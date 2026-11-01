import { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Banknote,
  Trash2,
  Search,
  Building2,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Wallet,
  FileText,
  Upload,
  Eye,
  Ban,
  Scale,
  FileSpreadsheet,
} from "lucide-react";
import {
  Card,
  CardHeader,
  Button,
  Modal,
  Input,
  Select,
  Badge,
  EmptyState,
  Spinner,
  Textarea,
} from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { audit } from "@/lib/audit";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/hooks/useConfirm";
import { uploadInvoiceFile, getInvoiceSignedUrl, validateInvoiceFile } from "@/lib/invoices";
import {
  cashSummary,
  monthlyArqueo,
  validateAmount,
  validateTxDate,
  findDuplicateInvoice,
  buildReversal,
  LARGE_AMOUNT_THRESHOLD,
  type CashTx,
} from "@/lib/finance";
import { ExportService } from "@/lib/export";
import type { AppData } from "@/hooks/useAppData";
import type { Worker } from "@/lib/types";

interface Supplier {
  id: string;
  name: string;
  rut: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  category: string;
  payment_terms: string | null;
  is_active: boolean;
  notes: string | null;
}

interface TreasuryTx {
  id: string;
  type: "ingreso" | "egreso";
  category: string;
  amount: number;
  transaction_date: string;
  description: string;
  supplier_id: string | null;
  worker_rut: string | null;
  invoice_number: string | null;
  invoice_file_path: string | null;
  payment_method: string;
  status: string;
  created_by: string | null;
}

interface ExternalService {
  id: string;
  service_name: string;
  supplier_id: string | null;
  category: string;
  monthly_cost: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  notes: string | null;
}

const TX_CATEGORIES = [
  "General",
  "Salarios",
  "EPP",
  "Herramientas",
  "Transporte",
  "Servicios",
  "Arriendo",
  "Utilidades",
  "Impuestos",
  "Mantención",
  "Seguridad",
  "Otros",
];
const SUPPLIER_CATEGORIES = [
  "General",
  "EPP",
  "Herramientas",
  "Transporte",
  "Servicios Profesionales",
  "Insumos",
  "Mantención",
  "Seguridad",
  "Otro",
];
const SERVICE_CATEGORIES = [
  "General",
  "Limpieza",
  "Seguridad",
  "Transporte",
  "Mantención",
  "Consultoría",
  "Contabilidad",
  "Legal",
  "Tecnología",
  "Otros",
];
const PAYMENT_METHODS = ["Transferencia", "Efectivo", "Cheque", "Tarjeta", "Webpay", "Otro"];

type Tab = "transactions" | "arqueo" | "suppliers" | "services";

const fmt = (n: number) => `$${Math.round(n).toLocaleString("es-CL")}`;
const MONTH_LABELS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  return `${MONTH_LABELS[Number(m) - 1] ?? m} ${y}`;
}

