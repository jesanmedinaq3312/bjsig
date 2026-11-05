import { createFileRoute } from "@tanstack/react-router";
import { PUBLIC_SITE_ORIGIN } from "@/lib/seo";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () => {
        const lines = [
          "User-agent: *",
          "Allow: /",
          "Disallow: /api/",
          ...(PUBLIC_SITE_ORIGIN ? [`Sitemap: ${PUBLIC_SITE_ORIGIN}/sitemap.xml`] : []),
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
