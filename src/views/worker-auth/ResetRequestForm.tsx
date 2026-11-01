import { KeyRound, Mail, ArrowLeft } from "lucide-react";
import { inputClass, ErrorBanner, SubmitButton, SectionTitle, FieldLabel } from "./ui";

export function ResetRequestForm({
  email,
  setEmail,
  busy,
  error,
  onBack,
  onSubmit,
}: {
  email: string;
  setEmail: (v: string) => void;
  busy: boolean;
  error: string | null;
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <SectionTitle icon={<KeyRound size={18} className="text-cyan-300" />}>
        Restablecer Contraseña
      </SectionTitle>
      <p className="text-xs text-white/50">
        Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
      </p>
      <div>
        <FieldLabel>Correo Electrónico</FieldLabel>
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
      {error && <ErrorBanner error={error} />}
      <SubmitButton
        busy={busy}
        icon={<KeyRound size={16} />}
        busyLabel="Enviando..."
        label="Enviar Código"
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
