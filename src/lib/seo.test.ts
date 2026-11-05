import { describe, expect, it } from "vitest";
import {
  buildSeoHead,
  buildSitemapXml,
  INDEXABLE_PUBLIC_PATHS,
  PUBLIC_SITE_ORIGIN,
} from "./seo";

describe("SEO público", () => {
  it("incluye el índice /modulos entre las rutas comerciales", () => {
    expect(INDEXABLE_PUBLIC_PATHS).toContain("/modulos");
  });

  it("habilita indexación y sitemap sólo cuando el origen HTTPS real está configurado", () => {
    const head = buildSeoHead({
      path: "/modulos",
      title: "Módulos de gestión empresarial | BJSIGAPP",
      description: "Explora los módulos de gestión empresarial multisucursal.",
      keywords: ["gestión multisucursal"],
    });
    const robots = head.meta.find((item) => "name" in item && item.name === "robots");
    const canonical = head.links?.find((item) => item.rel === "canonical");

    if (PUBLIC_SITE_ORIGIN) {
      expect(robots && "content" in robots ? robots.content : null).toBe(
        "index,follow,max-image-preview:large",
      );
      expect(canonical?.href).toBe(`${PUBLIC_SITE_ORIGIN}/modulos`);
      expect(buildSitemapXml()).toContain(`${PUBLIC_SITE_ORIGIN}/modulos`);
    } else {
      expect(robots && "content" in robots ? robots.content : null).toBe("noindex,follow");
      expect(canonical).toBeUndefined();
      expect(buildSitemapXml()).toBeNull();
    }
  });
});
