import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  fetchMyTenants,
  fetchIsSuperadmin,
  fetchActiveTenantId,
  fetchTenantSettings,
  setActiveTenant,
  isImpersonatingTenant,
  type TenantContextValue,
  type TenantSettings,
  type TenantSummary,
} from "@/lib/tenant";
import { buildAdminPath, navigateTo, parseRoute } from "@/lib/appRoute";
import { loadTenantBranding, setBrandingFallbackName } from "@/lib/logo";
import { effectiveModuleEnabled, effectivePermission, isPlatformRole } from "@/lib/authorization";

const TenantContext = createContext<TenantContextValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components -- mixed component and stable API export is intentional here
export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant debe usarse dentro de TenantProvider");
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components -- mixed component and stable API export is intentional here
export function useTenantOptional(): TenantContextValue | null {
  return useContext(TenantContext);
}

interface Props {
  children: ReactNode;
  /** Sólo se resuelve la empresa cuando hay sesión iniciada. */
  enabled: boolean;
  /** Slug presente en la URL, si lo hay. */
  slugFromUrl?: string | null;
  /** Rol resuelto server-side para distinguir operadores de plataforma. */
  userRole?: string | null;
}

export function TenantProvider({ children, enabled, slugFromUrl, userRole }: Props) {
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [loading, setLoading] = useState(enabled);
  const platformOperator = isPlatformRole(userRole);

  const load = useCallback(async () => {
    if (!enabled) {
      setTenants([]);
      setTenantId(null);
      setSettings(null);
      setIsSuperadmin(false);
      setIsImpersonating(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [list, root, activeId] = await Promise.all([
        fetchMyTenants(platformOperator),
        fetchIsSuperadmin(),
        fetchActiveTenantId(),
      ]);
      setTenants(list);
      setIsSuperadmin(root);

      // La empresa del slug manda, si el usuario tiene acceso a ella.
      const bySlug = slugFromUrl ? list.find((t) => t.slug === slugFromUrl) : undefined;
      let resolved = bySlug?.id ?? activeId ?? null;

      if (bySlug && bySlug.id !== activeId) {
        try {
          await setActiveTenant(bySlug.id, "tenant_slug", platformOperator);
          resolved = bySlug.id;
        } catch {
          resolved = activeId;
        }
      }

      setTenantId(resolved);
      if (resolved) {
        setBrandingFallbackName(list.find((t) => t.id === resolved)?.name);
        await loadTenantBranding(resolved);
      }
      const nextSettings = resolved ? await fetchTenantSettings(resolved) : null;
      setSettings(nextSettings);
      const currentRoute = parseRoute();
      if (
        resolved &&
        nextSettings?.default_view &&
        currentRoute.kind === "admin" &&
        !currentRoute.view
      ) {
        const tenant = list.find((item) => item.id === resolved);
        navigateTo(buildAdminPath(tenant?.slug ?? null, nextSettings.default_view), true);
      }
      setIsImpersonating(root ? await isImpersonatingTenant() : false);
    } finally {
      setLoading(false);
    }
  }, [enabled, slugFromUrl, platformOperator]);

  useEffect(() => {
    void load();
  }, [load]);

  const switchTenant = useCallback(
    async (id: string, reason?: string) => {
      const target = tenants.find((item) => item.id === id);
      if (!target || !target.is_active) throw new Error("Empresa no disponible para esta sesión");
      await setActiveTenant(id, reason, platformOperator);
      // Actualizar la URL antes de la recarga evita que load() resuelva
      // nuevamente el slug anterior y restaure silenciosamente ese tenant.
      const currentRoute = parseRoute();
      const nextView = currentRoute.view ?? settings?.default_view ?? "dashboard";
      navigateTo(buildAdminPath(target.slug, nextView));
    },
    [settings?.default_view, tenants, platformOperator],
  );

  const value = useMemo<TenantContextValue>(() => {
    const tenant = tenants.find((t) => t.id === tenantId) ?? null;
    return {
      tenantId,
      tenant,
      tenants,
      settings,
      isSuperadmin,
      isImpersonating,
      loading,
      moduleEnabled: (key: string) =>
        effectiveModuleEnabled(key, {
          role: settings?.role,
          permissions: settings?.permissions,
          planModules: settings?.plan_modules,
          overrides: settings?.overrides,
          tenantActive: Boolean(tenantId && tenant?.is_active),
          platformContext: platformOperator,
        }),
      permissionEnabled: (key?: string) =>
        effectivePermission(key, {
          role: settings?.role,
          permissions: settings?.permissions,
          planModules: settings?.plan_modules,
          overrides: settings?.overrides,
          tenantActive: Boolean(tenantId && tenant?.is_active),
          platformContext: platformOperator,
        }),
      switchTenant,
      reload: load,
    };
  }, [
    tenantId,
    tenants,
    settings,
    isSuperadmin,
    isImpersonating,
    loading,
    switchTenant,
    load,
    platformOperator,
  ]);

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}
