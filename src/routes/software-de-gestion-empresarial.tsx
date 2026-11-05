import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/software-de-gestion-empresarial")({
  server: {
    handlers: {
      GET: () =>
        new Response(null, {
          status: 308,
          headers: {
            location: "/modulos/plataforma-multiempresa",
            "cache-control": "public, max-age=86400",
          },
        }),
    },
  },
});
