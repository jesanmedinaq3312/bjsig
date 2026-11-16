import { useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import { systemConfigRepo } from "./repositories";

export const DEFAULT_COMPANY_LOGO_URL = "";
const LOGO_CONFIG_KEY = "company_logo_url";
const COMPANY_NAME_KEY = "company_name";
const LOGO_BUCKET = "company-branding";

async function getTenantId(): Promise<string> {
  const { data, error } = await supabase.rpc("current_tenant_id");
  if (error || !data) throw new Error("Cannot resolve tenant");
  return data as string;
}

function getLogoPath(tenantId: string): string {
  return `${tenantId}/logo`;
}

type Branding = {
  logoUrl: string;
  companyName: string;
  faviconUrl: string;
  headerImageUrl: string;
  heroImageUrl: string;
  heroOpacity: number;
  navigationLayout: "sidebar" | "bottom";
  navigationOpacity: number | null;
  iconUrls: {
    brand: string;
    hero: string;
    feature: string;
    cta: string;
  };
  landingContent: {
    heroTitle: string;
    heroDescription: string;
    ctaLabel: string;
  };
  heroImages: HeroImage[];
};

/** Imagen opcionalmente enlazada que se muestra en el hero de la landing principal. */
export type HeroImage = {
  image_url: string;
  alt?: string;
  link_url?: string;
};

export const MAX_HERO_IMAGES = 6;

let branding: Branding = {
  logoUrl: DEFAULT_COMPANY_LOGO_URL,
  companyName: "Empresa",
  faviconUrl: "",
  headerImageUrl: "",
  heroImageUrl: "",
  heroOpacity: 0.8,
  navigationLayout: "sidebar",
  navigationOpacity: null,
  iconUrls: { brand: "", hero: "", feature: "", cta: "" },
  landingContent: { heroTitle: "", heroDescription: "", ctaLabel: "" },
  heroImages: [],
};
let loaded = false;
let fallbackCompanyName = "Empresa";

/** Uses the active tenant name whenever no custom brand name is configured. */
export function setBrandingFallbackName(name: string | null | undefined): void {
  fallbackCompanyName = name?.trim() || "Empresa";
  if (!branding.companyName || branding.companyName === "Empresa") {
    branding = { ...branding, companyName: fallbackCompanyName };
    applyDynamicBranding(branding);
    notify();
  }
}

let loadingPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function applyDynamicBranding(b: Branding): void {
  if (typeof document === "undefined") return;
  document.title = `${b.companyName} — SIG`;
  const iconLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (iconLink) iconLink.setAttribute("href", b.faviconUrl || b.logoUrl || "/favicon.ico");
  const root = document.documentElement;
  root.style.setProperty(
    "--brand-header-image",
    b.headerImageUrl ? `url("${b.headerImageUrl}")` : "none",
  );
  root.style.setProperty(
    "--brand-hero-image",
    b.heroImageUrl ? `url("${b.heroImageUrl}")` : "none",
  );
  root.style.setProperty("--brand-hero-opacity", String(b.heroOpacity));
  if (b.navigationOpacity === null) {
    root.style.removeProperty("--brand-navigation-opacity");
  } else {
    root.style.setProperty("--brand-navigation-opacity", String(b.navigationOpacity));
  }
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeCompanyBranding(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCompanyBrandingSnapshot(): Branding {
  return branding;
}

export function useCompanyBranding(): Branding {
  return useSyncExternalStore(
    subscribeCompanyBranding,
    getCompanyBrandingSnapshot,
    getCompanyBrandingSnapshot,
  );
}

export async function loadCompanyBranding(force = false): Promise<void> {
  if (loaded && !force) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = Promise.all([
    systemConfigRepo.getValue(LOGO_CONFIG_KEY),
    systemConfigRepo.getValue(COMPANY_NAME_KEY),
  ])
    .then(([logoUrl, companyName]) => {
      branding = {
        logoUrl: logoUrl?.trim() || DEFAULT_COMPANY_LOGO_URL,
        companyName: companyName?.trim() || fallbackCompanyName,
        faviconUrl: "",
        headerImageUrl: "",
        heroImageUrl: "",
        heroOpacity: 0.8,
        navigationLayout: "sidebar",
        navigationOpacity: null,
        iconUrls: { brand: "", hero: "", feature: "", cta: "" },
        landingContent: { heroTitle: "", heroDescription: "", ctaLabel: "" },
        heroImages: [],
      };
      loaded = true;
      applyDynamicBranding(branding);
      notify();
    })
    .catch(() => {
      loaded = true;
    })
    .finally(() => {
      loadingPromise = null;
    });

  return loadingPromise;
}

/** Loads branding for the resolved tenant and prevents a previous tenant's CSS from persisting. */
export async function loadTenantBranding(tenantId: string): Promise<void> {
  try {
    const { data, error } = await supabase
      .from("tenant_branding")
      .select("company_name, logo_url, color_theme, glass_opacity, visual_assets")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (error) throw error;

    const row = data as {
      company_name?: string | null;
      logo_url?: string | null;
      color_theme?: string | null;
      glass_opacity?: string | null;
      visual_assets?: VisualAssets | null;
    } | null;
    if (row) {
      setBrandingCache(row.logo_url ?? null, row.company_name ?? null, row.visual_assets);
      applyTenantTheme(row.color_theme, row.glass_opacity);
      return;
    }
    await loadCompanyBranding(true);
  } catch {
    // A missing tenant branding row falls back to the legacy tenant-scoped config.
    await loadCompanyBranding(true);
  }
}

/** Carga solo los campos de marca públicos de una empresa antes del login. */
export async function loadTenantBrandingBySlug(slug: string): Promise<boolean> {
  const cleanSlug = slug.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cleanSlug)) return false;

  setBrandingFallbackName("Empresa");
  setBrandingCache(null, "Empresa");
  applyTenantTheme("blue", "0.8");
  const { data, error } = await supabase.rpc("fetch_public_tenant_branding", {
    _slug: cleanSlug,
  });
  if (error || !data) return false;

  const row = (Array.isArray(data) ? data[0] : data) as {
    company_name?: string | null;
    logo_url?: string | null;
    color_theme?: string | null;
    glass_opacity?: string | null;
    visual_assets?: VisualAssets | null;
  } | null;
  if (!row) return false;

  setBrandingFallbackName(row.company_name);
  setBrandingCache(row.logo_url ?? null, row.company_name ?? null, row.visual_assets);
  applyTenantTheme(row.color_theme, row.glass_opacity);
  return true;
}

/** El portal personal resuelve la empresa después de autenticar al trabajador. */
export async function loadCurrentTenantBranding(): Promise<void> {
  const { data, error } = await supabase.rpc("current_tenant_id");
  if (error || typeof data !== "string" || !data) {
    await loadCompanyBranding(true);
    return;
  }
  await loadTenantBranding(data);
}

export function getCompanyLogoUrl(): string {
  return branding.logoUrl;
}

export function getCompanyName(): string {
  return branding.companyName;
}

export type VisualAssets = {
  favicon_url?: string;
  header_image_url?: string;
  hero_image_url?: string;
  hero_opacity?: number;
  navigation?: {
    layout?: "sidebar" | "bottom";
    opacity?: number;
  };
  icon_urls?: {
    brand?: string;
    hero?: string;
    feature?: string;
    cta?: string;
  };
  landing?: {
    hero_title?: string;
    hero_description?: string;
    cta_label?: string;
  };
  hero_images?: HeroImage[];
};

export function sanitizeTenantNavigationConfig(value: unknown): {
  layout: "sidebar" | "bottom";
  opacity: number | null;
} {
  const navigation =
    typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const opacity = navigation.opacity;
  return {
    layout: navigation.layout === "bottom" ? "bottom" : "sidebar",
    opacity:
      typeof opacity === "number" && Number.isFinite(opacity) && opacity >= 0.4 && opacity <= 1
        ? opacity
        : null,
  };
}

function publicAssetUrl(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.length > 2048) return "";
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

/** Accepts HTTPS links or same-site paths such as /contacto or #modulos. */
export function safeHeroLinkUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2048) return "";
  if (/^\/(?!\/)[^\s"<>]*$/.test(trimmed) || /^#[\w-]+$/.test(trimmed)) return trimmed;
  try {
    return new URL(trimmed).protocol === "https:" ? trimmed : "";
  } catch {
    return "";
  }
}

/** Drops hero images without a secure image URL and caps the list. */
export function sanitizeHeroImages(value: unknown): HeroImage[] {
  if (!Array.isArray(value)) return [];
  const images: HeroImage[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const entry = item as Record<string, unknown>;
    const imageUrl = publicAssetUrl(entry.image_url);
    if (!imageUrl) continue;
    images.push({
      image_url: imageUrl,
      alt: typeof entry.alt === "string" ? entry.alt.trim().slice(0, 120) : "",
      link_url: safeHeroLinkUrl(entry.link_url),
    });
    if (images.length >= MAX_HERO_IMAGES) break;
  }
  return images;
}

/** Keeps public landing content within the small, safe set of editable fields. */
export function sanitizePublicLandingAssets(value: unknown): VisualAssets {
  const assets =
    typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const icons =
    typeof assets.icon_urls === "object" && assets.icon_urls !== null
      ? (assets.icon_urls as Record<string, unknown>)
      : {};
  const landing =
    typeof assets.landing === "object" && assets.landing !== null
      ? (assets.landing as Record<string, unknown>)
      : {};
  const opacity = assets.hero_opacity;

  return {
    favicon_url: publicAssetUrl(assets.favicon_url),
    header_image_url: publicAssetUrl(assets.header_image_url),
    hero_image_url: publicAssetUrl(assets.hero_image_url),
    hero_opacity:
      typeof opacity === "number" && Number.isFinite(opacity) && opacity >= 0 && opacity <= 1
        ? opacity
        : 0.8,
    icon_urls: {
      brand: publicAssetUrl(icons.brand),
      hero: publicAssetUrl(icons.hero),
      feature: publicAssetUrl(icons.feature),
      cta: publicAssetUrl(icons.cta),
    },
    landing: {
      hero_title: typeof landing.hero_title === "string" ? landing.hero_title.slice(0, 160) : "",
      hero_description:
        typeof landing.hero_description === "string" ? landing.hero_description.slice(0, 400) : "",
      cta_label: typeof landing.cta_label === "string" ? landing.cta_label.slice(0, 100) : "",
    },
    hero_images: sanitizeHeroImages(assets.hero_images),
  };
}

/** Loads public landing assets without mixing them into tenant branding fetches. */
export async function loadPublicLandingBranding(previewAssets?: unknown): Promise<void> {
  try {
    let source = previewAssets;
    if (source === undefined) {
      const { data, error } = await supabase.rpc("fetch_public_landing_settings");
      if (error) return;
      source = data;
    }
    setBrandingCache(null, "BJSIGAPP", sanitizePublicLandingAssets(source));
    loaded = false;
  } catch {
    // A failed public config fetch leaves the static landing defaults intact.
  }
}

function normalizeVisualAssets(assets?: VisualAssets | null) {
  const opacity = Number(assets?.hero_opacity);
  const navigation = sanitizeTenantNavigationConfig(assets?.navigation);
  return {
    faviconUrl: assets?.favicon_url?.trim() || "",
    headerImageUrl: assets?.header_image_url?.trim() || "",
    heroImageUrl: assets?.hero_image_url?.trim() || "",
    heroOpacity: Number.isFinite(opacity) && opacity >= 0 && opacity <= 1 ? opacity : 0.8,
    navigationLayout: navigation.layout,
    navigationOpacity: navigation.opacity,
    iconUrls: {
      brand: assets?.icon_urls?.brand?.trim() || "",
      hero: assets?.icon_urls?.hero?.trim() || "",
      feature: assets?.icon_urls?.feature?.trim() || "",
      cta: assets?.icon_urls?.cta?.trim() || "",
    },
    landingContent: {
      heroTitle: assets?.landing?.hero_title?.trim() || "",
      heroDescription: assets?.landing?.hero_description?.trim() || "",
      ctaLabel: assets?.landing?.cta_label?.trim() || "",
    },
    heroImages: sanitizeHeroImages(assets?.hero_images),
  };
}

export function setBrandingCache(
  logoUrl: string | null,
  companyName: string | null,
  visualAssets?: VisualAssets | null,
): void {
  branding = {
    logoUrl: logoUrl?.trim() || DEFAULT_COMPANY_LOGO_URL,
    companyName: companyName?.trim() || fallbackCompanyName,
    ...normalizeVisualAssets(visualAssets),
  };
  loaded = true;
  applyDynamicBranding(branding);
  notify();
}

export async function getCompanyLogoBlob(): Promise<Blob | null> {
  if (!branding.logoUrl) return null;
  try {
    const tenantId = await getTenantId();
    const { data: files, error: listError } = await supabase.storage
      .from(LOGO_BUCKET)
      .list(tenantId);
    if (listError || !files || files.length === 0) return null;
    const logoFile = files.find((f) => f.name.startsWith("logo."));
    if (!logoFile) return null;
    const { data, error: dlError } = await supabase.storage
      .from(LOGO_BUCKET)
      .download(`${tenantId}/${logoFile.name}`);
    if (dlError || !data) return null;
    return data as Blob;
  } catch {
    return null;
  }
}

export async function uploadCompanyLogo(file: File): Promise<string> {
  const extension = file.name.split(".").pop()?.toLowerCase() || "png";
  const contentType = file.type || `image/${extension}`;
  const tenantId = await getTenantId();
  const logoPath = getLogoPath(tenantId);

  // Remove any existing logo files with a different extension before uploading
  const { data: existingFiles, error: listError } = await supabase.storage
    .from(LOGO_BUCKET)
    .list(tenantId);
  if (!listError && existingFiles) {
    const stale = existingFiles
      .filter((f) => f.name !== `logo.${extension}` && f.name.startsWith("logo."))
      .map((f) => `${tenantId}/${f.name}`);
    if (stale.length > 0) {
      await supabase.storage.from(LOGO_BUCKET).remove(stale);
    }
  }

  const { error } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(`${logoPath}.${extension}`, file, {
      cacheControl: "3600",
      contentType,
      upsert: true,
    });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(`${logoPath}.${extension}`);
  const cacheBustedUrl = `${data.publicUrl}?v=${Date.now()}`;
  await systemConfigRepo.setValue(LOGO_CONFIG_KEY, cacheBustedUrl);
  return cacheBustedUrl;
}

export async function clearCompanyLogo(): Promise<void> {
  const tenantId = await getTenantId();
  const { data: files, error: listError } = await supabase.storage.from(LOGO_BUCKET).list(tenantId);
  if (listError) throw new Error(listError.message);

  if (files.length > 0) {
    const { error } = await supabase.storage
      .from(LOGO_BUCKET)
      .remove(files.map((file) => `${tenantId}/${file.name}`));
    if (error) throw new Error(error.message);
  }

  await systemConfigRepo.setValue(LOGO_CONFIG_KEY, "");
}

// ── Color theme & glass opacity (visual identity) ─────────────────────────

const COLOR_THEME_KEY = "color_theme";
const GLASS_OPACITY_KEY = "glass_opacity";
const THEME_STORAGE_KEY = "gyc-color-theme";
const GLASS_STORAGE_KEY = "gyc-glass-opacity";

interface ColorTheme {
  primary: string;
  primaryHover: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  textPrimary?: string;
  textMuted?: string;
}

const THEME_PRESETS: Record<string, ColorTheme> = {
  blue: {
    primary: "#2563eb",
    primaryHover: "#1d4ed8",
    accent: "#06b6d4",
    success: "#059669",
    warning: "#d97706",
    error: "#dc2626",
  },
  cyan: {
    primary: "#0891b2",
    primaryHover: "#0e7490",
    accent: "#06b6d4",
    success: "#059669",
    warning: "#d97706",
    error: "#dc2626",
  },
  indigo: {
    primary: "#4f46e5",
    primaryHover: "#4338ca",
    accent: "#818cf8",
    success: "#059669",
    warning: "#d97706",
    error: "#dc2626",
  },
  amber: {
    primary: "#d97706",
    primaryHover: "#b45309",
    accent: "#f59e0b",
    success: "#059669",
    warning: "#b45309",
    error: "#dc2626",
  },
  orange: {
    primary: "#ea580c",
    primaryHover: "#c2410c",
    accent: "#fb923c",
    success: "#059669",
    warning: "#d97706",
    error: "#dc2626",
  },
  emerald: {
    primary: "#059669",
    primaryHover: "#047857",
    accent: "#10b981",
    success: "#059669",
    warning: "#d97706",
    error: "#dc2626",
  },
  violet: {
    primary: "#7c3aed",
    primaryHover: "#6d28d9",
    accent: "#a78bfa",
    success: "#059669",
    warning: "#d97706",
    error: "#dc2626",
  },
  green: {
    primary: "#16a34a",
    primaryHover: "#15803d",
    accent: "#4ade80",
    success: "#059669",
    warning: "#d97706",
    error: "#dc2626",
  },
  rose: {
    primary: "#e11d48",
    primaryHover: "#be123c",
    accent: "#fb7185",
    success: "#059669",
    warning: "#d97706",
    error: "#dc2626",
  },
};

interface GlassOpacity {
  surface: number;
  sidebar: number;
  topbar: number;
  modal: number;
  input: number;
  border: number;
  highlight: number;
}

const DEFAULT_GLASS: GlassOpacity = {
  surface: 0.8,
  sidebar: 0.8,
  topbar: 0.8,
  modal: 0.8,
  input: 0.8,
  border: 0.2,
  highlight: 0.1,
};

function applyThemeToCSS(theme: ColorTheme): void {
  const root = document.documentElement;
  root.style.setProperty("--color-primary", theme.primary);
  root.style.setProperty("--color-primary-hover", theme.primaryHover);
  root.style.setProperty("--color-accent", theme.accent);
  root.style.setProperty("--color-success", theme.success);
  root.style.setProperty("--color-warning", theme.warning);
  root.style.setProperty("--color-error", theme.error);
  if (theme.textPrimary) root.style.setProperty("--color-text", theme.textPrimary);
  if (theme.textMuted) root.style.setProperty("--color-text-muted", theme.textMuted);
}

function applyGlassToCSS(glass: GlassOpacity): void {
  const root = document.documentElement;
  root.style.setProperty("--glass-surface-opacity", String(glass.surface));
  root.style.setProperty("--glass-sidebar-opacity", String(glass.sidebar));
  root.style.setProperty("--glass-topbar-opacity", String(glass.topbar));
  root.style.setProperty("--glass-modal-opacity", String(glass.modal));
  root.style.setProperty("--glass-input-opacity", String(glass.input));
  root.style.setProperty("--glass-border-opacity", String(glass.border));
  root.style.setProperty("--glass-highlight-opacity", String(glass.highlight));
}

function applyTenantTheme(colorTheme?: string | null, glassOpacity?: string | null): void {
  const themeValue = colorTheme?.trim() || "blue";
  if (/^#[0-9a-f]{6}$/i.test(themeValue)) {
    applyThemeToCSS({
      ...THEME_PRESETS.blue,
      primary: themeValue,
      primaryHover: themeValue,
      accent: themeValue,
    });
  } else {
    try {
      const customTheme = JSON.parse(themeValue) as ColorTheme;
      applyThemeToCSS({ ...THEME_PRESETS.blue, ...customTheme });
    } catch {
      applyThemeToCSS(THEME_PRESETS[themeValue] ?? THEME_PRESETS.blue);
    }
  }
  const opacity = Number.parseFloat(glassOpacity ?? "0.8");
  const safeOpacity = Number.isFinite(opacity) && opacity >= 0 && opacity <= 1 ? opacity : 0.8;
  applyGlassToCSS({
    ...DEFAULT_GLASS,
    surface: safeOpacity,
    sidebar: safeOpacity,
    topbar: safeOpacity,
    modal: safeOpacity,
    input: safeOpacity,
  });
}

let themeLoaded = false;
let themeLoadingPromise: Promise<void> | null = null;

export async function loadColorTheme(): Promise<void> {
  if (themeLoaded) return;
  if (themeLoadingPromise) return themeLoadingPromise;

  themeLoadingPromise = (async () => {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const storedGlass = localStorage.getItem(GLASS_STORAGE_KEY);

    if (storedTheme) {
      try {
        applyThemeToCSS(JSON.parse(storedTheme) as ColorTheme);
      } catch {
        /* ignore */
      }
    } else {
      const dbTheme = await systemConfigRepo.getValue(COLOR_THEME_KEY);
      if (dbTheme) {
        try {
          const parsed = JSON.parse(dbTheme) as ColorTheme;
          applyThemeToCSS(parsed);
          localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(parsed));
        } catch {
          /* ignore */
        }
      }
    }

    if (storedGlass) {
      try {
        applyGlassToCSS(JSON.parse(storedGlass) as GlassOpacity);
      } catch {
        /* ignore */
      }
    } else {
      const dbGlass = await systemConfigRepo.getValue(GLASS_OPACITY_KEY);
      if (dbGlass) {
        try {
          const parsed = JSON.parse(dbGlass) as GlassOpacity;
          applyGlassToCSS(parsed);
          localStorage.setItem(GLASS_STORAGE_KEY, JSON.stringify(parsed));
        } catch {
          /* ignore */
        }
      }
    }

    themeLoaded = true;
  })()
    .catch(() => {
      themeLoaded = true;
    })
    .finally(() => {
      themeLoadingPromise = null;
    });

  return themeLoadingPromise;
}
