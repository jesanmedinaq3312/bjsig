import { useEffect, useState, useCallback, useRef } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { callEdgeFunction } from "@/lib/edgeFunctions";
import { audit, syncQueuedAuditLogs, initAuditAutoSync } from "@/lib/audit";
import { clearGpsCache, recordSessionStart, clearSessionStart } from "@/lib/gps";
import { systemConfigRepo } from "@/lib/repositories";
import { hasOperationalAccess } from "@/lib/authorization";
import { getTurnstileToken } from "@/lib/turnstile";

const DEFAULT_TIMEOUT_MINUTES = 30;
export type EmailOtpStatus = "not_required" | "pending" | "verified";

export type MfaState =
  | { status: "not_required" }
  | { status: "challenge"; factorId: string; challengeId: string }
  | { status: "enroll"; factorId: string; qrCode: string; secret: string };

async function requireMfaSession(): Promise<void> {
  const current = await supabase.auth.getSession();
  if (current.data.session) return;
  const refreshed = await supabase.auth.refreshSession();
  if (refreshed.error || !refreshed.data.session) {
    throw new Error(
      "La sesión de configuración MFA expiró. Vuelve a ingresar tu contraseña para generar un nuevo QR.",
    );
  }
}

async function enrollFreshTotp() {
  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) throw listError;
  for (const factor of factors?.all ?? []) {
    if (factor.factor_type !== "totp" || factor.status !== "unverified") continue;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    if (error) throw error;
  }
  return supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "BJSIGAPP" });
}

