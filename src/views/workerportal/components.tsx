import { useState } from "react";
import { Shield, KeyRound, Download } from "lucide-react";
import { Card, CardHeader, Button } from "@/components/ui";
import { WorkerChangePassword } from "@/components/WorkerChangePassword";
import type { WorkerPortalData } from "@/hooks/useWorkerData";

export function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <Card className="p-4 glass-hover">
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform hover:scale-110 ${color}`}
        >
          {icon}
        </div>
        <div>
          <p className="text-xs text-slate-500 font-medium">{label}</p>
          <p className="text-lg font-bold text-slate-800">{value}</p>
        </div>
      </div>
    </Card>
  );
}

export function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader title={title} action={icon} />
      <div className="px-5 pb-5">{children}</div>
    </Card>
  );
}

export function ChangePasswordSection({ email }: { email: string }) {
  const [show, setShow] = useState(false);
  if (!email) return null;
  if (!show) {
    return (
      <Card>
        <CardHeader
          title="Seguridad de la Cuenta"
          action={<Shield size={18} className="text-slate-400" />}
        />
        <div className="px-5 pb-5">
          <p className="text-sm text-slate-500 mb-3">
            Puedes cambiar tu contraseña de acceso en cualquier momento.
          </p>
          <Button variant="outline" onClick={() => setShow(true)}>
            <KeyRound size={15} /> Cambiar Contraseña
          </Button>
        </div>
      </Card>
    );
  }
  return <WorkerChangePassword email={email} onSuccess={() => setShow(false)} />;
}

export function GdprDataSection({
  workerRut,
  data,
  fullName,
}: {
  workerRut: string;
  data: WorkerPortalData;
  fullName: string;
}) {
  const [downloading, setDownloading] = useState(false);

  function downloadMyData() {
    setDownloading(true);
    try {
      const exportData = {
        generated_at: new Date().toISOString(),
        legal_basis: "Ley 19.628 (Datos Personales) — Artículo 15: Derecho de acceso del titular",
        worker: {
          rut: data.profile?.rut ?? workerRut,
          full_name: data.profile?.full_name ?? fullName,
          position: data.profile?.position ?? null,
          department: data.profile?.department_name ?? null,
          email: data.profile?.email ?? null,
          phone: data.profile?.phone ?? null,
          hire_date: data.profile?.hire_date ?? null,
          contract_type: data.profile?.contract_type ?? null,
        },
        attendance: data.shifts,
        qr_scans: data.qr_scans,
        trainings: data.trainings,
        training_attendance: data.attendance,
        payroll_items: data.payroll_items,
        payroll_periods: data.payroll_periods,
        performance_objectives: data.objectives,
        performance_evaluations: data.evaluations,
        performance_feedback: data.feedback,
        documents: data.documents,
        epp: data.epp,
        incidents: data.incidents,
        shift_assignments: data.assignments,
        shift_change_logs: data.shift_change_logs,
        requests: data.requests,
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mis_datos_${workerRut.replace(/\./g, "")}_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Mis Datos Personales (GDPR / Ley 19.628)"
        action={<Shield size={18} className="text-slate-400" />}
      />
      <div className="px-5 pb-5">
        <p className="text-sm text-slate-500 mb-3">
          Tienes derecho a acceder a todos los datos personales que la empresa tiene sobre ti.
          Descarga una copia completa en formato JSON con toda tu informacion laboral, de
          asistencia, capacitaciones, liquidaciones, evaluaciones de desempeno, EPP e incidentes.
        </p>
        <Button variant="outline" onClick={downloadMyData} loading={downloading}>
          <Download size={15} /> Descargar Mis Datos
        </Button>
      </div>
    </Card>
  );
}
