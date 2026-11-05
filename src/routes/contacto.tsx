import { createFileRoute } from "@tanstack/react-router";
import { getSeoPageMetadata, SeoLandingPage } from "@/components/marketing/SeoLandingPage";
import { buildSeoHead } from "@/lib/seo";

const seo = getSeoPageMetadata("contacto");

export const Route = createFileRoute("/contacto")({
  head: () => buildSeoHead(seo),
  component: () => <SeoLandingPage page="contacto" />,
});
