import { Eye, ArrowRight, Trash2, Download, Send } from "lucide-react";
import { Badge, EmptyState, Card } from "@/components/ui";
import { downloadSiiCsv, DOCUMENT_TYPE_LABELS, DOCUMENT_TYPE_SHORT } from "@/lib/siiExport";
import type { Customer, Quote, Invoice, PurchaseOrder } from "@/lib/types";
import {
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_COLORS,
  SII_STATUS_LABELS,
  SII_STATUS_COLORS,
  PO_STATUS_LABELS,
  PO_STATUS_COLORS,
  fmtCL,
} from "./constants";

interface QuoteTableProps {
  quotes: Quote[];
  customerMap: Map<string, Customer>;
  canManage: boolean;
  canDelete: boolean;
  onView: (qt: Quote) => void;
  onStatusChange: (qt: Quote, status: string) => void;
  onConvert: (qt: Quote) => void;
  onDelete: (qt: Quote) => void;
}

export function QuoteTable({
  quotes,
  customerMap,
  canManage,
  canDelete,
  onView,
  onStatusChange,
  onConvert,
  onDelete,
}: QuoteTableProps) {
  if (quotes.length === 0)
    return <EmptyState message="Sin cotizaciones registradas" icon={<QuoteIcon />} />;
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500 uppercase">
              <th className="px-4 py-2.5 font-medium">N°</th>
              <th className="px-4 py-2.5 font-medium">Cliente</th>
              <th className="px-4 py-2.5 font-medium">Emisión</th>
              <th className="px-4 py-2.5 font-medium">Vence</th>
              <th className="px-4 py-2.5 font-medium text-right">Total</th>
              <th className="px-4 py-2.5 font-medium">Estado</th>
              <th className="px-4 py-2.5 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((qt) => (
              <tr key={qt.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-700">{qt.quote_number}</td>
                <td className="px-4 py-3 text-slate-600">
                  {customerMap.get(qt.customer_id)?.name ?? "—"}
                </td>
                <td className="px-4 py-3 text-slate-500">{qt.issue_date}</td>
                <td className="px-4 py-3 text-slate-500">{qt.expiry_date ?? "—"}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-700">
                  ${fmtCL(Number(qt.total))}
                </td>
                <td className="px-4 py-3">
                  <Badge className={QUOTE_STATUS_COLORS[qt.status]}>
                    {QUOTE_STATUS_LABELS[qt.status]}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => onView(qt)}
                      className="p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded"
                      title="Ver"
                    >
                      <Eye size={14} />
                    </button>
                    {canManage && qt.status !== "convertida" && (
                      <>
                        <select
                          value={qt.status}
                          onChange={(e) => onStatusChange(qt, e.target.value)}
                          className="text-xs border border-slate-200 rounded px-1 py-1 text-slate-600"
                          title="Cambiar estado"
                        >
                          {Object.entries(QUOTE_STATUS_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </select>
                        {qt.status === "aprobada" && (
                          <button
                            onClick={() => onConvert(qt)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                            title="Convertir en factura"
                          >
                            <ArrowRight size={14} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => onDelete(qt)}
                            className="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

interface InvoiceTableProps {
  invoices: Invoice[];
  customerMap: Map<string, Customer>;
  companyInfo: { rut: string; name: string };
  canManage: boolean;
  canDelete: boolean;
  onView: (inv: Invoice) => void;
  onStatusChange: (inv: Invoice, status: string) => void;
  onSiiSend: (inv: Invoice) => void;
  onDelete: (inv: Invoice) => void;
}

export function InvoiceTable({
  invoices,
  customerMap,
  companyInfo,
  canManage,
  canDelete,
  onView,
  onStatusChange,
  onSiiSend,
  onDelete,
}: InvoiceTableProps) {
  if (invoices.length === 0)
    return <EmptyState message="Sin documentos tributarios registrados" icon={<InvoiceIcon />} />;
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500 uppercase">
              <th className="px-4 py-2.5 font-medium">Tipo</th>
              <th className="px-4 py-2.5 font-medium">Folio</th>
              <th className="px-4 py-2.5 font-medium">Cliente</th>
              <th className="px-4 py-2.5 font-medium">Emisión</th>
              <th className="px-4 py-2.5 font-medium text-right">Total</th>
              <th className="px-4 py-2.5 font-medium">Estado</th>
              <th className="px-4 py-2.5 font-medium">SII</th>
              <th className="px-4 py-2.5 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Badge className="bg-slate-100 text-slate-600 border-slate-200">
                    {DOCUMENT_TYPE_SHORT[inv.document_type] ?? "DOC"}
                  </Badge>
                </td>
                <td className="px-4 py-3 font-medium text-slate-700">{inv.folio ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">
                  {inv.customer_id ? (customerMap.get(inv.customer_id)?.name ?? "—") : "—"}
                </td>
                <td className="px-4 py-3 text-slate-500">{inv.issue_date}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-700">
                  ${fmtCL(Number(inv.total))}
                </td>
                <td className="px-4 py-3">
                  <Badge className={INVOICE_STATUS_COLORS[inv.status]}>
                    {INVOICE_STATUS_LABELS[inv.status]}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge className={SII_STATUS_COLORS[inv.sii_status]}>
                    {SII_STATUS_LABELS[inv.sii_status]}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => onView(inv)}
                      className="p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded"
                      title="Ver"
                    >
                      <Eye size={14} />
                    </button>
                    {canManage && (
                      <>
                        <button
                          onClick={() =>
                            downloadSiiCsv(
                              inv,
                              inv.customer_id ? (customerMap.get(inv.customer_id) ?? null) : null,
                              companyInfo.rut,
                              companyInfo.name,
                            )
                          }
                          className="p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 rounded"
                          title="Exportar CSV SII"
                        >
                          <Download size={14} />
                        </button>
                        {inv.sii_status === "no_enviada" && inv.status !== "anulada" && (
                          <button
                            onClick={() => onSiiSend(inv)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            title="Enviar al SII"
                          >
                            <Send size={14} />
                          </button>
                        )}
                        {inv.status !== "anulada" && inv.status !== "pagada" && (
                          <select
                            value={inv.status}
                            onChange={(e) => onStatusChange(inv, e.target.value)}
                            className="text-xs border border-slate-200 rounded px-1 py-1 text-slate-600"
                            title="Cambiar estado"
                          >
                            {Object.entries(INVOICE_STATUS_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>
                                {v}
                              </option>
                            ))}
                          </select>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => onDelete(inv)}
                            className="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

interface CustomerTableProps {
  customers: Customer[];
  canDelete: boolean;
  onDelete: (c: Customer) => void;
}

export function CustomerTable({ customers, canDelete, onDelete }: CustomerTableProps) {
  if (customers.length === 0)
    return <EmptyState message="Sin clientes registrados" icon={<CustomerIcon />} />;
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500 uppercase">
              <th className="px-4 py-2.5 font-medium">RUT</th>
              <th className="px-4 py-2.5 font-medium">Nombre</th>
              <th className="px-4 py-2.5 font-medium">Contacto</th>
              <th className="px-4 py-2.5 font-medium">Email</th>
              <th className="px-4 py-2.5 font-medium">Teléfono</th>
              <th className="px-4 py-2.5 font-medium">Estado</th>
              <th className="px-4 py-2.5 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-700">{c.rut}</td>
                <td className="px-4 py-3 text-slate-700">{c.name}</td>
                <td className="px-4 py-3 text-slate-500">{c.contact_name ?? "—"}</td>
                <td className="px-4 py-3 text-slate-500">{c.contact_email ?? "—"}</td>
                <td className="px-4 py-3 text-slate-500">{c.contact_phone ?? "—"}</td>
                <td className="px-4 py-3">
                  <Badge
                    className={
                      c.is_active
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }
                  >
                    {c.is_active ? "Activo" : "Inactivo"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  {canDelete && (
                    <button
                      onClick={() => onDelete(c)}
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
    </Card>
  );
}

interface PurchaseOrderTableProps {
  purchaseOrders: PurchaseOrder[];
  supplierMap: Map<string, string>;
  canDelete: boolean;
  onView: (po: PurchaseOrder) => void;
  onDelete: (po: PurchaseOrder) => void;
}

export function PurchaseOrderTable({
  purchaseOrders,
  supplierMap,
  canDelete,
  onView,
  onDelete,
}: PurchaseOrderTableProps) {
  if (purchaseOrders.length === 0)
    return <EmptyState message="Sin órdenes de compra registradas" icon={<PoIcon />} />;
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500 uppercase">
              <th className="px-4 py-2.5 font-medium">N°</th>
              <th className="px-4 py-2.5 font-medium">Proveedor</th>
              <th className="px-4 py-2.5 font-medium">Emisión</th>
              <th className="px-4 py-2.5 font-medium">Esperada</th>
              <th className="px-4 py-2.5 font-medium text-right">Total</th>
              <th className="px-4 py-2.5 font-medium">Estado</th>
              <th className="px-4 py-2.5 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {purchaseOrders.map((po) => (
              <tr key={po.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-700">{po.po_number}</td>
                <td className="px-4 py-3 text-slate-600">
                  {po.supplier_id ? (supplierMap.get(po.supplier_id) ?? "—") : "—"}
                </td>
                <td className="px-4 py-3 text-slate-500">{po.issue_date}</td>
                <td className="px-4 py-3 text-slate-500">{po.expected_date ?? "—"}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-700">
                  ${fmtCL(Number(po.total))}
                </td>
                <td className="px-4 py-3">
                  <Badge className={PO_STATUS_COLORS[po.status]}>
                    {PO_STATUS_LABELS[po.status]}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => onView(po)}
                      className="p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded"
                      title="Ver"
                    >
                      <Eye size={14} />
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => onDelete(po)}
                        className="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// Icon stubs to avoid extra imports
function QuoteIcon() {
  return <span className="text-2xl">📄</span>;
}
function InvoiceIcon() {
  return <span className="text-2xl">🧾</span>;
}
function CustomerIcon() {
  return <span className="text-2xl">👥</span>;
}
function PoIcon() {
  return <span className="text-2xl">🛒</span>;
}
