import { createFileRoute } from "@tanstack/react-router";
import { BjsigShell } from "@/components/BjsigShell";

export const Route = createFileRoute("/$")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "BJSIGAPP · Gestión empresarial segura" },
      {
        name: "description",
        content: "Accede a tu empresa en BJSIGAPP: personas, prevención, operaciones y documentos.",
      },
      { property: "og:title", content: "BJSIGAPP · Gestión empresarial segura" },
      {
        property: "og:description",
        content: "Accede a tu empresa en BJSIGAPP: personas, prevención, operaciones y documentos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BjsigShell,
});
