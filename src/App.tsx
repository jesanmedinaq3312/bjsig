import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Layout, type ViewKey } from "@/components/Layout";
import { WorkerLayout } from "@/components/WorkerLayout";
import { audit } from "@/lib/audit";
import { useAppData } from "@/hooks/useAppData";
import { useAuth } from "@/hooks/useAuth";
import { GpsSessionGate } from "@/components/auth/GpsSessionGate";
import { AuthScreen } from "@/views/Auth";
import { WorkerChangePassword } from "@/components/WorkerChangePassword";
import { WorkerRecoveryPassword } from "@/components/WorkerRecoveryPassword";
import { OfflineBanner } from "@/components/OfflineBanner";
import { WorkerAuthScreen } from "@/views/WorkerAuth";
import { useLoading } from "@/components/LoadingProvider";
import { Spinner, FullScreenLoader, ReloadingBanner } from "@/components/ui";
import { useTheme } from "@/hooks/useTheme";
import { ViewErrorBoundary } from "@/components/ViewErrorBoundary";
import { useNavigationTracking } from "@/hooks/useNavigationTracking";
import { useToast } from "@/components/Toast";
import { TenantProvider } from "@/components/TenantProvider";
import { TenantGate } from "@/components/TenantGate";
import { DeveloperNoticeBanner } from "@/components/DeveloperNoticeBanner";
import { canAccessPermission, isPlatformRole } from "@/lib/roleAccess";
import { hasOperationalAccess } from "@/lib/authorization";
import { PublicDocument, PublicLanding } from "@/views/PublicLanding";
import { NotFoundPage, UnauthorizedPage } from "@/views/ErrorPage";
import {
  parseRoute,
  buildAdminPath,
  navigateTo,
  onRouteChange,
  type ParsedRoute,
} from "@/lib/appRoute";

const Dashboard = lazy(() => import("@/views/Dashboard").then((m) => ({ default: m.Dashboard })));
const WorkersView = lazy(() => import("@/views/Workers").then((m) => ({ default: m.WorkersView })));
const TerrainView = lazy(() => import("@/views/Terrain").then((m) => ({ default: m.TerrainView })));
const IncidentsView = lazy(() =>
  import("@/views/Incidents").then((m) => ({ default: m.IncidentsView })),
);
const DocsView = lazy(() => import("@/views/Docs").then((m) => ({ default: m.DocsView })));
const TrainingsView = lazy(() =>
  import("@/views/Trainings").then((m) => ({ default: m.TrainingsView })),
);
const ShiftsView = lazy(() => import("@/views/Shifts").then((m) => ({ default: m.ShiftsView })));
const IndicatorsView = lazy(() =>
  import("@/views/Indicators").then((m) => ({ default: m.IndicatorsView })),
);
const IsoView = lazy(() => import("@/views/Iso").then((m) => ({ default: m.IsoView })));
const CalendarView = lazy(() =>
  import("@/views/Calendar").then((m) => ({ default: m.CalendarView })),
);
const CloudDocsView = lazy(() =>
  import("@/views/CloudDocs").then((m) => ({ default: m.CloudDocsView })),
);
const SettingsView = lazy(() =>
  import("@/views/Settings").then((m) => ({ default: m.SettingsView })),
);
const LogsView = lazy(() => import("@/views/Logs").then((m) => ({ default: m.LogsView })));
const WorkerPortal = lazy(() =>
  import("@/views/WorkerPortal").then((m) => ({ default: m.WorkerPortal })),
);
const PayrollView = lazy(() => import("@/views/Payroll").then((m) => ({ default: m.PayrollView })));
const PerformanceView = lazy(() =>
  import("@/views/Performance").then((m) => ({ default: m.PerformanceView })),
);
const VacationsView = lazy(() =>
  import("@/views/Vacations").then((m) => ({ default: m.VacationsView })),
);
const FiniquitosView = lazy(() =>
  import("@/views/Finiquitos").then((m) => ({ default: m.FiniquitosView })),
);
const SecurityTalksView = lazy(() =>
  import("@/views/SecurityTalks").then((m) => ({ default: m.SecurityTalksView })),
);
const IperMatrixView = lazy(() =>
  import("@/views/IperMatrix").then((m) => ({ default: m.IperMatrixView })),
);
const ComplianceDocsView = lazy(() =>
  import("@/views/ComplianceDocs").then((m) => ({
    default: m.ComplianceDocsView,
  })),
);
const DepartmentsView = lazy(() =>
  import("@/views/Departments").then((m) => ({ default: m.DepartmentsView })),
);
const OrganigramaView = lazy(() =>
  import("@/views/Organigrama").then((m) => ({ default: m.OrganigramaView })),
);
const GdprView = lazy(() => import("@/views/Gdpr").then((m) => ({ default: m.GdprView })));
const EppWarehouseView = lazy(() =>
  import("@/views/EppWarehouse").then((m) => ({ default: m.EppWarehouseView })),
);
const TreasuryView = lazy(() =>
  import("@/views/Treasury").then((m) => ({ default: m.TreasuryView })),
);
const CommercialView = lazy(() =>
  import("@/views/Commercial").then((m) => ({ default: m.CommercialView })),
);
const MedicalLicensesView = lazy(() =>
  import("@/views/MedicalLicenses").then((m) => ({
    default: m.MedicalLicensesView,
  })),
);
const CommunicationsView = lazy(() =>
  import("@/views/Communications").then((m) => ({
    default: m.CommunicationsView,
  })),
);
const ExtendedFinanceView = lazy(() =>
  import("@/views/ExtendedFinance").then((m) => ({
    default: m.ExtendedFinanceView,
  })),
);
const HarassmentReportsView = lazy(() =>
  import("@/views/HarassmentReports").then((m) => ({
    default: m.HarassmentReportsView,
  })),
);
const SecurityBreachesView = lazy(() =>
  import("@/views/SecurityBreaches").then((m) => ({
    default: m.SecurityBreachesView,
  })),
);
const SaaSControlPanel = lazy(() =>
  import("@/views/settings/SaaSControlPanel").then((m) => ({
    default: m.SaaSControlPanel,
  })),
);

