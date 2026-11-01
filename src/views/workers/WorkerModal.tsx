import { useState } from "react";
import {
  Users,
  FileText,
  ExternalLink,
  Cloud,
  Wallet,
  Upload,
  Trash2,
  Loader2,
  CheckCircle2,
  Plus,
} from "lucide-react";
import { Modal, Button, Input, Select, Badge, Textarea, InfoTooltip } from "@/components/ui";
import { useToast } from "@/components/Toast";
import type {
  Worker,
  CloudDocument,
  Department,
  CloudProvider,
  ShiftCycle,
  ContractStatus,
  WorkerStatus,
} from "@/lib/types";
import { WorkerAvatar } from "@/components/WorkerAvatar";
import { formatRut, isValidRut } from "@/lib/rut";
import {
  CLOUD_PROVIDERS,
  PROVIDER_COLORS,
  DOC_CATEGORIES,
  emptyDocLink,
  type WorkerFormState,
  type DocLinkForm,
} from "./constants";

interface WorkerModalProps {
  worker: Worker | null;
  saving: boolean;
  cloudDocs: CloudDocument[];
  departments: Department[];
  onClose: () => void;
  onSave: (form: Omit<Worker, "id" | "created_at">) => void;
  onAddDoc: (
    rut: string,
    doc: { category: string; provider: CloudProvider; url: string; expiration_date: string | null },
  ) => Promise<void>;
  onDelDoc: (id: string) => Promise<void>;
  onPhotoUpload: (worker: Worker, file: File) => Promise<void>;
  resolvePhotoUrl: (url: string | null | undefined) => string | null;
}

