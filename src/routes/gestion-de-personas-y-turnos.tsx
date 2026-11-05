import { createFileRoute } from "@tanstack/react-router";
import { getSeoPageMetadata, SeoLandingPage } from "@/components/marketing/SeoLandingPage";
import { buildSeoHead } from "@/lib/seo";

const seo = getSeoPageMetadata("personas");

export const Route = createFileRoute("/gestion-de-personas-y-turnos")({
  head: () => buildSeoHead(seo),
  component: () => <SeoLandingPage page="personas" />,
});
