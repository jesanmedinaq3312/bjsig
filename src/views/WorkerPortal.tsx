import { useState, useEffect, useRef, lazy, Suspense } from "react";
import {
  QrCode,
  Clock,
  CalendarDays,
  MessageSquare,
  Send,
  Mail,
  AlertTriangle,
  XCircle,
  Info,
  Megaphone,
  ShieldAlert,
} from "lucide-react";
import { Card, Button, Select, Input, Textarea, Modal, Spinner, EmptyState } from "@/components/ui";
import { useWorkerData } from "@/hooks/useWorkerData";
import { useAuth } from "@/hooks/useAuth";
import type { WorkerRequestCategory } from "@/lib/types";
import { formatRut } from "@/lib/rut";
import { StatCard } from "./workerportal/components";
import { WelcomeHero } from "./workerportal/WelcomeHero";
import { MotivationalBanner } from "./workerportal/MotivationalBanner";
import { TAB_LABELS, type PortalTab } from "./workerportal/constants";
import { WorkerAvatar } from "@/components/WorkerAvatar";

const ResumenTab = lazy(() =>
  import("./workerportal/ResumenTab").then((m) => ({ default: m.ResumenTab })),
);
const AsistenciaTab = lazy(() =>
  import("./workerportal/AsistenciaTab").then((m) => ({ default: m.AsistenciaTab })),
);
const RrhhTab = lazy(() => import("./workerportal/RrhhTab").then((m) => ({ default: m.RrhhTab })));
const SeguridadTab = lazy(() =>
  import("./workerportal/SeguridadTab").then((m) => ({ default: m.SeguridadTab })),
);
const SolicitudesTab = lazy(() =>
  import("./workerportal/SolicitudesTab").then((m) => ({ default: m.SolicitudesTab })),
);
const ComunicacionesTab = lazy(() =>
  import("./workerportal/ComunicacionesTab").then((m) => ({ default: m.ComunicacionesTab })),
);
const DenunciasTab = lazy(() =>
  import("./workerportal/DenunciasTab").then((m) => ({ default: m.DenunciasTab })),
);

