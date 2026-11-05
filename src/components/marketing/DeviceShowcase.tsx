import {
  BadgeCheck,
  CheckCircle2,
  Clock3,
  PackageCheck,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { DashboardPreview } from "@/views/PublicLanding";

/**
 * Ilustración UI hecha con CSS y HTML para que las tres pantallas muestren
 * flujos reconocibles, sin depender de imágenes stock ni texto generado.
 */
export function DeviceShowcase() {
  return (
    <div
      className="device-showcase-stage relative mx-auto w-full max-w-[760px] px-1 pb-20 pt-12 sm:pb-24 sm:pt-14"
      role="group"
      aria-labelledby="device-showcase-caption"
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-[12%] top-[16%] h-[55%] rounded-full bg-sky-400/15 blur-3xl"
      />
      <div id="device-showcase-caption" className="device-showcase-caption absolute left-1/2 top-0 z-30 -translate-x-1/2 whitespace-nowrap rounded-full border border-sky-200/20 bg-slate-950/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-sky-100 shadow-lg sm:text-[11px]">
        Una operación · todas tus pantallas
      </div>

      <div className="device-laptop relative z-10 mx-auto w-[90%] sm:w-[88%]">
        <div className="device-laptop-lid relative rounded-t-[1.1rem] border-[5px] border-slate-800 bg-slate-900 p-[3px] shadow-[0_30px_70px_-28px_rgba(0,0,0,0.85)] sm:rounded-t-[1.35rem] sm:border-[7px] sm:p-1.5">
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-1 z-20 h-1 w-1 -translate-x-1/2 rounded-full bg-slate-500 sm:top-1.5 sm:h-1.5 sm:w-1.5"
          />
          <div className="overflow-hidden rounded-t-lg bg-white sm:rounded-t-xl">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-2 py-1.5 sm:px-3 sm:py-2">
              <div className="flex min-w-0 items-center gap-1.5 text-[8px] font-extrabold text-slate-800 sm:gap-2 sm:text-[10px]">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-blue-700 text-white sm:h-5 sm:w-5">
                  <ShieldCheck size={11} aria-hidden="true" />
                </span>
                <span className="truncate">BJSIGAPP · Gestión empresarial</span>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[7px] font-bold text-emerald-700 sm:text-[9px]">
                DEMO INTERACTIVA
              </span>
            </div>
            <div className="device-laptop-screen-content">
              <DashboardPreview />
            </div>
          </div>
        </div>
        <div
          aria-hidden="true"
          className="mx-auto h-2 w-[106%] -translate-x-[3%] rounded-b-[70%] border-x border-b border-slate-300/70 bg-gradient-to-b from-slate-300 via-slate-400 to-slate-500 shadow-xl sm:h-3"
        >
          <div className="mx-auto h-1 w-[24%] rounded-b-lg bg-slate-500/70 sm:h-1.5" />
        </div>
        <p className="mt-1 text-center text-[8px] font-bold text-slate-300 sm:text-[10px]">
          Panel central · módulos y sucursales
        </p>
      </div>

      <div
        className="device-tablet absolute bottom-[10%] left-[0%] z-20 w-[24%] max-w-[190px] -rotate-[5deg] rounded-[1.35rem] border-[5px] border-slate-800 bg-slate-900 p-1.5 shadow-[0_24px_50px_-22px_rgba(0,0,0,0.8)] sm:bottom-[11%] sm:left-[1%] sm:w-[30%] sm:rounded-[1.7rem] sm:border-[7px] sm:p-2"
        role="img"
        aria-label="Demo ilustrativa en tablet: registro de asistencia por QR simbólico, no escaneable"
      >
        <div className="relative aspect-[0.76] overflow-hidden rounded-[1rem] bg-slate-50 p-2 text-slate-900 sm:rounded-[1.25rem] sm:p-3">
          <div className="flex items-center justify-between gap-1 border-b border-slate-200 pb-2">
            <span className="truncate text-[7px] font-black text-slate-900 sm:text-[9px]">
              BJSIGAPP · Terreno
            </span>
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[6px] font-extrabold text-emerald-800 sm:text-[8px]">
              DEMO
            </span>
          </div>
          <div className="mt-2 flex items-start justify-between gap-1">
            <div>
              <p className="text-[6px] font-bold uppercase tracking-wide text-slate-500 sm:text-[8px]">
                Asistencia por QR
              </p>
              <p className="mt-0.5 text-[8px] font-black text-slate-900 sm:text-[11px]">
                Sucursal Norte
              </p>
            </div>
            <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-blue-100 text-blue-700 sm:h-7 sm:w-7">
              <QrCode size={14} aria-hidden="true" />
            </span>
          </div>
          <div className="mt-2 rounded-lg border border-dashed border-blue-300 bg-blue-50 p-2 text-center sm:mt-3 sm:rounded-xl sm:p-3">
            <QrCode className="mx-auto text-blue-800" size={25} aria-hidden="true" />
            <p className="mt-1 text-[6px] font-extrabold text-blue-900 sm:text-[8px]">
              QR ilustrativo · no escaneable
            </p>
          </div>
          <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 p-1.5 sm:mt-3 sm:gap-2 sm:rounded-xl sm:p-2">
            <CheckCircle2 size={13} className="shrink-0 text-emerald-700" aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate text-[6px] font-extrabold text-emerald-900 sm:text-[8px]">
                Entrada registrada
              </p>
              <p className="text-[6px] text-emerald-800 sm:text-[8px]">08:12 · En terreno</p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[6px] font-semibold text-slate-500 sm:text-[8px]">
            <Clock3 size={10} aria-hidden="true" /> Registro vinculado a la sede
          </div>
        </div>
      </div>

      <div
        className="device-phone absolute bottom-[7%] right-[2%] z-30 w-[16%] min-w-[70px] max-w-[126px] rotate-[5deg] rounded-[1.35rem] border-[5px] border-slate-800 bg-slate-900 p-1 shadow-[0_24px_50px_-20px_rgba(0,0,0,0.9)] sm:bottom-[8%] sm:right-[0%] sm:w-[19%] sm:rounded-[1.7rem] sm:border-[7px] sm:p-1.5"
        role="img"
        aria-label="Demo ilustrativa en teléfono: flujo de entrega y recepción de EPP"
      >
        <div className="relative aspect-[0.52] overflow-hidden rounded-[1rem] bg-white px-1.5 pb-2 pt-3 text-slate-900 sm:rounded-[1.25rem] sm:px-2 sm:pb-3 sm:pt-4">
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-1 h-1 w-5 -translate-x-1/2 rounded-full bg-slate-800 sm:top-1.5 sm:h-1.5 sm:w-7"
          />
          <div className="flex items-center gap-1 border-b border-slate-100 pb-1.5 sm:gap-1.5 sm:pb-2">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-blue-700 text-white sm:h-5 sm:w-5">
              <ShieldCheck size={10} aria-hidden="true" />
            </span>
            <span className="truncate text-[6px] font-black sm:text-[8px]">BJSIGAPP</span>
          </div>
          <div className="mt-2">
            <p className="text-[6px] font-bold uppercase leading-tight tracking-wide text-blue-700 sm:text-[8px]">
              Seguridad · EPP
            </p>
            <h3 className="mt-0.5 text-[8px] font-black leading-tight text-slate-900 sm:text-[11px]">
              Entrega de EPP
            </h3>
            <p className="mt-0.5 truncate text-[6px] text-slate-500 sm:text-[8px]">
              Colaborador · Sede Norte
            </p>
          </div>
          <div className="mt-2 space-y-1 sm:mt-3 sm:space-y-1.5">
            {[
              ["Casco", "Talla M"],
              ["Guantes", "Par asignado"],
              ["Chaleco", "Alta visibilidad"],
            ].map(([item, detail]) => (
              <div
                key={item}
                className="flex items-center gap-1 rounded-md border border-slate-100 bg-slate-50 p-1 sm:gap-1.5 sm:rounded-lg sm:p-1.5"
              >
                <CheckCircle2
                  size={9}
                  className="shrink-0 text-emerald-600 sm:h-3 sm:w-3"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="truncate text-[6px] font-extrabold text-slate-800 sm:text-[8px]">
                    {item}
                  </p>
                  <p className="truncate text-[5px] text-slate-500 sm:text-[7px]">{detail}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 rounded-md bg-blue-700 px-1.5 py-1.5 text-center text-[6px] font-extrabold text-white sm:mt-3 sm:rounded-lg sm:px-2 sm:py-2 sm:text-[8px]">
            <span className="inline-flex items-center justify-center gap-1">
              <PackageCheck size={10} aria-hidden="true" /> Confirmar recepción
            </span>
          </div>
          <p className="mt-1.5 flex items-center justify-center gap-1 text-[5px] font-semibold text-slate-500 sm:mt-2 sm:text-[7px]">
            <BadgeCheck size={9} aria-hidden="true" /> Registro demostrativo
          </p>
        </div>
      </div>

      <div className="sr-only">
        El panel interactivo de la laptop permite explorar módulos y sucursales. La tablet ilustra
        el registro de asistencia mediante QR en terreno y el teléfono ilustra el flujo de entrega
        y recepción de equipos de protección personal.
      </div>
    </div>
  );
}
