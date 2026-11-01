import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  FileText,
  Users,
  ShoppingCart,
  Receipt,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Card, Button, Badge, EmptyState, Spinner } from "@/components/ui";
import {
  customerRepo,
  quoteRepo,
  invoiceRepo,
  purchaseOrderRepo,
  invoiceItemRepo,
  supplierRepo,
  systemConfigRepo,
  getCurrentUserEmail,
} from "@/lib/repositories";
import { audit } from "@/lib/audit";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/hooks/useConfirm";
import { DOCUMENT_TYPE_LABELS } from "@/lib/siiExport";
import type { Customer, Quote, Invoice, PurchaseOrder } from "@/lib/types";
import {
  type Tab,
  type SupplierLite,
  QUOTE_STATUS_LABELS,
  INVOICE_STATUS_LABELS,
  fmtCL,
  computeTotals,
  TAX_RATE,
} from "./commercial/constants";
import { CommercialModal, type ModalMode } from "./commercial/CommercialModal";
import { QuoteTable, InvoiceTable, CustomerTable, PurchaseOrderTable } from "./commercial/Tables";

export function CommercialView({
  userRole,
  permissions,
}: {
  userRole: string;
  permissions?: Record<string, boolean>;
}) {
  const canManage =
    userRole === "superadmin" ||
    userRole === "developer" ||
    permissions?.["can_view_treasury"] === true ||
    permissions?.["can_edit_workers"] === true;
  const canDelete =
    userRole === "superadmin" ||
    userRole === "developer" ||
    permissions?.["can_delete_commercial"] === true;
  const [tab, setTab] = useState<Tab>("quotes");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierLite[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("quote");
  const [viewingDoc, setViewingDoc] = useState<Quote | Invoice | PurchaseOrder | null>(null);
  const [companyInfo, setCompanyInfo] = useState({ rut: "", name: "" });
  const toast = useToast();
  const { confirm } = useConfirm();

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, qRes, iRes, poRes, supRes, ciRes] = await Promise.all([
        customerRepo.getAllByName(),
        quoteRepo.getAllWithItems(),
        invoiceRepo.getAllWithItems(),
        purchaseOrderRepo.getAllWithItems(),
        supplierRepo.getLite(),
        systemConfigRepo.getValues(["company_rut", "company_name"]),
      ]);
      setCustomers(cRes);
      setQuotes(qRes);
      setInvoices(iRes);
      setPurchaseOrders(poRes);
      setSuppliers(supRes as SupplierLite[]);
      setCompanyInfo({
        rut: ciRes["company_rut"] ?? "",
        name: ciRes["company_name"] ?? "",
      });
    } catch (e) {
      toast.error("Error al cargar", (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const customerMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const supplierMap = useMemo(() => new Map(suppliers.map((s) => [s.id, s.name])), [suppliers]);

  const stats = useMemo(() => {
    const invoiced = invoices
      .filter((i) => i.status !== "anulada")
      .reduce((s, i) => s + Number(i.total), 0);
    const paid = invoices
      .filter((i) => i.status === "pagada")
      .reduce((s, i) => s + Number(i.total), 0);
    const pending = invoices
      .filter((i) => i.status === "emitida")
      .reduce((s, i) => s + Number(i.total), 0);
    const overdue = invoices
      .filter((i) => i.status === "vencida")
      .reduce((s, i) => s + Number(i.total), 0);
    const quotesApproved = quotes.filter((q) => q.status === "aprobada").length;
    const quotesPending = quotes.filter(
      (q) => q.status === "enviada" || q.status === "borrador",
    ).length;
    const poPending = purchaseOrders.filter(
      (p) => p.status === "pendiente" || p.status === "enviada",
    ).length;
    return { invoiced, paid, pending, overdue, quotesApproved, quotesPending, poPending };
  }, [invoices, quotes, purchaseOrders]);

  const filteredQuotes = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return quotes;
    return quotes.filter(
      (qt) =>
        qt.quote_number.toLowerCase().includes(q) ||
        (customerMap.get(qt.customer_id)?.name ?? "").toLowerCase().includes(q) ||
        qt.status.toLowerCase().includes(q),
    );
  }, [quotes, search, customerMap]);

  const filteredInvoices = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return invoices;
    return invoices.filter(
      (inv) =>
        String(inv.folio ?? "").includes(q) ||
        DOCUMENT_TYPE_LABELS[inv.document_type]?.toLowerCase().includes(q) ||
        (inv.customer_id
          ? (customerMap.get(inv.customer_id)?.name ?? "").toLowerCase().includes(q)
          : "") ||
        inv.status.toLowerCase().includes(q),
    );
  }, [invoices, search, customerMap]);

  const filteredCustomers = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.rut.toLowerCase().includes(q) ||
        (c.contact_email ?? "").toLowerCase().includes(q),
    );
  }, [customers, search]);

  const filteredPOs = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return purchaseOrders;
    return purchaseOrders.filter(
      (po) =>
        po.po_number.toLowerCase().includes(q) ||
        (po.supplier_id ? (supplierMap.get(po.supplier_id) ?? "").toLowerCase().includes(q) : "") ||
        po.status.toLowerCase().includes(q),
    );
  }, [purchaseOrders, search, supplierMap]);

  async function handleDeleteQuote(qt: Quote) {
    const ok = await confirm({
      title: "Eliminar cotización",
      message: `Se eliminará ${qt.quote_number}.`,
      confirmText: "Eliminar",
      type: "danger",
    });
    if (!ok) return;
    try {
      await quoteRepo.remove(qt.id);
      toast.success("Cotización eliminada", qt.quote_number);
      await loadAll();
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  async function handleDeleteInvoice(inv: Invoice) {
    const ok = await confirm({
      title: "Eliminar documento",
      message: `Se eliminará el folio ${inv.folio ?? ""}.`,
      confirmText: "Eliminar",
      type: "danger",
    });
    if (!ok) return;
    try {
      await invoiceRepo.remove(inv.id);
      toast.success("Documento eliminado", `Folio ${inv.folio}`);
      await loadAll();
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  async function handleDeleteCustomer(c: Customer) {
    const ok = await confirm({
      title: "Eliminar cliente",
      message: `Se eliminará a ${c.name}.`,
      confirmText: "Eliminar",
      type: "danger",
    });
    if (!ok) return;
    try {
      await customerRepo.remove(c.id);
      toast.success("Cliente eliminado", c.name);
      await loadAll();
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  async function handleDeletePO(po: PurchaseOrder) {
    const ok = await confirm({
      title: "Eliminar orden de compra",
      message: `Se eliminará ${po.po_number}.`,
      confirmText: "Eliminar",
      type: "danger",
    });
    if (!ok) return;
    try {
      await purchaseOrderRepo.remove(po.id);
      toast.success("Orden eliminada", po.po_number);
      await loadAll();
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  async function handleStatusChange(inv: Invoice, newStatus: string) {
    try {
      await invoiceRepo.update(inv.id, { status: newStatus } as Partial<Invoice>);
      await audit({
        action: "invoice.status_change",
        entity: "invoices",
        entity_label: `Folio ${inv.folio} → ${newStatus}`,
      });
      toast.success(
        "Estado actualizado",
        `Folio ${inv.folio}: ${INVOICE_STATUS_LABELS[newStatus]}`,
      );
      await loadAll();
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  async function handleQuoteStatusChange(qt: Quote, newStatus: string) {
    try {
      await quoteRepo.update(qt.id, { status: newStatus } as Partial<Quote>);
      await audit({
        action: "quote.status_change",
        entity: "quotes",
        entity_label: `${qt.quote_number} → ${newStatus}`,
      });
      toast.success("Estado actualizado", `${qt.quote_number}: ${QUOTE_STATUS_LABELS[newStatus]}`);
      await loadAll();
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  async function handleSiiSend(inv: Invoice) {
    try {
      await invoiceRepo.update(inv.id, { sii_status: "enviada" } as Partial<Invoice>);
      await audit({
        action: "invoice.sii_send",
        entity: "invoices",
        entity_label: `Folio ${inv.folio} enviado al SII`,
      });
      toast.success("Documento enviado al SII", `Folio ${inv.folio}`);
      await loadAll();
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  async function handleConvertQuote(qt: Quote) {
    const ok = await confirm({
      title: "Convertir en factura",
      message: `Se creará una factura desde ${qt.quote_number}.`,
      confirmText: "Convertir",
    });
    if (!ok) return;
    try {
      const totals = computeTotals(qt.items ?? []);
      const invData = await invoiceRepo.insert({
        document_type: "factura_electronica",
        customer_id: qt.customer_id,
        quote_id: qt.id,
        issue_date: new Date().toISOString().slice(0, 10),
        status: "borrador",
        subtotal: totals.subtotal,
        exempt_amount: totals.exemptAmount,
        tax_rate: TAX_RATE,
        tax_amount: totals.taxAmount,
        total: totals.total,
        notes: qt.notes,
        created_by: await getCurrentUserEmail(),
      } as never);
      const invItems = (qt.items ?? []).map((it, idx) => ({
        invoice_id: invData.id,
        line_number: idx + 1,
        description: it.description,
        quantity: it.quantity,
        unit_price: it.unit_price,
        exemption_flag: false,
        line_subtotal: it.quantity * it.unit_price,
      }));
      if (invItems.length > 0) {
        await invoiceItemRepo.insertMany(invItems as never);
      }
      await quoteRepo.update(qt.id, { status: "convertida" } as Partial<Quote>);
      await audit({
        action: "quote.convert_to_invoice",
        entity: "invoices",
        entity_label: `${qt.quote_number} → Factura`,
      });
      toast.success("Cotización convertida", `Factura creada desde ${qt.quote_number}`);
      await loadAll();
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  if (loading) return <Spinner />;

  const tabs: { key: Tab; label: string; icon: typeof FileText }[] = [
    { key: "quotes", label: "Cotizaciones", icon: FileText },
    { key: "invoices", label: "Facturación", icon: Receipt },
    { key: "customers", label: "Clientes", icon: Users },
    { key: "purchaseOrders", label: "Órdenes de Compra", icon: ShoppingCart },
  ];

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={16} className="text-emerald-600" />
              <span className="text-xs font-medium text-slate-500">Facturado</span>
            </div>
            <p className="text-xl font-bold text-emerald-700">${fmtCL(stats.invoiced)}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={16} className="text-blue-600" />
              <span className="text-xs font-medium text-slate-500">Cobrado</span>
            </div>
            <p className="text-xl font-bold text-blue-700">${fmtCL(stats.paid)}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={16} className="text-amber-600" />
              <span className="text-xs font-medium text-slate-500">Por cobrar</span>
            </div>
            <p className="text-xl font-bold text-amber-700">${fmtCL(stats.pending)}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle size={16} className="text-red-600" />
              <span className="text-xs font-medium text-slate-500">Vencido</span>
            </div>
            <p className="text-xl font-bold text-red-700">${fmtCL(stats.overdue)}</p>
          </div>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => {
                  setTab(t.key);
                  setSearch("");
                }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.key ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
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
                tab === "quotes"
                  ? "quote"
                  : tab === "invoices"
                    ? "invoice"
                    : tab === "customers"
                      ? "customer"
                      : "po",
              );
              setViewingDoc(null);
              setModalOpen(true);
            }}
          >
            <Plus size={15} />{" "}
            {tab === "quotes"
              ? "Nueva Cotización"
              : tab === "invoices"
                ? "Nuevo Documento"
                : tab === "customers"
                  ? "Nuevo Cliente"
                  : "Nueva Orden"}
          </Button>
        )}
      </div>

      {tab !== "purchaseOrders" && (
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {tab === "quotes" && (
        <QuoteTable
          quotes={filteredQuotes}
          customerMap={customerMap}
          canManage={canManage}
          canDelete={canDelete}
          onView={(qt) => {
            setViewingDoc(qt);
            setModalMode("viewQuote");
            setModalOpen(true);
          }}
          onStatusChange={handleQuoteStatusChange}
          onConvert={handleConvertQuote}
          onDelete={handleDeleteQuote}
        />
      )}

      {tab === "invoices" && (
        <InvoiceTable
          invoices={filteredInvoices}
          customerMap={customerMap}
          companyInfo={companyInfo}
          canManage={canManage}
          canDelete={canDelete}
          onView={(inv) => {
            setViewingDoc(inv);
            setModalMode("viewInvoice");
            setModalOpen(true);
          }}
          onStatusChange={handleStatusChange}
          onSiiSend={handleSiiSend}
          onDelete={handleDeleteInvoice}
        />
      )}

      {tab === "customers" && (
        <CustomerTable
          customers={filteredCustomers}
          canDelete={canDelete}
          onDelete={handleDeleteCustomer}
        />
      )}

      {tab === "purchaseOrders" && (
        <PurchaseOrderTable
          purchaseOrders={filteredPOs}
          supplierMap={supplierMap}
          canDelete={canDelete}
          onView={(po) => {
            setViewingDoc(po);
            setModalMode("viewPo");
            setModalOpen(true);
          }}
          onDelete={handleDeletePO}
        />
      )}

      {modalOpen && (
        <CommercialModal
          mode={modalMode}
          onClose={() => {
            setModalOpen(false);
            setViewingDoc(null);
          }}
          customers={customers}
          suppliers={suppliers}
          viewingDoc={viewingDoc}
          onSaved={loadAll}
        />
      )}
    </div>
  );
}
