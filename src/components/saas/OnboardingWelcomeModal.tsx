import { useMemo, useState } from "react";
import {
  BookOpen,
  Check,
  Copy,
  Download,
  ExternalLink,
  Mail,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button, Modal } from "@/components/ui";
import { ExportService } from "@/lib/export";

export interface OnboardingForm {
  tenant_id: string;
  company_name: string;
  contact_name: string;
  primary_email: string;
  alternate_email: string;
  access_path: string;
  help_path: string;
  manual_url: string;
  support_email: string;
  support_phone: string;
  support_whatsapp: string;
  support_hours: string;
  support_url: string;
  provider_legal_name: string;
  provider_rut: string;
  bank_name: string;
  account_type: string;
  account_number: string;
  account_holder: string;
  account_holder_rut: string;
  billing_email: string;
  billing_legal_notice: string;
  subject: string;
  temporary_password?: string;
}

interface OnboardingWelcomeModalProps {
  open: boolean;
  form: OnboardingForm;
  busy?: boolean;
  onChange: (form: OnboardingForm) => void;
  onClose: () => void;
  onSave: (form: OnboardingForm) => Promise<{ error?: string }>;
  onSend: (form: OnboardingForm) => Promise<{ error?: string }>;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  wide = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  wide?: boolean;
}) {
  return (
    <label className={`text-xs font-bold text-slate-700 ${wide ? "sm:col-span-2" : ""}`}>
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

export function OnboardingWelcomeModal({
  open,
  form,
  busy = false,
  onChange,
  onClose,
  onSave,
  onSend,
}: OnboardingWelcomeModalProps) {
  const [tab, setTab] = useState<"setup" | "preview">("setup");
  const [savedMessage, setSavedMessage] = useState("");
  const update = (key: keyof OnboardingForm, value: string) => onChange({ ...form, [key]: value });
  const previewText = useMemo(
    () =>
      `Hola ${form.contact_name || ""},\n\nTe damos la bienvenida a ${form.company_name}.\n\nAcceso: ${form.access_path}\nUsuario: ${form.primary_email}\n\nCambia tu contraseña en el primer acceso. Revisa el manual y contacta soporte si necesitas ayuda.`,
    [form],
  );
  const emailBody = useMemo(
    () =>
      `${previewText}\n\nManual de uso: ${form.manual_url || "Descárgalo desde el panel DevTeam."}\nCentro de ayuda: ${form.help_path || "Por confirmar"}\nSoporte: ${form.support_email || "Por confirmar"} · ${form.support_phone || form.support_whatsapp || "Por confirmar"}\nHorario: ${form.support_hours || "Por confirmar"}\n\nCobranza y depósito:\n${form.provider_legal_name || "Proveedor SaaS"}${form.provider_rut ? ` · RUT ${form.provider_rut}` : ""}\n${form.bank_name || "Banco por confirmar"} · ${form.account_type || "Tipo de cuenta por confirmar"}\nTitular: ${form.account_holder || "Por confirmar"}${form.account_number ? `\nCuenta: ${form.account_number}` : ""}${form.billing_email ? `\nComprobantes: ${form.billing_email}` : ""}\n\n${form.billing_legal_notice || "Los avisos de cobro no reemplazan una factura electrónica ni un DTE."}${form.temporary_password ? `\n\nCONTRASEÑA TEMPORAL: ${form.temporary_password}\nCámbiala inmediatamente en el primer acceso y no la reenvíes.` : ""}`,
    [form, previewText],
  );

  async function save() {
    const result = await onSave(form);
    setSavedMessage(result.error ? result.error : "Datos guardados como borrador.");
  }

  async function send() {
    const result = await onSend(form);
    setSavedMessage(result.error ? result.error : "Bienvenida enviada correctamente.");
  }

  async function downloadManual() {
    await ExportService.toPdf(
      `Manual de bienvenida — ${form.company_name}`,
      ["Sección", "Contenido"],
      [
        [
          "Primer acceso",
          `Ingresa en ${form.access_path} con tu correo y cambia la contraseña temporal.`,
        ],
        [
          "Recorrido inicial",
          "Revisa el panel, configura la empresa, invita usuarios y valida las comunicaciones.",
        ],
        [
          "Soporte",
          `${form.support_email || "Correo no configurado"} · ${form.support_phone || "Teléfono no configurado"} · ${form.support_hours || "Horario por confirmar"}`,
        ],
        [
          "Ayuda",
          form.help_path || form.support_url || "Solicita el enlace de ayuda al administrador.",
        ],
        ["Facturación", "Los avisos de cobro no reemplazan una factura electrónica ni un DTE."],
        [
          "Cuenta de depósito",
          `${form.bank_name || "Banco por confirmar"} · ${form.account_type || "Tipo de cuenta por confirmar"} · ${form.account_holder || "Titular por confirmar"}`,
        ],
        [
          "Seguridad",
          "No reenvíes credenciales. Cambia la contraseña en el primer acceso y contacta soporte ante cualquier duda.",
        ],
      ],
      `manual-bienvenida-${form.company_name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`,
      `${form.provider_legal_name || "Proveedor SaaS"} · Documento operativo para ${form.company_name}`,
    );
  }

  async function copyPreview() {
    await navigator.clipboard?.writeText(emailBody);
    setSavedMessage("Correo completo copiado.");
  }

  async function openPreferredEmail() {
    const result = await onSave(form);
    if (result.error) {
      setSavedMessage(result.error);
      return;
    }
    const params = new URLSearchParams({
      subject: form.subject || `Bienvenido a ${form.company_name}`,
      body: emailBody,
    });
    if (form.alternate_email.trim()) params.set("cc", form.alternate_email.trim());
    window.location.href = `mailto:${encodeURIComponent(form.primary_email.trim())}?${params.toString()}`;
  }

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      title={`Preparar bienvenida · ${form.company_name}`}
      size="xl"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-xs text-amber-950">
          <span>
            <ShieldCheck className="mr-1 inline" size={15} />
            La contraseña temporal nunca se guarda en el perfil, el PDF ni la auditoría.
          </span>
          <span className="font-bold">
            {form.temporary_password
              ? "Credencial temporal disponible en memoria"
              : "Se prioriza enlace de activación"}
          </span>
        </div>
        <div className="flex gap-2 border-b border-slate-100">
          <button
            type="button"
            onClick={() => setTab("setup")}
            className={`border-b-2 px-3 py-2 text-xs font-bold ${tab === "setup" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500"}`}
          >
            Configurar
          </button>
          <button
            type="button"
            onClick={() => setTab("preview")}
            className={`border-b-2 px-3 py-2 text-xs font-bold ${tab === "preview" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500"}`}
          >
            Vista previa del correo
          </button>
        </div>
        {tab === "setup" ? (
          <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
            <section>
              <h3 className="mb-3 text-sm font-black text-slate-900">Contacto y acceso</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Administrador o representante"
                  value={form.contact_name}
                  onChange={(value) => update("contact_name", value)}
                  placeholder="Nombre completo"
                />
                <Field
                  label="Correo principal"
                  value={form.primary_email}
                  onChange={(value) => update("primary_email", value)}
                  type="email"
                  placeholder="admin@empresa.cl"
                />
                <Field
                  label="Correo alternativo"
                  value={form.alternate_email}
                  onChange={(value) => update("alternate_email", value)}
                  type="email"
                  placeholder="Opcional"
                />
                <Field
                  label="Asunto"
                  value={form.subject}
                  onChange={(value) => update("subject", value)}
                  placeholder="Bienvenido a tu portal"
                />
                <Field
                  label="Ruta de acceso"
                  value={form.access_path}
                  onChange={(value) => update("access_path", value)}
                  placeholder="https://app.ejemplo.cl/admin"
                  wide
                />
                <Field
                  label="Ruta de ayuda o manual"
                  value={form.help_path}
                  onChange={(value) => update("help_path", value)}
                  placeholder="https://app.ejemplo.cl/ayuda"
                />
                <Field
                  label="URL pública del manual (opcional)"
                  value={form.manual_url}
                  onChange={(value) => update("manual_url", value)}
                  placeholder="https://..."
                />
              </div>
            </section>
            <section>
              <h3 className="mb-3 text-sm font-black text-slate-900">Soporte del SaaS</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Correo de soporte"
                  value={form.support_email}
                  onChange={(value) => update("support_email", value)}
                  type="email"
                />
                <Field
                  label="Teléfono"
                  value={form.support_phone}
                  onChange={(value) => update("support_phone", value)}
                />
                <Field
                  label="WhatsApp"
                  value={form.support_whatsapp}
                  onChange={(value) => update("support_whatsapp", value)}
                />
                <Field
                  label="Horario de atención"
                  value={form.support_hours}
                  onChange={(value) => update("support_hours", value)}
                />
                <Field
                  label="URL de soporte"
                  value={form.support_url}
                  onChange={(value) => update("support_url", value)}
                  placeholder="https://soporte..."
                  wide
                />
              </div>
            </section>
            <section>
              <h3 className="mb-3 text-sm font-black text-slate-900">
                Proveedor y cuenta de depósito
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Razón social"
                  value={form.provider_legal_name}
                  onChange={(value) => update("provider_legal_name", value)}
                />
                <Field
                  label="RUT proveedor"
                  value={form.provider_rut}
                  onChange={(value) => update("provider_rut", value)}
                />
                <Field
                  label="Banco"
                  value={form.bank_name}
                  onChange={(value) => update("bank_name", value)}
                />
                <Field
                  label="Tipo de cuenta"
                  value={form.account_type}
                  onChange={(value) => update("account_type", value)}
                  placeholder="Cuenta corriente"
                />
                <Field
                  label="Número de cuenta"
                  value={form.account_number}
                  onChange={(value) => update("account_number", value)}
                />
                <Field
                  label="Titular"
                  value={form.account_holder}
                  onChange={(value) => update("account_holder", value)}
                />
                <Field
                  label="RUT titular"
                  value={form.account_holder_rut}
                  onChange={(value) => update("account_holder_rut", value)}
                />
                <Field
                  label="Correo para comprobantes"
                  value={form.billing_email}
                  onChange={(value) => update("billing_email", value)}
                  type="email"
                />
                <label className="text-xs font-bold text-slate-700 sm:col-span-2">
                  Leyenda de facturación
                  <textarea
                    value={form.billing_legal_notice}
                    onChange={(event) => update("billing_legal_notice", event.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal"
                    placeholder="Los avisos de cobro no reemplazan una factura electrónica."
                  />
                </label>
              </div>
            </section>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-blue-700">
                  Correo de bienvenida
                </span>
                <Mail size={16} className="text-blue-600" />
              </div>
              <h3 className="text-lg font-black text-slate-950">
                {form.subject || `Bienvenido a ${form.company_name}`}
              </h3>
              <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">
                {previewText}
              </p>
              <div className="mt-4 rounded-xl border border-blue-100 bg-white p-3 text-xs text-slate-600">
                Manual: {form.manual_url || "se descargará desde este panel"}
                <br />
                Soporte: {form.support_email || "por configurar"}
                <br />
                Depósito: {form.bank_name || "por configurar"} ·{" "}
                {form.account_type || "por configurar"}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void openPreferredEmail()}
                  disabled={busy || !form.primary_email.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Mail size={13} /> Abrir en mi correo
                </button>
                <button
                  type="button"
                  onClick={() => void copyPreview()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
                >
                  <Copy size={13} /> Copiar correo
                </button>
              </div>
              <p className="mt-2 text-[10px] text-slate-500">
                Se abrirá redactado en tu aplicación de correo; tendrás que revisar y presionar
                Enviar manualmente.
              </p>
            </div>
            <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-5">
              <BookOpen size={22} className="text-violet-700" />
              <h3 className="mt-3 text-lg font-black text-slate-950">Manual de uso</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Incluye primer acceso, recorrido, soporte, comunicaciones, facturación y seguridad.
                No incluye contraseñas.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => void downloadManual()}>
                  <Download size={14} /> Descargar PDF
                </Button>
                {form.help_path && (
                  <a
                    href={form.help_path}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
                  >
                    <ExternalLink size={13} /> Abrir ayuda
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
        {savedMessage && (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
            {savedMessage}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            <X size={14} /> Cerrar
          </Button>
          <Button
            variant="outline"
            onClick={() => void save()}
            disabled={busy || !form.primary_email.trim()}
          >
            <Check size={14} /> Guardar borrador
          </Button>
          <Button
            onClick={() => void send()}
            disabled={busy || !form.primary_email.trim() || !form.access_path.trim()}
          >
            <Send size={14} /> {busy ? "Enviando…" : "Enviar bienvenida"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
