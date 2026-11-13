import { createFileRoute } from "@tanstack/react-router";
import { PublicLanding } from "@/views/PublicLanding";
import { getPublicSeoHead } from "@/lib/publicSeo";
import { fetchSaasLandingSettings } from "@/lib/saasLanding";

const homeTitle = "BJSIGAPP | Software de RR. HH. multiempresa";
const homeDescription =
  "Plataforma SaaS multiempresa para gestionar recursos humanos, asistencia, prevención, documentos y operación con módulos y permisos configurables.";

export const Route = createFileRoute("/")({
  loader: async () => {
    try {
      return { landing: await fetchSaasLandingSettings() };
    } catch {
      return { landing: null };
    }
  },
  head: () => getPublicSeoHead({ path: "/", title: homeTitle, description: homeDescription }),
  component: HomePage,
});

function HomePage() {
  const { landing } = Route.useLoaderData();
  return <PublicLanding initialLanding={landing} />;
}
