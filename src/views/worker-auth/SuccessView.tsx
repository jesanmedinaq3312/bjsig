import { CheckCircle2, ArrowRight } from "lucide-react";
import { submitButtonClass } from "./ui";

export function SuccessView({
  successMsg,
  onContinue,
}: {
  successMsg: string;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-5 text-center py-4">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/15 backdrop-blur-md border border-emerald-400/25 flex items-center justify-center [box-shadow:inset_0_1px_0_0_rgba(255,255,255,0.1)]">
        <CheckCircle2 size={32} className="text-emerald-300" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-white/90 mb-1">Listo</h2>
        <p className="text-sm text-white/50">{successMsg}</p>
      </div>
      <button onClick={onContinue} className={submitButtonClass}>
        Iniciar Sesión <ArrowRight size={16} />
      </button>
    </div>
  );
}
