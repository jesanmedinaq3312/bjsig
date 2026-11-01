import { useState } from "react";
import { Copy, Check, KeyRound, X, ShieldCheck } from "lucide-react";
import { Modal, Button } from "@/components/ui";

interface CredentialModalProps {
  open: boolean;
  onClose: () => void;
  workerName?: string;
  rut?: string;
  email?: string;
  temporaryPassword?: string;
}

export function CredentialModal({
  open,
  onClose,
  workerName,
  rut,
  email,
  temporaryPassword,
}: CredentialModalProps) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const credentials = [
    { label: "RUT", value: rut },
    { label: "Correo", value: email },
    { label: "Contraseña temporal", value: temporaryPassword, isPassword: true },
  ].filter((c) => c.value);

  async function copyPassword() {
    if (!temporaryPassword) return;
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = temporaryPassword;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Modal open onClose={onClose} title="Credenciales del Portal del Trabajador" size="md">
      <div className="space-y-5">
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <ShieldCheck size={22} className="shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">
              Entrega estas credenciales al trabajador
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Anota esta información y entrégala al trabajador en papel. Por seguridad, esta
              contraseña no se volverá a mostrar.
            </p>
          </div>
        </div>

        {workerName && (
          <div className="text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Trabajador</p>
            <p className="text-lg font-bold text-slate-800">{workerName}</p>
          </div>
        )}

        <div className="space-y-3">
          {credentials.map((cred) => (
            <div
              key={cred.label}
              className="flex items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                  {cred.label}
                </p>
                <p
                  className={`text-sm font-mono text-slate-800 truncate ${cred.isPassword ? "font-bold" : ""}`}
                >
                  {cred.value}
                </p>
              </div>
              {cred.isPassword && (
                <button
                  onClick={copyPassword}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    copied
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-800 text-white hover:bg-slate-700 active:scale-95"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check size={14} /> Copiado
                    </>
                  ) : (
                    <>
                      <Copy size={14} /> Copiar
                    </>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>

        {!temporaryPassword && (
          <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <KeyRound size={16} className="shrink-0 text-blue-600 mt-0.5" />
            <p className="text-xs text-blue-800">
              La cuenta se creó con una contraseña definida por el administrador. No se genera una
              contraseña temporal.
            </p>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button onClick={onClose}>
            <X size={15} /> Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
