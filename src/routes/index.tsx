import { createFileRoute } from "@tanstack/react-router";
import { PublicLanding } from "@/views/PublicLanding";
import { getPublicSeoHead } from "@/lib/publicSeo";

const homeTitle = "BJSIGAPP | Software de RR. HH. multiempresa";
const homeDescription =
  "Plataforma SaaS multiempresa para gestionar recursos humanos, asistencia, prevención, documentos y operación con módulos y permisos configurables.";

export const Route = createFileRoute("/")({
  head: () => getPublicSeoHead({ path: "/", title: homeTitle, description: homeDescription }),
  component: PublicLanding,
});
