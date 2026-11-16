import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Link2, Save, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  MAX_HERO_IMAGES,
  safeHeroLinkUrl,
  sanitizeHeroImages,
  type HeroImage,
} from "@/lib/logo";

const inputClass =
  "mt-1 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/20";

function isHttps(value: string): boolean {
  try {
    return new URL(value.trim()).protocol === "https:" && value.length <= 2048;
  } catch {
    return false;
  }
}

/** Validates a draft list; returns a user-facing error or null. */
// eslint-disable-next-line react-refresh/only-export-components -- shared with tests
export function validateHeroImages(images: HeroImage[]): string | null {
  if (images.length > MAX_HERO_IMAGES) return `Máximo ${MAX_HERO_IMAGES} imágenes.`;
  for (const [index, image] of images.entries()) {
    if (!isHttps(image.image_url)) return `Imagen ${index + 1}: usa una URL HTTPS válida.`;
    if ((image.alt ?? "").length > 120)
      return `Imagen ${index + 1}: el texto alternativo no puede superar 120 caracteres.`;
    if ((image.link_url ?? "").trim() && !safeHeroLinkUrl(image.link_url))
      return `Imagen ${index + 1}: el enlace debe ser HTTPS o una ruta del sitio (por ejemplo /contacto).`;
  }
  return null;
}

/** Edits the linked images shown in the main landing hero (global, platform owners only). */
export function HeroImagesEditor() {
  const [base, setBase] = useState<Record<string, unknown>>({});
  const [images, setImages] = useState<HeroImage[]>([]);
  const [saved, setSaved] = useState<string>("[]");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("fetch_public_landing_settings");
    if (error) {
      setFeedback(`No se pudo cargar la landing principal: ${error.message}`);
    } else {
      const source =
        typeof data === "object" && data !== null && !Array.isArray(data)
          ? (data as Record<string, unknown>)
          : {};
      const list = sanitizeHeroImages(source.hero_images);
      setBase(source);
      setImages(list);
      setSaved(JSON.stringify(list));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const update = (index: number, patch: Partial<HeroImage>) => {
    setImages((current) => current.map((img, i) => (i === index ? { ...img, ...patch } : img)));
    setFeedback(null);
  };
  const move = (index: number, delta: number) => {
    setImages((current) => {
      const next = [...current];
      const target = index + delta;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  async function save() {
    const error = validateHeroImages(images);
    if (error) {
      setFeedback(error);
      return;
    }
    setSaving(true);
    const cleaned = images.map((img) => ({
      image_url: img.image_url.trim(),
      alt: (img.alt ?? "").trim(),
      link_url: safeHeroLinkUrl(img.link_url),
    }));
    const { error: rpcError } = await supabase.rpc("update_public_landing_settings", {
      _visual_assets: { ...base, hero_images: cleaned },
    });
    setSaving(false);
    if (rpcError) {
      setFeedback(`No se publicaron las imágenes: ${rpcError.message}`);
      return;
    }
    setImages(cleaned);
    setSaved(JSON.stringify(cleaned));
    setBase((current) => ({ ...current, hero_images: cleaned }));
    setFeedback("Imágenes del hero publicadas en la landing principal.");
  }

  const dirty = JSON.stringify(images) !== saved;

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-sm font-black text-slate-900">Imágenes del hero · Landing principal</h2>
          <p className="mt-1 text-xs text-slate-500">
            Agrega hasta {MAX_HERO_IMAGES} imágenes HTTPS. Cada una puede llevar a un enlace (HTTPS o
            una ruta del sitio, como /contacto).
          </p>
        </div>
        <button
          type="button"
          disabled={loading || images.length >= MAX_HERO_IMAGES}
          onClick={() => setImages((c) => [...c, { image_url: "", alt: "", link_url: "" }])}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
        >
          <ImagePlus size={16} aria-hidden="true" /> Agregar imagen
        </button>
      </div>
      <div className="space-y-4 p-5">
        {loading && <p className="text-sm text-slate-500">Cargando…</p>}
        {!loading && images.length === 0 && (
          <p className="text-sm text-slate-500">Aún no hay imágenes en el hero.</p>
        )}
        {images.map((image, index) => (
          <div
            key={index}
            className="grid gap-3 rounded-2xl border border-slate-200 p-3 sm:grid-cols-[96px_1fr_auto]"
          >
            <div className="flex h-20 w-24 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
              {isHttps(image.image_url) ? (
                <img src={image.image_url.trim()} alt="" className="h-full w-full object-cover" />
              ) : (
                <ImagePlus size={20} className="text-slate-400" aria-hidden="true" />
              )}
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-slate-700">
                URL de la imagen
                <input
                  className={inputClass}
                  value={image.image_url}
                  placeholder="https://.../imagen.jpg"
                  onChange={(e) => update(index, { image_url: e.target.value })}
                />
              </label>
              <label className="text-xs font-semibold text-slate-700">
                <span className="inline-flex items-center gap-1">
                  <Link2 size={12} aria-hidden="true" /> Enlace al hacer clic (opcional)
                </span>
                <input
                  className={inputClass}
                  value={image.link_url ?? ""}
                  placeholder="https://... o /contacto"
                  onChange={(e) => update(index, { link_url: e.target.value })}
                />
              </label>
              <label className="text-xs font-semibold text-slate-700">
                Texto alternativo
                <input
                  className={inputClass}
                  value={image.alt ?? ""}
                  maxLength={120}
                  placeholder="Describe la imagen"
                  onChange={(e) => update(index, { alt: e.target.value })}
                />
              </label>
            </div>
            <div className="flex gap-1 sm:flex-col">
              <button type="button" aria-label="Subir" onClick={() => move(index, -1)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100">
                <ArrowUp size={16} />
              </button>
              <button type="button" aria-label="Bajar" onClick={() => move(index, 1)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100">
                <ArrowDown size={16} />
              </button>
              <button
                type="button"
                aria-label="Quitar imagen"
                onClick={() => setImages((c) => c.filter((_, i) => i !== index))}
                className="rounded-lg p-2 text-red-600 hover:bg-red-50"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!dirty || saving || loading}
            onClick={() => void save()}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-600 disabled:opacity-50"
          >
            <Save size={16} aria-hidden="true" /> {saving ? "Publicando…" : "Publicar imágenes"}
          </button>
          {feedback && (
            <p role="status" className="text-sm text-slate-600">
              {feedback}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
