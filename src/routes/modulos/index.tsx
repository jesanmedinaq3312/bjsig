import { createFileRoute } from "@tanstack/react-router";
import { PublicModuleCatalog } from "@/components/public/PublicModuleCatalog";
import { getPublicSeoHead } from "@/lib/publicSeo";

const catalogTitle = "Módulos de RR. HH. y gestión empresarial | BJSIGAPP";
const catalogDescription =
  "Explora módulos de recursos humanos, asistencia, prevención, documentos, capacitaciones, portal del trabajador y gestión empresarial en BJSIGAPP.";

export const Route = createFileRoute("/modulos/")({
  head: () =>
    getPublicSeoHead({
      path: "/modulos",
      title: catalogTitle,
      description: catalogDescription,
    }),
  component: PublicModuleCatalog,
});
