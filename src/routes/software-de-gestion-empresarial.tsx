import { createFileRoute } from "@tanstack/react-router";
import { getSeoPageMetadata, SeoLandingPage } from "@/components/marketing/SeoLandingPage";
import { buildSeoHead } from "@/lib/seo";

const seo = getSeoPageMetadata("gestion");

export const Route = createFileRoute("/software-de-gestion-empresarial")({
  head: () => buildSeoHead(seo),
  component: () => <SeoLandingPage page="gestion" />,
});
