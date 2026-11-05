import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/contacto")({
  server: {
    handlers: {
      GET: () =>
        new Response(null, {
          status: 308,
          headers: { location: "/#contacto", "cache-control": "public, max-age=86400" },
        }),
    },
  },
});
