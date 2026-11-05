import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/gestion-multisucursal")({
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
