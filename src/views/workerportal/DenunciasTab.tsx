import { useState } from "react";
import { ShieldAlert, Send, CheckCircle2, Info, Lock } from "lucide-react";
import { Card, Button, Select, Textarea, Input, Spinner, EmptyState } from "@/components/ui";
import { callEdgeFunction } from "@/lib/edgeFunctions";
import { useToast } from "@/components/Toast";
import type { HarassmentCategory } from "@/lib/types";

const CATEGORY_OPTIONS: { value: HarassmentCategory; label: string; desc: string }[] = [
  {
    value: "acoso_laboral",
    label: "Acoso Laboral",
    desc: "Conductas que atentan contra la dignidad o integridad psíquica en el ámbito laboral.",
  },
  {
    value: "acoso_sexual",
    label: "Acoso Sexual",
    desc: "Requerimientos de carácter sexual no consentidos.",
  },
  {
    value: "violencia",
    label: "Violencia en el Trabajo",
    desc: "Agresiones físicas o psicológicas en el contexto laboral.",
  },
  {
    value: "otro",
    label: "Otro",
    desc: "Otra conducta que considere constitutiva de acoso o violencia.",
  },
];

export function DenunciasTab({
  workerRut,
  isPreview = false,
}: {
  workerRut: string;
  isPreview?: boolean;
}) {
  const toast = useToast();
  const [category, setCategory] = useState<HarassmentCategory>("acoso_laboral");
  const [description, setDescription] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [rutInput, setRutInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (isPreview) return;
    if (!description.trim()) {
      toast.error("Campo obligatorio", "Debes describir los hechos de la denuncia.");
      return;
    }
    if (description.trim().length < 10) {
      toast.error("Descripción muy breve", "Describe los hechos con al menos 10 caracteres.");
      return;
    }
    setSubmitting(true);
    try {
      const { error: err } = await callEdgeFunction("harassment-report-submit", {
        category,
        description: description.trim(),
        reporter_worker_rut: anonymous ? null : rutInput.trim() || workerRut,
        anonymous,
      });
      if (err) throw new Error(err);
      setSubmitted(true);
      setDescription("");
      setRutInput("");
      toast.success("Denuncia enviada", "Tu denuncia fue registrada exitosamente.");
    } catch {
      toast.error("Error", "No se pudo enviar la denuncia. Intenta nuevamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (isPreview) {
    return (
      <Card className="p-6">
        <div className="flex items-start gap-3">
          <Lock size={18} className="mt-0.5 shrink-0 text-slate-500" />
          <div>
            <h3 className="text-base font-semibold text-slate-800">Vista previa de denuncias</h3>
            <p className="mt-1 text-sm text-slate-500">
              El envío de denuncias está deshabilitado durante la previsualización.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (submitted) {
    return (
      <Card className="p-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50">
            <CheckCircle2 size={32} className="text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Denuncia Enviada</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Tu denuncia ha sido registrada de forma confidencial. El equipo de RRHH la revisará y
            iniciará la investigación según lo establece la Ley 21.643 (Ley Karin).
          </p>
          <Button variant="outline" onClick={() => setSubmitted(false)}>
            Enviar otra denuncia
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
            <ShieldAlert size={20} className="text-rose-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-800">
              Canal de Denuncias — Ley Karin (Ley 21.643)
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Este canal te permite denunciar de forma confidencial situaciones de acoso laboral,
              acoso sexual o violencia en el trabajo. Tu denuncia será tratada con estricta reserva.
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
          <Lock size={16} className="text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 leading-relaxed">
            Puedes presentar tu denuncia de forma anónima o identificándote. Si te identificas, solo
            RRHH tendrá acceso a tu RUT. La denuncia no afectará tu situación laboral.
          </p>
        </div>
      </Card>

      <Card>
        <div className="px-5 py-4 border-b border-slate-100">
          <h4 className="text-sm font-semibold text-slate-700">Nueva Denuncia</h4>
        </div>
        <form onSubmit={submit} className="px-5 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Categoría</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CATEGORY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCategory(opt.value)}
                  className={`text-left p-3 rounded-lg border transition-all ${category === opt.value ? "border-rose-400 bg-rose-50 ring-1 ring-rose-300" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}
                >
                  <p className="text-sm font-medium text-slate-700">{opt.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <input
              id="anonymous"
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              className="w-4 h-4 rounded accent-rose-600"
            />
            <label htmlFor="anonymous" className="text-sm text-slate-600 cursor-pointer">
              Presentar denuncia de forma anónima
            </label>
          </div>

          {!anonymous && (
            <Input
              label="Tu RUT (opcional)"
              value={rutInput}
              onChange={(e) => setRutInput(e.target.value)}
              placeholder={workerRut}
              maxLength={12}
            />
          )}

          <Textarea
            label="Descripción de los hechos"
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 5000))}
            rows={5}
            placeholder="Describe detalladamente los hechos: fechas, personas involucradas, testigos, y cualquier información relevante para la investigación."
            maxLength={5000}
          />

          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              La denuncia será revisada por RRHH dentro del plazo legal de 30 días. Si proporcionas
              tu RUT, se te notificará el resultado de la investigación.
            </p>
          </div>

          <div className="flex justify-end">
            <Button type="submit" variant="primary" loading={submitting}>
              <Send size={15} /> Enviar Denuncia
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
