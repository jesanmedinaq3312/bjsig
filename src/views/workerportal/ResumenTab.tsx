import { QrCode, Clock, Download, Sparkles } from "lucide-react";
import { Card, CardHeader, Button, Badge, EmptyState, Spinner } from "@/components/ui";
import type { WorkerPortalData } from "@/hooks/useWorkerData";
import { Section, ChangePasswordSection, GdprDataSection } from "./components";

export function ResumenTab({
  data,
  workerRut,
  workerEmail,
  isPreview,
  fullName,
  qrDataUrl,
  downloadQr,
  qrRef,
}: {
  data: WorkerPortalData;
  workerRut: string;
  workerEmail: string;
  isPreview: boolean;
  fullName: string;
  qrDataUrl: string;
  downloadQr: () => void;
  qrRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="space-y-6 animate-view-enter">
      <Card className="overflow-hidden">
        <CardHeader
          title="Mi Codigo QR de Asistencia"
          action={<QrCode size={18} className="text-slate-400" />}
        />
        <div className="px-5 pb-5">
          <div className="flex flex-col items-center gap-3">
            <div
              ref={qrRef}
              className="p-4 bg-white rounded-2xl border-2 border-slate-200 shadow-lg transition-shadow hover:shadow-xl"
            >
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR de asistencia" className="w-44 h-44" />
              ) : (
                <div className="w-44 h-44 flex items-center justify-center">
                  <Spinner />
                </div>
              )}
            </div>
            <p className="text-sm text-slate-500 text-center max-w-sm">
              Presenta este codigo QR a tu supervisor para registrar tu entrada, salida o almuerzo.
            </p>
            {qrDataUrl && (
              <Button variant="outline" size="sm" onClick={downloadQr}>
                <Download size={14} /> Descargar QR
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Section icon={<Clock size={18} className="text-slate-400" />} title="Mi Turno Actual">
        {(() => {
          const activeAssignments = data.assignments.filter((a) => a.active === true);
          if (activeAssignments.length === 0)
            return (
              <EmptyState
                message="No tienes un turno asignado actualmente."
                icon={<Clock size={28} />}
              />
            );
          return (
            <div className="space-y-3">
              {activeAssignments.map((a) => {
                const def = data.shift_definitions.find((d) => d.id === a.shift_definition_id);
                const color = (def?.color as string) ?? "#3b82f6";
                return (
                  <div
                    key={a.id as string}
                    className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 transition-all hover:shadow-md"
                    style={{
                      backgroundColor: color + "0D",
                      borderLeftWidth: 4,
                      borderLeftColor: color,
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-sm"
                      style={{ backgroundColor: color }}
                    >
                      <Clock size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800">
                        {(a.shift_name as string) ?? "Turno"}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                        {def?.start_time && def?.end_time && (
                          <span>
                            {def.start_time as string} - {def.end_time as string}
                          </span>
                        )}
                        <span>Desde {a.start_date as string}</span>
                        {a.end_date && <span>Hasta {a.end_date as string}</span>}
                        {a.swap_with_rut && (
                          <span className="text-amber-600 font-medium">Intercambio programado</span>
                        )}
                      </div>
                      {a.days_of_week &&
                        Array.isArray(a.days_of_week) &&
                        a.days_of_week.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <span className="text-xs text-slate-400">Dias:</span>
                            {(["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"] as const).map(
                              (label, idx) => {
                                const dayNum = idx + 1;
                                const active = a.days_of_week!.includes(dayNum);
                                return (
                                  <span
                                    key={label}
                                    className={`px-2 py-0.5 rounded text-xs font-medium border transition-all ${active ? "text-white border-transparent shadow-sm" : "text-slate-400 border-slate-200 bg-slate-50"}`}
                                    style={active ? { backgroundColor: color } : undefined}
                                  >
                                    {label}
                                  </span>
                                );
                              },
                            )}
                          </div>
                        )}
                      {a.change_reason && (
                        <p className="text-xs text-slate-400 italic mt-1">
                          {a.change_reason as string}
                        </p>
                      )}
                    </div>
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      Activo
                    </Badge>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </Section>

      {!isPreview && <ChangePasswordSection email={workerEmail} />}
      <GdprDataSection workerRut={workerRut} data={data} fullName={fullName} />
    </div>
  );
}
