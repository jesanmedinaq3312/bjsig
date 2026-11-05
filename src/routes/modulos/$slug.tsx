import { createFileRoute, notFound } from "@tanstack/react-router";
import { PublicModuleDetail, PublicModuleNotFound } from "@/components/public/PublicModuleDetail";
import { PUBLIC_MODULES_BY_SLUG } from "@/lib/publicModules";
import { getPublicSeoHead } from "@/lib/publicSeo";

export const Route = createFileRoute("/modulos/$slug")({
  loader: ({ params }) => {
    const module = PUBLIC_MODULES_BY_SLUG[params.slug];
    if (!module) throw notFound();
    return module;
  },
  head: ({ loaderData }) =>
    loaderData
      ? getPublicSeoHead({
          path: `/modulos/${loaderData.slug}`,
          title: loaderData.seoTitle,
          description: loaderData.description,
        })
      : {
          meta: [
            { title: "Módulo no encontrado | BJSIGAPP" },
            { name: "robots", content: "noindex, nofollow" },
          ],
        },
  notFoundComponent: PublicModuleNotFound,
  component: ModulePage,
});

function ModulePage() {
  const module = Route.useLoaderData();
  return <PublicModuleDetail module={module} />;
}
