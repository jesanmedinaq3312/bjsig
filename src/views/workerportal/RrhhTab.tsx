import {
  GraduationCap,
  Wallet,
  Target,
  FileText,
  TrendingUp,
  MapPin,
  Clock,
  User,
  CalendarDays,
  MessageSquare,
  ThumbsUp,
  Lightbulb,
  AlertTriangle,
  Building2,
} from "lucide-react";
import { Badge, EmptyState } from "@/components/ui";
import { WorkerBankAccountForm } from "@/components/WorkerBankAccountForm";
import type { WorkerPortalData } from "@/hooks/useWorkerData";
import { Section } from "./components";

function feedbackTypeIcon(type: string) {
  if (type === "positivo") return <ThumbsUp size={14} className="text-emerald-600" />;
  if (type === "constructivo") return <Lightbulb size={14} className="text-amber-600" />;
  return <AlertTriangle size={14} className="text-red-600" />;
}

function feedbackTypeColor(type: string) {
  if (type === "positivo") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (type === "constructivo") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}

export function RrhhTab({ data }: { data: WorkerPortalData }) {
  return (
    <div className="space-y-6">
      <Section
        icon={<Building2 size={18} className="text-slate-400" />}
        title="Mis Datos Bancarios"
      >
        {data.profile ? (
          <WorkerBankAccountForm
            workerRut={data.profile.rut}
            workerName={data.profile.full_name}
            compact
          />
        ) : (
          <EmptyState message="No se pudieron cargar tus datos." icon={<Building2 size={28} />} />
        )}
      </Section>

      <Section
        icon={<GraduationCap size={18} className="text-slate-400" />}
        title="Mis Capacitaciones"
      >
        {data.trainings.length === 0 ? (
          <EmptyState
            message="No tienes capacitaciones asignadas."
            icon={<GraduationCap size={28} />}
          />
        ) : (
          <div className="space-y-3">
            {data.trainings.slice(0, 8).map((t) => {
              const att = data.attendance.find((a) => a.training_id === t.id);
              return (
                <div key={t.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{t.topic}</p>
                    </div>
                    <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                      {att ? "Completada" : "Programada"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mt-2">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <CalendarDays size={13} className="text-slate-400" />
                      <span>{t.date}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Clock size={13} className="text-slate-400" />
                      <span>{t.scheduled_time ?? "Horario por confirmar"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <MapPin size={13} className="text-slate-400" />
                      <span className="truncate">{t.location ?? "Lugar por confirmar"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <User size={13} className="text-slate-400" />
                      <span className="truncate">{t.trainer}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                    <span>
                      Duración: <strong className="text-slate-700">{t.hours} hrs</strong>
                    </span>
                    {att && (
                      <span>
                        Completadas:{" "}
                        <strong className="text-slate-700">{att.completed_hours} hrs</strong>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section icon={<Wallet size={18} className="text-slate-400" />} title="Mis Liquidaciones">
        {data.payroll_items.length === 0 ? (
          <EmptyState message="No tienes liquidaciones disponibles." icon={<Wallet size={28} />} />
        ) : (
          <div className="space-y-2">
            {data.payroll_items.slice(0, 6).map((item) => {
              const period = data.payroll_periods.find((pp) => pp.id === item.period_id);
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 border border-slate-100"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {period ? period.period_label : "Liquidación"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {period ? `${period.start_date} — ${period.end_date}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-800">
                      ${item.net_pay?.toLocaleString("es-CL") ?? "—"}
                    </p>
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      {item.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section icon={<Target size={18} className="text-slate-400" />} title="Mi Desempeño">
        {data.evaluations.length === 0 && data.objectives.length === 0 ? (
          <EmptyState
            message="No hay evaluaciones de desempeño registradas."
            icon={<Target size={28} />}
          />
        ) : (
          <div className="space-y-4">
            {data.evaluations.slice(0, 4).map((ev) => (
              <div
                key={ev.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 border border-slate-100"
              >
                <div>
                  <p className="text-sm font-medium text-slate-700">{ev.evaluation_date}</p>
                  <p className="text-xs text-slate-400">{ev.evaluator ?? ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-blue-600" />
                  <span className="text-sm font-bold text-slate-800">
                    {ev.score?.toFixed(1) ?? "—"}
                  </span>
                </div>
              </div>
            ))}
            {data.objectives.slice(0, 4).map((obj) => (
              <div
                key={obj.id as string}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 border border-slate-100"
              >
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    {(obj.title as string) ?? "Objetivo"}
                  </p>
                  <p className="text-xs text-slate-400">{(obj.due_date as string) ?? ""}</p>
                </div>
                <Badge
                  className={
                    obj.status === "completado"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }
                >
                  {(obj.status as string) ?? "Pendiente"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section icon={<MessageSquare size={18} className="text-slate-400" />} title="Mis Feedback">
        {data.feedback.length === 0 ? (
          <EmptyState message="No tienes feedback registrado." icon={<MessageSquare size={28} />} />
        ) : (
          <div className="space-y-3">
            {data.feedback.slice(0, 10).map((f) => (
              <div key={f.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge className={feedbackTypeColor(f.type)}>
                    {feedbackTypeIcon(f.type)} {f.type}
                  </Badge>
                  <span className="text-xs text-slate-500">{f.feedback_date}</span>
                  {f.author && <span className="text-xs text-slate-400">· por {f.author}</span>}
                </div>
                <p className="text-sm text-slate-700">{f.content}</p>
                {f.action_items && (
                  <p className="text-xs text-slate-500 mt-2 bg-white rounded p-2 border border-slate-100">
                    <strong>Acciones:</strong> {f.action_items}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section icon={<FileText size={18} className="text-slate-400" />} title="Mis Documentos">
        {data.documents.length === 0 ? (
          <EmptyState message="No tienes documentos cargados." icon={<FileText size={28} />} />
        ) : (
          <div className="space-y-2">
            {data.documents.slice(0, 8).map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 border border-slate-100"
              >
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">{d.subject}</p>
                    <p className="text-xs text-slate-400">{d.document_date}</p>
                  </div>
                </div>
                <Badge className="bg-slate-100 text-slate-600 border-slate-200">
                  {d.document_type}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
