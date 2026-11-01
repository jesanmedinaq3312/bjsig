import { useState } from "react";
import { UserCircle, FileCheck, Shield, Wallet, CreditCard, Phone, FileText } from "lucide-react";
import type { Worker } from "@/lib/types";
import { DetailRow } from "./components";

export function WorkerDetailRow({ w }: { w: Worker }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 text-xs">
      <div className="space-y-2">
        <p className="font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
          <UserCircle size={12} /> Datos Personales
        </p>
        <DetailRow label="RUT" value={w.rut} />
        <DetailRow label="Nacionalidad" value={w.nationality} />
        <DetailRow label="Fecha de nacimiento" value={w.birth_date} />
        <DetailRow label="Teléfono" value={w.phone} />
        <DetailRow label="Email" value={w.email} />
        <DetailRow label="Dirección" value={w.address} />
      </div>
      <div className="space-y-2">
        <p className="font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
          <FileCheck size={12} /> Contrato
        </p>
        <DetailRow label="Cargo" value={w.position} />
        <DetailRow label="Tipo de contrato" value={w.contract_type} />
        <DetailRow label="Estado" value={w.contract_status} />
        <DetailRow label="Fecha de ingreso" value={w.hire_date} />
        <DetailRow label="Inicio contrato" value={w.contract_start_date} />
        <DetailRow label="Fin contrato" value={w.contract_end_date} />
        <DetailRow label="Estado laboral" value={w.status} />
      </div>
      <div className="space-y-2">
        <p className="font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
          <Shield size={12} /> Previsión
        </p>
        <DetailRow label="AFP" value={w.afp} />
        <DetailRow label="Salud" value={w.health_insurance} />
        <DetailRow label="Examen ocupacional" value={w.occupational_exam_exp_date} />
        <DetailRow label="Licencia conducir" value={w.driver_license_exp_date} />
        <DetailRow label="IRL/ODI" value={w.irl_signed_date} />
      </div>
      <div className="space-y-2">
        <p className="font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
          <Wallet size={12} /> Cuenta Bancaria
        </p>
        <DetailRow label="Banco" value={w.bank_name} />
        <DetailRow label="Tipo de cuenta" value={w.account_type} />
        <DetailRow label="Número de cuenta" value={w.bank_account_number} />
      </div>
      <div className="space-y-2">
        <p className="font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
          <CreditCard size={12} /> Remuneración
        </p>
        <DetailRow
          label="Sueldo base"
          value={w.base_salary != null ? `${Number(w.base_salary).toLocaleString("es-CL")}` : null}
        />
        <DetailRow
          label="Valor hora"
          value={w.hourly_rate != null ? `${Number(w.hourly_rate).toLocaleString("es-CL")}` : null}
        />
        <DetailRow
          label="Sobretiempo"
          value={
            w.overtime_rate != null ? `${Number(w.overtime_rate).toLocaleString("es-CL")}` : null
          }
        />
        <DetailRow
          label="Colación"
          value={
            w.meal_allowance != null ? `${Number(w.meal_allowance).toLocaleString("es-CL")}` : null
          }
        />
        <DetailRow
          label="Movilización"
          value={
            w.mobility_allowance != null
              ? `${Number(w.mobility_allowance).toLocaleString("es-CL")}`
              : null
          }
        />
      </div>
      <div className="space-y-2">
        <p className="font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
          <Phone size={12} /> Contacto de Emergencia
        </p>
        <DetailRow label="Nombre" value={w.emergency_contact_name} />
        <DetailRow label="Teléfono" value={w.emergency_contact_phone} />
      </div>
      {w.notes && (
        <div className="space-y-2 md:col-span-2 lg:col-span-3">
          <p className="font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
            <FileText size={12} /> Notas
          </p>
          <p className="text-slate-600 bg-white rounded-lg p-3 border border-slate-200">
            {w.notes}
          </p>
        </div>
      )}
    </div>
  );
}
