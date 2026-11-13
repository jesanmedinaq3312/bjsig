import { describe, expect, it } from "vitest";
import {
  buildWhatsAppUrl,
  DEFAULT_SAAS_LANDING,
  normalizeSaasLandingSettings,
} from "./saasLanding";

describe("SaaS public landing settings", () => {
  it("falls back to the existing public copy when the RPC returns no row", () => {
    expect(normalizeSaasLandingSettings(null)).toEqual(DEFAULT_SAAS_LANDING);
  });

  it("normalizes the RPC row and strips formatting from the phone", () => {
    expect(
      normalizeSaasLandingSettings([
        {
          enabled: false,
          hero_title: "Mi título",
          hero_description: "Mi descripción",
          primary_cta_label: "Agenda",
          whatsapp_phone: "+56 9 4122-8089",
        },
      ]),
    ).toEqual({
      enabled: false,
      heroTitle: "Mi título",
      heroDescription: "Mi descripción",
      primaryCtaLabel: "Agenda",
      whatsappPhone: "56941228089",
    });
  });

  it("uses the default phone if a public response contains an invalid phone", () => {
    expect(normalizeSaasLandingSettings({ whatsapp_phone: "123" }).whatsappPhone).toBe(
      DEFAULT_SAAS_LANDING.whatsappPhone,
    );
  });

  it("builds an encoded WhatsApp URL from the configured phone", () => {
    expect(buildWhatsAppUrl("+56 9 4122 8089", "Hola, quiero una demo")).toBe(
      "https://wa.me/56941228089?text=Hola%2C%20quiero%20una%20demo",
    );
  });
});
