import { useState, useEffect } from "react";
import { HardHat, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { loadCompanyBranding, loadTenantBrandingBySlug, useCompanyBranding } from "@/lib/logo";
import { CompanyLogo } from "@/components/CompanyLogo";
import { normalizeRut, isValidRut } from "@/lib/rut";
import { friendlyError } from "@/lib/networkError";
import { RateLimitError } from "@/lib/rateLimit";
import {
  callWorkerAuth,
  validatePassword,
  type Mode,
  type RutCheck,
  type AccountCheck,
} from "./worker-auth/api";
import { audit } from "@/lib/audit";
import { LOGIN_DISCLAIMER } from "@/lib/legal";
import { RutForm } from "./worker-auth/RutForm";
import { LoginForm } from "./worker-auth/LoginForm";
import { FirstPasswordForm } from "./worker-auth/FirstPasswordForm";
import { ResetRequestForm } from "./worker-auth/ResetRequestForm";
import { SuccessView } from "./worker-auth/SuccessView";
import { useGpsCapture } from "@/hooks/useGpsCapture";
import { isFreshGpsCapture } from "@/lib/gps";
import { GpsCaptureCard } from "@/components/auth/GpsCaptureCard";

export function WorkerAuthScreen({ tenantSlug = null }: { tenantSlug?: string | null }) {
  const { signInWithPasswordThenOtp } = useAuth();
  const {
    position: gpsPosition,
    status: gpsStatus,
    error: gpsError,
    capture: captureGps,
  } = useGpsCapture();
  const { logoUrl, companyName } = useCompanyBranding();
  const workerPortalSlug = tenantSlug && /^[a-z0-9-]+$/i.test(tenantSlug) ? tenantSlug : null;
  const operatorPortalPath = workerPortalSlug ? `/${workerPortalSlug}/admin` : "/admin";

  const [mode, setMode] = useState<Mode>("rut");
  const [rutInput, setRutInput] = useState("");
  const [rutInfo, setRutInfo] = useState<RutCheck | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [retryAt, setRetryAt] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [, setAccountInfo] = useState<AccountCheck | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (!retryAt) return;
    const update = () => setRemainingSeconds(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [retryAt]);

  function showRequestError(err: unknown) {
    if (err instanceof RateLimitError) {
      setRetryAt(err.retryAt);
      setRemainingSeconds(Math.max(0, Math.ceil((err.retryAt - Date.now()) / 1000)));
    }
    setError(friendlyError(err));
  }

  useEffect(() => {
    void (workerPortalSlug ? loadTenantBrandingBySlug(workerPortalSlug) : loadCompanyBranding());
    if (window.location.pathname === "/admin") {
      window.history.replaceState(null, "", "/trabajador");
    }
  }, [workerPortalSlug]);

  function resetState() {
    setError(null);
    setSuccessMsg("");
  }

  function backToRut() {
    setMode("rut");
    resetState();
    setRutInput("");
    setRutInfo(null);
    setEmail("");
    setPassword("");
  }

  function backToLogin() {
    setMode("login");
    resetState();
    setNewPassword("");
    setConfirmPassword("");
  }

  async function handleRutCheck(e: React.FormEvent) {
    e.preventDefault();
    if (busy || retryAt > Date.now()) return;
    resetState();
    if (!rutInput.trim()) {
      setError("Ingresa tu RUT.");
      return;
    }
    if (!isValidRut(rutInput)) {
      setError("El RUT ingresado no es válido. Verifica el dígito verificador.");
      return;
    }
    setBusy(true);
    try {
      const result = (await callWorkerAuth("check_rut", {
        rut: normalizeRut(rutInput),
      })) as RutCheck;
      setRutInfo(result);
      if (!result.valid) {
        setError(result.error ?? "El RUT no está registrado en el sistema.");
        setBusy(false);
        return;
      }
      if (!result.active) {
        setError("Tu cuenta está bloqueada. Contacta al administrador.");
        setBusy(false);
        return;
      }
      setEmail("");
      setMode("login");
    } catch (err) {
      showRequestError(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (busy || retryAt > Date.now()) return;
    resetState();
    setBusy(true);
    try {
      let capture =
        gpsPosition && isFreshGpsCapture(gpsPosition) ? gpsPosition : await captureGps();
      if (!capture) {
        setError(gpsError ?? "Comparte tu ubicación GPS antes de ingresar.");
        return;
      }
      const check = (await callWorkerAuth("check_account", {
        email,
        rut: normalizeRut(rutInput),
      })) as AccountCheck;
      setAccountInfo(check);

      if (!check.exists) {
        setError("No existe una cuenta con este correo. Contacta al administrador.");
        await audit({
          action: "worker.signin_failed",
          entity: "auth",
          entity_label: email,
          details: { reason: "account_not_found" },
        });
        setBusy(false);
        return;
      }
      if (!check.active) {
        setError(check.error ?? "Tu cuenta está bloqueada. Contacta al administrador.");
        setBusy(false);
        return;
      }
      if (check.must_change_password) {
        if (check.has_auth_user === false) {
          setError(
            "Tu cuenta aún no ha sido activada. Contacta al administrador para que cree tu acceso al portal.",
          );
          setBusy(false);
          return;
        }
        setMode("first_password");
        setBusy(false);
        return;
      }

      if (!isFreshGpsCapture(capture)) capture = await captureGps();
      if (!capture) {
        setError(gpsError ?? "Vuelve a capturar tu ubicación GPS para continuar.");
        return;
      }
      await signInWithPasswordThenOtp(email, password, workerPortalSlug, {
        allowWorkerPortal: true,
        gpsPosition: capture,
      });
    } catch (err) {
      if (err instanceof RateLimitError) {
        showRequestError(err);
        return;
      }
      const msg = friendlyError(err);
      const invalidCredentials = msg.includes("Invalid login credentials");
      if (invalidCredentials) {
        try {
          await callWorkerAuth("record_login_failure", { email });
        } catch (rateErr) {
          if (rateErr instanceof RateLimitError) {
            showRequestError(rateErr);
            return;
          }
        }
      }
      setError(invalidCredentials ? "Credenciales inválidas" : msg);
      await audit({
        action: "worker.signin_failed",
        entity: "auth",
        entity_label: email,
        details: { reason: invalidCredentials ? "invalid_credentials" : "authentication_error" },
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleSetFirstPassword(e: React.FormEvent) {
    e.preventDefault();
    if (busy || retryAt > Date.now()) return;
    resetState();
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (newPassword === password) {
      setError("La nueva contraseña debe ser diferente a la temporal.");
      return;
    }
    const pwError = validatePassword(newPassword);
    if (pwError) {
      setError(pwError);
      return;
    }
    setBusy(true);
    try {
      await callWorkerAuth("set_initial_password", {
        email,
        current_password: password,
        new_password: newPassword,
      });
      setSuccessMsg("Contraseña establecida. Ahora puedes ingresar.");
      setMode("success");
      setPassword(newPassword);
    } catch (err) {
      showRequestError(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleResetRequest(e: React.FormEvent) {
    e.preventDefault();
    if (busy || retryAt > Date.now()) return;
    resetState();
    setBusy(true);
    try {
      await callWorkerAuth("request_reset", { email });
      setSuccessMsg(
        "Si el correo existe, recibirás un enlace de restablecimiento en breve. Revisa tu bandeja de entrada y carpeta de spam.",
      );
      setMode("success");
    } catch (err) {
      showRequestError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(8,145,178,0.25),rgba(255,255,255,0))] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 bg-white/10 backdrop-blur-2xl rounded-2xl border border-white/20 mb-4 shadow-xl shadow-cyan-950/50 [box-shadow:inset_0_1px_0_0_rgba(255,255,255,0.15)]">
            <CompanyLogo
              src={logoUrl}
              alt={`${companyName} Logo`}
              className="h-12 max-w-[240px] w-auto object-contain drop-shadow"
              fallbackClassName="h-12 w-12"
            />
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <HardHat className="text-cyan-400" size={24} />
            <h1 className="text-2xl font-black text-white tracking-tight">Portal del Trabajador</h1>
          </div>
          <p className="text-slate-300/80 text-xs font-medium">
            Acceso personal a tus documentos, solicitudes y datos laborales
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-slate-950/60 border border-white/20 p-7 [box-shadow:inset_0_1px_0_0_rgba(255,255,255,0.15),0_25px_50px_-12px_rgba(0,0,0,0.5)]">
          {remainingSeconds > 0 && (
            <p role="status" className="mb-4 text-sm text-muted-foreground">
              Podrás reintentar en {Math.floor(remainingSeconds / 60)}:
              {String(remainingSeconds % 60).padStart(2, "0")}.
            </p>
          )}
          {mode === "login" && (
            <div className="mb-4">
              <GpsCaptureCard
                status={gpsStatus}
                position={gpsPosition}
                error={gpsError}
                onCapture={() => void captureGps()}
                variant="dark"
              />
            </div>
          )}
          <fieldset disabled={remainingSeconds > 0} className="min-w-0">
            {mode === "rut" && (
              <RutForm
                rutInput={rutInput}
                setRutInput={setRutInput}
                busy={busy}
                error={error}
                onSubmit={handleRutCheck}
              />
            )}
            {mode === "login" && (
              <LoginForm
                rutInfo={rutInfo}
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                busy={busy}
                error={error}
                onBack={backToRut}
                onReset={() => {
                  resetState();
                  setMode("reset_request");
                }}
                onSubmit={handleLogin}
              />
            )}
            {mode === "first_password" && (
              <FirstPasswordForm
                newPassword={newPassword}
                setNewPassword={setNewPassword}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                busy={busy}
                error={error}
                onBack={backToLogin}
                onSubmit={handleSetFirstPassword}
              />
            )}
            {mode === "reset_request" && (
              <ResetRequestForm
                email={email}
                setEmail={setEmail}
                busy={busy}
                error={error}
                onBack={backToLogin}
                onSubmit={handleResetRequest}
              />
            )}
            {mode === "success" && <SuccessView successMsg={successMsg} onContinue={backToLogin} />}
          </fieldset>
        </div>

        <div className="mt-3 p-3 rounded-xl border border-white/10 bg-white/5">
          <p className="text-[10px] text-white/40 leading-relaxed text-center">
            {LOGIN_DISCLAIMER}
          </p>
        </div>

        <div className="mt-6 flex flex-col items-center gap-2">
          <a
            href={operatorPortalPath}
            className="text-xs text-white/40 hover:text-blue-300 font-medium transition-colors flex items-center gap-1"
          >
            ¿También tienes funciones operativas? Entra al panel de empresa con el mismo correo{" "}
            <ArrowRight size={13} />
          </a>
          <div className="flex items-center gap-1.5 text-white/40 text-[11px]">
            <HardHat size={13} className="text-white/40 shrink-0" />
            <span>Acceso exclusivo para trabajadores autorizados.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
