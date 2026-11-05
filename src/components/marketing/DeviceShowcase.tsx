import { BadgeCheck, CheckCircle2, PackageCheck, ShieldCheck } from "lucide-react";
import { useState } from "react";
import {
  DashboardPreview,
  getPreviewScopeLabel,
  PreviewNavigation,
  previewViews,
  type PreviewScope,
} from "@/views/PublicLanding";

/** Pantallas HTML ilustrativas: cambian juntas al elegir área o sucursal. */
export function DeviceShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [scope, setScope] = useState<PreviewScope>("all");
  const activeView = previewViews[activeIndex];
  const scopeLabel = getPreviewScopeLabel(scope);

  return (
    <div className="w-full" role="group" aria-label="Demo ilustrativa en tres dispositivos">
      <PreviewNavigation compact activeIndex={activeIndex} onSelect={setActiveIndex} />

      <div className="device-showcase-stage relative mx-auto w-full max-w-[900px] pb-16 pt-6 sm:pb-20 sm:pt-8">
        <div className="device-laptop relative z-10 mx-auto w-[96%]">
          <div className="device-laptop-lid relative rounded-t-[1rem] border-[5px] border-slate-800 bg-slate-900 p-[3px] sm:rounded-t-[1.3rem] sm:border-[7px] sm:p-1.5">
            <span
              aria-hidden="true"
              className="absolute left-1/2 top-1 z-20 h-1 w-1 -translate-x-1/2 rounded-full bg-slate-500 sm:top-1.5 sm:h-1.5 sm:w-1.5"
            />
            <div className="overflow-hidden rounded-t-lg bg-white sm:rounded-t-xl">
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-2 py-1.5 sm:px-3 sm:py-2">
                <div className="flex min-w-0 items-center gap-1.5 text-[8px] font-semibold text-slate-800 sm:gap-2 sm:text-[10px]">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-blue-700 text-white sm:h-5 sm:w-5">
                    <ShieldCheck size={11} aria-hidden="true" />
                  </span>
                  <span className="truncate">BJSIGAPP · Gestión empresarial</span>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-semibold text-emerald-800 sm:text-[10px]">
                  Datos de ejemplo
                </span>
              </div>
              <div className="device-laptop-screen-content">
                <DashboardPreview
                  activeIndex={activeIndex}
                  scope={scope}
                  onScopeChange={setScope}
                />
              </div>
            </div>
          </div>
          <div
            aria-hidden="true"
            className="mx-auto h-2 w-[104%] -translate-x-[2%] rounded-b-[70%] border-x border-b border-slate-300/70 bg-slate-400 shadow-xl sm:h-3"
          >
            <div className="mx-auto h-1 w-[24%] rounded-b-lg bg-slate-500/70 sm:h-1.5" />
          </div>
        </div>

        <div
          className="device-tablet absolute bottom-0 left-[1%] z-20 w-[46%] max-w-[300px] -rotate-[3deg] rounded-[1.2rem] border-[5px] border-slate-800 bg-slate-900 p-1.5 shadow-[0_18px_42px_-22px_rgba(0,0,0,0.8)] sm:left-[2%] sm:w-[32%] sm:max-w-[280px] sm:rounded-[1.6rem] sm:border-[7px] sm:p-2"
          role="img"
          data-ui="tablet-preview"
          aria-label={`Tablet: ${activeView.label}, ${scopeLabel}`}
        >
          <div className="aspect-[1.3] overflow-hidden rounded-[0.9rem] bg-slate-50 p-1.5 text-slate-900 sm:rounded-[1.15rem] sm:p-3">
            <div className="flex items-center justify-between gap-1 border-b border-slate-200 pb-1 sm:pb-2">
              <span className="truncate text-[8px] font-semibold sm:text-[10px]">BJSIGAPP</span>
              <span className="rounded bg-emerald-100 px-1 py-0.5 text-[7px] font-semibold text-emerald-800 sm:text-[8px]">
                Ejemplo
              </span>
            </div>
            <p className="mt-1 truncate text-[8px] font-semibold text-blue-700 sm:mt-2 sm:text-[10px]">
              {activeView.label}
            </p>
            <h3 className="mt-0.5 line-clamp-2 text-[9px] font-semibold leading-tight sm:text-xs">
              {activeView.title}
            </h3>
            <p className="mt-1 truncate text-[8px] text-slate-500 sm:text-[9px]">{scopeLabel}</p>
            <div className="mt-1 space-y-1 sm:mt-3 sm:space-y-1.5">
              {activeView.modules.slice(0, 2).map((module, index) => (
                <div
                  key={module}
                  className={`flex min-h-5 items-center gap-1 rounded-md bg-white px-1.5 py-1 text-[8px] text-slate-700 sm:min-h-7 sm:gap-1.5 sm:px-2 sm:text-[9px] ${index === 1 ? "hidden sm:flex" : ""}`}
                >
                  <CheckCircle2
                    size={10}
                    className="shrink-0 text-blue-700 sm:h-3 sm:w-3"
                    aria-hidden="true"
                  />
                  <span className="truncate">{module}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          className="device-phone absolute bottom-[3%] right-[1%] z-30 w-[34%] min-w-[120px] max-w-[180px] rotate-[3deg] rounded-[1.2rem] border-[5px] border-slate-800 bg-slate-900 p-1 shadow-[0_18px_42px_-22px_rgba(0,0,0,0.85)] sm:right-[2%] sm:w-[21%] sm:min-w-[140px] sm:max-w-[170px] sm:rounded-[1.6rem] sm:border-[7px] sm:p-1.5"
          role="img"
          data-ui="phone-preview"
          aria-label={`Teléfono: ${activeView.label}, ${scopeLabel}`}
        >
          <div className="relative aspect-[0.52] overflow-hidden rounded-[0.9rem] bg-white px-1.5 pb-2 pt-3 text-slate-900 sm:rounded-[1.15rem] sm:px-2 sm:pb-3 sm:pt-4">
            <span
              aria-hidden="true"
              className="absolute left-1/2 top-1 h-1 w-5 -translate-x-1/2 rounded-full bg-slate-800 sm:top-1.5 sm:h-1.5 sm:w-7"
            />
            <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 sm:gap-1.5 sm:pb-2">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-blue-700 text-white sm:h-5 sm:w-5">
                <ShieldCheck size={10} aria-hidden="true" />
              </span>
              <span className="truncate text-[8px] font-semibold sm:text-[10px]">BJSIGAPP</span>
            </div>
            <div className="mt-2">
              <p className="truncate text-[8px] font-semibold text-blue-700 sm:text-[10px]">
                {activeView.label}
              </p>
              <h3 className="mt-0.5 truncate text-[10px] font-semibold sm:text-xs">
                {activeView.modules[0]}
              </h3>
              <p className="mt-0.5 truncate text-[8px] text-slate-500 sm:text-[9px]">
                {scopeLabel}
              </p>
            </div>
            <div className="mt-2 space-y-1 sm:mt-3 sm:space-y-1.5">
              {activeView.modules.slice(1, 3).map((module) => (
                <div
                  key={module}
                  className="flex items-center gap-1 rounded-md bg-slate-50 p-1 sm:gap-1.5 sm:rounded-lg sm:p-1.5"
                >
                  <CheckCircle2
                    size={9}
                    className="shrink-0 text-emerald-600 sm:h-3 sm:w-3"
                    aria-hidden="true"
                  />
                  <span className="truncate text-[8px] font-medium text-slate-700 sm:text-[9px]">
                    {module}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2 rounded-md bg-blue-700 px-1.5 py-1.5 text-center text-[8px] font-semibold text-white sm:mt-3 sm:rounded-lg sm:px-2 sm:py-2 sm:text-[9px]">
              <span className="inline-flex items-center justify-center gap-1">
                <PackageCheck size={10} aria-hidden="true" /> Vista de ejemplo
              </span>
            </div>
            <p className="mt-1.5 flex items-center justify-center gap-1 text-[7px] font-medium text-slate-500 sm:mt-2 sm:text-[8px]">
              <BadgeCheck size={9} aria-hidden="true" /> Datos ilustrativos
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
