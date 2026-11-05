import { useState } from "react";
import {
  Lock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Card, CardHeader, Button } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import {
  ALLOWED_PASSWORD_SYMBOLS,
  meetsPasswordPolicy,
  PASSWORD_POLICY_MESSAGE,
} from "@/lib/passwordPolicy";

interface Props {
  email: string;
  onSuccess?: () => void;
}

export function WorkerRecoveryPassword({ email, onSuccess }: Props) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const pwChecks = {
    length: newPassword.length >= 8,
    upper: /[A-Z]/.test(newPassword),
    lower: /[a-z]/.test(newPassword),
    number: /\d/.test(newPassword),
    symbol: [...newPassword].some((character) => ALLOWED_PASSWORD_SYMBOLS.includes(character)),
    match: newPassword.length > 0 && newPassword === confirmPassword,
  };
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!newPassword || !confirmPassword) {
      setError("Todos los campos son obligatorios.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (!meetsPasswordPolicy(newPassword)) {
      setError(PASSWORD_POLICY_MESSAGE);
      return;
    }

    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      setSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al restablecer la contraseña.");
    } finally {
      setBusy(false);
    }
  }

  if (success) {
    return (
      <Card>
        <CardHeader
          title="Contraseña Restablecida"
          action={<ShieldCheck size={18} className="text-emerald-600" />}
        />
        <div className="px-5 pb-5">
          <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">
                Tu contraseña ha sido actualizada
              </p>
              <p className="text-xs text-emerald-600">
                Ya puedes usar tu nueva contraseña para ingresar al portal.
              </p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Restablecer Contraseña"
        action={<KeyRound size={18} className="text-cyan-600" />}
      />
      <div className="px-5 pb-5">
        <div className="mb-4 p-3 bg-cyan-50 border border-cyan-200/80 rounded-xl text-xs text-cyan-700 font-medium flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-cyan-600" />
          <span>
            Has solicitado restablecer tu contraseña para <strong>{email}</strong>. Ingresa tu nueva
            contraseña a continuación.
          </span>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nueva Contraseña
            </label>
            <div className="relative group">
              <Lock
                size={16}
                className="absolute left-3.5 top-3 text-slate-400 group-focus-within:text-cyan-600 transition-colors"
              />
              <input
                type={showPasswords ? "text" : "password"}
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-600/20 focus:border-cyan-600 focus:bg-white transition-all text-slate-800"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Confirmar Contraseña
            </label>
            <div className="relative group">
              <Lock
                size={16}
                className="absolute left-3.5 top-3 text-slate-400 group-focus-within:text-cyan-600 transition-colors"
              />
              <input
                type={showPasswords ? "text" : "password"}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite tu nueva contraseña"
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-600/20 focus:border-cyan-600 focus:bg-white transition-all text-slate-800"
              />
            </div>
          </div>
          {error && (
            <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200/80 rounded-xl text-xs font-medium text-red-700">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}
          {newPassword.length > 0 && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                Requisitos de contraseña
              </p>
              {[
                { ok: pwChecks.length, label: "Mínimo 8 caracteres" },
                { ok: pwChecks.upper, label: "Al menos una mayúscula" },
                { ok: pwChecks.lower, label: "Al menos una minúscula" },
                { ok: pwChecks.number, label: "Al menos un número" },
                { ok: pwChecks.symbol, label: "Al menos un símbolo permitido" },
                { ok: pwChecks.match, label: "Las contraseñas coinciden" },
              ].map((req) => (
                <div
                  key={req.label}
                  className={`flex items-center gap-2 text-xs ${req.ok ? "text-emerald-600" : "text-slate-400"}`}
                >
                  {req.ok ? (
                    <CheckCircle2 size={13} className="shrink-0" />
                  ) : (
                    <AlertCircle size={13} className="shrink-0" />
                  )}
                  <span>{req.label}</span>
                </div>
              ))}
            </div>
          )}
          <Button type="submit" variant="primary" disabled={busy} className="w-full">
            {busy ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Guardando...
              </>
            ) : (
              <>
                <CheckCircle2 size={15} /> Restablecer Contraseña
              </>
            )}
          </Button>
        </form>
      </div>
    </Card>
  );
}