export function useAuth() {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isWorker, setIsWorker] = useState(false);
  const [workerRut, setWorkerRut] = useState<string | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [userRole, setUserRole] = useState<string>("guest");
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [emailOtpStatus, setEmailOtpStatus] = useState<EmailOtpStatus>(() => {
    try {
      // The old email-OTP flow was removed in favor of TOTP MFA. Clear any
      // stale browser flag so a previous release cannot trap the user at login.
      sessionStorage.removeItem("bjsig_email_otp_status");
      sessionStorage.removeItem("bjsig_email_otp_email");
      return "not_required";
    } catch {
      return "not_required";
    }
  });
  const [mfaState, setMfaState] = useState<MfaState>({ status: "not_required" });
  const [timeoutMinutes, setTimeoutMinutes] = useState(DEFAULT_TIMEOUT_MINUTES);
  const lastActivityRef = useRef<number>(Date.now());
  const timeoutTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function refreshRoles(email: string | undefined) {
    if (!email) {
      setIsAdmin(false);
      setIsWorker(false);
      setWorkerRut(null);
      setMustChangePassword(false);
      setUserRole("guest");
      setPermissions({});
      return;
    }
    try {
      const [adminRes, workerRes, rutRes, roleRes, allowedRes, currentTenantRes] =
        await Promise.all([
          supabase.rpc("is_admin"),
          supabase.rpc("is_worker"),
          supabase.rpc("current_worker_rut"),
          supabase.rpc("current_user_role"),
          supabase
            .from("allowed_emails")
            .select("must_change_password, permissions")
            .eq("email", email.toLowerCase().trim())
            .maybeSingle(),
          supabase.rpc("current_tenant_id"),
        ]);
      setIsAdmin(!!adminRes.data);
      setIsWorker(!!workerRes.data);
      setWorkerRut((rutRes.data as string | null) ?? null);
      let resolvedRole = (roleRes.data as string) ?? "guest";
      let mergedPermissions =
        ((allowedRes.data as Record<string, unknown> | null)?.permissions as Record<
          string,
          boolean
        >) ?? {};
      let tenantId = typeof currentTenantRes.data === "string" ? currentTenantRes.data : null;

      // Prefer the tenant in the requested /<slug>/admin route, then the active context.
      const pathParts = window.location.pathname.split("/").filter(Boolean);
      const routeSlug = pathParts[1] === "admin" ? pathParts[0] : null;
      if (routeSlug || !tenantId) {
        const { data: tenantRows } = await supabase.rpc("my_tenants");
        const rows = Array.isArray(tenantRows)
          ? (tenantRows as Array<Record<string, unknown>>)
          : [];
        const selected = routeSlug
          ? rows.find((row) => String(row.slug ?? row.tenant_slug ?? "") === routeSlug)
          : rows[0];
        if (selected) tenantId = String(selected.id ?? selected.tenant_id ?? "") || tenantId;
      }
      if (tenantId) {
        const { data: accessData } = await supabase.rpc("get_effective_tenant_access", {
          _tenant_id: tenantId,
        });
        const access = (Array.isArray(accessData) ? accessData[0] : accessData) as Record<
          string,
          unknown
        > | null;
        if (access) {
          const tenantRole = String(access.role ?? "");
          if (tenantRole && !["worker", "member", "guest"].includes(tenantRole)) {
            resolvedRole = tenantRole;
          }
          mergedPermissions = {
            ...mergedPermissions,
            ...((access.permissions as Record<string, boolean> | null) ?? {}),
          };
        }
      }
      setUserRole(resolvedRole);
      setPermissions(mergedPermissions);
      const allowedRow = allowedRes.data as Record<string, unknown> | null;
      setMustChangePassword(!!(allowedRow as Record<string, unknown> | null)?.must_change_password);
    } catch {
      setIsAdmin(false);
      setIsWorker(false);
      setWorkerRut(null);
      setMustChangePassword(false);
      setUserRole("guest");
      setPermissions({});
    }
  }

  // Load session timeout config from system_config
  useEffect(() => {
    systemConfigRepo.getValue("session_timeout_minutes").then((val) => {
      const mins = val ? parseInt(val, 10) : DEFAULT_TIMEOUT_MINUTES;
      if (!isNaN(mins) && mins > 0) setTimeoutMinutes(mins);
    });
  }, []);

  // Track user activity and auto-sign-out after inactivity
  useEffect(() => {
    if (!session) return;

    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };
    const events = ["mousedown", "keydown", "touchstart", "click", "scroll"];
    events.forEach((e) => window.addEventListener(e, updateActivity, { passive: true }));

    // Check every 30 seconds if the session has expired
    let timeoutNotified = false;
    timeoutTimerRef.current = setInterval(async () => {
      const elapsed = Date.now() - lastActivityRef.current;
      const limit = timeoutMinutes * 60 * 1000;
      if (elapsed >= limit) {
        if (!timeoutNotified) {
          timeoutNotified = true;
          try {
            sessionStorage.setItem("gyc_session_expired", "1");
          } catch {
            /* ignore */
          }
        }
        await audit({
          action: "auth.session_timeout",
          entity: "auth",
          entity_label: user?.email ?? "unknown",
          details: { timeout_minutes: timeoutMinutes },
        });
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setIsAdmin(false);
        setIsWorker(false);
        setWorkerRut(null);
      }
    }, 30000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, updateActivity));
      if (timeoutTimerRef.current) clearInterval(timeoutTimerRef.current);
    };
  }, [session, timeoutMinutes, user]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      refreshRoles(data.session?.user?.email);
      if (data.session) {
        const { data: mfaRequired } = await supabase.rpc("mfa_required_for_current_user");
        if (mfaRequired === true) {
          const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          if (aal?.currentLevel !== "aal2") {
            await requireMfaSession();
            const { data: factors } = await supabase.auth.mfa.listFactors();
            const verifiedFactor = factors?.totp?.find((factor) => factor.status === "verified");
            if (verifiedFactor) {
              const { data: challenge } = await supabase.auth.mfa.challenge({
                factorId: verifiedFactor.id,
              });
              if (challenge?.id) {
                setMfaState({
                  status: "challenge",
                  factorId: verifiedFactor.id,
                  challengeId: challenge.id,
                });
              }
            } else {
              const { data: enrollment } = await enrollFreshTotp();
              if (enrollment?.id && enrollment.totp) {
                setMfaState({
                  status: "enroll",
                  factorId: enrollment.id,
                  qrCode: enrollment.totp.qr_code,
                  secret: enrollment.totp.secret,
                });
              }
            }
            setEmailOtpStatus("pending");
          }
        }
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      (async () => {
        if (event === "SIGNED_IN" && sess) {
          try {
            if (sessionStorage.getItem("bjsig_magic_fallback_pending") === "1") {
              sessionStorage.removeItem("bjsig_magic_fallback_pending");
              sessionStorage.removeItem("bjsig_email_otp_status");
              sessionStorage.removeItem("bjsig_email_otp_email");
              setEmailOtpStatus("verified");
            }
          } catch {
            /* ignore */
          }
        }
        if (event === "MFA_CHALLENGE_VERIFIED") {
          setEmailOtpStatus("verified");
          try {
            sessionStorage.removeItem("bjsig_email_otp_status");
            sessionStorage.removeItem("bjsig_email_otp_email");
          } catch {
            /* ignore */
          }
        }
        setPasswordRecovery(event === "PASSWORD_RECOVERY");
        // If session was lost unexpectedly (token refresh failure, background expiry),
        // flag it so the login screen can show a "session expired" message.
        if (event === "SIGNED_OUT" && !sess) {
          try {
            sessionStorage.setItem("gyc_session_expired", "1");
          } catch {
            /* ignore */
          }
        }
        setSession(sess);
        setUser(sess?.user ?? null);
        refreshRoles(sess?.user?.email);
      })();
    });

    // Los navegadores pausan/throttlean los timers en pestañas en segundo plano
    // (varía según navegador: Safari es el más agresivo). Si el auto-refresh del
    // token de Supabase no alcanza a correr a tiempo mientras la pestaña estaba
    // en background, la sesión queda vencida en silencio y recién se nota cuando
    // el usuario vuelve — mostrando pantalla en blanco o expulsándolo al login.
    // Al detectar que la pestaña vuelve a estar visible, se fuerza una
    // re-sincronización inmediata de la sesión en vez de esperar al próximo
    // timer, y se cuenta como actividad para el timeout por inactividad.
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        lastActivityRef.current = Date.now();
        supabase.auth
          .getSession()
          .then(({ data }) => {
            if (!data.session) {
              try {
                sessionStorage.setItem("gyc_session_expired", "1");
              } catch {
                /* ignore */
              }
            }
            setSession(data.session);
            setUser(data.session?.user ?? null);
            refreshRoles(data.session?.user?.email);
          })
          .catch(() => {
            // Network error on visibility — don't silently kick the user out
          });
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Initialize offline audit log auto-sync on reconnect
    initAuditAutoSync();

    // Sync queued audit logs on page unload / app close
    const handleBeforeUnload = () => {
      syncQueuedAuditLogs().catch(() => {});
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      sub.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const captchaToken = await getTurnstileToken("supabase_sign_in");
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken },
    });
    if (error) {
      // Log failed login attempt with full context
      await audit({
        action: "auth.signin_failed",
        entity: "auth",
        entity_label: email,
        details: { error: error.message },
      });
      throw error;
    }
    recordSessionStart();
    await audit({ action: "auth.signin", entity: "auth", entity_label: email });
    return data;
  }, []);

  const signInWithPasswordThenOtp = useCallback(
    async (
      email: string,
      password: string,
      tenantSlug?: string | null,
      options: { allowWorkerPortal?: boolean } = {},
    ) => {
      const captchaToken = await getTurnstileToken("supabase_sign_in");
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: { captchaToken },
      });
      if (error) {
        await audit({
          action: "auth.signin_failed",
          entity: "auth",
          entity_label: email,
          details: { error: error.message },
        });
        throw error;
      }
      const [workerResult, adminResult, roleResult, accountResult, activeTenantResult] =
        await Promise.all([
          supabase.rpc("is_worker"),
          supabase.rpc("is_admin"),
          supabase.rpc("current_user_role"),
          supabase
            .from("allowed_emails")
            .select("permissions")
            .eq("email", email.toLowerCase().trim())
            .maybeSingle(),
          supabase.rpc("current_tenant_id"),
        ]);
      let resolvedRole = (roleResult.data as string) ?? "guest";
      let permissions =
        ((accountResult.data as Record<string, unknown> | null)?.permissions as Record<
          string,
          boolean
        >) ?? {};
      let tenantId = typeof activeTenantResult.data === "string" ? activeTenantResult.data : null;
      const { data: tenantsData } = await supabase.rpc("my_tenants");
      const tenantRows = Array.isArray(tenantsData)
        ? (tenantsData as Array<Record<string, unknown>>)
        : [];
      const requestedTenant = tenantSlug
        ? tenantRows.find((row) => String(row.slug ?? row.tenant_slug ?? "") === tenantSlug)
        : tenantRows[0];
      if (requestedTenant) tenantId = String(requestedTenant.id ?? requestedTenant.tenant_id ?? "");
      if (tenantId) {
        const { data: accessData } = await supabase.rpc("get_effective_tenant_access", {
          _tenant_id: tenantId,
        });
        const access = (Array.isArray(accessData) ? accessData[0] : accessData) as Record<
          string,
          unknown
        > | null;
        if (access) {
          const tenantRole = String(access.role ?? "");
          if (tenantRole && !["worker", "member", "guest"].includes(tenantRole)) {
            resolvedRole = tenantRole;
          }
          permissions = {
            ...permissions,
            ...((access.permissions as Record<string, boolean> | null) ?? {}),
          };
        }
      }
      if (
        workerResult.data === true &&
        adminResult.data !== true &&
        !hasOperationalAccess(resolvedRole, permissions) &&
        !options.allowWorkerPortal
      ) {
        await supabase.auth.signOut();
        throw new Error(
          "Esta cuenta solo tiene acceso personal de trabajador. Usa el portal de empresa si también tienes permisos operativos.",
        );
      }
      const { data: mfaRequired, error: mfaRequiredError } = await supabase.rpc(
        "mfa_required_for_current_user",
      );
      if (mfaRequiredError) throw mfaRequiredError;
      if (mfaRequired !== true) {
        setMfaState({ status: "not_required" });
        setEmailOtpStatus("verified");
        recordSessionStart();
        await audit({ action: "auth.signin", entity: "auth", entity_label: email });
        return data;
      }
      const { data: aal, error: aalError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalError) {
        await supabase.auth.signOut();
        throw new Error("No se pudo comprobar el segundo factor de autenticación.");
      }
      if (aal?.currentLevel === "aal2") {
        setMfaState({ status: "not_required" });
        setEmailOtpStatus("verified");
        recordSessionStart();
        await audit({ action: "auth.signin", entity: "auth", entity_label: email });
        return data;
      }

      await requireMfaSession();
      const { data: factors, error: factorError } = await supabase.auth.mfa.listFactors();
      if (factorError) throw factorError;
      const verifiedFactor = factors?.totp?.find((factor) => factor.status === "verified");
      if (verifiedFactor) {
        const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId: verifiedFactor.id,
        });
        if (challengeError || !challenge?.id) {
          await supabase.auth.signOut();
          throw challengeError ?? new Error("No se pudo iniciar el desafío MFA.");
        }
        setMfaState({
          status: "challenge",
          factorId: verifiedFactor.id,
          challengeId: challenge.id,
        });
      } else {
        const { data: enrollment, error: enrollmentError } = await enrollFreshTotp();
        if (enrollmentError || !enrollment?.id || !enrollment.totp) {
          await supabase.auth.signOut();
          throw (
            enrollmentError ??
            new Error("Este usuario debe configurar MFA TOTP antes de continuar.")
          );
        }
        setMfaState({
          status: "enroll",
          factorId: enrollment.id,
          qrCode: enrollment.totp.qr_code,
          secret: enrollment.totp.secret,
        });
      }
      setEmailOtpStatus("pending");
      return data;
    },
    [],
  );

  const verifyMfaCode = useCallback(
    async (code: string) => {
      const cleanCode = code.replace(/\s/g, "");
      if (!/^\d{6}$/.test(cleanCode)) throw new Error("Ingresa el código MFA de 6 dígitos.");
      await requireMfaSession();
      const current = mfaState;
      if (current.status === "not_required") throw new Error("No hay un desafío MFA pendiente.");
      const result =
        current.status === "challenge"
          ? await supabase.auth.mfa.verify({
              factorId: current.factorId,
              challengeId: current.challengeId,
              code: cleanCode,
            })
          : await supabase.auth.mfa.challengeAndVerify({
              factorId: current.factorId,
              code: cleanCode,
            });
      if (result.error) {
        if (result.error.message.toLowerCase().includes("auth session missing")) {
          throw new Error(
            "La sesión de configuración MFA expiró. Vuelve a ingresar tu contraseña para generar un nuevo QR.",
          );
        }
        throw result.error;
      }
      setMfaState({ status: "not_required" });
      setEmailOtpStatus("verified");
      recordSessionStart();
      await audit({ action: "auth.mfa_verified", entity: "auth" });
      try {
        sessionStorage.removeItem("bjsig_email_otp_status");
        sessionStorage.removeItem("bjsig_email_otp_email");
      } catch {
        /* ignore */
      }
    },
    [mfaState],
  );

  const cancelMfa = useCallback(async () => {
    setMfaState({ status: "not_required" });
    setEmailOtpStatus("not_required");
    await supabase.auth.signOut();
  }, []);

  const signInWithMagicLink = useCallback(async (email: string, shouldCreateUser = false) => {
    const captchaToken = await getTurnstileToken("supabase_sign_in_otp");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/admin`,
        shouldCreateUser,
        captchaToken,
      },
    });
    if (error) throw error;
    try {
      sessionStorage.setItem("bjsig_magic_fallback_pending", "1");
    } catch {
      /* ignore */
    }
  }, []);

  const sendEmailOtp = useCallback(async (email: string) => {
    const captchaToken = await getTurnstileToken("supabase_sign_in_otp");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false, captchaToken },
    });
    if (error) throw error;
  }, []);

  const verifyEmailOtp = useCallback(async (email: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: token.replace(/\s/g, "").slice(0, 6),
      type: "email",
    });
    if (error) throw error;
    setEmailOtpStatus("verified");
    try {
      sessionStorage.removeItem("bjsig_email_otp_status");
      sessionStorage.removeItem("bjsig_email_otp_email");
    } catch {
      /* ignore */
    }
    return data;
  }, []);

  const checkEmailAllowed = useCallback(async (email: string): Promise<boolean> => {
    try {
      const { data, error } = await callEdgeFunction<{ allowed: boolean }>(
        "check-email-allowed",
        { email },
        { anon: true },
      );
      if (error) return false;
      return data?.allowed === true;
    } catch {
      return false;
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const captchaToken = await getTurnstileToken("supabase_sign_up");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { captchaToken },
    });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    await audit({ action: "auth.signout", entity: "auth", entity_label: user?.email ?? "unknown" });
    await syncQueuedAuditLogs();
    clearGpsCache();
    clearSessionStart();
    await supabase.auth.signOut();
    queryClient.clear();
    setSession(null);
    setUser(null);
    setIsAdmin(false);
    setIsWorker(false);
    setWorkerRut(null);
    setEmailOtpStatus("not_required");
    try {
      sessionStorage.removeItem("bjsig_email_otp_status");
      sessionStorage.removeItem("bjsig_email_otp_email");
      sessionStorage.removeItem("bjsig_magic_fallback_pending");
    } catch {
      /* ignore */
    }
  }, [user, queryClient]);

  function clearMustChangePassword() {
    setMustChangePassword(false);
  }
  function clearPasswordRecovery() {
    setPasswordRecovery(false);
  }

  return {
    session,
    user,
    loading,
    isAdmin,
    isWorker,
    workerRut,
    mustChangePassword,
    passwordRecovery,
    clearMustChangePassword,
    clearPasswordRecovery,
    userRole,
    permissions,
    emailOtpStatus,
    mfaState,
    signIn,
    signInWithPasswordThenOtp,
    signInWithMagicLink,
    sendEmailOtp,
    verifyEmailOtp,
    verifyMfaCode,
    cancelMfa,
    signUp,
    checkEmailAllowed,
    signOut,
    timeoutMinutes,
  };
}
