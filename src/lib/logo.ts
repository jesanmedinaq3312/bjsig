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
};

let branding: Branding = {
  logoUrl: DEFAULT_COMPANY_LOGO_URL,
  companyName: "Empresa",
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
  if (b.logoUrl) {
    const iconLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (iconLink) iconLink.setAttribute("href", b.logoUrl);
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
      .select("company_name, logo_url, color_theme, glass_opacity")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (error) throw error;

    const row = data as {
      company_name?: string | null;
      logo_url?: string | null;
      color_theme?: string | null;
      glass_opacity?: string | null;
    } | null;
    if (row) {
      setBrandingCache(row.logo_url ?? null, row.company_name ?? null);
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
  } | null;
  if (!row) return false;

  setBrandingFallbackName(row.company_name);
  setBrandingCache(row.logo_url ?? null, row.company_name ?? null);
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

export function setBrandingCache(logoUrl: string | null, companyName: string | null): void {
  branding = {
    logoUrl: logoUrl?.trim() || DEFAULT_COMPANY_LOGO_URL,
    companyName: companyName?.trim() || fallbackCompanyName,
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
