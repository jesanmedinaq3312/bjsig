import { supabase } from "@/lib/supabase";

export interface SaasLandingSettings {
  enabled: boolean;
  heroTitle: string;
  heroDescription: string;
  primaryCtaLabel: string;
  whatsappPhone: string;
}

export interface CompanyLandingSettings {
  companyName: string;
  logoUrl: string;
  heroImageUrl: string;
  ctaLabel: string;
}

export const DEFAULT_SAAS_LANDING: SaasLandingSettings = {
  enabled: true,
  heroTitle: "Software multiempresa de RR. HH. y operaciones",
  heroDescription:
    "Administra personas, asistencia, turnos, prevención, documentos y procesos internos desde una plataforma SaaS. Configura módulos, permisos e identidad para cada empresa.",
  primaryCtaLabel: "Solicitar una demo",
  whatsappPhone: "56941228089",
};

function firstRow(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    const first = value[0];
    return first && typeof first === "object" ? (first as Record<string, unknown>) : null;
  }
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export function normalizeSaasLandingSettings(value: unknown): SaasLandingSettings {
  const row = firstRow(value);
  if (!row) return DEFAULT_SAAS_LANDING;
  const phone = String(row.whatsapp_phone ?? DEFAULT_SAAS_LANDING.whatsappPhone).replace(/\D/g, "");
  return {
    enabled: row.enabled !== false,
    heroTitle: String(row.hero_title ?? DEFAULT_SAAS_LANDING.heroTitle),
    heroDescription: String(row.hero_description ?? DEFAULT_SAAS_LANDING.heroDescription),
    primaryCtaLabel: String(row.primary_cta_label ?? DEFAULT_SAAS_LANDING.primaryCtaLabel),
    whatsappPhone:
      phone.length >= 8 && phone.length <= 15 ? phone : DEFAULT_SAAS_LANDING.whatsappPhone,
  };
}

export async function fetchSaasLandingSettings(): Promise<SaasLandingSettings> {
  const { data, error } = await supabase.rpc("fetch_public_saas_landing");
  if (error) throw error;
  return normalizeSaasLandingSettings(data);
}

export async function saveSaasLandingSettings(settings: SaasLandingSettings): Promise<void> {
  const { error } = await supabase.rpc("update_saas_public_landing", {
    _enabled: settings.enabled,
    _hero_title: settings.heroTitle.trim(),
    _hero_description: settings.heroDescription.trim(),
    _primary_cta_label: settings.primaryCtaLabel.trim(),
    _whatsapp_phone: settings.whatsappPhone.replace(/\D/g, ""),
  });
  if (error) throw error;
}

export async function fetchCompanyLandingSettings(
  slug: string,
): Promise<CompanyLandingSettings | null> {
  const { data, error } = await supabase.rpc("fetch_public_tenant_landing", {
    _slug: slug,
  });
  if (error) throw error;
  const row = firstRow(data);
  if (!row) return null;
  return {
    companyName: String(row.company_name ?? "Empresa"),
    logoUrl: String(row.logo_url ?? ""),
    heroImageUrl: String(
      (row.visual_assets as Record<string, unknown> | null)?.hero_image_url ?? "",
    ),
    ctaLabel: String(row.landing_cta_label ?? "Acceder al portal"),
  };
}

export function buildWhatsAppUrl(phone: string, message?: string): string {
  const normalized = phone.replace(/\D/g, "");
  const query = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${normalized}${query}`;
}
