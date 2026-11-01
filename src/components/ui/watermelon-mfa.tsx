import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, Loader2, ScanLine, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";

interface WatermelonMfaCardProps {
  mode: "enroll" | "challenge";
  qrCode?: string;
  secret?: string;
  code: string;
  busy: boolean;
  error?: string | null;
  onCodeChange: (value: string) => void;
  onVerify: () => void;
  onCancel: () => void;
}

export function WatermelonMfaCard({
  mode,
  qrCode,
  secret,
  code,
  busy,
  error,
  onCodeChange,
  onVerify,
  onCancel,
}: WatermelonMfaCardProps) {
  const [copied, setCopied] = useState(false);
  const isEnroll = mode === "enroll";

  async function copySecret() {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="relative overflow-hidden rounded-[2rem] border border-violet-300/20 bg-slate-950/55 p-5 shadow-[0_24px_80px_rgba(76,29,149,0.28)] backdrop-blur-xl"
      aria-labelledby="mfa-title"
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-fuchsia-500/20 blur-3xl"
        animate={{ scale: [1, 1.14, 1], opacity: [0.45, 0.7, 0.45] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 -right-16 h-52 w-52 rounded-full bg-cyan-400/15 blur-3xl"
        animate={{ scale: [1.08, 1, 1.08], opacity: [0.35, 0.65, 0.35] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative space-y-4">
        <div className="flex items-center justify-center gap-2 text-violet-100">
          <motion.div
            initial={{ rotate: -12, scale: 0.8 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 16 }}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-300/25 bg-violet-400/15 text-violet-200 shadow-[0_0_30px_rgba(167,139,250,0.25)]"
          >
            <ShieldCheck size={21} />
          </motion.div>
          <div>
            <h2 id="mfa-title" className="text-left text-base font-bold">
              Verificación MFA requerida
            </h2>
            <p className="text-left text-[11px] text-white/50">
              Protección activa para tu sesión administrativa
            </p>
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {isEnroll ? (
            <motion.div
              key="enroll"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              className="space-y-3"
            >
              <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                {[
                  ["1", "Abre Authenticator"],
                  ["2", "Escanea el QR"],
                  ["3", "Escribe 6 dígitos"],
                ].map(([step, label]) => (
                  <div
                    key={step}
                    className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/65"
                  >
                    <span className="mx-auto flex h-5 w-5 items-center justify-center rounded-full bg-violet-400/20 font-black text-violet-200">
                      {step}
                    </span>
                    <span className="mt-1 block leading-4">{label}</span>
                  </div>
                ))}
              </div>
              <p className="text-center text-xs leading-relaxed text-white/65">
                Usa Microsoft Authenticator o cualquier aplicación TOTP. El QR se vincula una sola
                vez.
              </p>
              <div className="relative mx-auto w-fit rounded-[1.35rem] border border-white/20 bg-white/95 p-3 shadow-[0_0_45px_rgba(167,139,250,0.28)]">
                <motion.div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-2 z-10 h-px bg-gradient-to-r from-transparent via-violet-500 to-transparent shadow-[0_0_12px_rgba(139,92,246,0.95)]"
                  animate={{ top: [10, 164, 10] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                />
                <img
                  src={qrCode}
                  alt="Paso 2: escanea este QR para configurar MFA TOTP"
                  className="h-40 w-40 rounded-lg"
                />
                <div className="mt-2 flex items-center justify-center gap-1 text-[10px] font-semibold text-slate-600">
                  <ScanLine size={12} className="text-violet-600" /> Escanea para vincular
                </div>
              </div>
              {secret && (
                <button
                  type="button"
                  onClick={() => void copySecret()}
                  className="group mx-auto flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[10px] text-white/55 transition hover:border-violet-300/35 hover:bg-violet-400/10 hover:text-violet-100"
                >
                  {copied ? <Check size={13} className="text-emerald-300" /> : <Copy size={13} />}
                  <span className="max-w-[220px] truncate">
                    {copied ? "Clave copiada" : `Clave manual: ${secret}`}
                  </span>
                </button>
              )}
            </motion.div>
          ) : (
            <motion.p
              key="challenge"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              className="text-center text-xs leading-relaxed text-white/65"
            >
              Ingresa el código actual de tu aplicación autenticadora.
            </motion.p>
          )}
        </AnimatePresence>

        <div className="space-y-3">
          <label htmlFor="mfa-code" className="sr-only">
            Código MFA de seis dígitos
          </label>
          <motion.input
            id="mfa-code"
            value={code}
            onChange={(event) => onCodeChange(event.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            whileFocus={{ scale: 1.015 }}
            className="w-full rounded-2xl border border-white/15 bg-white/10 px-3 py-3 text-center text-lg tracking-[0.35em] text-white outline-none transition focus:border-violet-300/70 focus:bg-white/15 focus:ring-4 focus:ring-violet-400/10"
          />
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center text-xs text-rose-300"
            >
              {error}
            </motion.p>
          )}
          <motion.button
            type="button"
            disabled={busy || code.length !== 6}
            onClick={onVerify}
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.975 }}
            className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(139,92,246,0.28)] transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            <motion.span
              aria-hidden="true"
              className="absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-18deg] bg-white/25 blur-md"
              animate={{ left: ["-35%", "125%"] }}
              transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.4, ease: "easeInOut" }}
            />
            <span className="relative flex items-center gap-2">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {busy ? "Verificando…" : "Verificar MFA"}
            </span>
          </motion.button>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="w-full text-xs text-white/50 transition hover:text-white/85 disabled:opacity-50"
          >
            Cancelar y cerrar sesión
          </button>
        </div>
      </div>
    </motion.section>
  );
}
