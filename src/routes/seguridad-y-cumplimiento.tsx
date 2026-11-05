import { createFileRoute } from "@tanstack/react-router";
import { getSeoPageMetadata, SeoLandingPage } from "@/components/marketing/SeoLandingPage";
import { buildSeoHead } from "@/lib/seo";

const seo = getSeoPageMetadata("seguridad");

export const Route = createFileRoute("/seguridad-y-cumplimiento")({
  head: () => buildSeoHead(seo),
  component: () => <SeoLandingPage page="seguridad" />,
});