export function WorkerPortal({
  workerRut,
  previewEmail,
  isPreview: isPreviewProp,
}: {
  workerRut: string;
  previewEmail?: string;
  isPreview?: boolean;
}) {
  const { data, loading, error, createRequest, respondToAttendanceRectification } =
    useWorkerData(workerRut);
  const { session } = useAuth();
  const workerEmail = previewEmail ?? session?.user?.email ?? "";
  const isPreview = isPreviewProp ?? previewEmail !== undefined;
  const [activeTab, setActiveTab] = useState<PortalTab>("resumen");
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [reqForm, setReqForm] = useState({
    category: "consulta" as WorkerRequestCategory,
    subject: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [reqError, setReqError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!workerRut) return;
    let cancelled = false;
    (async () => {
      const payload = JSON.stringify({
        type: "GYC_ATTENDANCE",
        rut: workerRut,
        name: data?.profile?.full_name ?? "",
        v: 1,
      });
      try {
        const QRCode = (await import("qrcode")).default;
        const url = await QRCode.toDataURL(payload, {
          width: 200,
          margin: 1,
          color: { dark: "#1e293b", light: "#ffffff" },
          errorCorrectionLevel: "M",
        });
        if (!cancelled) setQrDataUrl(url);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workerRut, data?.profile?.full_name]);

  function downloadQr() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `QR_${workerRut.replace(/\./g, "")}.png`;
    a.click();
  }

  if (loading) return <Spinner />;
  if (error) return <EmptyState message={`Error: ${error}`} icon={<AlertTriangle size={32} />} />;
  if (!data) return <EmptyState message="No se pudieron cargar tus datos." />;
  if (!data.profile) {
    return (
      <EmptyState
        message="No se encontró la ficha laboral de esta persona en la empresa activa, por lo que no se puede mostrar su cargo. Verifica la asignación de empresa o contacta al administrador."
        icon={<AlertTriangle size={32} />}
      />
    );
  }

  const p = data.profile;
  const fullName = p?.full_name ?? "Trabajador";
  const positionLabel = p.position.trim() || "Cargo no informado";

  const SENSITIVE_KEYWORDS = [
    "enfermedad",
    "diagnóstico",
    "cáncer",
    "vih",
    "depresión",
    "embarazo",
    "aborto",
    "familiar",
    "hijo",
    "pareja",
    "divorcio",
    "salud mental",
    "psiquiatra",
    "terapia",
  ];

  function checkSensitive(text: string): boolean {
    const lower = text.toLowerCase();
    return SENSITIVE_KEYWORDS.some((kw) => lower.includes(kw));
  }

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    if (isPreview) return;
    if (!reqForm.subject.trim() || !reqForm.message.trim()) {
      setReqError("Asunto y mensaje son obligatorios.");
      return;
    }
    if (checkSensitive(reqForm.subject + " " + reqForm.message)) {
      setReqError(
        "Tu mensaje podría contener información personal o sensible. Por favor, reformula tu solicitud enfocándote solo en el aspecto laboral. Si necesitas comunicar algo confidencial, contacta directamente a RRHH.",
      );
      return;
    }
    setSubmitting(true);
    setReqError(null);
    const { error: err } = await createRequest(
      reqForm.category,
      reqForm.subject.trim(),
      reqForm.message.trim(),
    );
    setSubmitting(false);
    if (err) {
      setReqError(err);
      return;
    }
    setReqForm({ category: "consulta", subject: "", message: "" });
    setShowRequestModal(false);
  }

  return (
    <div className="space-y-6 animate-view-enter">
      {isPreview && (
        <div
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
        >
          Vista previa de solo lectura. Las solicitudes, denuncias y confirmaciones están
          deshabilitadas.
        </div>
      )}
      <WelcomeHero profile={p} fullName={fullName} />

      <MotivationalBanner workerRut={workerRut} />

      <Card className="overflow-hidden">
        <div className="flex flex-col md:flex-row items-center gap-4 p-5">
          <WorkerAvatar
            name={fullName}
            rut={p?.rut ?? workerRut}
            photoUrl={p?.photo_url}
            className="h-20 w-20 shrink-0"
            rounded="rounded-full"
          />
          <div className="text-center sm:text-left flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-slate-800 truncate">{fullName}</h2>
            <p className="text-sm text-slate-500">
              {positionLabel} · {p.department_name ?? "Sin departamento"}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              RUT: {p?.rut ? formatRut(p.rut) : formatRut(workerRut)}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 inline-flex items-center gap-1">
              <Mail size={11} /> {p?.email ?? workerEmail}
            </p>
          </div>
          {!isPreview && (
            <Button
              onClick={() => setShowRequestModal(true)}
              variant="primary"
              size="md"
              className="w-full md:w-auto md:shrink-0"
            >
              <Send size={15} /> Nueva Solicitud
            </Button>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          icon={<QrCode size={20} className="text-blue-600" />}
          label="Registros QR"
          value={data.qr_scans.length}
          color="bg-blue-50"
        />
        <StatCard
          icon={<CalendarDays size={20} className="text-emerald-600" />}
          label="Dias de Turno"
          value={data.shifts.length}
          color="bg-emerald-50"
        />
        <StatCard
          icon={<Clock size={20} className="text-teal-600" />}
          label="Asignaciones"
          value={data.assignments.length}
          color="bg-teal-50"
        />
        <StatCard
          icon={<MessageSquare size={20} className="text-amber-600" />}
          label="Solicitudes"
          value={data.requests.length}
          color="bg-amber-50"
        />
        <StatCard
          icon={<Megaphone size={20} className="text-rose-600" />}
          label="Comunicaciones"
          value={data.circulars.length}
          color="bg-rose-50"
        />
        <StatCard
          icon={<ShieldAlert size={20} className="text-rose-600" />}
          label="Denuncias"
          value={"Ley Karin"}
          color="bg-rose-50"
        />
      </div>

      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
        {(Object.keys(TAB_LABELS) as PortalTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            aria-selected={activeTab === tab}
            role="tab"
            className={`min-h-11 px-3 sm:px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap rounded-t-lg ${activeTab === tab ? "border-blue-600 text-blue-600 bg-blue-50/50" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50/50"}`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      <Suspense
        fallback={
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        }
      >
        {activeTab === "resumen" && (
          <ResumenTab
            data={data}
            workerRut={workerRut}
            workerEmail={workerEmail}
            isPreview={isPreview}
            fullName={fullName}
            qrDataUrl={qrDataUrl}
            downloadQr={downloadQr}
            qrRef={qrRef}
          />
        )}
        {activeTab === "asistencia" && (
          <AsistenciaTab
            data={data}
            isPreview={isPreview}
            onRespondRectification={respondToAttendanceRectification}
          />
        )}
        {activeTab === "rrhh" && <RrhhTab data={data} />}
        {activeTab === "seguridad" && <SeguridadTab data={data} />}
        {activeTab === "solicitudes" && <SolicitudesTab data={data} />}
        {activeTab === "comunicaciones" && (
          <ComunicacionesTab data={data} workerRut={workerRut} isPreview={isPreview} />
        )}
        {activeTab === "denuncias" && <DenunciasTab workerRut={workerRut} isPreview={isPreview} />}
      </Suspense>

      <Modal
        open={showRequestModal && !isPreview}
        onClose={() => setShowRequestModal(false)}
        title="Nueva Solicitud"
      >
        <form onSubmit={submitRequest} className="space-y-4">
          <Select
            label="Categoria"
            value={reqForm.category}
            onChange={(e) =>
              setReqForm({ ...reqForm, category: e.target.value as WorkerRequestCategory })
            }
          >
            <option value="permiso">Permiso</option>
            <option value="consulta">Consulta</option>
            <option value="reclamo">Reclamo</option>
            <option value="sugerencia">Sugerencia</option>
            <option value="otro">Otro</option>
          </Select>
          <Input
            label="Asunto"
            value={reqForm.subject}
            onChange={(e) => setReqForm({ ...reqForm, subject: e.target.value.slice(0, 200) })}
            placeholder="Resumen breve de tu solicitud"
            maxLength={200}
          />
          <Textarea
            label="Mensaje"
            value={reqForm.message}
            onChange={(e) => setReqForm({ ...reqForm, message: e.target.value.slice(0, 2000) })}
            rows={4}
            placeholder="Describe tu solicitud en detalle"
            maxLength={2000}
          />
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              Este canal es exclusivamente para temas laborales (permisos, consultas, reclamos,
              sugerencias). No incluyas datos personales ni sensibles de salud propia o de terceros,
              ni informacion de situacion familiar. Si necesitas comunicar algo confidencial,
              contacta directamente a Recursos Humanos.
            </p>
          </div>
          {reqError && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <XCircle size={14} /> {reqError}
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setShowRequestModal(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="w-full sm:w-auto"
              loading={submitting}
            >
              <Send size={14} /> Enviar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
