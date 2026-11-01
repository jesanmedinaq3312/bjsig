import { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  Trash2,
  AlertTriangle,
  Search,
  History,
  HardHat,
  FileSpreadsheet,
  FileText,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  QrCode,
} from "lucide-react";
import { Card, CardHeader, Button, Badge, EmptyState, Spinner } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { audit } from "@/lib/audit";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/hooks/useConfirm";
import { normalizeRut } from "@/lib/rut";
import { ExportService } from "@/lib/export";
import { ExportPdf } from "@/lib/exportPdf";
import { usePagination } from "@/hooks/usePagination";
import { EppQrConfirm } from "@/components/EppQrConfirm";
import type { AppData } from "@/hooks/useAppData";
import {
  type EppItem,
  type EppStock,
  type EppDelivery,
  type EppReturn,
  type Tab,
  type ModalMode,
  type DeliverForm,
  normalizeSize,
} from "./epp-warehouse/types";
import { EppModal } from "./epp-warehouse/EppModal";
import { QuickDeliverForm } from "./epp-warehouse/QuickDeliverForm";
import { TerrainEppTab } from "./epp-warehouse/TerrainEppTab";

export function EppWarehouseView({
  data,
  userRole,
  permissions,
}: {
  data: AppData;
  userRole: string;
  permissions?: Record<string, boolean>;
}) {
  const { workers } = data;
  const unrestricted = userRole === "superadmin" || userRole === "developer";
  const canDeliver = unrestricted || permissions?.["can_epp_deliver"] === true;
  const canReturn = unrestricted || permissions?.["can_epp_return"] === true;
  const canManageStock = unrestricted || permissions?.["can_epp_manage_stock"] === true;
  const canManageItems = unrestricted || permissions?.["can_epp_manage_items"] === true;
  const canDeleteEpp = unrestricted || permissions?.["can_delete_epp"] === true;
  const isBodeguero =
    !unrestricted && (canDeliver || canReturn) && !canManageItems && !canManageStock;
  const [tab, setTab] = useState<Tab>("stock");
  const [items, setItems] = useState<EppItem[]>([]);
  const [stock, setStock] = useState<EppStock[]>([]);
  const [deliveries, setDeliveries] = useState<EppDelivery[]>([]);
  const [returns, setReturns] = useState<EppReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("item");
  const [qrConfirm, setQrConfirm] = useState<{ deliverForm: DeliverForm } | null>(null);
  const [delivering, setDelivering] = useState(false);
  const toast = useToast();
  const { confirm } = useConfirm();

  async function loadAll() {
    setLoading(true);
    try {
      const [itemsRes, stockRes, delRes, retRes] = await Promise.all([
        supabase.from("epp_items").select("*").order("name"),
        supabase.from("epp_stock").select("*").order("size_label"),
        supabase
          .from("epp_deliveries")
          .select("*")
          .order("delivery_date", { ascending: false })
          .limit(200),
        supabase
          .from("epp_returns")
          .select("*")
          .order("return_date", { ascending: false })
          .limit(200),
      ]);
      if (itemsRes.data) setItems(itemsRes.data as EppItem[]);
      if (stockRes.data) setStock(stockRes.data as EppStock[]);
      if (delRes.data) setDeliveries(delRes.data as EppDelivery[]);
      if (retRes.data) setReturns(retRes.data as EppReturn[]);
      const queryErrors = [itemsRes.error, stockRes.error, delRes.error, retRes.error].filter(
        Boolean,
      );
      if (queryErrors.length > 0) {
        const permissionDenied = queryErrors.some((error) =>
          /permission denied|row-level security/i.test(error?.message ?? ""),
        );
        toast.warning(
          permissionDenied ? "Permisos EPP pendientes" : "Carga EPP parcial",
          permissionDenied
            ? "Aplica la migración 20260918_0001_worker_portal_preview_and_epp_rls.sql en Supabase para habilitar el tenant activo."
            : queryErrors
                .map((error) => error?.message)
                .filter(Boolean)
                .join(" · "),
        );
      }
    } catch (e) {
      toast.error("Error al cargar", (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- reviewed dependency set; unstable callback recreation is intentional to avoid loops

  const itemNameMap = useMemo(() => new Map(items.map((i) => [i.id, i.name])), [items]);
  const workerNameMap = useMemo(() => new Map(workers.map((w) => [w.rut, w.full_name])), [workers]);

  const filteredItems = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        (i.sku ?? "").toLowerCase().includes(q),
    );
  }, [items, search]);

  const lowStockCount = useMemo(
    () => stock.filter((s) => s.quantity <= s.min_quantity).length,
    [stock],
  );

  const {
    page: stockPage,
    totalPages: stockTotalPages,
    pageItems: stockPageItems,
    setPage: setStockPage,
    total: stockTotal,
  } = usePagination(filteredItems, 50);
  const {
    page: histPage,
    totalPages: histTotalPages,
    pageItems: histPageItems,
    setPage: setHistPage,
    total: histTotal,
  } = usePagination(deliveries, 50);
  const {
    page: retPage,
    totalPages: retTotalPages,
    pageItems: retPageItems,
    setPage: setRetPage,
    total: retTotal,
  } = usePagination(returns, 50);

  function openModal(mode: ModalMode) {
    setModalMode(mode);
    setModalOpen(true);
  }

  async function handleSaveItem(form: {
    name: string;
    category: string;
    sku: string;
    size_required: boolean;
    min_stock: number;
    unit_cost: number;
    notes: string;
  }) {
    try {
      const { error } = await supabase.from("epp_items").insert({
        name: form.name,
        category: form.category,
        sku: form.sku || null,
        size_required: form.size_required,
        min_stock: form.min_stock,
        unit_cost: form.unit_cost,
        notes: form.notes || null,
      });
      if (error) throw new Error(error.message);
      await audit({ action: "epp.item.create", entity: "epp_items", entity_label: form.name });
      toast.success("Item creado", form.name);
      setModalOpen(false);
      await loadAll();
    } catch (e) {
      toast.error("No se pudo crear el item", (e as Error).message);
    }
  }

  async function executeDelivery(
    form: DeliverForm,
    qrData: { confirmed_via_qr: boolean; confirmed_scan_rut: string | null },
  ) {
    setDelivering(true);
    try {
      const rut = normalizeRut(form.worker_rut);
      if (!Number.isInteger(form.quantity) || form.quantity <= 0) {
        throw new Error("La cantidad a entregar debe ser un número entero mayor que cero.");
      }
      if (
        qrData.confirmed_via_qr &&
        (!qrData.confirmed_scan_rut || normalizeRut(qrData.confirmed_scan_rut) !== rut)
      ) {
        throw new Error(
          "El QR no corresponde al trabajador seleccionado. Verifica la identidad e intenta nuevamente.",
        );
      }
      const stockRow = stock.find(
        (s) =>
          s.item_id === form.item_id &&
          normalizeSize(s.size_label) === normalizeSize(form.size_label),
      );
      if (stockRow && stockRow.quantity < form.quantity) {
        toast.error(
          "Stock insuficiente",
          `Solo hay ${stockRow.quantity} unidades disponibles de ${itemNameMap.get(form.item_id) ?? "EPP"} (talla ${form.size_label}). No se puede entregar ${form.quantity}.`,
        );
        setDelivering(false);
        return;
      }
      if (!stockRow) {
        toast.error(
          "Sin stock registrado",
          `No hay stock registrado para ${itemNameMap.get(form.item_id) ?? "EPP"} (talla ${form.size_label}). No se puede entregar un item sin inventario.`,
        );
        setDelivering(false);
        return;
      }
      const today = new Date().toISOString().slice(0, 10);
      const duplicates = deliveries.filter(
        (d) =>
          d.worker_rut === rut &&
          d.item_id === form.item_id &&
          d.size_label === form.size_label &&
          d.delivery_date === today,
      );
      if (duplicates.length > 0) {
        const dupInfo = duplicates
          .map((d) => `${d.quantity}u${d.confirmed_via_qr ? " (QR)" : ""}`)
          .join(", ");
        toast.error(
          "Entrega duplicada detectada",
          `Este trabajador ya recibio ${itemNameMap.get(form.item_id) ?? "EPP"} (talla ${form.size_label}) hoy: ${dupInfo}. Verifica si es necesario o usa una justificacion valida.`,
        );
        setDelivering(false);
        return;
      }
      const { data: newQty, error: stockErr } = await supabase.rpc("epp_adjust_stock", {
        p_item_id: form.item_id,
        p_size_label: form.size_label,
        p_delta: -form.quantity,
      });
      if (stockErr) throw new Error(stockErr.message);
      if (newQty === null)
        throw new Error("No se encontro el registro de stock para este item y talla.");
      if (newQty === -1) throw new Error("Stock insuficiente en la base de datos.");
      const { error: delErr } = await supabase.from("epp_deliveries").insert({
        worker_rut: rut,
        item_id: form.item_id,
        size_label: form.size_label,
        quantity: form.quantity,
        justification: form.justification,
        condition: form.condition,
        notes: form.notes || null,
        delivered_by: (await supabase.auth.getUser()).data.user?.email ?? null,
        confirmed_via_qr: qrData.confirmed_via_qr,
        confirmed_at: qrData.confirmed_via_qr ? new Date().toISOString() : null,
        confirmed_scan_rut: qrData.confirmed_scan_rut,
      });
      if (delErr) {
        await supabase.rpc("epp_adjust_stock", {
          p_item_id: form.item_id,
          p_size_label: form.size_label,
          p_delta: form.quantity,
        });
        throw new Error(delErr.message);
      }
      const action = qrData.confirmed_via_qr ? "epp.delivery" : "epp.delivery_without_qr";
      await audit({
        action,
        entity: "epp_deliveries",
        entity_label: `${workerNameMap.get(rut) ?? rut} — ${itemNameMap.get(form.item_id) ?? "EPP"}`,
      });
      toast.success(
        "Entrega registrada",
        `${itemNameMap.get(form.item_id) ?? "EPP"} entregado a ${workerNameMap.get(rut) ?? rut}${qrData.confirmed_via_qr ? " (confirmado con QR)" : ""}`,
      );
      setModalOpen(false);
      await loadAll();
    } catch (e) {
      toast.error("No se pudo registrar la entrega", (e as Error).message);
    } finally {
      setDelivering(false);
    }
  }

  async function handleDeliver(form: DeliverForm) {
    if (!form.worker_rut) {
      toast.error(
        "Selecciona un trabajador",
        "Debes seleccionar un trabajador antes de continuar.",
      );
      return;
    }
    setQrConfirm({ deliverForm: form });
  }

  async function handleQuickDeliver(form: DeliverForm) {
    if (!form.worker_rut) {
      toast.error(
        "Selecciona un trabajador",
        "Debes seleccionar un trabajador antes de continuar.",
      );
      return;
    }
    await executeDelivery(form, { confirmed_via_qr: false, confirmed_scan_rut: null });
  }

  function handleQrConfirmed(scannedRut: string) {
    if (!qrConfirm) return;
    void executeDelivery(qrConfirm.deliverForm, {
      confirmed_via_qr: true,
      confirmed_scan_rut: scannedRut,
    });
    setQrConfirm(null);
  }

  function handleQrSkip() {
    if (!qrConfirm) return;
    void executeDelivery(qrConfirm.deliverForm, {
      confirmed_via_qr: false,
      confirmed_scan_rut: null,
    });
    setQrConfirm(null);
  }

  async function handleReturn(form: {
    delivery_id: string;
    return_condition: string;
    quantity: number;
    restocked: boolean;
    notes: string;
  }) {
    try {
      const delivery = deliveries.find((d) => d.id === form.delivery_id);
      if (!delivery) throw new Error("Entrega no encontrada");
      if (
        !Number.isInteger(form.quantity) ||
        form.quantity <= 0 ||
        form.quantity > delivery.quantity
      ) {
        throw new Error(
          "La cantidad devuelta debe ser un número entero mayor que cero y no superar la cantidad entregada.",
        );
      }
      const { error } = await supabase.from("epp_returns").insert({
        delivery_id: form.delivery_id,
        worker_rut: delivery.worker_rut,
        item_id: delivery.item_id,
        quantity: form.quantity,
        return_condition: form.return_condition,
        restocked: form.restocked,
        notes: form.notes || null,
        received_by: (await supabase.auth.getUser()).data.user?.email ?? null,
      });
      if (error) throw new Error(error.message);
      if (form.restocked) {
        const { error: stockErr } = await supabase.rpc("epp_adjust_stock", {
          p_item_id: delivery.item_id,
          p_size_label: delivery.size_label,
          p_delta: form.quantity,
        });
        if (stockErr) throw new Error(stockErr.message);
      }
      await audit({
        action: "epp.return",
        entity: "epp_returns",
        entity_label: `${workerNameMap.get(delivery.worker_rut) ?? delivery.worker_rut} — ${itemNameMap.get(delivery.item_id) ?? "EPP"}`,
      });
      toast.success("Devolución registrada", "EPP devuelto al inventario");
      setModalOpen(false);
      await loadAll();
    } catch (e) {
      toast.error("No se pudo registrar la devolución", (e as Error).message);
    }
  }

  async function handleRestock(form: { item_id: string; size_label: string; quantity: number }) {
    if (!form.item_id) {
      toast.error("Selecciona un item", "Debes seleccionar un item antes de reabastecer.");
      return;
    }
    if (form.quantity <= 0) {
      toast.error("Cantidad inválida", "La cantidad a agregar debe ser mayor que cero.");
      return;
    }
    try {
      const { data: newQty, error: rpcErr } = await supabase.rpc("epp_adjust_stock", {
        p_item_id: form.item_id,
        p_size_label: form.size_label,
        p_delta: form.quantity,
      });
      if (rpcErr) throw new Error(rpcErr.message);
      if (newQty === null) {
        const { error } = await supabase.from("epp_stock").insert({
          item_id: form.item_id,
          size_label: form.size_label,
          quantity: form.quantity,
          min_quantity: 0,
          last_restocked: new Date().toISOString(),
        });
        if (error) throw new Error(error.message);
      }
      await audit({
        action: "epp.restock",
        entity: "epp_stock",
        entity_label: `${itemNameMap.get(form.item_id) ?? "EPP"} — +${form.quantity}`,
      });
      toast.success("Stock reabastecido", `+${form.quantity} unidades`);
      setModalOpen(false);
      await loadAll();
    } catch (e) {
      toast.error("No se pudo reabastecer el inventario", (e as Error).message);
    }
  }

  async function handleDeleteItem(item: EppItem) {
    if (!canManageItems) {
      toast.error("Sin permisos", "Solo los administradores pueden eliminar items de bodega.");
      return;
    }
    const ok = await confirm({
      title: "Eliminar item",
      message: `Se eliminará ${item.name} y su stock asociado.`,
      confirmText: "Eliminar",
      type: "danger",
    });
    if (!ok) return;
    try {
      const { error } = await supabase.from("epp_items").delete().eq("id", item.id);
      if (error) throw new Error(error.message);
      toast.success("Item eliminado", item.name);
      await loadAll();
    } catch (e) {
      toast.error("No se pudo eliminar el item", (e as Error).message);
    }
  }

  function exportInventoryExcel() {
    const rows = items.map((item) => {
      const itemStock = stock.filter((s) => s.item_id === item.id);
      const totalQty = itemStock.reduce((sum, s) => sum + s.quantity, 0);
      const sizes =
        itemStock.map((s) => `${s.size_label}: ${s.quantity}`).join(", ") || "Sin stock";
      return {
        Item: item.name,
        Categoria: item.category,
        SKU: item.sku ?? "",
        "Stock Total": totalQty,
        "Stock Minimo": item.min_stock,
        "Costo Unitario": item.unit_cost,
        Tallas: sizes,
        Estado: totalQty <= item.min_stock ? "Bajo minimo" : "OK",
      };
    });
    ExportService.toExcel(rows, "Inventario EPP", "inventario_epp");
  }

  function exportInventoryPdf() {
    const headers = [
      "Item",
      "Categoria",
      "SKU",
      "Stock Total",
      "Minimo",
      "Costo Unit.",
      "Tallas",
      "Estado",
    ];
    const body = items.map((item) => {
      const itemStock = stock.filter((s) => s.item_id === item.id);
      const totalQty = itemStock.reduce((sum, s) => sum + s.quantity, 0);
      const sizes =
        itemStock.map((s) => `${s.size_label}: ${s.quantity}`).join(", ") || "Sin stock";
      return [
        item.name,
        item.category,
        item.sku ?? "",
        String(totalQty),
        String(item.min_stock),
        `${item.unit_cost.toLocaleString("es-CL")}`,
        sizes,
        totalQty <= item.min_stock ? "Bajo minimo" : "OK",
      ];
    });
    ExportPdf.toPdf(
      "Inventario de EPP",
      headers,
      body,
      "inventario_epp",
      "Listado completo de items y stock",
    );
  }

  if (loading) return <Spinner />;

  const tabs: { key: Tab; label: string; icon: typeof Package }[] = [
    { key: "stock", label: "Inventario", icon: Package },
    { key: "deliver", label: "Entregar EPP", icon: ArrowDownToLine },
    { key: "returns", label: "Devoluciones", icon: ArrowUpFromLine },
    { key: "history", label: "Historial", icon: History },
    { key: "terrain", label: "Terreno (DS 594)", icon: HardHat },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {lowStockCount > 0 && (
            <Badge className="bg-red-50 text-red-700 border-red-200">
              <AlertTriangle size={12} className="mr-1" /> {lowStockCount} bajo mínimo
            </Badge>
          )}
          {isBodeguero && (
            <Badge className="bg-blue-50 text-blue-700 border-blue-200">
              <HardHat size={12} className="mr-1" /> Modo Bodeguero
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {(canManageStock || canManageItems || canDeliver) && (
            <>
              {canManageStock && (
                <Button variant="outline" size="sm" onClick={() => openModal("restock")}>
                  <Plus size={15} /> Reabastecer
                </Button>
              )}
              {canManageItems && (
                <Button variant="outline" size="sm" onClick={() => openModal("item")}>
                  <Package size={15} /> Nuevo Item
                </Button>
              )}
            </>
          )}
        </div>
      </div>

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

      {tab === "stock" && (
        <Card>
          <CardHeader title="Inventario de EPP" subtitle={`${filteredItems.length} items`} />
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="relative max-w-sm flex-1 min-w-[180px]">
              <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar item..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={exportInventoryExcel}
                disabled={items.length === 0}
              >
                <FileSpreadsheet size={15} /> Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportInventoryPdf}
                disabled={items.length === 0}
              >
                <FileText size={15} /> PDF
              </Button>
            </div>
          </div>
          {filteredItems.length === 0 ? (
            <EmptyState message="No hay items de EPP registrados" icon={<Package size={32} />} />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500 uppercase">
                      <th className="px-4 py-2.5 font-medium">Item</th>
                      <th className="px-4 py-2.5 font-medium">Categoría</th>
                      <th className="px-4 py-2.5 font-medium">SKU</th>
                      <th className="px-4 py-2.5 font-medium">Talla</th>
                      <th className="px-4 py-2.5 font-medium text-center">Stock</th>
                      <th className="px-4 py-2.5 font-medium text-center">Mínimo</th>
                      <th className="px-4 py-2.5 font-medium">Costo Unit.</th>
                      <th className="px-4 py-2.5 font-medium text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockPageItems.map((item) => {
                      const itemStock = stock.filter((s) => s.item_id === item.id);
                      return itemStock.length === 0 ? (
                        <tr key={item.id} className="border-b border-slate-100">
                          <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                          <td className="px-4 py-3 text-slate-600">{item.category}</td>
                          <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                            {item.sku ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-400">—</td>
                          <td className="px-4 py-3 text-center">
                            <Badge className="bg-red-50 text-red-700 border-red-200">
                              Sin stock
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center text-slate-400">{item.min_stock}</td>
                          <td className="px-4 py-3 text-slate-600">
                            ${item.unit_cost.toLocaleString("es-CL")}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {canManageItems && canDeleteEpp ? (
                              <button
                                onClick={() => handleDeleteItem(item)}
                                className="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded"
                                title="Eliminar item"
                              >
                                <Trash2 size={14} />
                              </button>
                            ) : (
                              <span
                                className="text-xs text-slate-300"
                                title="Sin permiso de eliminación"
                              >
                                —
                              </span>
                            )}
                          </td>
                        </tr>
                      ) : (
                        itemStock.map((s) => {
                          const isLow = s.quantity <= s.min_quantity;
                          return (
                            <tr
                              key={`${item.id}-${s.id}`}
                              className="border-b border-slate-100 hover:bg-slate-50"
                            >
                              <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                              <td className="px-4 py-3 text-slate-600">{item.category}</td>
                              <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                                {item.sku ?? "—"}
                              </td>
                              <td className="px-4 py-3 text-slate-600">{s.size_label}</td>
                              <td className="px-4 py-3 text-center">
                                <Badge
                                  className={
                                    isLow
                                      ? "bg-red-50 text-red-700 border-red-200"
                                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  }
                                >
                                  {s.quantity}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-center text-slate-400">
                                {s.min_quantity}
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                ${item.unit_cost.toLocaleString("es-CL")}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {canManageItems && canDeleteEpp ? (
                                  <button
                                    onClick={() => handleDeleteItem(item)}
                                    className="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded"
                                    title="Eliminar item"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                ) : (
                                  <span
                                    className="text-xs text-slate-300"
                                    title="Sin permiso de eliminación"
                                  >
                                    —
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {stockTotalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
                  <span className="text-xs text-slate-500">
                    Página {stockPage} de {stockTotalPages} · {stockTotal} items
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setStockPage(Math.max(1, stockPage - 1))}
                      disabled={stockPage === 1}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="px-3 text-xs font-medium text-slate-700">
                      {stockPage} / {stockTotalPages}
                    </span>
                    <button
                      onClick={() => setStockPage(Math.min(stockTotalPages, stockPage + 1))}
                      disabled={stockPage === stockTotalPages}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {tab === "deliver" && (
        <Card>
          <CardHeader
            title="Entregar EPP a Trabajador"
            subtitle="Selecciona el trabajador y el equipo a entregar"
          />
          {canDeliver ? (
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
                <QrCode size={16} className="text-blue-600 shrink-0" />
                <p className="text-xs text-blue-700">
                  Usa <strong>Confirmar con QR</strong> para validar la identidad escaneando la
                  tarjeta del trabajador, o <strong>Registro rapido</strong> para entregar
                  directamente como excepcion auditada.
                </p>
              </div>
              <QuickDeliverForm
                workers={workers}
                items={items}
                stock={stock}
                deliveries={deliveries}
                delivering={delivering}
                onDeliverQr={handleDeliver}
                onDeliverQuick={handleQuickDeliver}
              />
            </div>
          ) : (
            <EmptyState
              message="No tienes permisos para entregar EPP"
              icon={<ArrowDownToLine size={32} />}
            />
          )}
        </Card>
      )}

      {tab === "history" && (
        <Card>
          <CardHeader title="Historial de Entregas" subtitle={`${deliveries.length} registros`} />
          {deliveries.length === 0 ? (
            <EmptyState message="Sin entregas registradas" icon={<History size={32} />} />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500 uppercase">
                      <th className="px-4 py-2.5 font-medium">Fecha</th>
                      <th className="px-4 py-2.5 font-medium">Trabajador</th>
                      <th className="px-4 py-2.5 font-medium">Item</th>
                      <th className="px-4 py-2.5 font-medium">Talla</th>
                      <th className="px-4 py-2.5 font-medium text-center">Cant.</th>
                      <th className="px-4 py-2.5 font-medium">Condición</th>
                      <th className="px-4 py-2.5 font-medium text-center">QR</th>
                      <th className="px-4 py-2.5 font-medium">Justificación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {histPageItems.map((d) => (
                      <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-600">{d.delivery_date}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {workerNameMap.get(d.worker_rut) ?? d.worker_rut}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {itemNameMap.get(d.item_id) ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{d.size_label}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{d.quantity}</td>
                        <td className="px-4 py-3">
                          <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                            {d.condition}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {d.confirmed_via_qr ? (
                            <span
                              title="Confirmado con QR"
                              className="inline-flex items-center justify-center"
                            >
                              <CheckCircle2 size={16} className="text-emerald-600" />
                            </span>
                          ) : (
                            <span
                              title="Sin confirmacion QR"
                              className="inline-flex items-center justify-center"
                            >
                              <AlertTriangle size={16} className="text-amber-500" />
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">
                          {d.justification}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {histTotalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
                  <span className="text-xs text-slate-500">
                    Página {histPage} de {histTotalPages} · {histTotal} registros
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setHistPage(Math.max(1, histPage - 1))}
                      disabled={histPage === 1}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="px-3 text-xs font-medium text-slate-700">
                      {histPage} / {histTotalPages}
                    </span>
                    <button
                      onClick={() => setHistPage(Math.min(histTotalPages, histPage + 1))}
                      disabled={histPage === histTotalPages}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {tab === "returns" && (
        <Card>
          <CardHeader title="Devoluciones de EPP" subtitle={`${returns.length} registros`} />
          {canReturn && (
            <div className="flex justify-end mb-3">
              <Button size="sm" onClick={() => openModal("return")}>
                <ArrowUpFromLine size={15} /> Registrar Devolución
              </Button>
            </div>
          )}
          {returns.length === 0 ? (
            <EmptyState
              message="Sin devoluciones registradas"
              icon={<ArrowUpFromLine size={32} />}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500 uppercase">
                      <th className="px-4 py-2.5 font-medium">Fecha</th>
                      <th className="px-4 py-2.5 font-medium">Trabajador</th>
                      <th className="px-4 py-2.5 font-medium">Item</th>
                      <th className="px-4 py-2.5 font-medium text-center">Cant.</th>
                      <th className="px-4 py-2.5 font-medium">Condición</th>
                      <th className="px-4 py-2.5 font-medium">Reingresado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {retPageItems.map((r) => (
                      <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-600">{r.return_date}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {workerNameMap.get(r.worker_rut) ?? r.worker_rut}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {itemNameMap.get(r.item_id) ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600">{r.quantity}</td>
                        <td className="px-4 py-3">
                          <Badge
                            className={
                              r.return_condition === "Bueno"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : r.return_condition === "Perdido"
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                            }
                          >
                            {r.return_condition}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{r.restocked ? "Sí" : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {retTotalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
                  <span className="text-xs text-slate-500">
                    Página {retPage} de {retTotalPages} · {retTotal} registros
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setRetPage(Math.max(1, retPage - 1))}
                      disabled={retPage === 1}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="px-3 text-xs font-medium text-slate-700">
                      {retPage} / {retTotalPages}
                    </span>
                    <button
                      onClick={() => setRetPage(Math.min(retTotalPages, retPage + 1))}
                      disabled={retPage === retTotalPages}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {tab === "terrain" && (
        <TerrainEppTab data={data} canDeliver={canDeliver} canDeleteEpp={canDeleteEpp} />
      )}

      {modalOpen && (
        <EppModal
          mode={modalMode}
          items={items}
          workers={workers}
          deliveries={deliveries}
          stock={stock}
          onClose={() => setModalOpen(false)}
          onSaveItem={handleSaveItem}
          onReturn={handleReturn}
          onRestock={handleRestock}
          delivering={delivering}
        />
      )}

      {qrConfirm && (
        <EppQrConfirm
          expectedRut={qrConfirm.deliverForm.worker_rut}
          workerName={
            workerNameMap.get(normalizeRut(qrConfirm.deliverForm.worker_rut)) ??
            qrConfirm.deliverForm.worker_rut
          }
          onConfirm={handleQrConfirmed}
          onSkip={handleQrSkip}
          onClose={() => setQrConfirm(null)}
        />
      )}
    </div>
  );
}
