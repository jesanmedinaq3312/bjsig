import { describe, expect, it } from "vitest";
import { sanitizePublicLandingAssets, sanitizeTenantNavigationConfig } from "./logo";

describe("sanitizePublicLandingAssets", () => {
  it("conserva campos permitidos y solo URLs HTTPS válidas", () => {
    const result = sanitizePublicLandingAssets({
      hero_image_url: "https://cdn.example.com/hero.jpg",
      header_image_url: "javascript:alert(1)",
      hero_opacity: 0.45,
      landing: {
        hero_title: "Un título global",
        hero_description: "Descripción pública",
        cta_label: "Solicitar demo",
        internal_note: "no publicar",
      },
      icon_urls: {
        brand: "http://cdn.example.com/brand.svg",
        hero: "https://cdn.example.com/hero.svg",
      },
      secret: "no publicar",
    });

    expect(result.hero_image_url).toBe("https://cdn.example.com/hero.jpg");
    expect(result.header_image_url).toBe("");
    expect(result.hero_opacity).toBe(0.45);
    expect(result.icon_urls).toMatchObject({ brand: "", hero: "https://cdn.example.com/hero.svg" });
    expect(result.landing).toEqual({
      hero_title: "Un título global",
      hero_description: "Descripción pública",
      cta_label: "Solicitar demo",
    });
    expect(result).not.toHaveProperty("secret");
  });

  it("aplica límites seguros y valores predeterminados a datos inválidos", () => {
    const result = sanitizePublicLandingAssets({
      hero_opacity: 1.4,
      landing: { hero_title: "T".repeat(200), hero_description: 12, cta_label: "C".repeat(120) },
      hero_image_url: "https://example.com/" + "x".repeat(2050),
    });

    expect(result.hero_opacity).toBe(0.8);
    expect(result.hero_image_url).toBe("");
    expect(result.landing?.hero_title).toHaveLength(160);
    expect(result.landing?.hero_description).toBe("");
    expect(result.landing?.cta_label).toHaveLength(100);
  });
});

describe("sanitizeTenantNavigationConfig", () => {
  it("conserva el bottom navbar y una opacidad válida", () => {
    expect(sanitizeTenantNavigationConfig({ layout: "bottom", opacity: 0.65 })).toEqual({
      layout: "bottom",
      opacity: 0.65,
    });
  });

  it("usa sidebar y rechaza valores de opacidad fuera del rango seguro", () => {
    expect(sanitizeTenantNavigationConfig({ layout: "invalid", opacity: 1.2 })).toEqual({
      layout: "sidebar",
      opacity: null,
    });
  });
});
