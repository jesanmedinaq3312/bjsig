import { useState, useEffect } from "react";
import { Banknote, Save, Building2 } from "lucide-react";
import { Card, CardHeader, Button, Input, Select, Spinner } from "@/components/ui";
import { workerBankAccountRepo } from "@/lib/repositories";
import { audit } from "@/lib/audit";
import { useToast } from "@/components/Toast";
import { normalizeRut, formatRut, isValidRut } from "@/lib/rut";

const ACCOUNT_TYPES = ["Cuenta Corriente", "Cuenta Vista", "Cuenta Rut", "Cuenta de Ahorro"];

interface BankAccount {
  id: string;
  bank_name: string;
  account_type: string;
  account_number: string;
  holder_name: string;
  holder_rut: string | null;
  email_for_payments: string | null;
  is_active: boolean;
}

interface WorkerBankAccountFormProps {
  workerRut: string;
  workerName: string;
  onSaved?: () => void;
  compact?: boolean;
}

export function WorkerBankAccountForm({
  workerRut,
  workerName,
  onSaved,
  compact,
}: WorkerBankAccountFormProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [account, setAccount] = useState<BankAccount | null>(null);
  const [form, setForm] = useState({
    bank_name: "",
    account_type: "Cuenta Corriente",
    account_number: "",
    holder_name: workerName,
    holder_rut: workerRut,
    email_for_payments: "",
  });
  const [rutError, setRutError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    setForm((f) => ({ ...f, holder_name: workerName, holder_rut: workerRut }));
  }, [workerName, workerRut]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await workerBankAccountRepo.getByWorker(normalizeRut(workerRut));
        if (data) {
          const acct = data as unknown as BankAccount;
          setAccount(acct);
          setForm({
            bank_name: acct.bank_name,
            account_type: acct.account_type,
            account_number: acct.account_number,
            holder_name: acct.holder_name,
            holder_rut: acct.holder_rut ? formatRut(acct.holder_rut) : "",
            email_for_payments: acct.email_for_payments ?? "",
          });
        }
      } catch (e) {
        toast.error("Error al cargar cuenta bancaria", (e as Error).message);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [workerRut]); // eslint-disable-line react-hooks/exhaustive-deps -- reviewed dependency set; unstable callback recreation is intentional to avoid loops

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setRutError(null);

    if (form.holder_rut.trim()) {
      if (!isValidRut(form.holder_rut)) {
        setRutError("El RUT del titular no es valido. Verifica el digito verificador.");
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        worker_rut: normalizeRut(workerRut),
        bank_name: form.bank_name.trim(),
        account_type: form.account_type,
        account_number: form.account_number.trim(),
        holder_name: form.holder_name.trim(),
        holder_rut: form.holder_rut.trim() ? normalizeRut(form.holder_rut) : null,
        email_for_payments: form.email_for_payments.trim() || null,
      };
      await workerBankAccountRepo.upsertForWorker(payload);
      await audit({
        action: "worker.bank_account.update",
        entity: "worker_bank_accounts",
        entity_label: `${workerName} — ${payload.bank_name}`,
      });
      toast.success("Datos bancarios guardados", workerName);
      onSaved?.();
    } catch (e) {
      toast.error("Error al guardar", (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner />;

  const content = (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Banco"
          required
          value={form.bank_name}
          onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
          placeholder="Banco de Chile"
        />
        <Select
          label="Tipo de cuenta"
          value={form.account_type}
          onChange={(e) => setForm({ ...form, account_type: e.target.value })}
        >
          {ACCOUNT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </div>
      <Input
        label="Numero de cuenta"
        required
        value={form.account_number}
        onChange={(e) => setForm({ ...form, account_number: e.target.value })}
        placeholder="000-0-000000-0"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Nombre del titular"
          required
          value={form.holder_name}
          onChange={(e) => setForm({ ...form, holder_name: e.target.value })}
          placeholder="Nombre completo del titular"
        />
        <Input
          label="RUT del titular (opcional)"
          value={form.holder_rut}
          onChange={(e) => {
            setForm({ ...form, holder_rut: e.target.value });
            setRutError(null);
          }}
          placeholder="12.345.678-9"
        />
      </div>
      {rutError && <p className="text-xs text-red-600">{rutError}</p>}
      <Input
        label="Email para notificaciones de pago (opcional)"
        type="email"
        value={form.email_for_payments}
        onChange={(e) => setForm({ ...form, email_for_payments: e.target.value })}
        placeholder="pagos@trabajador.cl"
      />
      <div className="flex justify-end gap-2 pt-1">
        <Button type="submit" loading={saving}>
          <Save size={15} /> Guardar datos bancarios
        </Button>
      </div>
    </form>
  );

  if (compact) return content;

  return (
    <Card>
      <CardHeader title="Datos bancarios del trabajador" subtitle={workerName} />
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-blue-50 border border-blue-100">
          <Building2 size={16} className="text-blue-600 shrink-0" />
          <p className="text-xs text-blue-700">
            Estos datos se usan para pagos, finiquitos y liquidaciones. Verifica que la cuenta este
            a nombre del titular correcto.
          </p>
        </div>
        {content}
      </div>
    </Card>
  );
}
