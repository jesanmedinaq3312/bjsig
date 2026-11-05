import { createFileRoute } from "@tanstack/react-router";
import { BjsigShell } from "@/components/BjsigShell";

export const Route = createFileRoute("/$")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Acceso y portales de BJSIGAPP" },
      {
        name: "description",
        content: "Acceso privado a los portales de trabajadores y administración de BJSIGAPP.",
      },
      { name: "robots", content: "noindex,nofollow" },
      { name: "googlebot", content: "noindex,nofollow" },
      { property: "og:title", content: "Acceso y portales de BJSIGAPP" },
      {
        property: "og:description",
        content: "Acceso privado a los portales de trabajadores y administración de BJSIGAPP.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BjsigShell,
});
