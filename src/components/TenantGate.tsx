import { useEffect, type ReactNode } from "react";
import { Building2, ShieldAlert, LockKeyhole } from "lucide-react";
import { useTenant } from "@/components/TenantProvider";
import { buildAdminPath, navigateTo, parseRoute } from "@/lib/appRoute";
import { Spinner } from "@/components/ui";

interface Props {
  view: string;
  children: ReactNode;
}

/**
 * Asegura que la URL lleve el identificador de la empresa activa, bloquea el
 * acceso cuando la empresa está suspendida o cortada y muestra el aviso de
 * soporte cuando el dueño del SaaS entra "como" una empresa.
 */
export function TenantGate({ view, children }: Props) {
  const { tenant, loading, isImpersonating, moduleEnabled } = useTenant();

  useEffect(() => {
    if (loading || !tenant?.slug) return;
    const current = parseRoute();
    if (current.kind !== "admin") return;
    if (current.slug !== tenant.slug || current.view !== view) {
      navigateTo(buildAdminPath(tenant.slug, view), true);
    }
  }, [loading, tenant?.slug, view]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spinner />
      </div>
    );
  }

  if (tenant && !tenant.is_active) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-600 mb-4">
            <ShieldAlert size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Acceso suspendido</h1>
          <p className="text-slate-300 text-sm">
            El acceso de {tenant.name} está temporalmente suspendido. Contacta al administrador del
            servicio para reactivarlo.
          </p>
        </div>
      </div>
    );
  }

  if (tenant && view !== "dashboard" && view !== "saas" && !moduleEnabled(view)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 mb-4">
            <LockKeyhole size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Vista no incluida en tu plan</h1>
          <p className="text-slate-300 text-sm">
            El administrador del SaaS debe habilitar <strong>{view}</strong> para {tenant.name} o
            asignar un plan superior.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {isImpersonating && tenant && (
        <div className="sticky top-0 z-50 bg-amber-500 text-white text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2">
          <Building2 size={14} />
          Modo soporte: estás viendo los datos de {tenant.name}. Toda acción queda registrada.
        </div>
      )}
      {children}
    </>
  );
}
