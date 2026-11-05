import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = process.cwd();
const publicDir = resolve(projectRoot, "public");
const sitemapPath = resolve(publicDir, "sitemap.xml");
const routesPath = resolve(publicDir, "manus-routes.json");
const configuredOrigin = (process.env.VITE_PUBLIC_SITE_URL || "").trim();
const generatedMarker =
  "<!-- Generated from public/manus-routes.json by scripts/generate-sitemap.mjs -->";

if (!configuredOrigin) {
  if (existsSync(sitemapPath) && readFileSync(sitemapPath, "utf8").includes(generatedMarker)) {
    unlinkSync(sitemapPath);
  }
  console.warn(
    "Skipping sitemap generation: set VITE_PUBLIC_SITE_URL to the real public HTTPS origin.",
  );
  process.exit(0);
}

let origin;
try {
  const parsed = new URL(configuredOrigin);
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(
      "VITE_PUBLIC_SITE_URL must be an HTTPS origin without credentials, path, query, or fragment.",
    );
  }
  origin = parsed.origin;
} catch (error) {
  console.error(error instanceof Error ? error.message : "Invalid VITE_PUBLIC_SITE_URL.");
  process.exit(1);
}

if (!existsSync(routesPath)) {
  console.error("Cannot generate sitemap: public/manus-routes.json is missing.");
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(routesPath, "utf8"));
const publicPaths = manifest.routes
  .map((route) => route.path)
  .filter((path) => path === "/" || path.startsWith("/modulos/"))
  .filter((path) => !path.includes(":") && !path.includes("$"));

const uniquePaths = [...new Set(publicPaths)];
const entries = uniquePaths
  .map((path) => `  <url><loc>${new URL(path, origin).toString()}</loc></url>`)
  .join("\n");
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  generatedMarker,
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  entries,
  "</urlset>",
  "",
].join("\n");

writeFileSync(sitemapPath, sitemap, "utf8");
console.log(`Generated public/sitemap.xml with ${uniquePaths.length} public URLs.`);