export function WorkerModal({
  worker,
  saving,
  cloudDocs,
  departments,
  onClose,
  onSave,
  onAddDoc,
  onDelDoc,
  onPhotoUpload,
  resolvePhotoUrl,
}: WorkerModalProps) {
  const [photoUploading, setPhotoUploading] = useState(false);
  const [rutError, setRutError] = useState<string | null>(null);
  const toast = useToast();

  const [form, setForm] = useState<WorkerFormState>({
    rut: worker?.rut ?? "",
    full_name: worker?.full_name ?? "",
    nombres: worker?.nombres ?? "",
    apellidos: worker?.apellidos ?? "",
    position: worker?.position ?? "",
    shift_cycle: (worker?.shift_cycle ?? "7x7") as ShiftCycle,
    contract_status: (worker?.contract_status ?? "Vigente") as ContractStatus,
    contract_type: worker?.contract_type ?? "",
    status: (worker?.status ?? "ACTIVO") as WorkerStatus,
    occupational_exam_exp_date: worker?.occupational_exam_exp_date ?? "",
    driver_license_exp_date: worker?.driver_license_exp_date ?? "",
    irl_signed_date: worker?.irl_signed_date ?? "",
    phone: worker?.phone ?? "",
    email: worker?.email ?? "",
    address: worker?.address ?? "",
    birth_date: worker?.birth_date ?? "",
    hire_date: worker?.hire_date ?? "",
    contract_start_date: worker?.contract_start_date ?? "",
    contract_end_date: worker?.contract_end_date ?? "",
    contract_url: worker?.contract_url ?? "",
    emergency_contact_name: worker?.emergency_contact_name ?? "",
    emergency_contact_phone: worker?.emergency_contact_phone ?? "",
    afp: worker?.afp ?? "",
    health_insurance: worker?.health_insurance ?? "",
    nationality: worker?.nationality ?? "",
    notes: worker?.notes ?? "",
    photo_url: worker?.photo_url ?? "",
    department_id: worker?.department_id ?? "",
    reports_to: worker?.reports_to ?? "",
    bank_name: worker?.bank_name ?? "",
    bank_account_number: worker?.bank_account_number ?? "",
    account_type: worker?.account_type ?? "",
    base_salary: worker?.base_salary != null ? String(worker.base_salary) : "",
    hourly_rate: worker?.hourly_rate != null ? String(worker.hourly_rate) : "",
    overtime_rate: worker?.overtime_rate != null ? String(worker.overtime_rate) : "",
    meal_allowance: worker?.meal_allowance != null ? String(worker.meal_allowance) : "",
    mobility_allowance: worker?.mobility_allowance != null ? String(worker.mobility_allowance) : "",
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidRut(form.rut)) {
      setRutError("El RUT ingresado no es válido. Verifica el dígito verificador.");
      return;
    }
    setRutError(null);
    const nullIfEmpty = (v: string) => v || null;
    const nameParts = form.full_name.trim().split(/\s+/);
    const derivedNombres = form.nombres.trim() || (nameParts[0] ?? "");
    const derivedApellidos = form.apellidos.trim() || nameParts.slice(1).join(" ");
    const extraRates = form as unknown as Partial<
      Pick<Worker, "afp_rate" | "health_rate" | "bonus_target">
    >;
    onSave({
      ...form,
      afp_rate: extraRates.afp_rate ?? null,
      health_rate: extraRates.health_rate ?? null,
      bonus_target: extraRates.bonus_target ?? null,
      nombres: derivedNombres,
      apellidos: derivedApellidos,
      department_id: nullIfEmpty(form.department_id),
      reports_to: nullIfEmpty(form.reports_to),
      contract_type: nullIfEmpty(form.contract_type),
      status: form.status,
      occupational_exam_exp_date: nullIfEmpty(form.occupational_exam_exp_date),
      driver_license_exp_date: nullIfEmpty(form.driver_license_exp_date),
      irl_signed_date: nullIfEmpty(form.irl_signed_date),
      phone: nullIfEmpty(form.phone),
      email: nullIfEmpty(form.email),
      address: nullIfEmpty(form.address),
      birth_date: nullIfEmpty(form.birth_date),
      hire_date: nullIfEmpty(form.hire_date),
      contract_start_date: nullIfEmpty(form.contract_start_date),
      contract_end_date: nullIfEmpty(form.contract_end_date),
      contract_url: nullIfEmpty(form.contract_url),
      emergency_contact_name: nullIfEmpty(form.emergency_contact_name),
      emergency_contact_phone: nullIfEmpty(form.emergency_contact_phone),
      afp: nullIfEmpty(form.afp),
      health_insurance: nullIfEmpty(form.health_insurance),
      nationality: nullIfEmpty(form.nationality),
      notes: nullIfEmpty(form.notes),
      photo_url: nullIfEmpty(form.photo_url),
      bank_name: nullIfEmpty(form.bank_name),
      bank_account_number: nullIfEmpty(form.bank_account_number),
      account_type: nullIfEmpty(form.account_type),
      base_salary: form.base_salary.trim() === "" ? 0 : Number(form.base_salary),
      hourly_rate: form.hourly_rate.trim() === "" ? 0 : Number(form.hourly_rate),
      overtime_rate: form.overtime_rate === "" ? null : Number(form.overtime_rate),
      meal_allowance: form.meal_allowance === "" ? null : Number(form.meal_allowance),
      mobility_allowance: form.mobility_allowance === "" ? null : Number(form.mobility_allowance),
    });
  }

  const set = <K extends keyof WorkerFormState>(key: K, value: WorkerFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <Modal
      open
      onClose={onClose}
      title={worker ? "Editar Trabajador" : "Nuevo Trabajador"}
      size="xl"
    >
      <form onSubmit={submit} className="space-y-6">
        {/* Foto de perfil */}
        <section className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 shrink-0">
              <WorkerAvatar
                name={form.full_name || "Nuevo trabajador"}
                rut={form.rut}
                photoUrl={resolvePhotoUrl(form.photo_url) || form.photo_url}
                className="h-20 w-20"
                rounded="rounded-full"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-700">Foto de Perfil (opcional)</p>
              <p className="text-xs text-slate-500 mb-2">
                Sube un archivo o pega un enlace desde Drive, TeraBox, OneDrive, Dropbox o cualquier
                URL directa.
              </p>
              <div className="flex flex-wrap gap-2">
                {worker && (
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
                    {photoUploading ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Upload size={13} />
                    )}
                    {photoUploading ? "Subiendo..." : "Subir archivo"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      disabled={photoUploading}
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setPhotoUploading(true);
                          try {
                            await onPhotoUpload(worker, f);
                          } finally {
                            setPhotoUploading(false);
                          }
                        }
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
                {form.photo_url && (
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, photo_url: "" }))}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Trash2 size={13} /> Quitar
                  </button>
                )}
              </div>
              {!worker && (
                <p className="text-xs text-amber-600 mt-1">
                  Guarda el trabajador primero para poder subir un archivo.
                </p>
              )}
            </div>
          </div>
          <div className="mt-3">
            <Input
              label="O pega una URL de foto (Drive, TeraBox, OneDrive, etc.)"
              value={form.photo_url}
              onChange={(e) => set("photo_url", e.target.value)}
              placeholder="https://drive.google.com/.../foto.jpg"
            />
            <p className="text-xs text-slate-400 mt-1">
              Para Google Drive usa el enlace de vista previa de la imagen. Para TeraBox usa el
              enlace de descarga directa.
            </p>
          </div>
        </section>

        {/* Datos personales */}
        <section>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Users size={14} /> Datos Personales
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Input
                label="RUT"
                required
                value={form.rut}
                onChange={(e) => {
                  set("rut", formatRut(e.target.value));
                  setRutError(null);
                }}
                placeholder="12.345.678-9"
                maxLength={12}
              />
              {rutError && <p className="text-xs text-red-600 font-medium mt-1">{rutError}</p>}
            </div>
            <Input
              label="Nombres"
              required
              value={form.nombres}
              onChange={(e) => {
                set("nombres", e.target.value);
                setForm((p) => ({
                  ...p,
                  nombres: e.target.value,
                  full_name: `${e.target.value} ${p.apellidos}`.trim(),
                }));
              }}
              placeholder="Juan Carlos"
            />
            <Input
              label="Apellidos"
              required
              value={form.apellidos}
              onChange={(e) => {
                set("apellidos", e.target.value);
                setForm((p) => ({
                  ...p,
                  apellidos: e.target.value,
                  full_name: `${p.nombres} ${e.target.value}`.trim(),
                }));
              }}
              placeholder="Pérez González"
            />
            <Input
              label="Nacionalidad"
              value={form.nationality}
              onChange={(e) => set("nationality", e.target.value)}
              placeholder="Chilena"
            />
            <Input
              label="Fecha de Nacimiento"
              type="date"
              value={form.birth_date}
              onChange={(e) => set("birth_date", e.target.value)}
            />
            <Input
              label="Teléfono"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+56 9 1234 5678"
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="nombre@correo.com"
            />
            <div className="sm:col-span-2 lg:col-span-3">
              <Input
                label="Dirección"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="Av. Siempre Viva 742, Santiago"
              />
            </div>
          </div>
        </section>

        {/* Datos laborales */}
        <section>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <FileText size={14} /> Datos Laborales
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label="Cargo"
              required
              value={form.position}
              onChange={(e) => set("position", e.target.value)}
            />
            <Select
              label="Departamento"
              value={form.department_id}
              onChange={(e) => set("department_id", e.target.value)}
            >
              <option value="">Sin departamento</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
            <Select
              label="Ciclo de Turno"
              value={form.shift_cycle}
              onChange={(e) => set("shift_cycle", e.target.value as ShiftCycle)}
            >
              <option value="7x7">7x7</option>
              <option value="5x2">5x2</option>
              <option value="4x3">4x3</option>
            </Select>
            <Select
              label="Estado"
              value={form.status}
              onChange={(e) => set("status", e.target.value as WorkerStatus)}
            >
              <option value="ACTIVO">ACTIVO</option>
              <option value="INACTIVO">INACTIVO</option>
            </Select>
            <Input
              label="Fecha de Ingreso"
              type="date"
              value={form.hire_date}
              onChange={(e) => set("hire_date", e.target.value)}
            />
            <Input
              label="Examen Ocupacional Vence"
              type="date"
              value={form.occupational_exam_exp_date}
              onChange={(e) => set("occupational_exam_exp_date", e.target.value)}
            />
            <Input
              label="Licencia de Conducir Vence"
              type="date"
              value={form.driver_license_exp_date}
              onChange={(e) => set("driver_license_exp_date", e.target.value)}
            />
            <Input
              label="IRL/ODI Firmada"
              type="date"
              value={form.irl_signed_date}
              onChange={(e) => set("irl_signed_date", e.target.value)}
            />
          </div>
        </section>

        {/* Contrato */}
        <section className="p-4 rounded-xl border border-blue-100 bg-blue-50/40">
          <h4 className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <FileText size={14} /> Contrato
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Select
              label="Estado del Contrato"
              value={form.contract_status}
              onChange={(e) => set("contract_status", e.target.value as ContractStatus)}
            >
              <option value="Vigente">Vigente</option>
              <option value="Por vencer">Por vencer</option>
              <option value="Vencido">Vencido</option>
            </Select>
            <Select
              label="Tipo de Contrato"
              value={form.contract_type}
              onChange={(e) => {
                set("contract_type", e.target.value);
                if (e.target.value === "Indefinido") set("contract_end_date", "");
              }}
            >
              <option value="">Seleccionar...</option>
              <option value="Indefinido">Indefinido</option>
              <option value="Plazo Fijo">Plazo Fijo</option>
              <option value="Obra o Faena">Obra o Faena</option>
            </Select>
            <div className="hidden lg:block" />
            <Input
              label="Inicio del Contrato"
              type="date"
              value={form.contract_start_date}
              onChange={(e) => set("contract_start_date", e.target.value)}
            />
            <Input
              label="Término del Contrato"
              type="date"
              value={form.contract_end_date}
              onChange={(e) => set("contract_end_date", e.target.value)}
              disabled={form.contract_type === "Indefinido"}
              placeholder={
                form.contract_type === "Indefinido" ? "No aplica (contrato indefinido)" : ""
              }
            />
            <div className="sm:col-span-2 lg:col-span-3">
              <Input
                label="Enlace del Contrato (Drive / OneDrive / TeraBox / etc.)"
                value={form.contract_url}
                onChange={(e) => set("contract_url", e.target.value)}
                placeholder="https://drive.google.com/..."
              />
            </div>
          </div>
          {form.contract_url && (
            <a
              href={form.contract_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              <ExternalLink size={13} /> Abrir contrato
            </a>
          )}
        </section>

        {/* Previsión y emergencia */}
        <section>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Users size={14} /> Previsión y Contacto de Emergencia
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label="AFP"
              value={form.afp}
              onChange={(e) => set("afp", e.target.value)}
              placeholder="Capital / Habitat / Modelo / Cuprum"
            />
            <Input
              label="Salud (Isapre / Fonasa)"
              value={form.health_insurance}
              onChange={(e) => set("health_insurance", e.target.value)}
              placeholder="Fonasa / Colmena / Banmédica"
            />
            <div className="hidden lg:block" />
            <Input
              label="Contacto de Emergencia"
              value={form.emergency_contact_name}
              onChange={(e) => set("emergency_contact_name", e.target.value)}
              placeholder="Nombre completo"
            />
            <Input
              label="Teléfono de Emergencia"
              value={form.emergency_contact_phone}
              onChange={(e) => set("emergency_contact_phone", e.target.value)}
              placeholder="+56 9 1234 5678"
            />
          </div>
        </section>

        {/* Cuenta bancaria y remuneración */}
        <section className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/40">
          <h4 className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Wallet size={14} /> Remuneración y Cuenta Bancaria
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label="Sueldo Base (CLP)"
              type="number"
              min={0}
              value={form.base_salary}
              onChange={(e) => set("base_salary", e.target.value)}
              placeholder="0"
            />
            <Input
              label="Valor Hora Ordinaria (CLP)"
              type="number"
              min={0}
              value={form.hourly_rate}
              onChange={(e) => set("hourly_rate", e.target.value)}
              placeholder="0"
            />
            <Input
              label="Multiplicador Horas Extras"
              type="number"
              step="0.1"
              min={0}
              value={form.overtime_rate}
              onChange={(e) => set("overtime_rate", e.target.value)}
              placeholder="1.5"
            />
            <Input
              label="Asignación de Colación (CLP)"
              type="number"
              min={0}
              value={form.meal_allowance}
              onChange={(e) => set("meal_allowance", e.target.value)}
              placeholder="0"
            />
            <Input
              label="Asignación de Movilización (CLP)"
              type="number"
              min={0}
              value={form.mobility_allowance}
              onChange={(e) => set("mobility_allowance", e.target.value)}
              placeholder="0"
            />
            <div className="hidden lg:block" />
            <Input
              label="Banco"
              value={form.bank_name}
              onChange={(e) => set("bank_name", e.target.value)}
              placeholder="BancoEstado / Banco de Chile / Santander"
            />
            <Select
              label="Tipo de Cuenta"
              value={form.account_type}
              onChange={(e) => set("account_type", e.target.value)}
            >
              <option value="">Seleccionar...</option>
              <option value="Cuenta Corriente">Cuenta Corriente</option>
              <option value="Cuenta Vista">Cuenta Vista</option>
              <option value="Cuenta de Ahorro">Cuenta de Ahorro</option>
              <option value="Cuenta RUT">Cuenta RUT</option>
            </Select>
            <Input
              label="Número de Cuenta"
              value={form.bank_account_number}
              onChange={(e) => set("bank_account_number", e.target.value)}
              placeholder="000-000-000"
            />
          </div>
        </section>

        {/* Documentos en la nube */}
        <WorkerDocsSection
          rut={form.rut}
          cloudDocs={cloudDocs}
          onAddDoc={onAddDoc}
          onDelDoc={onDelDoc}
        />

        {/* Notas */}
        <section>
          <Textarea
            label="Notas internas"
            rows={3}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Observaciones, restricciones médicas, etc."
          />
        </section>

        {/* Nota sobre acceso al portal */}
        {!worker && form.email && (
          <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-200/50 text-xs text-emerald-700 flex items-start gap-2">
            <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-emerald-600" />
            <span>
              Al guardar, se creará automáticamente la cuenta del Portal del Trabajador para este
              correo. El trabajador deberá ingresar con su RUT y correo, y crear su contraseña en el
              primer acceso.
            </span>
          </div>
        )}
        {!worker && !form.email && (
          <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 text-xs text-amber-700 flex items-start gap-2">
            <InfoTooltip text="Sin correo, el trabajador no podrá acceder al portal." />
            <span>
              Si ingresas un correo, se creará automáticamente la cuenta del Portal del Trabajador
              al guardar. Sin correo, el trabajador podrá ser registrado pero no tendrá acceso al
              portal.
            </span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Guardar Trabajador
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function WorkerDocsSection({
  rut,
  cloudDocs,
  onAddDoc,
  onDelDoc,
}: {
  rut: string;
  cloudDocs: CloudDocument[];
  onAddDoc: (
    rut: string,
    doc: { category: string; provider: CloudProvider; url: string; expiration_date: string | null },
  ) => Promise<void>;
  onDelDoc: (id: string) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [docForm, setDocForm] = useState<DocLinkForm>(emptyDocLink());
  const [savingDoc, setSavingDoc] = useState(false);
  const toast = useToast();

  async function addDoc(e: React.FormEvent) {
    e.preventDefault();
    if (!docForm.url.trim()) {
      toast.warning("URL requerida", "La URL del documento es obligatoria");
      return;
    }
    setSavingDoc(true);
    try {
      await onAddDoc(rut, {
        category: docForm.category,
        provider: docForm.provider,
        url: docForm.url,
        expiration_date: docForm.expiration_date || null,
      });
      setDocForm(emptyDocLink());
      setShowForm(false);
      toast.success("Documento vinculado", docForm.category);
    } catch (err) {
      toast.error("Error", (err as Error).message);
    } finally {
      setSavingDoc(false);
    }
  }

  return (
    <section className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
          <Cloud size={14} /> Documentos en la Nube
          <InfoTooltip text="Pega aquí los enlaces de los documentos del trabajador alojados en Google Drive, OneDrive, TeraBox, Dropbox o cualquier URL directa. Podrás abrirlos desde aquí y ver su vencimiento." />
        </h4>
        <Button type="button" variant="outline" size="sm" onClick={() => setShowForm((s) => !s)}>
          <Plus size={14} /> Añadir enlace
        </Button>
      </div>

      {showForm && (
        <form onSubmit={addDoc} className="mb-3 p-3 glass-surface rounded-lg space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Categoría"
              value={docForm.category}
              onChange={(e) => setDocForm({ ...docForm, category: e.target.value })}
            >
              {DOC_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Select
              label="Proveedor"
              value={docForm.provider}
              onChange={(e) =>
                setDocForm({ ...docForm, provider: e.target.value as CloudProvider })
              }
            >
              {CLOUD_PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </div>
          <Input
            label="URL del documento"
            required
            value={docForm.url}
            onChange={(e) => setDocForm({ ...docForm, url: e.target.value })}
            placeholder="https://drive.google.com/..."
          />
          <Input
            label="Vencimiento (opcional)"
            type="date"
            value={docForm.expiration_date}
            onChange={(e) => setDocForm({ ...docForm, expiration_date: e.target.value })}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" loading={savingDoc}>
              Guardar enlace
            </Button>
          </div>
        </form>
      )}

      {cloudDocs.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-3">
          Sin documentos vinculados. Añade un enlace para empezar.
        </p>
      ) : (
        <div className="space-y-1.5">
          {cloudDocs.map((d) => (
            <div key={d.id} className="flex items-center gap-2 px-3 py-2 glass-surface rounded-lg">
              <Badge
                className={
                  PROVIDER_COLORS[d.provider as CloudProvider] ??
                  "bg-slate-50 text-slate-700 border-slate-200"
                }
              >
                {d.provider}
              </Badge>
              <span className="text-xs text-slate-600 font-medium flex-1 truncate">
                {d.category}
              </span>
              {d.expiration_date && (
                <span className="text-xs text-slate-400">{d.expiration_date}</span>
              )}
              <a
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                title="Abrir documento"
              >
                <ExternalLink size={14} />
              </a>
              <button
                onClick={() => onDelDoc(d.id)}
                className="p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded"
                title="Eliminar enlace"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
