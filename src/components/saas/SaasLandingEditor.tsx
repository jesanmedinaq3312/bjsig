import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Globe2, Loader2, Save, ShieldAlert } from "lucide-react";
import {
  DEFAULT_SAAS_LANDING,
  fetchSaasLandingSettings,
  saveSaasLandingSettings,
  type SaasLandingSettings,
} from "@/lib/saasLanding";

const inputClass =
  "mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20";

export function SaasLandingEditor() {
  const [settings, setSettings] = useState<SaasLandingSettings>(DEFAULT_SAAS_LANDING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let mounted = true;
    void fetchSaasLandingSettings()
      .then((value) => {
        if (mounted) setSettings(value);
      })
      .catch((reason: unknown) => {
        if (mounted)
          setError(reason instanceof Error ? reason.message : "No se pudo cargar la landing.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  function update<K extends keyof SaasLandingSettings>(key: K, value: SaasLandingSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  async function save() {
    const title = settings.heroTitle.trim();
    const description = settings.heroDescription.trim();
    const ctaLabel = settings.primaryCtaLabel.trim();
    const phone = settings.whatsappPhone.replace(/\D/g, "");
    if (!title || !description || !ctaLabel || phone.length < 8 || phone.length > 15) {
      setError("Completa los textos obligatorios y usa un teléfono internacional válido.");
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);
    const next = {
      ...settings,
      heroTitle: title,
      heroDescription: description,
      primaryCtaLabel: ctaLabel,
      whatsappPhone: phone,
    };
    try {
      await saveSaasLandingSettings(next);
      setSettings(next);
      window.dispatchEvent(new CustomEvent("bjsig:saas-landing-updated", { detail: next }));
      setSaved(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudieron guardar los cambios.");
    } finally {
      setSaving(false);
    }
  }

  const whatsappPreview = `https://wa.me/${settings.whatsappPhone.replace(/\D/g, "")}`;

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <Globe2 size={19} />
          </span>
          <div>
            <h2 className="text-sm font-black text-slate-900">Landing pública de BJSIGAPP</h2>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Edita el encabezado comercial y controla si el sitio público está visible.
            </p>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <label className="flex min-h-16 items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <span>
              <span className="block text-sm font-bold text-slate-900">Publicar landing SaaS</span>
              <span className="mt-0.5 block text-xs text-slate-600">
                {settings.enabled
                  ? "El sitio principal está visible para visitantes."
                  : "Los visitantes verán un aviso de sitio temporalmente no disponible."}
              </span>
            </span>
            <input
              aria-label="Publicar landing SaaS"
              type="checkbox"
              checked={settings.enabled}
              onChange={(event) => update("enabled", event.target.checked)}
              disabled={loading || saving}
              className="h-5 w-5 accent-blue-700"
            />
          </label>

          <label className="block text-xs font-bold text-slate-700">
            Título principal
            <input
              value={settings.heroTitle}
              onChange={(event) => update("heroTitle", event.target.value)}
              maxLength={180}
              className={inputClass}
              disabled={loading || saving}
            />
            <span className="mt-1 block text-right text-[10px] font-normal text-slate-500">
              {settings.heroTitle.length}/180
            </span>
          </label>

          <label className="block text-xs font-bold text-slate-700">
            Descripción principal
            <textarea
              value={settings.heroDescription}
              onChange={(event) => update("heroDescription", event.target.value)}
              maxLength={600}
              rows={4}
              className={`${inputClass} resize-y leading-6`}
              disabled={loading || saving}
            />
            <span className="mt-1 block text-right text-[10px] font-normal text-slate-500">
              {settings.heroDescription.length}/600
            </span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-bold text-slate-700">
              Texto del botón de contacto
              <input
                value={settings.primaryCtaLabel}
                onChange={(event) => update("primaryCtaLabel", event.target.value)}
                maxLength={100}
                className={inputClass}
                disabled={loading || saving}
              />
            </label>
            <label className="block text-xs font-bold text-slate-700">
              WhatsApp comercial (código país + número)
              <input
                type="tel"
                inputMode="tel"
                value={settings.whatsappPhone}
                onChange={(event) => update("whatsappPhone", event.target.value)}
                maxLength={25}
                placeholder="56941228089"
                className={inputClass}
                disabled={loading || saving}
              />
            </label>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"
            >
              {error}
            </p>
          )}
          {saved && (
            <p
              role="status"
              className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800"
            >
              <CheckCircle2 size={15} /> Cambios guardados y aplicados en la landing pública.
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              Ver landing pública <ExternalLink size={14} />
            </a>
            <button
              type="button"
              onClick={() => void save()}
              disabled={loading || saving}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {loading ? "Cargando…" : saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>

      <aside className="h-fit overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 text-white shadow-sm">
        <div className="border-b border-white/10 px-5 py-4">
          <h3 className="text-sm font-black">Vista previa</h3>
          <p className="mt-1 text-xs text-slate-300">
            Representación del hero con los valores actuales.
          </p>
        </div>
        <div className="p-5 sm:p-7">
          <div className="mb-5 flex items-center gap-2 text-xs font-bold tracking-wide text-white/80">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-700 font-black text-white">
              BJ
            </span>
            BJSIGAPP
          </div>
          {!settings.enabled && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
              <ShieldAlert size={15} /> La landing está desactivada.
            </div>
          )}
          <h3 className="max-w-xl text-2xl font-black leading-tight tracking-tight sm:text-3xl">
            {settings.heroTitle || "Tu título aparecerá aquí"}
          </h3>
          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">
            {settings.heroDescription || "Tu descripción aparecerá aquí."}
          </p>
          <span className="mt-5 inline-flex min-h-10 items-center rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white">
            {settings.primaryCtaLabel || "Texto del botón"}
          </span>
          <p className="mt-4 break-all text-[11px] text-slate-400">{whatsappPreview}</p>
        </div>
      </aside>
    </section>
  );
}
