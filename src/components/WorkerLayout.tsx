import { type ReactNode, useEffect } from "react";
import { HardHat, LogOut } from "lucide-react";
import { loadCurrentTenantBranding, loadCompanyBranding, useCompanyBranding } from "@/lib/logo";
import { CompanyLogo } from "@/components/CompanyLogo";
import { DeveloperNoticeBanner } from "@/components/DeveloperNoticeBanner";

export function WorkerLayout({
  children,
  userEmail,
  onSignOut,
}: {
  children: ReactNode;
  userEmail?: string;
  onSignOut: () => void;
}) {
  const { logoUrl, companyName } = useCompanyBranding();

  useEffect(() => {
    void (userEmail ? loadCurrentTenantBranding() : loadCompanyBranding());
  }, [userEmail]);

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      <div className="fixed inset-0 -z-10 bg-slate-50 dark:bg-slate-950" />
      <div
        className="fixed top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full -z-10 opacity-30 dark:opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)" }}
      />
      <div
        className="fixed top-[40%] right-[-10%] w-[600px] h-[600px] rounded-full -z-10 opacity-20 dark:opacity-15 blur-3xl"
        style={{ background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)" }}
      />
      <div
        className="fixed bottom-[-10%] left-[30%] w-[450px] h-[450px] rounded-full -z-10 opacity-20 dark:opacity-15 blur-3xl"
        style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)" }}
      />

      <header className="sticky top-0 z-20 glass-topbar px-4 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="p-1 rounded-xl border border-white/10 shrink-0"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <CompanyLogo
              src={logoUrl}
              alt={`${companyName} Logo`}
              className="h-8 max-w-[150px] w-auto object-contain drop-shadow"
              fallbackClassName="h-8 w-8"
            />
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-tight truncate">{companyName}</p>
            <p className="text-blue-400 text-[10px] font-semibold leading-tight mt-0.5 flex items-center gap-1">
              <HardHat size={10} className="shrink-0" /> Portal del Trabajador
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-emerald-200/40"
            style={{ background: "rgba(16,185,129,0.12)" }}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-emerald-700">Sistema Operativo</span>
          </div>
          {userEmail && (
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate max-w-[160px]">
                {userEmail}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">Trabajador</span>
            </div>
          )}
          <button
            onClick={onSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg border border-slate-200 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut size={14} /> Salir
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 lg:p-8 max-w-[1400px] w-full mx-auto animate-fade-in">
        <DeveloperNoticeBanner />
        {children}
      </main>
    </div>
  );
}
