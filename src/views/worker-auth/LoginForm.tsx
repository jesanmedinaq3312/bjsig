import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  HardHat,
  CheckCircle2,
  ArrowLeft,
  KeyRound,
} from "lucide-react";
import type { RutCheck } from "./api";
import {
  inputClass,
  inputWithButtonClass,
  ErrorBanner,
  SubmitButton,
  SectionTitle,
  FieldLabel,
} from "./ui";

export function LoginForm({
  rutInfo,
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  busy,
  error,
  onBack,
  onReset,
  onSubmit,
}: {
  rutInfo: RutCheck | null;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  busy: boolean;
  error: string | null;
  onBack: () => void;
  onReset: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {rutInfo && (
        <div className="flex items-center gap-2.5 p-3 bg-cyan-500/10 backdrop-blur-md border border-cyan-400/20 rounded-xl [box-shadow:inset_0_1px_0_0_rgba(255,255,255,0.05)]">
          <CheckCircle2 size={16} className="shrink-0 text-cyan-300" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-cyan-200 truncate">{rutInfo.worker_name}</p>
            <p className="text-xs text-cyan-400">RUT verificado correctamente</p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="text-xs text-cyan-300 hover:text-cyan-200 font-medium shrink-0"
          >
            Cambiar
          </button>
        </div>
      )}
      <SectionTitle icon={<User size={18} className="text-cyan-300" />}>
        Iniciar Sesión
      </SectionTitle>
      <p className="-mt-2 text-[11px] leading-relaxed text-white/50">
        Este es tu espacio personal. Confirma el RUT y usa el correo registrado; para tus tareas
        operativas, entra al panel de empresa con la misma cuenta.
      </p>
      <div>
        <FieldLabel>Correo Electrónico</FieldLabel>
        {rutInfo?.email_hint && (
          <p className="text-[11px] text-cyan-300/70 mb-1.5">
            Tu correo es <strong className="text-cyan-200">{rutInfo.email}</strong>. Escríbelo
            completo para continuar.
          </p>
        )}
        <div className="relative group">
          <Mail
            size={16}
            className="absolute left-3.5 top-3 text-white/50 group-focus-within:text-cyan-300 transition-colors"
          />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="trabajador@empresa.cl"
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <FieldLabel>Contraseña</FieldLabel>
        <div className="relative group">
          <Lock
            size={16}
            className="absolute left-3.5 top-3 text-white/50 group-focus-within:text-cyan-300 transition-colors"
          />
          <input
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={inputWithButtonClass}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-2.5 text-white/50 hover:text-white/80 transition-colors"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      {error && <ErrorBanner error={error} />}
      <SubmitButton
        busy={busy}
        icon={<HardHat size={16} />}
        busyLabel="Verificando..."
        label="Ingresar al Portal"
      />
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-white/50 hover:text-white/80 font-medium transition-colors flex items-center gap-1"
        >
          <ArrowLeft size={13} /> Volver
        </button>
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-white/50 hover:text-cyan-300 font-medium transition-colors flex items-center gap-1"
        >
          <KeyRound size={13} /> ¿Olvidaste tu contraseña?
        </button>
      </div>
    </form>
  );
}
