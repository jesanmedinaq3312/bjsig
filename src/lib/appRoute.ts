/**
 * Ruteo por empresa: /<slug>/admin/<vista>
 *
 * Rutas soportadas:
 *   /admin                      → acceso administrativo (sin empresa resuelta aún)
 *   /<slug>/admin/<vista>       → aplicación administrativa de una empresa
 *   /admin-saas[/<seccion>]     → panel del dueño del SaaS
 *   cualquier otra              → portal del trabajador
 */

export type RouteKind = "worker" | "admin" | "platform";

export interface ParsedRoute {
  kind: RouteKind;
  slug: string | null;
  view: string | null;
  section: string | null;
}

export function parseRoute(pathname: string = window.location.pathname): ParsedRoute {
  const parts = pathname.split("/").filter(Boolean);

  if (parts[0] === "admin-saas") {
    return { kind: "platform", slug: null, view: null, section: parts[1] ?? "tenants" };
  }
  if (parts[0] === "admin") {
    return { kind: "admin", slug: null, view: parts[1] ?? null, section: null };
  }
  if (parts[1] === "admin") {
    return { kind: "admin", slug: parts[0], view: parts[2] ?? null, section: null };
  }
  if (parts[0] === "trabajador" || parts[0] === "portal-trabajador") {
    return { kind: "worker", slug: null, view: null, section: null };
  }
  return { kind: "worker", slug: parts[0] ?? null, view: null, section: null };
}

export function buildAdminPath(slug: string | null, view: string): string {
  return slug ? `/${slug}/admin/${view}` : `/admin/${view}`;
}

export function navigateTo(path: string, replace = false): void {
  if (window.location.pathname === path) return;
  if (replace) window.history.replaceState({}, "", path);
  else window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function onRouteChange(handler: () => void): () => void {
  window.addEventListener("popstate", handler);
  return () => window.removeEventListener("popstate", handler);
}
