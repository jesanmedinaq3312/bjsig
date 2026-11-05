import { PUBLIC_MODULES } from "@/lib/publicModules";

type PublicSeoInput = {
  path: string;
  title: string;
  description: string;
};

export const PUBLIC_INDEXABLE_PATHS = [
  "/",
  "/modulos",
  ...PUBLIC_MODULES.map((module) => `/modulos/${module.slug}`),
] as const;

export function getPublicOrigin(): string | undefined {
  const configured = import.meta.env.VITE_PUBLIC_SITE_URL?.trim();
  if (!configured) return undefined;

  try {
    const parsed = new URL(configured);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) return undefined;
    if (parsed.pathname !== "/" || parsed.search || parsed.hash) return undefined;
    return parsed.origin;
  } catch {
    return undefined;
  }
}

export function getPublicSeoHead({ path, title, description }: PublicSeoInput) {
  const origin = getPublicOrigin();
  const canonical = origin ? new URL(path, origin).toString() : undefined;
  const image = origin ? new URL("/icons/icon-512.png", origin).toString() : undefined;
  const indexingDirectives = origin ? "index,follow,max-image-preview:large" : "noindex,follow";

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: indexingDirectives },
      { name: "googlebot", content: indexingDirectives },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "BJSIGAPP" },
      { property: "og:locale", content: "es_CL" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      ...(canonical ? [{ property: "og:url", content: canonical }] : []),
      ...(image
        ? [
            { property: "og:image", content: image },
            { property: "og:image:alt", content: "BJSIGAPP, plataforma de gestión multiempresa" },
            { name: "twitter:image", content: image },
          ]
        : []),
    ],
    links: canonical ? [{ rel: "canonical", href: canonical }] : [],
  };
}

export function buildPublicSitemapXml(): string | undefined {
  const origin = getPublicOrigin();
  if (!origin) return undefined;

  const urls = PUBLIC_INDEXABLE_PATHS.map((path) => {
    const loc = escapeXml(new URL(path, origin).toString());
    return `  <url><loc>${loc}</loc></url>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
