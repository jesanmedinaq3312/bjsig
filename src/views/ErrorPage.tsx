import type { ReactNode } from "react";
import { ShieldAlert, Compass, Home, LogIn, ArrowLeft } from "lucide-react";
import { navigateTo } from "@/lib/appRoute";

interface ErrorPageProps {
  code: string;
  title: string;
  description: string;
  icon?: ReactNode;
  actions?: ReactNode;
}

export function ErrorPage({ code, title, description, icon, actions }: ErrorPageProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white/95 p-8 text-center shadow-xl backdrop-blur">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          {icon ?? <Compass className="h-8 w-8" />}
        </div>
        <p className="text-5xl font-black tracking-tight text-slate-900">{code}</p>
        <h1 className="mt-2 text-lg font-bold text-slate-800">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{actions}</div>
      </div>
    </div>
  );
}

const primaryBtn =
  "inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700";
const secondaryBtn =
  "inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50";

export function NotFoundPage({
  homePath = "/",
  onBack,
}: {
  homePath?: string;
  onBack?: () => void;
}) {
  return (
    <ErrorPage
      code="404"
      title="Página no encontrada"
      description="La dirección que intentas abrir no existe o fue movida. Revisa el enlace o vuelve al inicio del sistema."
      actions={
        <>
          <button
            type="button"
            className={primaryBtn}
            onClick={() => (onBack ? onBack() : navigateTo(homePath))}
          >
            <Home className="h-4 w-4" /> Volver al inicio
          </button>
          <button type="button" className={secondaryBtn} onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" /> Página anterior
          </button>
        </>
      }
    />
  );
}

export function UnauthorizedPage({
  description = "No tienes los permisos necesarios para ver esta sección. Si crees que es un error, contacta al administrador de tu empresa.",
  homePath = "/",
  onHome,
  onSignOut,
}: {
  description?: string;
  homePath?: string;
  onHome?: () => void;
  onSignOut?: () => void;
}) {
  return (
    <ErrorPage
      code="401"
      title="Acceso no autorizado"
      description={description}
      icon={<ShieldAlert className="h-8 w-8" />}
      actions={
        <>
          <button
            type="button"
            className={primaryBtn}
            onClick={() => (onHome ? onHome() : navigateTo(homePath))}
          >
            <Home className="h-4 w-4" /> Ir al inicio
          </button>
          {onSignOut && (
            <button type="button" className={secondaryBtn} onClick={onSignOut}>
              <LogIn className="h-4 w-4" /> Iniciar sesión con otra cuenta
            </button>
          )}
        </>
      }
    />
  );
}
