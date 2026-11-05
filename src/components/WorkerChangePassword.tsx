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
import { callEdgeFunction } from "@/lib/edgeFunctions";
import {
  meetsPasswordPolicy,
  PASSWORD_POLICY_MESSAGE,
  ALLOWED_PASSWORD_SYMBOLS,
} from "@/lib/passwordPolicy";

interface Props {
  email: string;
  forced?: boolean;
  onSuccess?: () => void;
}

export function WorkerChangePassword({ email, forced = false, onSuccess }: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
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
    different: currentPassword.length > 0 && newPassword !== currentPassword,
  };
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
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
    if (currentPassword === newPassword) {
      setError("La nueva contraseña debe ser diferente a la actual.");
      return;
    }

    setBusy(true);
    try {
      const { error: fnError } = await callEdgeFunction("worker-auth", {
        action: "change_password",
        email,
        current_password: currentPassword,
        new_password: newPassword,
      });
      if (fnError) throw new Error(fnError);

      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cambiar la contraseña.");
    } finally {
      setBusy(false);
    }
  }

  if (success && !forced) {
    return (
      <Card>
        <CardHeader
          title="Cambiar Contraseña"
          action={<ShieldCheck size={18} className="text-emerald-600" />}
        />
        <div className="px-5 pb-5">
          <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Contraseña actualizada</p>
              <p className="text-xs text-emerald-600">
                Tu nueva contraseña es persistente y podrás usarla en futuros ingresos.
              </p>
            </div>
          </div>
          <button
            onClick={() => setSuccess(false)}
            className="mt-3 text-xs text-slate-500 hover:text-slate-700 font-medium"
          >
            Cambiar nuevamente
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title={forced ? "Configura tu contraseña definitiva" : "Cambiar Contraseña"}
        action={<KeyRound size={18} className={forced ? "text-amber-600" : "text-slate-400"} />}
      />
      <div className="px-5 pb-5">
        {forced && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-700 font-medium flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-600" />
            <span>
              Has ingresado con una contraseña temporal. Por seguridad, debes crear una contraseña
              nueva antes de continuar. Esta será tu contraseña persistente.
            </span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Contraseña Actual
            </label>
            <div className="relative group">
              <Lock
                size={16}
                className="absolute left-3.5 top-3 text-slate-400 group-focus-within:text-cyan-600 transition-colors"
              />
              <input
                type={showPasswords ? "text" : "password"}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Tu contraseña actual"
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-600/20 focus:border-cyan-600 focus:bg-white transition-all text-slate-800"
              />
            </div>
          </div>
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
                ...(!forced
                  ? [{ ok: pwChecks.different, label: "Diferente a la contraseña actual" }]
                  : []),
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
          {success && forced && (
            <div className="flex items-start gap-2.5 p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl text-xs font-medium text-emerald-700">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
              <span>Contraseña actualizada correctamente.</span>
            </div>
          )}
          <Button type="submit" variant="primary" disabled={busy} className="w-full">
            {busy ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Guardando...
              </>
            ) : (
              <>
                <CheckCircle2 size={15} /> {forced ? "Establecer Contraseña" : "Cambiar Contraseña"}
              </>
            )}
          </Button>
        </form>
      </div>
    </Card>
  );
}
