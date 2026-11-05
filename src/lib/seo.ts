export const PUBLIC_SITE_ORIGIN = normalizePublicOrigin(import.meta.env.VITE_PUBLIC_SITE_URL);

export const INDEXABLE_PUBLIC_PATHS = [
  "/",
  "/modulos",
  "/gestion-multisucursal",
  "/software-de-gestion-empresarial",
  "/gestion-de-personas-y-turnos",
  "/seguridad-y-cumplimiento",
  "/contacto",
] as const;

function normalizePublicOrigin(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

export interface SeoPageInput {
  path: (typeof INDEXABLE_PUBLIC_PATHS)[number];
  title: string;
  description: string;
  keywords: string[];
}

export function buildSeoHead({ path, title, description, keywords }: SeoPageInput) {
  const canonicalUrl = PUBLIC_SITE_ORIGIN ? new URL(path, PUBLIC_SITE_ORIGIN).toString() : null;
  const imageUrl = PUBLIC_SITE_ORIGIN
    ? new URL("/icons/icon-512.png", PUBLIC_SITE_ORIGIN).toString()
    : null;
  const indexingDirectives = PUBLIC_SITE_ORIGIN
    ? "index,follow,max-image-preview:large"
    : "noindex,follow";

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { name: "keywords", content: keywords.join(", ") },
      { name: "robots", content: indexingDirectives },
      { name: "googlebot", content: indexingDirectives },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "BJSIGAPP" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      ...(canonicalUrl ? [{ property: "og:url", content: canonicalUrl }] : []),
      ...(imageUrl ? [{ property: "og:image", content: imageUrl }] : []),
      ...(imageUrl ? [{ property: "og:image:alt", content: "BJSIGAPP, gestión empresarial" }] : []),
      { name: "twitter:card", content: imageUrl ? "summary_large_image" : "summary" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      ...(imageUrl ? [{ name: "twitter:image", content: imageUrl }] : []),
    ],
    links: canonicalUrl ? [{ rel: "canonical", href: canonicalUrl }] : [],
  };
}

export function buildSitemapXml(): string | null {
  if (!PUBLIC_SITE_ORIGIN) return null;
  const urls = INDEXABLE_PUBLIC_PATHS.map((path) => {
    const loc = escapeXml(new URL(path, PUBLIC_SITE_ORIGIN).toString());
    return `  <url><loc>${loc}</loc></url>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}