const VIEW_STORAGE_KEY = "gyc_current_view";

// Vistas válidas del panel administrativo: cualquier otra ruta /<empresa>/admin/<vista>
// se considera inexistente y muestra la página 404.
const KNOWN_VIEWS = new Set<string>([
  "dashboard",
  "workers",
  "terrain",
  "incidents",
  "docs",
  "trainings",
  "indicators",
  "iso",
  "calendar",
  "clouddocs",
  "settings",
  "logs",
  "shifts",
  "payroll",
  "performance",
  "workerportal",
  "vacations",
  "finiquitos",
  "securitytalks",
  "ipermatrix",
  "compliancedocs",
  "saas",
  "departments",
  "organigrama",
  "gdpr",
  "eppwarehouse",
  "treasury",
  "medicallicenses",
  "commercial",
  "communications",
  "extendedfinance",
  "harassmentreports",
  "securitybreaches",
]);

function getInitialView(): ViewKey {
  const initialRoute = parseRoute();
  if (initialRoute.kind === "platform") return "saas";
  const fromUrl = initialRoute.view;
  if (fromUrl) return fromUrl as ViewKey;
  try {
    const saved = localStorage.getItem(VIEW_STORAGE_KEY) as ViewKey | null;
    if (saved) return saved;
  } catch {
    /* ignore */
  }
  return "dashboard";
}

