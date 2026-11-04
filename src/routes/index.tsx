import { createFileRoute } from "@tanstack/react-router";
import { BjsigShell } from "@/components/BjsigShell";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "BJSIGAPP · Controla todas tus empresas sin papeles" },
      {
        name: "description",
        content:
          "BJSIGAPP conecta la gestión de personas, seguridad, operaciones y cumplimiento en un solo lugar.",
      },
      { property: "og:title", content: "BJSIGAPP · Controla todas tus empresas sin papeles" },
      {
        property: "og:description",
        content:
          "BJSIGAPP conecta la gestión de personas, seguridad, operaciones y cumplimiento en un solo lugar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BjsigShell,
});
