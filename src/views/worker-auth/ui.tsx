import type { ReactNode } from "react";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";

export const inputClass =
  "w-full pl-10 pr-3.5 py-2.5 text-sm bg-white/5 border border-white/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400/50 focus:bg-white/10 transition-all text-white placeholder:text-white/40 disabled:opacity-50 disabled:cursor-not-allowed [box-shadow:inset_0_1px_0_0_rgba(255,255,255,0.05)]";

export const inputWithButtonClass =
  "w-full pl-10 pr-10 py-2.5 text-sm bg-white/5 border border-white/15 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-400/50 focus:bg-white/10 transition-all text-white placeholder:text-white/40 disabled:opacity-50 disabled:cursor-not-allowed [box-shadow:inset_0_1px_0_0_rgba(255,255,255,0.05)]";

export const submitButtonClass =
  "w-full py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-sm font-semibold rounded-xl hover:from-cyan-400 hover:to-teal-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 transition-all duration-200 disabled:opacity-50 shadow-lg shadow-cyan-600/25 flex items-center justify-center gap-2 active:scale-[0.99] [box-shadow:inset_0_1px_0_0_rgba(255,255,255,0.2)]";

export function ErrorBanner({ error }: { error: string }) {
  return (
    <div className="flex items-start gap-2.5 p-3 bg-red-500/10 backdrop-blur-md border border-red-400/20 rounded-xl text-xs font-medium text-red-300 [box-shadow:inset_0_1px_0_0_rgba(255,255,255,0.05)]">
      <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
      <div className="flex-1">
        <span>{error}</span>
        {error.includes("administrador") && (
          <a
            href="/admin"
            className="block mt-1.5 text-blue-300 hover:text-blue-200 font-semibold flex items-center gap-1"
          >
            Ir al panel de administración <ArrowRight size={13} />
          </a>
        )}
      </div>
    </div>
  );
}

export function SubmitButton({
  busy,
  icon,
  busyLabel,
  label,
}: {
  busy: boolean;
  icon: ReactNode;
  busyLabel: string;
  label: string;
}) {
  return (
    <button type="submit" disabled={busy} className={submitButtonClass}>
      {busy ? (
        <>
          <Loader2 size={16} className="animate-spin" /> {busyLabel}
        </>
      ) : (
        <>
          {icon} {label}
        </>
      )}
    </button>
  );
}

export function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-xs text-white/50 hover:text-white/80 font-medium flex items-center justify-center gap-1"
    >
      <ArrowRight size={13} className="rotate-180" /> {label}
    </button>
  );
}

export function SectionTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <h2 className="text-sm font-bold text-white/90">{children}</h2>
    </div>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="block text-xs font-semibold text-white/80 mb-1.5">{children}</label>;
}
