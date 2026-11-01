import { SCAN_TYPES } from "./constants";
import type { QrScanType } from "@/lib/types";

interface ScanTypeSelectorProps {
  selectedType: QrScanType;
  scanning: boolean;
  onSelect: (type: QrScanType) => void;
}

export function ScanTypeSelector({ selectedType, scanning, onSelect }: ScanTypeSelectorProps) {
  return (
    <div className="mb-4">
      <p className="text-xs text-slate-400 mb-2 font-medium">Tipo de registro:</p>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {SCAN_TYPES.map((s) => {
          const Icon = s.icon;
          const isActive = selectedType === s.value;
          return (
            <button
              key={s.value}
              onClick={() => onSelect(s.value)}
              disabled={scanning}
              className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg border text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                isActive
                  ? `${s.bg} ${s.color} scale-105`
                  : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
              }`}
            >
              <Icon size={18} />
              <span className="text-[10px] leading-tight text-center">{s.label}</span>
            </button>
          );
        })}
      </div>
      {scanning && (
        <p className="text-[10px] text-amber-400/80 mt-1.5">
          Deten la camara para cambiar el tipo de registro.
        </p>
      )}
    </div>
  );
}
