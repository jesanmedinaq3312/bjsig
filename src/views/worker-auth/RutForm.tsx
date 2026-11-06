import { Fingerprint, ShieldCheck } from "lucide-react";
import { formatRut } from "@/lib/rut";
import { inputClass, ErrorBanner, SubmitButton, SectionTitle, FieldLabel } from "./ui";

export function RutForm({
  rutInput,
  setRutInput,
  busy,
  error,
  onSubmit,
}: {
  rutInput: string;
  setRutInput: (v: string) => void;
  busy: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <SectionTitle icon={<Fingerprint size={18} className="text-cyan-300" />}>
        Validar Identidad
      </SectionTitle>
      <p className="text-xs text-white/50">
        Ingresa tu RUT y luego el correo asociado. El acceso se valida con ambos datos juntos.
      </p>
      <div>
        <FieldLabel>RUT</FieldLabel>
        <div className="relative group">
          <Fingerprint
            size={16}
            className="absolute left-3.5 top-3 text-white/50 group-focus-within:text-cyan-300 transition-colors"
          />
          <input
            type="text"
            required
            value={rutInput}
            onChange={(e) => setRutInput(formatRut(e.target.value))}
            placeholder="12.345.678-9"
            maxLength={12}
            className={inputClass}
          />
        </div>
      </div>
      {error && <ErrorBanner error={error} />}
      <SubmitButton
        busy={busy}
        icon={<Fingerprint size={16} />}
        busyLabel="Validando..."
        label="Validar RUT"
      />

      <div className="mt-2 p-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md [box-shadow:inset_0_1px_0_0_rgba(255,255,255,0.05)]">
        <div className="flex items-start gap-2">
          <ShieldCheck size={15} className="mt-0.5 shrink-0 text-white/50" />
          <div className="space-y-1">
            <p className="text-xs font-semibold text-white/70">Aviso de Privacidad y Monitoreo</p>
            <p className="text-xs text-white/50">
              Esta etapa no confirma si un RUT está registrado. La validación se realiza junto con
              el correo en el siguiente paso. La solicitud previa al inicio de sesión no incluye
              ubicación GPS ni metadatos de huella del navegador, cookies, referrer, viewport o ID
              de dispositivo.
            </p>
            <div className="flex flex-wrap gap-3 mt-1.5">
              <span className="flex items-center gap-1 text-xs text-white/50">
                <ShieldCheck size={12} /> Datos protegidos
              </span>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
