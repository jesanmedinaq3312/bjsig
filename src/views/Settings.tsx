import { useState } from "react";
import { Settings as SettingsIcon, DatabaseBackup, Shield, Lock, Users } from "lucide-react";
import { InfoTooltip } from "@/components/ui";
import type { AppData } from "@/hooks/useAppData";
import type { SettingsTab } from "./settings/constants";

const TABS: { key: SettingsTab; label: string; icon: typeof Users }[] = [
  { key: "access", label: "Acceso y Usuarios", icon: Users },
  { key: "backups", label: "Respaldos", icon: DatabaseBackup },
  { key: "security", label: "Seguridad", icon: Shield },
  { key: "privacy", label: "Privacidad", icon: Lock },
  { key: "system", label: "Sistema", icon: SettingsIcon },
];

export function SettingsView({
  data,
  isAdmin,
  currentEmail,
  currentUserRole = "",
}: {
  data: AppData;
  isAdmin: boolean;
  currentEmail: string;
  currentUserRole?: string;
}) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("access");

  const totalRecords =
    data.workers.length +
    data.eppLogs.length +
    data.incidents.length +
    data.trainings.length +
    data.shifts.length +
    data.astLogs.length +
    data.cphsMeetings.length +
    data.isoAudits.length +
    data.hhcPlans.length +
    data.cloudDocs.length;
  const tabs = TABS;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <SettingsIcon size={22} className="text-blue-600" />
        <h2 className="text-lg font-semibold text-slate-800">Configuración del Sistema</h2>
        <InfoTooltip text="Gestiona accesos, respaldos, seguridad, privacidad e identidad visual del sistema." />
      </div>

      <div className="flex gap-1 items-end overflow-x-auto pb-0 -mb-0">
        {tabs.map((tab, idx) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all duration-200 whitespace-nowrap ${
                isActive
                  ? "bg-white text-blue-700 shadow-sm border-t border-x border-slate-200 z-10 -mb-px"
                  : "bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700 z-0"
              }`}
              style={{ marginLeft: idx > 0 ? "-8px" : "0", paddingLeft: idx > 0 ? "20px" : "16px" }}
            >
              <tab.icon size={16} />
              {tab.label}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t" />
              )}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-b-xl rounded-tr-xl border border-slate-200 shadow-sm min-h-[400px]">
        {activeTab === "access" && (
          <AccessControlPanelLazy
            isAdmin={isAdmin}
            isPlatformOperator={currentUserRole === "developer" || currentUserRole === "superadmin"}
            currentEmail={currentEmail}
            currentUserRole={currentUserRole}
          />
        )}
        {activeTab === "backups" && (
          <BackupsPanelLazy data={data} isAdmin={isAdmin} totalRecords={totalRecords} />
        )}
        {activeTab === "security" && <SecurityPanelLazy isAdmin={isAdmin} />}
        {activeTab === "privacy" && (
          <PrivacyPanelLazy isAdmin={isAdmin} currentEmail={currentEmail} />
        )}
        {activeTab === "system" && <SystemPanelLazy isAdmin={isAdmin} />}
      </div>
    </div>
  );
}

import { lazy } from "react";

const AccessControlPanelLazy = lazy(() =>
  import("./settings/AccessControlPanel").then((m) => ({ default: m.AccessControlPanel })),
);
const BackupsPanelLazy = lazy(() =>
  import("./settings/BackupsPanel").then((m) => ({ default: m.BackupsPanel })),
);
const SecurityPanelLazy = lazy(() =>
  import("./settings/SecurityPanel").then((m) => ({ default: m.SecurityPanel })),
);
const PrivacyPanelLazy = lazy(() =>
  import("./settings/PrivacyPanel").then((m) => ({ default: m.PrivacyPanel })),
);
const SystemPanelLazy = lazy(() =>
  import("./settings/SystemPanel").then((m) => ({ default: m.SystemPanel })),
);
const SaaSControlPanelLazy = lazy(() =>
  import("./settings/SaaSControlPanel").then((m) => ({ default: m.SaaSControlPanel })),
);
