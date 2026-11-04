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
          "Digitaliza asistencia, EPP, capacitaciones, documentos y Ley Karin de todas tus empresas. Ahorra horas y evita multas. Pide tu demo gratis.",
      },
      { property: "og:title", content: "BJSIGAPP · Controla todas tus empresas sin papeles" },
      {
        property: "og:description",
        content:
          "Digitaliza asistencia, EPP, capacitaciones, documentos y Ley Karin de todas tus empresas. Ahorra horas y evita multas. Pide tu demo gratis.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BjsigShell,
});
