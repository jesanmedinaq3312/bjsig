import { createFileRoute } from "@tanstack/react-router";
import { ModuleDirectoryPage } from "@/components/marketing/ModuleDirectoryPage";
import { buildSeoHead, type SeoPageInput } from "@/lib/seo";

const moduleDirectorySeo: SeoPageInput = {
  path: "/modulos",
  title: "Módulos de gestión empresarial multisucursal | BJSIGAPP",
  description:
    "Explora los módulos de BJSIGAPP para ordenar personas, asistencia, turnos, prevención, EPP y documentos en empresas con varias sucursales.",
  keywords: [
    "módulos de gestión empresarial",
    "software de gestión multisucursal",
    "asistencia y turnos",
    "prevención y EPP",
    "BJSIGAPP",
  ],
};

export const Route = createFileRoute("/modulos")({
  head: () => buildSeoHead(moduleDirectorySeo),
  component: ModuleDirectoryPage,
});
