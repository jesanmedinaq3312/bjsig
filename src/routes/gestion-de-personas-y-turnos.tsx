import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/gestion-de-personas-y-turnos")({
  server: {
    handlers: {
      GET: () =>
        new Response(null, {
          status: 308,
          headers: { location: "/modulos", "cache-control": "public, max-age=86400" },
        }),
    },
  },
});