export function App() {
  useTheme();
  const toast = useToast();
  const [view, setView] = useState<ViewKey>(getInitialView);
  const [route, setRoute] = useState<ParsedRoute>(() => parseRoute());
  const previewParams = new URLSearchParams(window.location.search);
  const publicPath = window.location.pathname;
  const previewWorkerRut =
    previewParams.get("preview") === "worker" ? previewParams.get("worker_rut") : null;
  const previewEmail = previewParams.get("preview_email") ?? "";
  const {
    session,
    loading: authLoading,
    isAdmin,
    isWorker,
    workerRut,
    mustChangePassword,
    passwordRecovery,
    clearMustChangePassword,
    clearPasswordRecovery,
    signOut,
    permissions,
    userRole,
    emailOtpStatus,
    gpsAccessStatus,
    attestGpsCapture,
  } = useAuth();
  const isCompanyOwner = userRole === "company_owner";
  const tenantAdmin = isAdmin || isCompanyOwner;
  const canUseOperationalPortal = hasOperationalAccess(userRole, permissions);

  useEffect(() => {
    if (
      !authLoading &&
      session &&
      (userRole === "developer" || userRole === "superadmin") &&
      !parseRoute().view
    ) {
      setView("saas");
      if (parseRoute().kind !== "platform") navigateTo("/admin-saas", true);
    }
  }, [authLoading, session, userRole]);

  // Sincroniza la vista con la URL /<empresa>/admin/<vista>
  useEffect(
    () =>
      onRouteChange(() => {
        const next = parseRoute();
        setRoute(next);
        if (next.kind === "admin" && next.view) setView(next.view as ViewKey);
      }),
    [],
  );

  const navigateView = (next: ViewKey) => {
    setView(next);
    const current = parseRoute();
    if (current.kind === "admin") navigateTo(buildAdminPath(current.slug, next));
  };

  // El plano de control SaaS nunca debe inicializar queries de una empresa.
  // Esto evita que la última vista empresarial quede visible mientras se resuelve
  // la sesión del operador de plataforma.
  const rawData = useAppData(
    view,
    !!session &&
      (gpsAccessStatus === "disabled" || gpsAccessStatus === "verified") &&
      emailOtpStatus !== "pending" &&
      !isWorker &&
      route.kind !== "platform",
    route.slug,
  );
  const { runInBackground } = useLoading();
  const data = {
    ...rawData,
    reload: () => runInBackground("Actualizando datos", rawData.reload),
  };
  const [loadTimeout, setLoadTimeout] = useState(false);
  const deniedViewRef = useRef<ViewKey | null>(null);
  const userEmail = session?.user?.email ?? null;

  // Permission gate: map views to permission keys
  const VIEW_PERMISSIONS: Partial<Record<ViewKey, string>> = {
    dashboard: "can_view_dashboard",
    calendar: "can_view_calendar",
    workers: "can_view_workers",
    terrain: "can_view_shifts",
    incidents: "can_view_incidents",
    docs: "can_view_docs",
    clouddocs: "can_view_clouddocs",
    trainings: "can_view_trainings",
    shifts: "can_view_shifts",
    payroll: "can_view_payroll",
    performance: "can_view_performance",
    indicators: "can_view_indicators",
    iso: "can_view_iso",
    settings: "can_view_settings",
    logs: "can_view_audit_logs",
    vacations: "can_view_vacations",
    finiquitos: "can_view_finiquitos",
    securitytalks: "can_view_security_talks",
    ipermatrix: "can_view_iper",
    compliancedocs: "can_view_compliance",
    departments: "can_view_departments",
    organigrama: "can_view_organigrama",
    eppwarehouse: "can_view_epp_warehouse",
    treasury: "can_view_treasury",
    commercial: "can_view_commercial",
    gdpr: "can_view_gdpr",
    medicallicenses: "can_view_medical_licenses",
    communications: "can_view_communications",
    extendedfinance: "can_view_extended_finance",
    harassmentreports: "can_view_harassment_reports",
    securitybreaches: "can_view_security_breaches",
  };

  const requiredPerm = VIEW_PERMISSIONS[view];
  const unrestricted = isPlatformRole(userRole);
  // DevTeam opera en cualquier tenant habilitado. Este bypass solo resuelve el
  // guard visual; TenantProvider y RPC/RLS siguen validando el tenant en servidor.
  const hasPermission = canAccessPermission(requiredPerm, permissions, userRole, {
    platformContext: unrestricted && route.kind === "admin",
  });
  const isPlatformView = view === "saas";
  const effectiveView: ViewKey =
    unrestricted && isPlatformView && hasPermission ? "saas" : hasPermission ? view : "dashboard";

  const trackingPagePath = isWorker
    ? "/worker/portal"
    : route.kind === "platform"
      ? "/platform/saas"
      : `/admin/${effectiveView}`;
  const trackingUserEmail =
    session &&
    emailOtpStatus !== "pending" &&
    (gpsAccessStatus === "disabled" || gpsAccessStatus === "verified")
      ? userEmail
      : null;
  useNavigationTracking(trackingPagePath, trackingUserEmail);

  // Ruteo: /admin y /<empresa>/admin/<vista> son administrativos; el resto es portal del trabajador
  const isAdminRoute = route.kind === "admin";
  const isWorkerRoute = route.kind === "worker";

  // Timeout de respaldo: si data.loading dura más de 10s, mostrar el contenido
  // con los datos disponibles en vez de quedarse en FullScreenLoader indefinidamente
  useEffect(() => {
    if (!data.loading) {
      setLoadTimeout(false);
      return;
    }
    setLoadTimeout(false);
    const t = setTimeout(() => setLoadTimeout(true), 10000);
    return () => clearTimeout(t);
  }, [data.loading, effectiveView]);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, view);
    } catch {
      /* ignore */
    }
  }, [view]);

  // Mostrar aviso si la sesión expiró por inactividad o en background tab
  useEffect(() => {
    try {
      if (sessionStorage.getItem("gyc_session_expired") === "1") {
        sessionStorage.removeItem("gyc_session_expired");
        toast.warning(
          "Sesión expirada",
          "Tu sesión caducó por inactividad. Por favor ingresa nuevamente.",
        );
      }
    } catch {
      /* ignore */
    }
  }, [toast]);

  useEffect(() => {
    if (!hasPermission && view !== "dashboard" && deniedViewRef.current !== view) {
      deniedViewRef.current = view;
      void audit({
        action: "access.denied.view",
        entity: "view",
        entity_label: view,
        details: { required_permission: requiredPerm ?? null },
      });
    } else if (hasPermission) {
      deniedViewRef.current = null;
    }
  }, [hasPermission, view, requiredPerm]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spinner />
      </div>
    );
  }

  if (!session) {
    if (publicPath === "/") return <PublicLanding />;
    if (publicPath === "/privacidad") return <PublicDocument kind="privacy" />;
    if (publicPath === "/terminos") return <PublicDocument kind="terms" />;
    if (publicPath === "/contacto") return <PublicDocument kind="contact" />;
    // El acceso operativo y el portal personal son superficies distintas de una misma identidad.
    if (isAdminRoute || route.kind === "platform") {
      return <AuthScreen tenantSlug={route.slug} />;
    }
    return <WorkerAuthScreen tenantSlug={route.slug} />;
  }

  if (gpsAccessStatus === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spinner />
      </div>
    );
  }

  if (gpsAccessStatus === "required" || gpsAccessStatus === "error") {
    return <GpsSessionGate onVerify={attestGpsCapture} onSignOut={() => void signOut()} />;
  }

  if (emailOtpStatus === "pending") {
    return <AuthScreen tenantSlug={route.slug} />;
  }

  // Password recovery flow: user clicked reset link in email (admins and workers)
  if (passwordRecovery) {
    if (isAdmin || (route.kind === "admin" && canUseOperationalPortal)) {
      return (
        <Layout
          current="dashboard"
          onNavigate={() => {}}
          userEmail={session.user.email}
          onSignOut={signOut}
          isAdmin
        >
          <div className="max-w-md mx-auto pt-8">
            <WorkerRecoveryPassword
              email={session.user.email ?? ""}
              onSuccess={clearPasswordRecovery}
            />
          </div>
        </Layout>
      );
    }
    return (
      <WorkerLayout userEmail={session.user.email} onSignOut={signOut}>
        <div className="max-w-md mx-auto pt-8">
          <WorkerRecoveryPassword
            email={session.user.email ?? ""}
            onSuccess={clearPasswordRecovery}
          />
        </div>
      </WorkerLayout>
    );
  }

  // Dev Team puede abrir un portal aislado en una pestaña completa sin convertir su sesión en trabajador.
  if (isAdmin && previewWorkerRut) {
    return (
      <TenantProvider enabled={!!session} slugFromUrl={route.slug} userRole={userRole}>
        <WorkerLayout userEmail={session.user.email} onSignOut={signOut}>
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-20">
                <Spinner />
              </div>
            }
          >
            <WorkerPortal workerRut={previewWorkerRut} previewEmail={previewEmail} />
          </Suspense>
        </WorkerLayout>
      </TenantProvider>
    );
  }

  // La URL elige entre vista personal y operativa; el rol jamás concede permisos por sí solo.
  if (isWorker && route.kind === "admin" && !canUseOperationalPortal) {
    return (
      <WorkerLayout userEmail={session.user.email} onSignOut={signOut}>
        <UnauthorizedPage
          description="Esta cuenta tiene acceso al portal personal, pero no tiene permisos operativos para esta empresa."
          onHome={() => navigateTo("/trabajador")}
          onSignOut={signOut}
        />
      </WorkerLayout>
    );
  }

  if (isWorker && route.kind === "worker") {
    // Force password change on first login (temporary password from admin)
    if (mustChangePassword) {
      return (
        <WorkerLayout userEmail={session.user.email} onSignOut={signOut}>
          <div className="max-w-md mx-auto pt-8">
            <WorkerChangePassword
              email={session.user.email ?? ""}
              forced
              onSuccess={clearMustChangePassword}
            />
          </div>
        </WorkerLayout>
      );
    }
    return (
      <TenantProvider enabled={!!session} slugFromUrl={route.slug} userRole={userRole}>
        <WorkerLayout userEmail={session.user.email} onSignOut={signOut}>
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-20">
                <Spinner />
              </div>
            }
          >
            {workerRut ? (
              <WorkerPortal workerRut={workerRut} />
            ) : (
              <div className="flex items-center justify-center py-20 text-slate-500 text-sm">
                Tu cuenta no tiene un RUT de trabajador asociado. Contacta al administrador.
              </div>
            )}
          </Suspense>
        </WorkerLayout>
      </TenantProvider>
    );
  }

  // If an admin is logged in but on a worker route, redirect to admin panel
  if (isWorkerRoute && session && !isWorker && canUseOperationalPortal) {
    window.history.replaceState(null, "", "/admin");
  }

  if (route.kind === "platform") {
    return (
      <Layout
        current="saas"
        onNavigate={() => {}}
        userEmail={session.user.email}
        onSignOut={signOut}
        isAdmin={isAdmin}
        permissions={permissions}
        userRole={userRole}
        hideSidebar
      >
        <Suspense fallback={<FullScreenLoader />}>
          {unrestricted ? (
            <SaaSControlPanel />
          ) : (
            <UnauthorizedPage
              description="El plano de control SaaS es exclusivo para el Dev Team. Tu cuenta no tiene rol de operador de plataforma."
              onHome={() => navigateTo("/admin/dashboard")}
              onSignOut={signOut}
            />
          )}
        </Suspense>
      </Layout>
    );
  }

  const unknownView = isAdminRoute && !!route.view && !KNOWN_VIEWS.has(route.view);
  const accessDenied = !hasPermission && view !== "dashboard";

  if (unknownView || accessDenied) {
    return (
      <Layout
        current="dashboard"
        onNavigate={navigateView}
        userEmail={session.user.email}
        onSignOut={signOut}
        isAdmin={isAdmin}
        permissions={permissions}
        userRole={userRole}
      >
        {unknownView ? (
          <NotFoundPage onBack={() => navigateView("dashboard")} />
        ) : (
          <UnauthorizedPage onHome={() => navigateView("dashboard")} onSignOut={signOut} />
        )}
      </Layout>
    );
  }

  return (
    <TenantProvider enabled={!!session} slugFromUrl={route.slug} userRole={userRole}>
      <TenantGate view={effectiveView}>
        <Layout
          current={effectiveView}
          onNavigate={navigateView}
          userEmail={session.user.email}
          onSignOut={signOut}
          isAdmin={isAdmin}
          permissions={permissions}
          userRole={userRole}
          hideSidebar={effectiveView === "saas"}
        >
          {effectiveView !== "saas" && <DeveloperNoticeBanner />}
          <OfflineBanner />
          {effectiveView === "compliancedocs" ? (
            <Suspense fallback={<FullScreenLoader />}>
              <ComplianceDocsView />
            </Suspense>
          ) : (
            <>
              {data.loading && !loadTimeout && (
                <div
                  className="fixed top-1/2 left-1/2 z-[170] -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 rounded-full border border-blue-100 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-600 shadow-lg backdrop-blur"
                  role="status"
                >
                  <span className="h-2 w-2 animate-pulse rounded-full bg-blue-600" /> Cargando
                  datos…
                </div>
              )}
              <div key={effectiveView} className="animate-view-enter">
                {data.reloading && <ReloadingBanner />}
                <ViewErrorBoundary viewName={effectiveView}>
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center py-20">
                        <Spinner />
                      </div>
                    }
                  >
                    {effectiveView === "dashboard" && (
                      <Dashboard data={data} onNavigate={navigateView} />
                    )}
                    {effectiveView === "calendar" && (
                      <CalendarView data={data} userRole={userRole} permissions={permissions} />
                    )}
                    {effectiveView === "workers" && (
                      <WorkersView data={data} userRole={userRole} permissions={permissions} />
                    )}
                    {effectiveView === "terrain" && (
                      <TerrainView data={data} userRole={userRole} permissions={permissions} />
                    )}
                    {effectiveView === "incidents" && (
                      <IncidentsView data={data} userRole={userRole} permissions={permissions} />
                    )}
                    {effectiveView === "docs" && <DocsView data={data} />}
                    {effectiveView === "clouddocs" && (
                      <CloudDocsView data={data} userRole={userRole} permissions={permissions} />
                    )}
                    {effectiveView === "trainings" && (
                      <TrainingsView data={data} userRole={userRole} permissions={permissions} />
                    )}
                    {effectiveView === "shifts" && (
                      <ShiftsView data={data} userRole={userRole} permissions={permissions} />
                    )}
                    {effectiveView === "payroll" && (
                      <PayrollView data={data} userRole={userRole} permissions={permissions} />
                    )}
                    {effectiveView === "performance" && (
                      <PerformanceView data={data} userRole={userRole} permissions={permissions} />
                    )}
                    {effectiveView === "indicators" && (
                      <IndicatorsView data={data} userRole={userRole} permissions={permissions} />
                    )}
                    {effectiveView === "iso" && (
                      <IsoView data={data} userRole={userRole} permissions={permissions} />
                    )}
                    {effectiveView === "settings" && (
                      <SettingsView
                        data={data}
                        isAdmin={
                          tenantAdmin &&
                          (userRole === "superadmin" ||
                            userRole === "developer" ||
                            userRole === "company_owner" ||
                            permissions?.can_manage_users === true)
                        }
                        currentEmail={session?.user?.email ?? ""}
                        currentUserRole={userRole}
                      />
                    )}
                    {effectiveView === "saas" && <SaaSControlPanel />}
                    {effectiveView === "logs" && <LogsView />}
                    {effectiveView === "vacations" && (
                      <VacationsView
                        data={data}
                        currentUserEmail={session?.user?.email ?? ""}
                        userRole={userRole}
                        permissions={permissions}
                      />
                    )}
                    {effectiveView === "finiquitos" && (
                      <FiniquitosView
                        data={data}
                        currentUserEmail={session?.user?.email ?? ""}
                        userRole={userRole}
                        permissions={permissions}
                      />
                    )}
                    {effectiveView === "securitytalks" && (
                      <SecurityTalksView
                        data={data}
                        userRole={userRole}
                        permissions={permissions}
                      />
                    )}
                    {effectiveView === "ipermatrix" && (
                      <IperMatrixView data={data} userRole={userRole} permissions={permissions} />
                    )}
                    {effectiveView === "departments" && (
                      <DepartmentsView data={data} userRole={userRole} permissions={permissions} />
                    )}
                    {effectiveView === "organigrama" && <OrganigramaView data={data} />}
                    {effectiveView === "gdpr" && <GdprView data={data} />}
                    {effectiveView === "eppwarehouse" && (
                      <EppWarehouseView data={data} userRole={userRole} permissions={permissions} />
                    )}
                    {effectiveView === "treasury" && (
                      <TreasuryView data={data} userRole={userRole} permissions={permissions} />
                    )}
                    {effectiveView === "commercial" && (
                      <CommercialView userRole={userRole} permissions={permissions} />
                    )}
                    {effectiveView === "medicallicenses" && (
                      <MedicalLicensesView
                        data={data}
                        currentUserEmail={session?.user?.email ?? ""}
                        userRole={userRole}
                        permissions={permissions}
                      />
                    )}
                    {effectiveView === "communications" && (
                      <CommunicationsView userRole={userRole} permissions={permissions} />
                    )}
                    {effectiveView === "extendedfinance" && (
                      <ExtendedFinanceView userRole={userRole} permissions={permissions} />
                    )}
                    {effectiveView === "harassmentreports" && (
                      <HarassmentReportsView userRole={userRole} permissions={permissions} />
                    )}
                    {effectiveView === "securitybreaches" && (
                      <SecurityBreachesView userRole={userRole} permissions={permissions} />
                    )}
                  </Suspense>
                </ViewErrorBoundary>
              </div>
            </>
          )}
        </Layout>
      </TenantGate>
    </TenantProvider>
  );
}

export default App;
