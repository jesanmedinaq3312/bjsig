import { createFileRoute } from "@tanstack/react-router";
import { getSeoPageMetadata, SeoLandingPage } from "@/components/marketing/SeoLandingPage";
import { buildSeoHead } from "@/lib/seo";

const seo = getSeoPageMetadata("multisucursal");

export const Route = createFileRoute("/gestion-multisucursal")({
  head: () => buildSeoHead(seo),
  component: () => <SeoLandingPage page="multisucursal" />,
});
