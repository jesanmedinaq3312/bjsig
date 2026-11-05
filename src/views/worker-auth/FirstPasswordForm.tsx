import { KeyRound, Lock, Eye, EyeOff, CheckCircle2, ArrowLeft } from "lucide-react";
import {
  inputClass,
  inputWithButtonClass,
  ErrorBanner,
  SubmitButton,
  SectionTitle,
  FieldLabel,
} from "./ui";
import { PASSWORD_POLICY_MESSAGE } from "@/lib/passwordPolicy";

export function FirstPasswordForm({
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  showPassword,
  setShowPassword,
  busy,
  error,
  onBack,
  onSubmit,
}: {
  newPassword: string;
  setNewPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  busy: boolean;
  error: string | null;
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <SectionTitle icon={<KeyRound size={18} className="text-cyan-300" />}>
        Configurar Contraseña
      </SectionTitle>
      <div className="p-3 bg-cyan-500/10 backdrop-blur-md border border-cyan-400/20 rounded-xl text-xs text-cyan-200 font-medium [box-shadow:inset_0_1px_0_0_rgba(255,255,255,0.05)]">
        Bienvenido. Es la primera vez que ingresas. Crea una contraseña para tu cuenta.
      </div>
      <p className="text-[11px] leading-relaxed text-white/60">{PASSWORD_POLICY_MESSAGE}</p>
      <div>
        <FieldLabel>Nueva Contraseña</FieldLabel>
        <div className="relative group">
          <Lock
            size={16}
            className="absolute left-3.5 top-3 text-white/50 group-focus-within:text-cyan-300 transition-colors"
          />
          <input
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            className={inputWithButtonClass}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-2.5 text-white/50 hover:text-white/80"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      <div>
        <FieldLabel>Confirmar Contraseña</FieldLabel>
        <div className="relative group">
          <Lock
            size={16}
            className="absolute left-3.5 top-3 text-white/50 group-focus-within:text-cyan-300 transition-colors"
          />
          <input
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repite tu contraseña"
            className={inputClass}
          />
        </div>
      </div>
      {error && <ErrorBanner error={error} />}
      <SubmitButton
        busy={busy}
        icon={<CheckCircle2 size={16} />}
        busyLabel="Guardando..."
        label="Establecer Contraseña"
      />
      <button
        type="button"
        onClick={onBack}
        className="w-full text-xs text-white/50 hover:text-white/80 font-medium flex items-center justify-center gap-1"
      >
        <ArrowLeft size={13} /> Volver al inicio de sesión
      </button>
    </form>
  );
}
