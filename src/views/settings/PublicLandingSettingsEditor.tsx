import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ExternalLink, Eye, Globe2, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { safeHeroLinkUrl, sanitizeHeroImages, type VisualAssets } from "@/lib/logo";
import {
  DEFAULT_SAAS_LANDING,
  fetchSaasLandingSettings,
  type SaasLandingSettings,
} from "@/lib/saasLanding";

const PREVIEW_STORAGE_KEY = "bjsig-public-landing-preview";
const inputClass =
  "mt-1 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20";
const imageKeys = ["favicon_url", "header_image_url", "hero_image_url"] as const;
type ImageKey = (typeof imageKeys)[number] | "hero_link_url";
type IconKey = "brand" | "hero" | "feature" | "cta";

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeDraft(value: unknown): VisualAssets {
  const source = record(value);
  const landing = record(source.landing);
  const icons = record(source.icon_urls);
  const opacity = Number(source.hero_opacity);
  return {
    favicon_url: text(source.favicon_url),
    header_image_url: text(source.header_image_url),
    hero_image_url: text(source.hero_image_url),
    hero_link_url: safeHeroLinkUrl(source.hero_link_url),
    hero_opacity: Number.isFinite(opacity) && opacity >= 0 && opacity <= 1 ? opacity : 0.8,
    icon_urls: {
      brand: text(icons.brand),
      hero: text(icons.hero),
      feature: text(icons.feature),
      cta: text(icons.cta),
    },
    landing: {
      hero_title: text(landing.hero_title),
      hero_description: text(landing.hero_description),
      cta_label: text(landing.cta_label),
    },
    // Las imágenes del hero se editan en Identidad visual; se conservan al guardar aquí.
    hero_images: sanitizeHeroImages(source.hero_images),
  };
}

function isSecureAssetUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    return new URL(value).protocol === "https:" && value.length <= 2048;
  } catch {
    return false;
  }
}

function validateDraft(draft: VisualAssets): string | null {
  const landing = draft.landing ?? {};
  if ((landing.hero_title?.length ?? 0) > 160) return "El título no puede superar 160 caracteres.";
  if ((landing.hero_description?.length ?? 0) > 400)
    return "La descripción no puede superar 400 caracteres.";
  if ((landing.cta_label?.length ?? 0) > 100)
    return "El texto del botón no puede superar 100 caracteres.";
  for (const key of imageKeys) {
    if (!isSecureAssetUrl(draft[key] ?? ""))
      return "Usa una URL HTTPS válida para las imágenes y el favicon.";
  }
  if (draft.hero_link_url && safeHeroLinkUrl(draft.hero_link_url) !== draft.hero_link_url.trim())
    return "El enlace del hero debe ser HTTPS o una ruta segura del sitio (por ejemplo /modulos).";
  for (const url of Object.values(draft.icon_urls ?? {})) {
    if (!isSecureAssetUrl(url ?? "")) return "Usa una URL HTTPS válida para los iconos.";
  }
  const opacity = draft.hero_opacity ?? 0.8;
  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1)
    return "La opacidad debe estar entre 0 y 100%.";
  return null;
}

function safePreviewUrl(value: string | undefined): string {
  return value && isSecureAssetUrl(value) ? value.trim() : "";
}

