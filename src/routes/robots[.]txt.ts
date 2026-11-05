import { createFileRoute } from "@tanstack/react-router";
import { getPublicOrigin } from "@/lib/publicSeo";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () => {
        const origin = getPublicOrigin();
        const lines = [
          "User-agent: *",
          "Allow: /",
          "Disallow: /api/",
          "Disallow: /admin",
          "Disallow: /admin-saas",
          "Disallow: /trabajador",
          "Disallow: /portal-trabajador",
          "Disallow: /*/admin",
          "Disallow: /*/admin/",
          ...(origin ? [`Sitemap: ${origin}/sitemap.xml`] : []),
          "",
        ];
        return new Response(lines.join("\n"), {
          status: 200,
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "public, max-age=3600, s-maxage=3600",
          },
        });
      },
    },
  },
});
