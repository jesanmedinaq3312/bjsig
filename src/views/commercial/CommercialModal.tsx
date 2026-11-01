import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal, Input, Select, Button, Textarea } from "@/components/ui";
import {
  customerRepo,
  quoteRepo,
  quoteItemRepo,
  invoiceRepo,
  invoiceItemRepo,
  purchaseOrderRepo,
  purchaseOrderItemRepo,
  getCurrentUserEmail,
} from "@/lib/repositories";
import { audit } from "@/lib/audit";
import { useToast } from "@/components/Toast";
import { downloadSiiCsv, DOCUMENT_TYPE_LABELS } from "@/lib/siiExport";
import type { Customer, Quote, Invoice, PurchaseOrder, InvoiceItem } from "@/lib/types";
import {
  PAYMENT_METHODS,
  TAX_RATE,
  fmtCL,
  computeTotals,
  type ItemRow,
  type SupplierLite,
} from "./constants";

export type ModalMode =
  "quote" | "invoice" | "customer" | "po" | "viewQuote" | "viewInvoice" | "viewPo";

export function CommercialModal({
  mode,
  onClose,
  customers,
  suppliers,
  viewingDoc,
  onSaved,
}: {
  mode: ModalMode;
  onClose: () => void;
  customers: Customer[];
  suppliers: SupplierLite[];
  viewingDoc: Quote | Invoice | PurchaseOrder | null;
  onSaved: () => void;
}) {
  const toast = useToast();
  const isView = mode === "viewQuote" || mode === "viewInvoice" || mode === "viewPo";
  const title =
    mode === "quote"
      ? "Nueva Cotización"
      : mode === "invoice"
        ? "Nuevo Documento Tributario"
        : mode === "customer"
          ? "Nuevo Cliente"
          : mode === "po"
            ? "Nueva Orden de Compra"
            : mode === "viewQuote"
              ? `Cotización ${(viewingDoc as Quote)?.quote_number ?? ""}`
              : mode === "viewInvoice"
                ? `Documento ${(viewingDoc as Invoice)?.folio ?? ""}`
                : `Orden de Compra ${(viewingDoc as PurchaseOrder)?.po_number ?? ""}`;

  const [custForm, setCustForm] = useState({
    rut: "",
    name: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    address: "",
    city: "",
    notes: "",
  });

  const [docForm, setDocForm] = useState({
    customer_id: customers[0]?.id ?? "",
    supplier_id: suppliers[0]?.id ?? "",
    issue_date: new Date().toISOString().slice(0, 10),
    expiry_date: "",
    due_date: "",
    expected_date: "",
    document_type: "factura_electronica" as string,
    payment_method: "Transferencia",
    notes: "",
    discount: 0,
  });
  const [items, setItems] = useState<ItemRow[]>([{ description: "", quantity: 1, unit_price: 0 }]);

  useEffect(() => {
    if (isView && viewingDoc) {
      if ("items" in viewingDoc && viewingDoc.items) {
        setItems(
          viewingDoc.items.map((it) => ({
            description: String(it.description ?? ""),
            quantity: Number(it.quantity),
            unit_price: Number(it.unit_price),
            exemption_flag: "exemption_flag" in it ? Boolean(it.exemption_flag) : false,
          })),
        );
      }
      setDocForm((f) => ({
        ...f,
        customer_id: (viewingDoc as Quote).customer_id ?? "",
        supplier_id: (viewingDoc as PurchaseOrder).supplier_id ?? "",
        issue_date:
          "issue_date" in viewingDoc ? String(viewingDoc.issue_date ?? f.issue_date) : f.issue_date,
        expiry_date: (viewingDoc as Quote).expiry_date ?? "",
        due_date: (viewingDoc as Invoice).due_date ?? "",
        expected_date: (viewingDoc as PurchaseOrder).expected_date ?? "",
        document_type: (viewingDoc as Invoice).document_type ?? "factura_electronica",
        payment_method: (viewingDoc as Invoice).payment_method ?? "Transferencia",
        notes: "notes" in viewingDoc ? String(viewingDoc.notes ?? "") : "",
        discount: Number((viewingDoc as Quote).discount ?? 0),
      }));
    }
  }, [isView, viewingDoc]);

  const totals = useMemo(() => computeTotals(items, docForm.discount), [items, docForm.discount]);

  function addItem() {
    setItems([...items, { description: "", quantity: 1, unit_price: 0 }]);
  }
  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }
  function updateItem(idx: number, field: keyof ItemRow, value: string | number | boolean) {
    setItems(items.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  }

  async function saveCustomer() {
    if (!custForm.rut.trim() || !custForm.name.trim()) {
      toast.error("Faltan datos", "RUT y nombre son obligatorios");
      return;
    }
    try {
      await customerRepo.insert({
        rut: custForm.rut.trim(),
        name: custForm.name.trim(),
        contact_name: custForm.contact_name || null,
        contact_email: custForm.contact_email || null,
        contact_phone: custForm.contact_phone || null,
        address: custForm.address || null,
        city: custForm.city || null,
        notes: custForm.notes || null,
      } as never);
      await audit({ action: "customer.create", entity: "customers", entity_label: custForm.name });
      toast.success("Cliente creado", custForm.name);
      onClose();
      onSaved();
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  async function saveQuote() {
    if (!docForm.customer_id) {
      toast.error("Falta cliente", "Selecciona un cliente");
      return;
    }
    if (items.every((it) => !it.description.trim())) {
      toast.error("Faltan items", "Agrega al menos un item");
      return;
    }
    try {
      const validItems = items.filter((it) => it.description.trim());
      const quoteNumber = await quoteRepo.nextQuoteNumber();
      const qtData = await quoteRepo.insert({
        quote_number: quoteNumber,
        customer_id: docForm.customer_id,
        issue_date: docForm.issue_date,
        expiry_date: docForm.expiry_date || null,
        status: "borrador",
        subtotal: totals.subtotal,
        discount: docForm.discount,
        tax_rate: TAX_RATE,
        tax_amount: totals.taxAmount,
        total: totals.total,
        notes: docForm.notes || null,
        created_by: await getCurrentUserEmail(),
      } as never);
      const quoteItems = validItems.map((it, idx) => ({
        quote_id: qtData.id,
        line_number: idx + 1,
        description: it.description,
        quantity: it.quantity,
        unit_price: it.unit_price,
        line_total: it.quantity * it.unit_price,
      }));
      await quoteItemRepo.insertMany(quoteItems as never);
      await audit({ action: "quote.create", entity: "quotes", entity_label: quoteNumber });
      toast.success("Cotización creada", quoteNumber);
      onClose();
      onSaved();
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  async function saveInvoice() {
    if (items.every((it) => !it.description.trim())) {
      toast.error("Faltan items", "Agrega al menos un item");
      return;
    }
    try {
      const validItems = items.filter((it) => it.description.trim());
      const nextFolio = await invoiceRepo.nextFolio();
      const invData = await invoiceRepo.insert({
        document_type: docForm.document_type,
        folio: nextFolio,
        customer_id: docForm.customer_id || null,
        issue_date: docForm.issue_date,
        due_date: docForm.due_date || null,
        status: "borrador",
        subtotal: totals.subtotal,
        exempt_amount: totals.exemptAmount,
        tax_rate: TAX_RATE,
        tax_amount: totals.taxAmount,
        total: totals.total,
        payment_method: docForm.payment_method,
        sii_status: "no_enviada",
        notes: docForm.notes || null,
        created_by: await getCurrentUserEmail(),
      } as never);
      const invItems = validItems.map((it, idx) => ({
        invoice_id: invData.id,
        line_number: idx + 1,
        description: it.description,
        quantity: it.quantity,
        unit_price: it.unit_price,
        exemption_flag: it.exemption_flag ?? false,
        line_subtotal: it.quantity * it.unit_price,
      }));
      await invoiceItemRepo.insertMany(invItems as never);
      await audit({
        action: "invoice.create",
        entity: "invoices",
        entity_label: `Folio ${nextFolio}`,
      });
      toast.success("Documento creado", `Folio ${nextFolio}`);
      onClose();
      onSaved();
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  async function savePO() {
    if (items.every((it) => !it.description.trim())) {
      toast.error("Faltan items", "Agrega al menos un item");
      return;
    }
    try {
      const validItems = items.filter((it) => it.description.trim());
      const poNumber = await purchaseOrderRepo.nextPoNumber();
      const poData = await purchaseOrderRepo.insert({
        po_number: poNumber,
        supplier_id: docForm.supplier_id || null,
        issue_date: docForm.issue_date,
        expected_date: docForm.expected_date || null,
        status: "pendiente",
        subtotal: totals.subtotal,
        tax_rate: TAX_RATE,
        tax_amount: totals.taxAmount,
        total: totals.total,
        notes: docForm.notes || null,
        created_by: await getCurrentUserEmail(),
      } as never);
      const poItems = validItems.map((it, idx) => ({
        purchase_order_id: poData.id,
        line_number: idx + 1,
        description: it.description,
        quantity: it.quantity,
        unit_price: it.unit_price,
        line_total: it.quantity * it.unit_price,
      }));
      await purchaseOrderItemRepo.insertMany(poItems as never);
      await audit({
        action: "purchase_order.create",
        entity: "purchase_orders",
        entity_label: poNumber,
      });
      toast.success("Orden de compra creada", poNumber);
      onClose();
      onSaved();
    } catch (e) {
      toast.error("Error", (e as Error).message);
    }
  }

  function handleSave() {
    if (mode === "customer") saveCustomer();
    else if (mode === "quote") saveQuote();
    else if (mode === "invoice") saveInvoice();
    else if (mode === "po") savePO();
  }

  const showItems = mode === "quote" || mode === "invoice" || mode === "po" || isView;
  const showCustomerSelect =
    mode === "quote" || mode === "invoice" || mode === "viewQuote" || mode === "viewInvoice";
  const showSupplierSelect = mode === "po" || mode === "viewPo";

  return (
    <Modal open onClose={onClose} title={title} size="xl">
      <div className="space-y-4">
        {mode === "customer" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="RUT *"
              value={custForm.rut}
              onChange={(e) => setCustForm({ ...custForm, rut: e.target.value })}
              placeholder="12345678-9"
            />
            <Input
              label="Nombre / Razón Social *"
              value={custForm.name}
              onChange={(e) => setCustForm({ ...custForm, name: e.target.value })}
            />
            <Input
              label="Contacto"
              value={custForm.contact_name}
              onChange={(e) => setCustForm({ ...custForm, contact_name: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              value={custForm.contact_email}
              onChange={(e) => setCustForm({ ...custForm, contact_email: e.target.value })}
            />
            <Input
              label="Teléfono"
              value={custForm.contact_phone}
              onChange={(e) => setCustForm({ ...custForm, contact_phone: e.target.value })}
            />
            <Input
              label="Dirección"
              value={custForm.address}
              onChange={(e) => setCustForm({ ...custForm, address: e.target.value })}
            />
            <Input
              label="Ciudad"
              value={custForm.city}
              onChange={(e) => setCustForm({ ...custForm, city: e.target.value })}
            />
            <Textarea
              label="Notas"
              rows={2}
              value={custForm.notes}
              onChange={(e) => setCustForm({ ...custForm, notes: e.target.value })}
            />
          </div>
        )}

        {showCustomerSelect && (
          <Select
            label="Cliente"
            value={docForm.customer_id}
            onChange={(e) => setDocForm({ ...docForm, customer_id: e.target.value })}
            disabled={isView}
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.rut})
              </option>
            ))}
          </Select>
        )}
        {showSupplierSelect && (
          <Select
            label="Proveedor"
            value={docForm.supplier_id}
            onChange={(e) => setDocForm({ ...docForm, supplier_id: e.target.value })}
            disabled={isView}
          >
            <option value="">— Sin proveedor —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        )}

        {mode === "invoice" && (
          <Select
            label="Tipo de Documento"
            value={docForm.document_type}
            onChange={(e) => setDocForm({ ...docForm, document_type: e.target.value })}
            disabled={isView}
          >
            {Object.entries(DOCUMENT_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        )}

        {showItems && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Fecha de Emisión"
              type="date"
              value={docForm.issue_date}
              onChange={(e) => setDocForm({ ...docForm, issue_date: e.target.value })}
              disabled={isView}
            />
            {mode === "quote" || mode === "viewQuote" ? (
              <Input
                label="Vencimiento"
                type="date"
                value={docForm.expiry_date}
                onChange={(e) => setDocForm({ ...docForm, expiry_date: e.target.value })}
                disabled={isView}
              />
            ) : mode === "invoice" || mode === "viewInvoice" ? (
              <Input
                label="Vencimiento Pago"
                type="date"
                value={docForm.due_date}
                onChange={(e) => setDocForm({ ...docForm, due_date: e.target.value })}
                disabled={isView}
              />
            ) : (
              <Input
                label="Fecha Esperada"
                type="date"
                value={docForm.expected_date}
                onChange={(e) => setDocForm({ ...docForm, expected_date: e.target.value })}
                disabled={isView}
              />
            )}
            {mode === "invoice" && (
              <Select
                label="Forma de Pago"
                value={docForm.payment_method}
                onChange={(e) => setDocForm({ ...docForm, payment_method: e.target.value })}
                disabled={isView}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            )}
          </div>
        )}

        {showItems && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-700">Detalle</h4>
              {!isView && (
                <Button size="sm" variant="outline" onClick={addItem}>
                  <Plus size={14} /> Agregar línea
                </Button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500 uppercase">
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Descripción</th>
                    <th className="px-3 py-2 font-medium text-right">Cant.</th>
                    <th className="px-3 py-2 font-medium text-right">Precio</th>
                    {mode === "invoice" && (
                      <th className="px-3 py-2 font-medium text-center">Exento</th>
                    )}
                    <th className="px-3 py-2 font-medium text-right">Total</th>
                    {!isView && <th className="px-3 py-2"></th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <input
                          value={it.description}
                          onChange={(e) => updateItem(idx, "description", e.target.value)}
                          disabled={isView}
                          className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-transparent disabled:border-transparent"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={it.quantity}
                          onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))}
                          disabled={isView}
                          className="w-20 px-2 py-1 text-sm text-right border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-transparent disabled:border-transparent"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={it.unit_price}
                          onChange={(e) => updateItem(idx, "unit_price", Number(e.target.value))}
                          disabled={isView}
                          className="w-24 px-2 py-1 text-sm text-right border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-transparent disabled:border-transparent"
                        />
                      </td>
                      {mode === "invoice" && (
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={it.exemption_flag ?? false}
                            onChange={(e) => updateItem(idx, "exemption_flag", e.target.checked)}
                            disabled={isView}
                            className="rounded"
                          />
                        </td>
                      )}
                      <td className="px-3 py-2 text-right font-medium text-slate-700">
                        ${fmtCL(it.quantity * it.unit_price)}
                      </td>
                      {!isView && (
                        <td className="px-3 py-2 text-right">
                          {items.length > 1 && (
                            <button
                              onClick={() => removeItem(idx)}
                              className="p-1 text-slate-400 hover:text-red-600"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <div className="w-64 space-y-1 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span>${fmtCL(totals.subtotal)}</span>
                </div>
                {totals.exemptAmount > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Monto exento</span>
                    <span>${fmtCL(totals.exemptAmount)}</span>
                  </div>
                )}
                {mode === "quote" && !isView && (
                  <div className="flex justify-between text-slate-500">
                    <span>Descuento</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={docForm.discount}
                      onChange={(e) => setDocForm({ ...docForm, discount: Number(e.target.value) })}
                      className="w-24 px-2 py-0.5 text-sm text-right border border-slate-200 rounded"
                    />
                  </div>
                )}
                {mode === "quote" && docForm.discount > 0 && !isView && (
                  <div className="flex justify-between text-slate-500">
                    <span>Neto (con desc.)</span>
                    <span>${fmtCL(Math.max(0, totals.subtotal - totals.discount))}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500">
                  <span>IVA (19%)</span>
                  <span>${fmtCL(totals.taxAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-800 border-t border-slate-200 pt-1">
                  <span>Total</span>
                  <span>${fmtCL(totals.total)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {showItems && (
          <Textarea
            label="Notas"
            rows={2}
            value={docForm.notes}
            onChange={(e) => setDocForm({ ...docForm, notes: e.target.value })}
            disabled={isView}
          />
        )}

        {!isView && (
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Guardar</Button>
          </div>
        )}
        {isView && (
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="ghost" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
