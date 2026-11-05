import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/seguridad-y-cumplimiento")({
  server: {
    handlers: {
      GET: () =>
        new Response(null, {
          status: 308,
          headers: {
            location: "/modulos/prevencion-de-riesgos",
            "cache-control": "public, max-age=86400",
          },
        }),
    },
  },
});
