import { useState } from "react";
import {
  Plus,
  Trash2,
  FileSpreadsheet,
  Shield,
  Users,
  Clock,
  CalendarDays,
  Megaphone,
} from "lucide-react";
import {
  Card,
  CardHeader,
  Button,
  Modal,
  Input,
  Badge,
  EmptyState,
  Spinner,
  Textarea,
} from "@/components/ui";
import { ExportService } from "@/lib/export";
import { securityTalkRepo } from "@/lib/repositories";
import { audit } from "@/lib/audit";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/hooks/useConfirm";
import { useLoading } from "@/components/LoadingProvider";
import type { SecurityTalk } from "@/lib/types";
import type { AppData } from "@/hooks/useAppData";

export function SecurityTalksView({
  data,
  userRole,
  permissions,
}: {
  data: AppData;
  userRole?: string;
  permissions?: Record<string, boolean>;
}) {
  const { workers, securityTalks, loading } = data;
  const canDelete = userRole === "superadmin" || !!permissions?.can_delete_security_talks;
  const toast = useToast();
  const { confirm } = useConfirm();
  const { runWithLoading } = useLoading();
  const [modalOpen, setModalOpen] = useState(false);

  const workerName = (rut: string) => workers.find((w) => w.rut === rut)?.full_name ?? rut;

  const totalTalks = securityTalks.length;
  const totalAttendees = securityTalks.reduce((s, t) => s + t.attendees_rut_list.length, 0);
  const totalMinutes = securityTalks.reduce((s, t) => s + t.duration_minutes, 0);
  const uniqueAreas = new Set(securityTalks.map((t) => t.area)).size;

  async function addTalk(form: Omit<SecurityTalk, "id" | "created_at" | "digital_signature">) {
    try {
      await runWithLoading(async () => {
        await securityTalkRepo.insert({
          ...form,
          digital_signature: null,
        });
        await audit({
          action: "security_talk.create",
          entity: "security_talks",
          entity_label: `${form.topic} — ${form.talk_date}`,
        });
        setModalOpen(false);
        toast.success("Charla registrada", form.topic);
        await data.reload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  async function delTalk(t: SecurityTalk) {
    const ok = await confirm({
      title: "Eliminar charla",
      message: `¿Eliminar la charla "${t.topic}"? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      type: "danger",
    });
    if (!ok) return;
    try {
      await runWithLoading(async () => {
        await securityTalkRepo.remove(t.id);
        await audit({ action: "security_talk.delete", entity: "security_talks", entity_id: t.id });
        toast.success("Charla eliminada");
        await data.reload();
      });
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  function exportExcel() {
    ExportService.toExcel(
      securityTalks.map((t) => ({
        Fecha: t.talk_date,
        Tema: t.topic,
        Área: t.area,
        Expositor: t.speaker,
        "Duración (min)": t.duration_minutes,
        Asistentes: t.attendees_rut_list.length,
        "RUT Asistentes": t.attendees_rut_list.join(", "),
        "Nombres Asistentes": t.attendees_rut_list.map(workerName).join(", "),
        Observaciones: t.observations ?? "",
      })),
      "Charlas DIT",
      "charlas_dit_gyc",
    );
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Megaphone size={18} className="text-blue-600" />
            <span className="text-xs text-slate-500">Charlas</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{totalTalks}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users size={18} className="text-emerald-600" />
            <span className="text-xs text-slate-500">Asistentes Totales</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{totalAttendees}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={18} className="text-amber-600" />
            <span className="text-xs text-slate-500">Minutos Totales</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{totalMinutes}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={18} className="text-violet-600" />
            <span className="text-xs text-slate-500">Áreas</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{uniqueAreas}</p>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={exportExcel}>
          <FileSpreadsheet size={15} /> Excel
        </Button>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus size={15} /> Nueva Charla
        </Button>
      </div>

      <Card>
        <CardHeader
          title="Charlas de Seguridad DIT"
          subtitle="Registro de charlas diarias de seguridad — Daily Safety Talks"
        />
        {securityTalks.length === 0 ? (
          <EmptyState
            message="No hay charlas de seguridad registradas"
            icon={<Shield size={32} />}
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {securityTalks.map((t) => (
              <div key={t.id} className="px-5 py-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge className="bg-slate-100 text-slate-600 border-slate-200">
                        <CalendarDays size={11} /> {t.talk_date}
                      </Badge>
                      <Badge className="bg-blue-50 text-blue-700 border-blue-200">{t.area}</Badge>
                      <Badge className="bg-amber-50 text-amber-700 border-amber-200">
                        {t.duration_minutes} min
                      </Badge>
                      <span className="text-xs text-slate-500">Expositor: {t.speaker}</span>
                    </div>
                    <p className="font-semibold text-slate-800">{t.topic}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {t.attendees_rut_list.map((rut, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-600"
                        >
                          {workerName(rut)}
                        </span>
                      ))}
                    </div>
                    {t.observations && (
                      <p className="text-xs text-slate-400 mt-2">{t.observations}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 self-start">
                    {canDelete && (
                      <button
                        onClick={() => delTalk(t)}
                        className="p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded"
                        title="Eliminar"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <SecurityTalkModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        workers={workers}
        onSave={addTalk}
      />
    </div>
  );
}

function SecurityTalkModal({
  open,
  onClose,
  workers,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  workers: AppData["workers"];
  onSave: (form: Omit<SecurityTalk, "id" | "created_at" | "digital_signature">) => void;
}) {
  const [talkDate, setTalkDate] = useState("");
  const [topic, setTopic] = useState("");
  const [area, setArea] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [duration, setDuration] = useState(15);
  const [observations, setObservations] = useState("");
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);

  function toggleWorker(rut: string) {
    setSelectedWorkers((prev) =>
      prev.includes(rut) ? prev.filter((r) => r !== rut) : [...prev, rut],
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!talkDate || !topic || !area || !speaker) return;
    onSave({
      talk_date: talkDate,
      topic,
      area,
      speaker,
      attendees_rut_list: selectedWorkers,
      duration_minutes: duration,
      observations: observations || null,
    });
    setTalkDate("");
    setTopic("");
    setArea("");
    setSpeaker("");
    setDuration(15);
    setObservations("");
    setSelectedWorkers([]);
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva Charla de Seguridad DIT" size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Fecha"
            type="date"
            value={talkDate}
            onChange={(e) => setTalkDate(e.target.value)}
            required
          />
          <Input
            label="Duración (minutos)"
            type="number"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            required
          />
        </div>
        <Input
          label="Tema"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Ej: Uso de EPP en alturas"
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Área"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="Ej: Terreno"
            required
          />
          <Input
            label="Expositor"
            value={speaker}
            onChange={(e) => setSpeaker(e.target.value)}
            required
          />
        </div>
        <div>
          <span className="block text-xs font-medium text-slate-600 mb-1.5">
            Asistentes ({selectedWorkers.length} seleccionados)
          </span>
          <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
            {workers.map((w) => (
              <label
                key={w.rut}
                className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedWorkers.includes(w.rut)}
                  onChange={() => toggleWorker(w.rut)}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">
                  {w.full_name} — {w.rut}
                </span>
              </label>
            ))}
          </div>
        </div>
        <Textarea
          label="Observaciones (opcional)"
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          rows={2}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" size="sm">
            Crear Charla
          </Button>
        </div>
      </form>
    </Modal>
  );
}
