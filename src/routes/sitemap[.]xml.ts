import { createFileRoute } from "@tanstack/react-router";
import { buildPublicSitemapXml } from "@/lib/publicSeo";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const sitemap = buildPublicSitemapXml();
        if (!sitemap) {
          return new Response("Configura VITE_PUBLIC_SITE_URL con el dominio público HTTPS real.", {
            status: 503,
            headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
          });
        }
        return new Response(sitemap, {
          status: 200,
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=3600, s-maxage=3600",
          },
        });
      },
    },
  },
});
