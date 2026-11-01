import { useEffect, useState } from "react";
import {
  HardHat,
  Mail,
  Lock,
  AlertCircle,
  Loader2,
  QrCode,
  ArrowRight,
  KeyRound,
  CheckCircle2,
  ArrowLeft,
  Clock,
  FileCheck,
  ShieldCheck,
  Eye,
  EyeOff,
  TrendingUp,
  Zap,
  BarChart3,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  loadCompanyBranding,
  loadTenantBrandingBySlug,
  useCompanyBranding,
  getCompanyName,
} from "@/lib/logo";
import { CompanyLogo } from "@/components/CompanyLogo";
import { friendlyError } from "@/lib/networkError";
import { callEdgeFunction } from "@/lib/edgeFunctions";
import { supabase } from "@/lib/supabase";
import { SUPABASE_CONFIGURED } from "@/lib/supabaseConfig";
import { refreshGpsCache, gpsSupported, type GpsPosition } from "@/lib/gps";
import { audit } from "@/lib/audit";
import { LOGIN_DISCLAIMER } from "@/lib/legal";
import { GpsWidget, type GpsStatus } from "./worker-auth/GpsWidget";
import { WatermelonMfaCard } from "@/components/ui/watermelon-mfa";

async function checkEmailRole(
  email: string,
  password: string,
  allowPasswordFallback = true,
): Promise<
  | {
      isWorker: boolean;
      isPlatformDeveloper?: boolean;
      isNewAdmin?: boolean;
      hasAuthIdentity?: boolean;
    }
  | { error: string }
> {
  try {
    const { data, error } = await callEdgeFunction<{
      allowed: boolean;
      is_worker: boolean;
      is_platform_developer?: boolean;
      is_new_admin?: boolean;
      has_auth_identity?: boolean;
    }>("check-email-allowed", { email }, { anon: true });
    if (error) {
      if (!allowPasswordFallback) return { error };
      // V4 fallback: after a clean schema reset, authenticate first and read
      // only the caller's own allow-list row through authenticated RLS.
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (!authError) {
        const { data: ownRow } = await supabase
          .from("allowed_emails")
          .select("active,role")
          .eq("email", email.toLowerCase().trim())
          .maybeSingle();
        return {
          isWorker: ownRow?.role === "worker",
          isPlatformDeveloper: ownRow?.role === "developer",
          hasAuthIdentity: true,
        };
      }
      return { error: `Error del servidor. Intenta nuevamente.` };
    }
    if (data?.allowed === false) {
      return { error: "Tu correo no está autorizado para acceder al sistema." };
    }
    return {
      isWorker: data?.is_worker === true,
      isPlatformDeveloper: data?.is_platform_developer === true,
      isNewAdmin: data?.is_new_admin === true,
      hasAuthIdentity: data?.has_auth_identity !== false,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `No se pudo conectar: ${msg}` };
  }
}