export function PublicLandingSettingsEditor() {
  const [draft, setDraft] = useState<VisualAssets>(() => normalizeDraft({}));
  const [savedDraft, setSavedDraft] = useState<VisualAssets>(() => normalizeDraft({}));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [landingPreview, setLandingPreview] = useState<SaasLandingSettings | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase.rpc("fetch_public_landing_settings");
      if (error) {
        setLoadError(`No se pudo cargar la configuración global: ${error.message}`);
      } else {
        const normalized = normalizeDraft(data);
        setDraft(normalized);
        setSavedDraft(normalized);
      }
    } catch (error) {
      setLoadError(
        `No se pudo cargar la configuración global: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let mounted = true;
    void fetchSaasLandingSettings()
      .then((settings) => {
        if (mounted) setLandingPreview(settings);
      })
      .catch(() => {
        // If the new migration is not present yet, the legacy copy remains a visual fallback.
      });
    const onLandingUpdated = (event: Event) => {
      const settings = (event as CustomEvent<SaasLandingSettings>).detail;
      if (settings) setLandingPreview(settings);
    };
    window.addEventListener("bjsig:saas-landing-updated", onLandingUpdated);
    return () => {
      mounted = false;
      window.removeEventListener("bjsig:saas-landing-updated", onLandingUpdated);
    };
  }, []);

  const dirty = JSON.stringify(draft) !== JSON.stringify(savedDraft);
  const safeHeroUrl = safePreviewUrl(draft.hero_image_url);
  const opacity = draft.hero_opacity ?? 0.8;
  const previewTitle =
    landingPreview?.heroTitle ||
    draft.landing?.hero_title?.trim() ||
    DEFAULT_SAAS_LANDING.heroTitle;
  const previewDescription =
    landingPreview?.heroDescription ||
    draft.landing?.hero_description?.trim() ||
    DEFAULT_SAAS_LANDING.heroDescription;
  const previewCta =
    landingPreview?.primaryCtaLabel ||
    draft.landing?.cta_label?.trim() ||
    DEFAULT_SAAS_LANDING.primaryCtaLabel;

  function updateImage(key: ImageKey, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
    setFeedback(null);
  }

  function updateIcon(key: IconKey, value: string) {
    setDraft((current) => ({
      ...current,
      icon_urls: { ...current.icon_urls, [key]: value },
    }));
    setFeedback(null);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateDraft(draft);
    if (validationError) {
      setFeedback(validationError);
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      const { error } = await supabase.rpc("update_public_landing_settings", {
        _visual_assets: draft,
      });
      if (error) {
        setFeedback(`No se publicaron los cambios: ${error.message}`);
      } else {
        const published = normalizeDraft(draft);
        setDraft(published);
        setSavedDraft(published);
        setFeedback("Cambios publicados en la landing principal.");
      }
    } catch (error) {
      setFeedback(
        `No se publicaron los cambios: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setSaving(false);
    }
  }

  function openPreview() {
    try {
      window.sessionStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      setFeedback("El navegador no permitió preparar la vista previa en esta pestaña.");
      return;
    }
    const previewWindow = window.open("/?landing-preview=1", "_blank");
    if (!previewWindow) {
      try {
        window.sessionStorage.removeItem(PREVIEW_STORAGE_KEY);
      } catch {
        // The browser may block storage as well as the new window.
      }
      setFeedback(
        "El navegador bloqueó la vista previa. Permite ventanas emergentes e inténtalo otra vez.",
      );
      return;
    }
    previewWindow.opener = null;
  }

  const imageFields: Array<[ImageKey, string, string]> = [
    ["favicon_url", "Favicon", "https://.../favicon.png"],
    ["header_image_url", "Imagen del encabezado", "https://.../header.jpg"],
    ["hero_image_url", "Imagen principal", "https://.../hero.jpg"],
  ];
  const iconFields: Array<[IconKey, string]> = [
    ["brand", "Marca / encabezado"],
    ["hero", "Hero y botón de acceso"],
    ["feature", "Beneficios"],
    ["cta", "Llamada a la acción"],
  ];

  return (
    <section className="space-y-5" aria-labelledby="main-landing-editor-title">
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <Globe2 size={19} className="mt-1 shrink-0 text-blue-700" aria-hidden="true" />
          <div>
            <h2 id="main-landing-editor-title" className="text-xl font-black text-slate-950">
              Landing principal
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              Edita los recursos visuales globales de{" "}
              <code className="font-semibold text-slate-800">/</code>. El título, la descripción, el
              botón, la visibilidad y WhatsApp se administran en la tarjeta de contenido de esta
              misma sección.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openPreview}
          disabled={loading || Boolean(loadError)}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Eye size={15} aria-hidden="true" />
          Previsualizar cambios
          <ExternalLink size={13} aria-hidden="true" />
        </button>
      </header>

      {loadError && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          role="alert"
        >
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="min-h-10 rounded-lg border border-red-300 px-3 font-semibold hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
          >
            Reintentar
          </button>
        </div>
      )}
      {feedback && (
        <p
          className={`rounded-xl border px-4 py-3 text-sm ${feedback.startsWith("Cambios") ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-950"}`}
          role={feedback.startsWith("Cambios") ? "status" : "alert"}
        >
          {feedback}
        </p>
      )}

      {loading ? (
        <div
          className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600"
          role="status"
        >
          Cargando la configuración global…
        </div>
      ) : !loadError ? (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
          <form onSubmit={save} className="space-y-5">
            <section className="rounded-3xl border border-blue-100 bg-blue-50/70 p-5">
              <h3 className="text-base font-bold text-slate-900">Copy y publicación</h3>
              <p className="mt-1 text-sm leading-6 text-slate-700">
                El contenido, el teléfono de contacto y la publicación se editan en la tarjeta
                <strong> Landing pública de BJSIGAPP</strong> que aparece arriba. Este formulario
                conserva intactos los textos heredados mientras guarda imágenes, favicon, iconos y
                opacidad.
              </p>
            </section>

            <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">Imágenes y favicon</h3>
                <p className="mt-1 text-sm leading-5 text-slate-600">
                  Usa enlaces HTTPS públicos. Deja vacío para mantener el recurso predeterminado.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {imageFields.map(([key, label, placeholder]) => (
                  <label key={key} className="block text-sm font-semibold text-slate-800">
                    {label}
                    <input
                      type="url"
                      maxLength={2048}
                      value={draft[key] ?? ""}
                      onChange={(event) => updateImage(key, event.target.value)}
                      placeholder={placeholder}
                      className={inputClass}
                    />
                  </label>
                ))}
                <label className="block text-sm font-semibold text-slate-800">
                  Enlace de la imagen principal
                  <input
                    type="text"
                    maxLength={2048}
                    value={draft.hero_link_url ?? ""}
                    onChange={(event) => updateImage("hero_link_url", event.target.value)}
                    placeholder="/modulos o https://..."
                    className={inputClass}
                  />
                  <span className="mt-1 block text-xs font-normal text-slate-500">
                    El fondo completo del hero será clickeable sin cubrir el título ni los botones.
                  </span>
                </label>
              </div>
              <label
                className="block text-sm font-semibold text-slate-800"
                htmlFor="global-hero-opacity"
              >
                Opacidad de la capa del hero
                <div className="mt-2 flex items-center gap-3">
                  <input
                    id="global-hero-opacity"
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={opacity}
                    onChange={(event) => {
                      setDraft((current) => ({
                        ...current,
                        hero_opacity: Number(event.target.value),
                      }));
                      setFeedback(null);
                    }}
                    className="min-w-0 flex-1 accent-blue-700"
                  />
                  <output
                    htmlFor="global-hero-opacity"
                    className="w-12 text-right text-sm tabular-nums text-slate-700"
                  >
                    {Math.round(opacity * 100)}%
                  </output>
                </div>
              </label>
            </section>

            <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">Iconos propagados</h3>
                <p className="mt-1 text-sm leading-5 text-slate-600">
                  Reemplaza los iconos de respaldo en la landing principal.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {iconFields.map(([key, label]) => (
                  <label key={key} className="block text-sm font-semibold text-slate-800">
                    {label}
                    <input
                      type="url"
                      maxLength={2048}
                      value={draft.icon_urls?.[key] ?? ""}
                      onChange={(event) => updateIcon(key, event.target.value)}
                      placeholder="https://.../icon.svg"
                      className={inputClass}
                    />
                  </label>
                ))}
              </div>
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-600">
                {dirty ? "Tienes cambios sin publicar." : "La configuración está publicada."}
              </p>
              <button
                type="submit"
                disabled={saving || !dirty}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700"
              >
                <Save size={15} aria-hidden="true" />
                {saving ? "Publicando…" : "Publicar cambios"}
              </button>
            </div>
          </form>

          <aside className="space-y-3 xl:sticky xl:top-24" aria-label="Vista previa de la landing">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-900">Vista previa del hero</h3>
              <span className="text-xs text-slate-600">Visuales en borrador</span>
            </div>
            <div
              className="overflow-hidden rounded-3xl border border-slate-300 bg-slate-950 bg-cover bg-center text-white"
              style={{
                backgroundImage: `linear-gradient(rgba(2,6,23,${opacity}),rgba(2,6,23,${opacity}))${safeHeroUrl ? `,url("${safeHeroUrl}")` : ""}`,
              }}
            >
              <div className="border-b border-white/15 px-5 py-4 text-sm font-bold">BJSIGAPP</div>
              <div className="px-5 py-8 sm:px-7 sm:py-10">
                {safePreviewUrl(draft.icon_urls?.hero) && (
                  <img
                    src={safePreviewUrl(draft.icon_urls?.hero)}
                    alt=""
                    className="mb-4 h-10 w-10 rounded-lg object-cover"
                  />
                )}
                <h4 className="max-w-xl text-3xl font-bold leading-tight sm:text-4xl">
                  {previewTitle}
                </h4>
                <p className="mt-4 max-w-xl text-sm leading-6 text-slate-200 sm:text-base">
                  {previewDescription}
                </p>
                <span className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white">
                  {previewCta}
                </span>
              </div>
            </div>
            <p className="text-xs leading-5 text-slate-600">
              La previsualización completa de <code>/</code> abre en otra pestaña y no publica el
              borrador.
            </p>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
