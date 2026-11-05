import { createFileRoute } from "@tanstack/react-router";
import { getSeoPageMetadata, SeoLandingPage } from "@/components/marketing/SeoLandingPage";
import { buildSeoHead } from "@/lib/seo";

const seo = getSeoPageMetadata("home");

export const Route = createFileRoute("/")({
  head: () => buildSeoHead(seo),
  component: () => <SeoLandingPage page="home" />,
});