export function AuthScreen({ tenantSlug = null }: { tenantSlug?: string | null }) {
  const {
    signInWithPasswordThenOtp,
    signInWithMagicLink,
    verifyMfaCode,
    cancelMfa,
    emailOtpStatus,
    mfaState,
  } = useAuth();
  const { logoUrl, companyName } = useCompanyBranding();
  const displayCompanyName = companyName === "Empresa" ? "BJSIGAPP" : companyName;
  const scopedSlug = tenantSlug && /^[a-z0-9-]+$/i.test(tenantSlug) ? tenantSlug : null;
  const workerPortalPath = scopedSlug ? `/${scopedSlug}` : "/trabajador";
  const [email, setEmail] = useState(() => {
    try {
      return sessionStorage.getItem("bjsig_email_otp_email") ?? "";
    } catch {
      return "";
    }
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [magicAvailable, setMagicAvailable] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("idle");
  const [gpsPosition, setGpsPosition] = useState<GpsPosition | null>(null);

  const canUseGps = gpsSupported();
  const gpsReady = canUseGps && gpsStatus === "active";

  async function handleEnableGps() {
    setGpsStatus("loading");
    try {
      const pos = await refreshGpsCache(10000);
      if (pos) {
        setGpsPosition(pos);
        setGpsStatus("active");
      } else {
        setGpsStatus("denied");
      }
    } catch {
      setGpsStatus("denied");
    }
  }

  // Enlace directo a WhatsApp con mensaje predeterminado y QR generado
  const whatsappNumber = "56941228089";
  const whatsappMessage = encodeURIComponent(
    "Hola, necesito solicitar acceso al administrador para el sistema SIG Pro.",
  );
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(whatsappUrl)}`;

  useEffect(() => {
    void (tenantSlug ? loadTenantBrandingBySlug(tenantSlug) : loadCompanyBranding());
    if (canUseGps && gpsStatus === "idle") {
      void handleEnableGps();
    }
  }, [tenantSlug]); // eslint-disable-line react-hooks/exhaustive-deps -- callbacks are intentionally stable per mount

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!gpsReady) {
      setError("Activa el GPS para habilitar el acceso.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      if (!SUPABASE_CONFIGURED) {
        setError(
          "El sistema no está configurado: faltan VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en el entorno de ejecución.",
        );
        return;
      }
      try {
        // Password login is the authoritative path for existing users. The
        // public email check is only needed after a failed password attempt,
        // avoiding a rate-limit hit on every normal login.
        await signInWithPasswordThenOtp(email, password, tenantSlug);
      } catch (err) {
        const msg = friendlyError(err);
        if (!msg.toLowerCase().includes("invalid login credentials")) throw err;
        const result = await checkEmailRole(email, password);
        if (!("error" in result) && result.isNewAdmin && result.hasAuthIdentity === false) {
          setMagicAvailable(true);
          setError("Correo autorizado. Como última opción, puedes solicitar un magic link.");
          return;
        }
        throw err;
      }
    } catch (err) {
      const msg = friendlyError(err);
      setError(msg.includes("Invalid login credentials") ? "Credenciales inválidas" : msg);
      await audit({
        action: "admin.signin_failed",
        entity: "auth",
        entity_label: email,
        details: { reason: "invalid_credentials" },
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!gpsReady) {
      setError("Activa el GPS para habilitar el acceso.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/admin`,
      });
      if (resetError) throw resetError;
      setForgotSent(true);
    } catch (err) {
      const msg = friendlyError(err);
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleMagicLink() {
    if (!gpsReady) {
      setError("Activa el GPS para habilitar el acceso.");
      return;
    }
    setError(null);
    setBusy(true);
    setMagicSent(false);
    try {
      // Supabase Auth applies its own anti-enumeration and email rate limits.
      // Do not call check-email-allowed first: that endpoint is intentionally
      // rate-limited and a repeated click must not consume the login budget.
      await signInWithMagicLink(email, false);
      setMagicSent(true);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wm-stage min-h-dvh bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,99,235,0.25),rgba(255,255,255,0))] flex items-center justify-center px-4 py-6 sm:p-8 relative overflow-hidden">
      {/* Luces de fondo y malla decorativa */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Cabecera con Logo Oficial */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 bg-white/10 backdrop-blur-2xl rounded-2xl border border-white/20 mb-4 shadow-xl shadow-blue-950/50 [box-shadow:inset_0_1px_0_0_rgba(255,255,255,0.15)]">
            <CompanyLogo
              src={logoUrl}
              alt={`${companyName} Logo`}
              className="h-12 max-w-[240px] w-auto object-contain drop-shadow"
              fallbackClassName="h-12 w-12"
            />
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <h1 className="text-2xl font-black text-white tracking-tight">{displayCompanyName}</h1>
            <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full">
              SIG Pro
            </span>
          </div>
          <p className="text-slate-400 text-xs font-medium">
            Sistema Integrado de Gestión & Prevención de Riesgos
          </p>
          <p className="mt-2 text-[11px] text-cyan-200/80">
            Portal operativo: ingresa con el correo habilitado por tu empresa.
          </p>
          <p className="text-slate-500 text-[11px] mt-0.5">BJ Servicios Informáticos SpA</p>
        </div>

        {/* Tarjeta de Login */}
        <div className="wm-login-card bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-slate-950/60 border border-white/20 p-5 sm:p-7 [box-shadow:inset_0_1px_0_0_rgba(255,255,255,0.15),0_25px_50px_-12px_rgba(0,0,0,0.5)]">
          <div className="mb-4">
            <GpsWidget
              gpsStatus={gpsStatus}
              gpsPosition={gpsPosition}
              onEnable={handleEnableGps}
              supported={canUseGps}
              accent="blue"
            />
          </div>
          {forgotMode ? (
            forgotSent ? (
              <div className="space-y-5 text-center py-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/15 backdrop-blur-md border border-emerald-400/25 flex items-center justify-center [box-shadow:inset_0_1px_0_0_rgba(255,255,255,0.1)]">
                  <CheckCircle2 size={32} className="text-emerald-300" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white/90 mb-1">Correo Enviado</h2>
                  <p className="text-sm text-white/50">
                    Si el correo existe, recibirás un enlace para restablecer tu contraseña. Revisa
                    tu bandeja de entrada y carpeta de spam.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setForgotMode(false);
                    setForgotSent(false);
                    setForgotEmail("");
                  }}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-semibold rounded-xl hover:from-blue-400 hover:to-indigo-400 transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 active:scale-[0.99]"
                >
                  <ArrowLeft size={16} /> Volver al Inicio
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <KeyRound size={18} className="text-blue-300" />
                  <h2 className="text-sm font-bold text-white/90">Restablecer Contraseña</h2>
                </div>
                <p className="text-xs text-white/50">
                  Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1.5">
                    Correo Electrónico
                  </label>
                  <div className="relative group">
                    <Mail
                      size={16}
                      className="absolute left-3.5 top-3 text-white/50 group-focus-within:text-blue-300 transition-colors"
                    />
                    <input
                      type="email"
                      required
                      disabled={!gpsReady || busy}
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="admin@empresa.cl"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white/5 border border-white/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400/50 focus:bg-white/10 transition-all text-white placeholder:text-white/40 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
                {error && (
                  <div className="flex items-start gap-2.5 p-3 bg-red-500/10 backdrop-blur-md border border-red-400/20 rounded-xl text-xs font-medium text-red-300">
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
                    <span>{error}</span>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={busy || !gpsReady}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-semibold rounded-xl hover:from-blue-400 hover:to-indigo-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all duration-200 disabled:opacity-50 shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 active:scale-[0.99]"
                >
                  {busy ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Enviando...
                    </>
                  ) : (
                    <>
                      <KeyRound size={16} /> Enviar Enlace
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForgotMode(false);
                    setError(null);
                  }}
                  className="w-full text-xs text-white/50 hover:text-white/80 font-medium flex items-center justify-center gap-1"
                >
                  <ArrowLeft size={13} /> Volver al inicio de sesión
                </button>
              </form>
            )
          ) : (
            <>
              {mfaState.status !== "not_required" ? (
                <fieldset disabled={!gpsReady} className="min-w-0 border-0 p-0">
                  <WatermelonMfaCard
                    mode={mfaState.status}
                    qrCode={mfaState.status === "enroll" ? mfaState.qrCode : undefined}
                    secret={mfaState.status === "enroll" ? mfaState.secret : undefined}
                    code={mfaCode}
                    busy={busy}
                    error={error}
                    onCodeChange={setMfaCode}
                    onVerify={async () => {
                      if (!gpsReady) {
                        setError("Activa el GPS para habilitar el acceso.");
                        return;
                      }
                      setBusy(true);
                      setError(null);
                      try {
                        await verifyMfaCode(mfaCode);
                      } catch (err) {
                        setError(friendlyError(err));
                      } finally {
                        setBusy(false);
                      }
                    }}
                    onCancel={() => void cancelMfa()}
                  />
                </fieldset>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/80 mb-1.5">
                      Correo Electrónico
                    </label>
                    <div className="relative group">
                      <Mail
                        size={16}
                        className="absolute left-3.5 top-3 text-white/50 group-focus-within:text-blue-300 transition-colors"
                      />
                      <input
                        type="email"
                        required
                        disabled={!gpsReady || busy}
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setMagicAvailable(false);
                          setMagicSent(false);
                        }}
                        placeholder="prevencionista@correo.cl"
                        className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-white/5 border border-white/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400/50 focus:bg-white/10 transition-all text-white placeholder:text-white/40 disabled:opacity-50 disabled:cursor-not-allowed [box-shadow:inset_0_1px_0_0_rgba(255,255,255,0.05)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-white/80 mb-1.5">
                      Contraseña
                    </label>
                    <div className="relative group">
                      <Lock
                        size={16}
                        className="absolute left-3.5 top-3 text-white/50 group-focus-within:text-blue-300 transition-colors"
                      />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={6}
                        disabled={!gpsReady || busy}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-11 py-2.5 text-sm bg-white/5 border border-white/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400/50 focus:bg-white/10 transition-all text-white placeholder:text-white/40 disabled:opacity-50 disabled:cursor-not-allowed [box-shadow:inset_0_1px_0_0_rgba(255,255,255,0.05)]"
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 transition-colors hover:text-white"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div
                      role="alert"
                      className="flex items-start gap-2.5 p-3 bg-red-500/10 backdrop-blur-md border border-red-400/20 rounded-xl text-xs font-medium text-red-300 animate-in fade-in [box-shadow:inset_0_1px_0_0_rgba(255,255,255,0.05)]"
                    >
                      <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
                      <div className="flex-1">
                        <span>{error}</span>
                        {error.includes("Portal del Trabajador") && (
                          <a
                            href={workerPortalPath}
                            className="block mt-1.5 text-cyan-300 hover:text-cyan-200 font-semibold flex items-center gap-1"
                          >
                            <HardHat size={13} /> Ir al Portal del Trabajador{" "}
                            <ArrowRight size={13} />
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={busy || !gpsReady}
                    className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-semibold rounded-xl hover:from-blue-400 hover:to-indigo-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all duration-200 disabled:opacity-50 shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 active:scale-[0.99] [box-shadow:inset_0_1px_0_0_rgba(255,255,255,0.2)]"
                  >
                    {busy ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      "Ingresar al Sistema"
                    )}
                  </button>
                  {magicSent && (
                    <div className="text-center text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-400/20 rounded-xl px-3 py-2">
                      Enviamos un enlace mágico de Supabase. Revisa tu correo para iniciar sesión.
                    </div>
                  )}
                  {magicAvailable && !magicSent && (
                    <button
                      type="button"
                      disabled={busy || !email || !gpsReady}
                      onClick={() => void handleMagicLink()}
                      className="w-full rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-3 py-2.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-400/20 disabled:opacity-50"
                    >
                      Enviar magic link como última opción
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setForgotMode(true);
                      setError(null);
                    }}
                    className="w-full text-xs text-white/50 hover:text-blue-300 font-medium flex items-center justify-center gap-1 transition-colors"
                  >
                    <KeyRound size={13} /> ¿Olvidaste tu contraseña?
                  </button>
                </form>
              )}
              {/* Sección QR - Solicitar Acceso */}
              <div className="mt-6 pt-5 border-t border-white/10 flex flex-col items-center text-center">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white/80 mb-1">
                  <QrCode size={15} className="text-blue-300" />
                  <span>Solicita acceso al administrador</span>
                </div>
                <p className="text-[11px] text-white/50 mb-3 max-w-[260px]">
                  Escanea el código QR o haz clic sobre él para solicitar ayuda vía WhatsApp.
                </p>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col items-center bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/15 hover:border-blue-400/40 p-3 rounded-2xl transition-all duration-200 [box-shadow:inset_0_1px_0_0_rgba(255,255,255,0.05)]"
                >
                  <img
                    src={qrCodeUrl}
                    alt="Código QR de ayuda"
                    className="w-24 h-24 rounded-lg object-contain bg-white p-1 border border-white/10 group-hover:scale-105 transition-transform"
                  />
                  <span className="mt-2 text-[11px] font-semibold text-blue-300 group-hover:text-blue-200">
                    +56 9 4122 8089
                  </span>
                </a>
              </div>

              <div className="mt-3 p-3 rounded-xl border border-white/10 bg-white/5">
                <p className="text-[10px] text-white/40 leading-relaxed text-center">
                  {LOGIN_DISCLAIMER}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex flex-col items-center gap-2">
                <a
                  href={workerPortalPath}
                  className="text-xs text-cyan-300 hover:text-cyan-200 font-semibold transition-colors flex items-center gap-1.5"
                >
                  <HardHat size={14} /> Portal del Trabajador
                </a>
                <div className="flex items-center justify-center gap-1.5 text-white/40 text-[11px]">
                  <HardHat size={13} className="text-white/40 shrink-0" />
                  <span>Acceso restringido a personal autorizado.</span>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[10px] text-slate-400 font-medium">
          <span className="px-2.5 py-1 bg-white/5 border border-white/15 rounded-md backdrop-blur-md text-white/60 [box-shadow:inset_0_1px_0_0_rgba(255,255,255,0.05)]">
            DS 44
          </span>
          <span className="px-2.5 py-1 bg-white/5 border border-white/15 rounded-md backdrop-blur-md text-white/60 [box-shadow:inset_0_1px_0_0_rgba(255,255,255,0.05)]">
            DS 594
          </span>
          <span className="px-2.5 py-1 bg-white/5 border border-white/15 rounded-md backdrop-blur-md text-white/60 [box-shadow:inset_0_1px_0_0_rgba(255,255,255,0.05)]">
            Ley 16.744
          </span>
          <span className="px-2.5 py-1 bg-white/5 border border-white/15 rounded-md backdrop-blur-md text-white/60 [box-shadow:inset_0_1px_0_0_rgba(255,255,255,0.05)]">
            ISO 9001 / 14001 / 45001
          </span>
        </div>

        {/* Badges de Valor Agregado y Ahorro de Tiempo */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {[
            {
              icon: Clock,
              label: "80% menos tiempo",
              sub: "en reportes",
              color: "text-blue-300",
              bg: "bg-blue-500/10 border-blue-500/20",
            },
            {
              icon: FileCheck,
              label: "100% trazabilidad",
              sub: "documental",
              color: "text-emerald-300",
              bg: "bg-emerald-500/10 border-emerald-500/20",
            },
            {
              icon: ShieldCheck,
              label: "Cumplimiento",
              sub: "automatizado",
              color: "text-amber-300",
              bg: "bg-amber-500/10 border-amber-500/20",
            },
            {
              icon: TrendingUp,
              label: "Indicadores",
              sub: "en tiempo real",
              color: "text-cyan-300",
              bg: "bg-cyan-500/10 border-cyan-500/20",
            },
            {
              icon: Zap,
              label: "Automatización",
              sub: "de procesos",
              color: "text-violet-300",
              bg: "bg-violet-500/10 border-violet-500/20",
            },
            {
              icon: BarChart3,
              label: "Decisiones",
              sub: "basadas en datos",
              color: "text-rose-300",
              bg: "bg-rose-500/10 border-rose-500/20",
            },
          ].map((badge) => (
            <div
              key={badge.label}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border backdrop-blur-md transition-all duration-200 hover:scale-[1.03] ${badge.bg}`}
            >
              <badge.icon size={18} className={`shrink-0 ${badge.color}`} />
              <div className="min-w-0">
                <p className={`text-[11px] font-bold leading-tight ${badge.color}`}>
                  {badge.label}
                </p>
                <p className="text-[9px] text-white/40 leading-tight">{badge.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