export function TreasuryView({
  data,
  userRole,
  permissions,
}: {
  data: AppData;
  userRole: string;
  permissions?: Record<string, boolean>;
}) {
  const canManage =
    userRole === "superadmin" ||
    userRole === "developer" ||
    permissions?.["can_view_treasury"] === true;
  const canDelete =
    userRole === "superadmin" ||
    userRole === "developer" ||
    permissions?.["can_delete_treasury"] === true;
  const [tab, setTab] = useState<Tab>("transactions");
  const [transactions, setTransactions] = useState<TreasuryTx[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [services, setServices] = useState<ExternalService[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"tx" | "supplier" | "service">("tx");
  const toast = useToast();
  const { confirm } = useConfirm();

  const [saving, setSaving] = useState(false);
  const [allTx, setAllTx] = useState<CashTx[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [methodFilter, setMethodFilter] = useState("");

  /** Trae TODOS los movimientos del rango (paginado) para que el balance nunca sea parcial. */
  async function fetchAllSummaryRows(from: string, to: string): Promise<CashTx[]> {
    const page = 1000;
    const rows: CashTx[] = [];
    for (let offset = 0; ; offset += page) {
      let q = supabase
        .from("treasury_transactions")
        .select("type,amount,status,transaction_date,payment_method")
        .order("transaction_date", { ascending: true })
        .range(offset, offset + page - 1);
      if (from) q = q.gte("transaction_date", from);
      if (to) q = q.lte("transaction_date", to);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      const batch = (data ?? []) as CashTx[];
      rows.push(...batch);
      if (batch.length < page) break;
    }
    return rows;
  }

  async function loadAll() {
    setLoading(true);
    try {
      let txQuery = supabase
        .from("treasury_transactions")
        .select("*")
        .order("transaction_date", { ascending: false })
        .limit(500);
      if (dateFrom) txQuery = txQuery.gte("transaction_date", dateFrom);
      if (dateTo) txQuery = txQuery.lte("transaction_date", dateTo);
      const [txRes, supRes, svcRes, summaryRows] = await Promise.all([
        txQuery,
        supabase.from("suppliers").select("*").order("name"),
        supabase.from("external_services").select("*").order("service_name"),
        fetchAllSummaryRows(dateFrom, dateTo),
      ]);
      if (txRes.data) setTransactions(txRes.data as TreasuryTx[]);
      if (supRes.data) setSuppliers(supRes.data as Supplier[]);
      if (svcRes.data) setServices(svcRes.data as ExternalService[]);
      setAllTx(summaryRows);
    } catch (e) {
      toast.error("Error al cargar", (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, [dateFrom, dateTo]); // eslint-disable-line react-hooks/exhaustive-deps -- reviewed dependency set; unstable callback recreation is intentional to avoid loops

  const scopedTx = useMemo(
    () => (methodFilter ? allTx.filter((t) => t.payment_method === methodFilter) : allTx),
    [allTx, methodFilter],
  );
  const totals = useMemo(() => cashSummary(scopedTx), [scopedTx]);
  const arqueo = useMemo(() => monthlyArqueo(scopedTx), [scopedTx]);

  const supplierMap = useMemo(() => new Map(suppliers.map((s) => [s.id, s.name])), [suppliers]);
  const workerMap = useMemo(
    () => new Map(data.workers.map((w) => [w.rut, w.full_name])),
    [data.workers],
  );

  const filteredTx = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return transactions;
    return transactions.filter(
      (t) =>
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.invoice_number ?? "").toLowerCase().includes(q) ||
        (t.worker_rut ? (workerMap.get(t.worker_rut) ?? "").toLowerCase().includes(q) : false),
    );
  }, [transactions, search]); // eslint-disable-line react-hooks/exhaustive-deps -- reviewed dependency set; unstable callback recreation is intentional to avoid loops

  const monthlyServiceCost = useMemo(() => {
    return services.filter((s) => s.is_active).reduce((sum, s) => sum + Number(s.monthly_cost), 0);
  }, [services]);

  async function handleSaveTx(form: {
    type: string;
    category: string;
    amount: number;
    transaction_date: string;
    description: string;
    supplier_id: string;
    worker_rut: string;
    invoice_number: string;
    payment_method: string;
    status: string;
    invoice_file: File | null;
  }) {
    if (saving) return;
    setSaving(true);
    try {
      const amountError = validateAmount(form.amount);
      if (amountError) {
        toast.error("Monto inválido", amountError);
        return;
      }
      const dateError = validateTxDate(form.transaction_date, {
        allowFuture: form.status === "Pendiente",
      });
      if (dateError) {
        toast.error("Fecha inválida", dateError);
        return;
      }
      if (form.amount >= LARGE_AMOUNT_THRESHOLD) {
        const okBig = await confirm({
          title: "Confirmar monto alto",
          message: `Vas a registrar ${fmt(form.amount)}. ¿Confirmas que el monto es correcto?`,
          confirmText: "Sí, registrar",
        });
        if (!okBig) return;
      }
      if (form.invoice_number) {
        const dup = findDuplicateInvoice(transactions, {
          supplier_id: form.supplier_id || null,
          invoice_number: form.invoice_number,
        });
        if (dup) {
          toast.error(
            "Documento duplicado",
            `Ya existe un movimiento con el documento ${form.invoice_number} para ese proveedor.`,
          );
          return;
        }
      }
      let invoiceFilePath: string | null = null;
      if (form.invoice_file) {
        const validationError = validateInvoiceFile(form.invoice_file);
        if (validationError) {
          toast.error("Archivo inválido", validationError);
          return;
        }
      }
      const { data: txData, error } = await supabase
        .from("treasury_transactions")
        .insert({
          type: form.type,
          category: form.category,
          amount: form.amount,
          transaction_date: form.transaction_date,
          description: form.description,
          supplier_id: form.supplier_id || null,
          worker_rut: form.worker_rut || null,
          invoice_number: form.invoice_number || null,
          payment_method: form.payment_method,
          status: form.status,
          created_by: (await supabase.auth.getUser()).data.user?.email ?? null,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      const txId = txData.id;
      if (form.invoice_file) {
        invoiceFilePath = await uploadInvoiceFile(form.invoice_file, txId);
        const { error: updateErr } = await supabase
          .from("treasury_transactions")
          .update({ invoice_file_path: invoiceFilePath })
          .eq("id", txId);
        if (updateErr) throw new Error(updateErr.message);
      }
      await audit({
        action: "treasury.tx.create",
        entity: "treasury_transactions",
        entity_label: `${form.type === "ingreso" ? "+" : "-"}${form.amount} — ${form.description}${invoiceFilePath ? " (con factura)" : ""}`,
      });
      toast.success("Transacción registrada", form.description);
      setModalOpen(false);
      await loadAll();
    } catch (e) {
      toast.error("Error", (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleViewInvoice(tx: TreasuryTx) {
    if (!tx.invoice_file_path) return;
    try {
      const url = await getInvoiceSignedUrl(tx.invoice_file_path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error("Error al abrir factura", (e as Error).message);
    }
  }

  async function handleSaveSupplier(form: {
    name: string;
    rut: string;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    category: string;
    payment_terms: string;
    notes: string;
  }) {
    try {
      const { error } = await supabase.from("suppliers").insert({
        name: form.name,
        rut: form.rut || null,
        contact_name: form.contact_name || null,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
        category: form.category,
        payment_terms: form.payment_terms || null,
        notes: form.notes || null,
      });
      if (error) throw new Error(error.message);
      await audit({ action: "supplier.create", entity: "suppliers", entity_label: form.name });
      toast.success("Proveedor creado", form.name);
      setModalOpen(false);
      await loadAll();
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  async function handleSaveService(form: {
    service_name: string;
    supplier_id: string;
    category: string;
    monthly_cost: number;
    start_date: string;
    end_date: string;
    notes: string;
  }) {
    try {
      const { error } = await supabase.from("external_services").insert({
        service_name: form.service_name,
        supplier_id: form.supplier_id || null,
        category: form.category,
        monthly_cost: form.monthly_cost,
        start_date: form.start_date,
        end_date: form.end_date || null,
        notes: form.notes || null,
      });
      if (error) throw new Error(error.message);
      await audit({
        action: "service.create",
        entity: "external_services",
        entity_label: form.service_name,
      });
      toast.success("Servicio creado", form.service_name);
      setModalOpen(false);
      await loadAll();
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  /** Anula el movimiento y deja un reverso: nunca se borra el historial de caja. */
  async function handleAnnulTx(tx: TreasuryTx) {
    if (tx.status === "Anulado") {
      toast.error("Ya está anulado", tx.description);
      return;
    }
    const ok = await confirm({
      title: "Anular movimiento",
      message: `Se anulará "${tx.description}" por ${fmt(Number(tx.amount))}. Si ya estaba pagado se genera un movimiento de reverso para cuadrar la caja. El registro original se conserva.`,
      confirmText: "Anular",
      type: "danger",
    });
    if (!ok) return;
    try {
      const wasPaid = tx.status === "Pagado";
      const { error } = await supabase
        .from("treasury_transactions")
        .update({ status: "Anulado" })
        .eq("id", tx.id);
      if (error) throw new Error(error.message);
      if (wasPaid) {
        const rev = buildReversal({ ...tx, amount: Number(tx.amount) }, "anulación");
        const { error: revErr } = await supabase.from("treasury_transactions").insert({
          type: rev.type,
          category: rev.category,
          amount: rev.amount,
          transaction_date: rev.transaction_date,
          description: rev.description,
          payment_method: tx.payment_method,
          supplier_id: tx.supplier_id,
          worker_rut: tx.worker_rut,
          status: "Pagado",
          created_by: (await supabase.auth.getUser()).data.user?.email ?? null,
        });
        if (revErr) throw new Error(revErr.message);
      }
      await audit({
        action: "treasury.tx.annul",
        entity: "treasury_transactions",
        entity_id: tx.id,
        entity_label: tx.description,
      });
      toast.success(
        "Movimiento anulado",
        wasPaid ? "Se registró el reverso en caja" : tx.description,
      );
      await loadAll();
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  function exportArqueo() {
    ExportService.toExcel(
      arqueo.map((r) => ({
        Mes: monthLabel(r.month),
        "Saldo inicial": r.saldoInicial,
        Ingresos: r.ingresos,
        Egresos: r.egresos,
        "Saldo final": r.saldoFinal,
        Movimientos: r.movimientos,
      })),
      "Arqueo",
      "arqueo_mensual",
    );
  }

  async function handleDeleteSupplier(s: Supplier) {
    const ok = await confirm({
      title: "Eliminar proveedor",
      message: `Se eliminará a ${s.name}.`,
      confirmText: "Eliminar",
      type: "danger",
    });
    if (!ok) return;
    try {
      const { error } = await supabase.from("suppliers").delete().eq("id", s.id);
      if (error) throw new Error(error.message);
      toast.success("Proveedor eliminado", s.name);
      await loadAll();
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  if (loading) return <Spinner />;

  const tabs: { key: Tab; label: string; icon: typeof Banknote }[] = [
    { key: "transactions", label: "Movimientos", icon: Wallet },
    { key: "arqueo", label: "Arqueo mensual", icon: Scale },
    { key: "suppliers", label: "Proveedores", icon: Building2 },
    { key: "services", label: "Servicios Externos", icon: ExternalLink },
  ];

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={16} className="text-emerald-600" />
              <span className="text-xs font-medium text-slate-500">Ingresos pagados</span>
            </div>
            <p className="text-2xl font-bold text-emerald-700">{fmt(totals.ingresos)}</p>
            {totals.ingresosPendientes > 0 && (
              <p className="text-xs text-amber-600 mt-1">
                Por cobrar: {fmt(totals.ingresosPendientes)}
              </p>
            )}
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown size={16} className="text-red-600" />
              <span className="text-xs font-medium text-slate-500">Egresos pagados</span>
            </div>
            <p className="text-2xl font-bold text-red-700">{fmt(totals.egresos)}</p>
            {totals.egresosPendientes > 0 && (
              <p className="text-xs text-amber-600 mt-1">
                Comprometido: {fmt(totals.egresosPendientes)}
              </p>
            )}
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Wallet size={16} className="text-blue-600" />
              <span className="text-xs font-medium text-slate-500">Saldo en caja</span>
            </div>
            <p
              className={`text-2xl font-bold ${totals.balance >= 0 ? "text-blue-700" : "text-red-700"}`}
            >
              {fmt(totals.balance)}
            </p>
            <p className="text-xs text-slate-400 mt-1">{totals.count} movimientos considerados</p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Scale size={16} className="text-violet-600" />
              <span className="text-xs font-medium text-slate-500">Saldo proyectado</span>
            </div>
            <p
              className={`text-2xl font-bold ${totals.balanceProyectado >= 0 ? "text-violet-700" : "text-red-700"}`}
            >
              {fmt(totals.balanceProyectado)}
            </p>
            {monthlyServiceCost > 0 && (
              <p className="text-xs text-slate-400 mt-1">
                Servicios activos: {fmt(monthlyServiceCost)}/mes
              </p>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <div className="p-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2 py-1.5 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2 py-1.5 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Medio de pago</label>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="px-2 py-1.5 text-sm border border-slate-300 rounded-lg"
            >
              <option value="">Todos</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          {(dateFrom || dateTo || methodFilter) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDateFrom("");
                setDateTo("");
                setMethodFilter("");
              }}
            >
              Limpiar filtros
            </Button>
          )}
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <div className="flex gap-1 border-b border-slate-200">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
              >
                <Icon size={14} className="inline mr-1.5" />
                {t.label}
              </button>
            );
          })}
        </div>
        {canManage && (
          <Button
            size="sm"
            onClick={() => {
              setModalMode(
                tab === "suppliers" ? "supplier" : tab === "services" ? "service" : "tx",
              );
              setModalOpen(true);
            }}
          >
            <Plus size={15} />{" "}
            {tab === "suppliers"
              ? "Nuevo Proveedor"
              : tab === "services"
                ? "Nuevo Servicio"
                : "Nuevo Movimiento"}
          </Button>
        )}
      </div>

      {tab === "transactions" && (
        <Card>
          <div className="mb-3 relative max-w-sm">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {filteredTx.length === 0 ? (
            <EmptyState message="Sin movimientos registrados" icon={<Wallet size={32} />} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500 uppercase">
                    <th className="px-4 py-2.5 font-medium">Fecha</th>
                    <th className="px-4 py-2.5 font-medium">Tipo</th>
                    <th className="px-4 py-2.5 font-medium">Categoría</th>
                    <th className="px-4 py-2.5 font-medium">Descripción</th>
                    <th className="px-4 py-2.5 font-medium">Proveedor</th>
                    <th className="px-4 py-2.5 font-medium">Trabajador</th>
                    <th className="px-4 py-2.5 font-medium text-right">Monto</th>
                    <th className="px-4 py-2.5 font-medium">Estado</th>
                    <th className="px-4 py-2.5 font-medium text-center">Factura</th>
                    <th className="px-4 py-2.5 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTx.map((t) => (
                    <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600">{t.transaction_date}</td>
                      <td className="px-4 py-3">
                        <Badge
                          className={
                            t.type === "ingreso"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          }
                        >
                          {t.type === "ingreso" ? "Ingreso" : "Egreso"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{t.category}</td>
                      <td className="px-4 py-3 text-slate-700 max-w-xs truncate">
                        {t.description}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {t.supplier_id ? (supplierMap.get(t.supplier_id) ?? "—") : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {t.worker_rut ? (workerMap.get(t.worker_rut) ?? t.worker_rut) : "—"}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-semibold ${t.type === "ingreso" ? "text-emerald-700" : "text-red-700"}`}
                      >
                        ${Number(t.amount).toLocaleString("es-CL")}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={
                            t.status === "Pagado"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : t.status === "Pendiente"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                          }
                        >
                          {t.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {t.invoice_file_path && (
                          <button
                            onClick={() => handleViewInvoice(t)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            title="Ver factura"
                          >
                            <FileText size={15} />
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canDelete && t.status !== "Anulado" && (
                          <button
                            onClick={() => handleAnnulTx(t)}
                            className="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded"
                            title="Anular con reverso"
                          >
                            <Ban size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "arqueo" && (
        <Card>
          <CardHeader
            title="Arqueo mensual"
            subtitle="Saldo inicial, movimientos pagados y saldo final por mes"
          />
          <div className="flex justify-end mb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportArqueo}
              disabled={arqueo.length === 0}
            >
              <FileSpreadsheet size={15} /> Excel
            </Button>
          </div>
          {arqueo.length === 0 ? (
            <EmptyState
              message="Sin movimientos pagados en el período"
              icon={<Scale size={32} />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500 uppercase">
                    <th className="px-4 py-2.5 font-medium">Mes</th>
                    <th className="px-4 py-2.5 font-medium text-right">Saldo inicial</th>
                    <th className="px-4 py-2.5 font-medium text-right">Ingresos</th>
                    <th className="px-4 py-2.5 font-medium text-right">Egresos</th>
                    <th className="px-4 py-2.5 font-medium text-right">Saldo final</th>
                    <th className="px-4 py-2.5 font-medium text-right">Movimientos</th>
                  </tr>
                </thead>
                <tbody>
                  {arqueo.map((r) => (
                    <tr key={r.month} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {monthLabel(r.month)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{fmt(r.saldoInicial)}</td>
                      <td className="px-4 py-3 text-right text-emerald-700">{fmt(r.ingresos)}</td>
                      <td className="px-4 py-3 text-right text-red-700">{fmt(r.egresos)}</td>
                      <td
                        className={`px-4 py-3 text-right font-semibold ${r.saldoFinal >= 0 ? "text-blue-700" : "text-red-700"}`}
                      >
                        {fmt(r.saldoFinal)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500">{r.movimientos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "suppliers" && (
        <Card>
          <CardHeader title="Proveedores" subtitle={`${suppliers.length} registros`} />
          {suppliers.length === 0 ? (
            <EmptyState message="Sin proveedores registrados" icon={<Building2 size={32} />} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500 uppercase">
                    <th className="px-4 py-2.5 font-medium">Nombre</th>
                    <th className="px-4 py-2.5 font-medium">RUT</th>
                    <th className="px-4 py-2.5 font-medium">Categoría</th>
                    <th className="px-4 py-2.5 font-medium">Contacto</th>
                    <th className="px-4 py-2.5 font-medium">Teléfono</th>
                    <th className="px-4 py-2.5 font-medium">Estado</th>
                    <th className="px-4 py-2.5 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((s) => (
                    <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                      <td className="px-4 py-3 text-slate-600 font-mono text-xs">{s.rut ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{s.category}</td>
                      <td className="px-4 py-3 text-slate-600">{s.contact_name ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{s.contact_phone ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Badge
                          className={
                            s.is_active
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }
                        >
                          {s.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteSupplier(s)}
                            className="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "services" && (
        <Card>
          <CardHeader
            title="Servicios Externos"
            subtitle={`${services.length} registros · Costo mensual total: $${monthlyServiceCost.toLocaleString("es-CL")}`}
          />
          {services.length === 0 ? (
            <EmptyState
              message="Sin servicios externos registrados"
              icon={<ExternalLink size={32} />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500 uppercase">
                    <th className="px-4 py-2.5 font-medium">Servicio</th>
                    <th className="px-4 py-2.5 font-medium">Proveedor</th>
                    <th className="px-4 py-2.5 font-medium">Categoría</th>
                    <th className="px-4 py-2.5 font-medium text-right">Costo mensual</th>
                    <th className="px-4 py-2.5 font-medium">Inicio</th>
                    <th className="px-4 py-2.5 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((s) => (
                    <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{s.service_name}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {s.supplier_id ? (supplierMap.get(s.supplier_id) ?? "—") : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{s.category}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700">
                        ${Number(s.monthly_cost).toLocaleString("es-CL")}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{s.start_date}</td>
                      <td className="px-4 py-3">
                        <Badge
                          className={
                            s.is_active
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }
                        >
                          {s.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {modalOpen && (
        <TreasuryModal
          mode={modalMode}
          suppliers={suppliers}
          workers={data.workers}
          onClose={() => setModalOpen(false)}
          onSaveTx={handleSaveTx}
          onSaveSupplier={handleSaveSupplier}
          onSaveService={handleSaveService}
        />
      )}
    </div>
  );
}

function TreasuryModal({
  mode,
  suppliers,
  workers,
  onClose,
  onSaveTx,
  onSaveSupplier,
  onSaveService,
}: {
  mode: "tx" | "supplier" | "service";
  suppliers: Supplier[];
  workers: Worker[];
  onClose: () => void;
  onSaveTx: (form: {
    type: string;
    category: string;
    amount: number;
    transaction_date: string;
    description: string;
    supplier_id: string;
    worker_rut: string;
    invoice_number: string;
    payment_method: string;
    status: string;
    invoice_file: File | null;
  }) => Promise<void>;
  onSaveSupplier: (form: {
    name: string;
    rut: string;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    category: string;
    payment_terms: string;
    notes: string;
  }) => Promise<void>;
  onSaveService: (form: {
    service_name: string;
    supplier_id: string;
    category: string;
    monthly_cost: number;
    start_date: string;
    end_date: string;
    notes: string;
  }) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [txForm, setTxForm] = useState({
    type: "egreso",
    category: "General",
    amount: 0,
    transaction_date: new Date().toISOString().slice(0, 10),
    description: "",
    supplier_id: "",
    worker_rut: "",
    invoice_number: "",
    payment_method: "Transferencia",
    status: "Pagado",
  });
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [supForm, setSupForm] = useState({
    name: "",
    rut: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    category: "General",
    payment_terms: "",
    notes: "",
  });
  const [svcForm, setSvcForm] = useState({
    service_name: "",
    supplier_id: "",
    category: "General",
    monthly_cost: 0,
    start_date: new Date().toISOString().slice(0, 10),
    end_date: "",
    notes: "",
  });

  const titles: Record<typeof mode, string> = {
    tx: "Nuevo Movimiento",
    supplier: "Nuevo Proveedor",
    service: "Nuevo Servicio Externo",
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (mode === "tx") await onSaveTx({ ...txForm, invoice_file: invoiceFile });
      else if (mode === "supplier") await onSaveSupplier(supForm);
      else if (mode === "service") await onSaveService(svcForm);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={titles[mode]} size="md">
      <form onSubmit={submit} className="space-y-4">
        {mode === "tx" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Tipo"
                value={txForm.type}
                onChange={(e) => setTxForm({ ...txForm, type: e.target.value })}
              >
                <option value="egreso">Egreso</option>
                <option value="ingreso">Ingreso</option>
              </Select>
              <Select
                label="Categoría"
                value={txForm.category}
                onChange={(e) => setTxForm({ ...txForm, category: e.target.value })}
              >
                {TX_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
            <Input
              label="Descripción"
              required
              value={txForm.description}
              onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Monto ($)"
                type="number"
                required
                value={txForm.amount}
                onChange={(e) =>
                  setTxForm({ ...txForm, amount: parseInt(e.target.value, 10) || 0 })
                }
              />
              <Input
                label="Fecha"
                type="date"
                required
                value={txForm.transaction_date}
                onChange={(e) => setTxForm({ ...txForm, transaction_date: e.target.value })}
              />
            </div>
            <Select
              label="Proveedor (opcional)"
              value={txForm.supplier_id}
              onChange={(e) => setTxForm({ ...txForm, supplier_id: e.target.value })}
            >
              <option value="">Sin proveedor</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Select
              label="Trabajador vinculado (opcional)"
              value={txForm.worker_rut}
              onChange={(e) => setTxForm({ ...txForm, worker_rut: e.target.value })}
            >
              <option value="">Sin trabajador</option>
              {workers.map((w) => (
                <option key={w.rut} value={w.rut}>
                  {w.full_name} ({w.rut})
                </option>
              ))}
            </Select>
            {txForm.worker_rut &&
              (() => {
                const w = workers.find((x) => x.rut === txForm.worker_rut);
                if (!w) return null;
                return (
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3 space-y-1 text-xs">
                    <p className="font-semibold text-emerald-700 flex items-center gap-1">
                      <Wallet size={12} /> Cuenta bancaria del trabajador
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-slate-600">
                      <div>
                        <span className="text-slate-400">Banco:</span> {w.bank_name || "—"}
                      </div>
                      <div>
                        <span className="text-slate-400">Tipo:</span> {w.account_type || "—"}
                      </div>
                      <div>
                        <span className="text-slate-400">Cuenta:</span>{" "}
                        {w.bank_account_number || "—"}
                      </div>
                    </div>
                    {txForm.type === "egreso" && w.base_salary != null && (
                      <p className="text-slate-500 pt-1">
                        Sueldo base: ${Number(w.base_salary).toLocaleString("es-CL")}
                      </p>
                    )}
                  </div>
                );
              })()}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="N° Factura"
                value={txForm.invoice_number}
                onChange={(e) => setTxForm({ ...txForm, invoice_number: e.target.value })}
              />
              <Select
                label="Método de pago"
                value={txForm.payment_method}
                onChange={(e) => setTxForm({ ...txForm, payment_method: e.target.value })}
              >
                {PAYMENT_METHODS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Adjuntar factura (PDF, PNG o JPEG — máx. 5 MB)
              </label>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
                  <Upload size={14} /> {invoiceFile ? invoiceFile.name : "Subir archivo"}
                  <input
                    type="file"
                    accept="application/pdf,image/png,image/jpeg"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setInvoiceFile(f);
                      e.target.value = "";
                    }}
                  />
                </label>
                {invoiceFile && (
                  <button
                    type="button"
                    onClick={() => setInvoiceFile(null)}
                    className="text-xs text-red-600 hover:text-red-700 font-medium"
                  >
                    Quitar
                  </button>
                )}
              </div>
            </div>
            <Select
              label="Estado"
              value={txForm.status}
              onChange={(e) => setTxForm({ ...txForm, status: e.target.value })}
            >
              <option value="Pagado">Pagado</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Anulado">Anulado</option>
            </Select>
          </>
        )}

        {mode === "supplier" && (
          <>
            <Input
              label="Nombre / Razón Social"
              required
              value={supForm.name}
              onChange={(e) => setSupForm({ ...supForm, name: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="RUT"
                value={supForm.rut}
                onChange={(e) => setSupForm({ ...supForm, rut: e.target.value })}
                placeholder="76.543.210-K"
              />
              <Select
                label="Categoría"
                value={supForm.category}
                onChange={(e) => setSupForm({ ...supForm, category: e.target.value })}
              >
                {SUPPLIER_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Contacto"
                value={supForm.contact_name}
                onChange={(e) => setSupForm({ ...supForm, contact_name: e.target.value })}
              />
              <Input
                label="Teléfono"
                value={supForm.contact_phone}
                onChange={(e) => setSupForm({ ...supForm, contact_phone: e.target.value })}
              />
            </div>
            <Input
              label="Email"
              type="email"
              value={supForm.contact_email}
              onChange={(e) => setSupForm({ ...supForm, contact_email: e.target.value })}
            />
            <Input
              label="Condiciones de pago"
              value={supForm.payment_terms}
              onChange={(e) => setSupForm({ ...supForm, payment_terms: e.target.value })}
              placeholder="30 días, 50% anticipado..."
            />
            <Textarea
              label="Notas"
              rows={2}
              value={supForm.notes}
              onChange={(e) => setSupForm({ ...supForm, notes: e.target.value })}
            />
          </>
        )}

        {mode === "service" && (
          <>
            <Input
              label="Nombre del servicio"
              required
              value={svcForm.service_name}
              onChange={(e) => setSvcForm({ ...svcForm, service_name: e.target.value })}
            />
            <Select
              label="Proveedor"
              value={svcForm.supplier_id}
              onChange={(e) => setSvcForm({ ...svcForm, supplier_id: e.target.value })}
            >
              <option value="">Sin proveedor</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Categoría"
                value={svcForm.category}
                onChange={(e) => setSvcForm({ ...svcForm, category: e.target.value })}
              >
                {SERVICE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
              <Input
                label="Costo mensual ($)"
                type="number"
                value={svcForm.monthly_cost}
                onChange={(e) =>
                  setSvcForm({ ...svcForm, monthly_cost: parseInt(e.target.value, 10) || 0 })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Fecha inicio"
                type="date"
                value={svcForm.start_date}
                onChange={(e) => setSvcForm({ ...svcForm, start_date: e.target.value })}
              />
              <Input
                label="Fecha término (opcional)"
                type="date"
                value={svcForm.end_date}
                onChange={(e) => setSvcForm({ ...svcForm, end_date: e.target.value })}
              />
            </div>
            <Textarea
              label="Notas"
              rows={2}
              value={svcForm.notes}
              onChange={(e) => setSvcForm({ ...svcForm, notes: e.target.value })}
            />
          </>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Guardar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
