import type { Invoice, InvoiceItem, Customer } from "./types";

const DOCUMENT_TYPE_CODES: Record<string, string> = {
  factura_electronica: "33",
  factura_exenta: "34",
  boleta_electronica: "39",
  nota_credito: "61",
  nota_debito: "56",
};

interface SiiExportOptions {
  invoice: Invoice;
  customer: Customer | null;
  companyRut: string;
  companyName: string;
}

function fmt(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

export function escapeCsv(val: string | number | null | undefined): string {
  const raw = String(val ?? "");
  const neutralized = /^[=+\-@\t\r]/.test(raw) || /^[\t\r ]+[=+\-@]/.test(raw) ? `'${raw}` : raw;
  if (
    neutralized.includes(";") ||
    neutralized.includes('"') ||
    neutralized.includes("\n") ||
    neutralized.includes("\r")
  ) {
    return `"${neutralized.replace(/"/g, '""')}"`;
  }
  return neutralized;
}

export function exportInvoiceSiiCsv({
  invoice,
  customer,
  companyRut,
  companyName,
}: SiiExportOptions): string {
  const lines: string[] = [];
  lines.push(
    [
      "TipoDoc",
      "Folio",
      "FchEmis",
      "RUTEmisor",
      "RznSocEmisor",
      "RUTRecep",
      "RznSocRecep",
      "MntNeto",
      "MntExe",
      "TasaIVA",
      "IVA",
      "MntTotal",
      "EstadoSII",
      "FormaPago",
      "Item",
      "DscItem",
      "Qty",
      "PrcItem",
      "MontoItem",
      "IndExe",
      "TpoDocRef",
      "FolioRef",
      "CdgVendedor",
      "RUTEmisor",
      "NroLinDet",
      "NroLinRef",
      "TpoMov",
      "Glosa",
      "FmaPago",
      "FchVenc",
      "DirRecep",
      "CmnaRecep",
      "CiudadRecep",
    ].join(";"),
  );

  const items = invoice.items ?? [];
  if (items.length === 0) {
    lines.push(
      [
        DOCUMENT_TYPE_CODES[invoice.document_type] ?? "33",
        invoice.folio ?? "",
        invoice.issue_date,
        companyRut,
        companyName,
        customer?.rut ?? "",
        customer?.name ?? "",
        fmt(invoice.subtotal),
        fmt(invoice.exempt_amount),
        fmt(invoice.tax_rate),
        fmt(invoice.tax_amount),
        fmt(invoice.total),
        invoice.sii_status,
        invoice.payment_method ?? "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        invoice.due_date ?? "",
        customer?.address ?? "",
        "",
        customer?.city ?? "",
      ]
        .map(escapeCsv)
        .join(";"),
    );
  } else {
    items.forEach((item, idx) => {
      lines.push(
        [
          DOCUMENT_TYPE_CODES[invoice.document_type] ?? "33",
          invoice.folio ?? "",
          invoice.issue_date,
          companyRut,
          companyName,
          customer?.rut ?? "",
          customer?.name ?? "",
          idx === 0 ? fmt(invoice.subtotal) : "",
          idx === 0 ? fmt(invoice.exempt_amount) : "",
          idx === 0 ? fmt(invoice.tax_rate) : "",
          idx === 0 ? fmt(invoice.tax_amount) : "",
          idx === 0 ? fmt(invoice.total) : "",
          idx === 0 ? invoice.sii_status : "",
          idx === 0 ? (invoice.payment_method ?? "") : "",
          idx + 1,
          item.description,
          fmt(item.quantity),
          fmt(item.unit_price),
          fmt(item.line_subtotal),
          item.exemption_flag ? "1" : "0",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          idx === 0 ? (invoice.due_date ?? "") : "",
          idx === 0 ? (customer?.address ?? "") : "",
          "",
          idx === 0 ? (customer?.city ?? "") : "",
        ]
          .map(escapeCsv)
          .join(";"),
      );
    });
  }
  return lines.join("\n");
}

export function downloadSiiCsv(
  invoice: Invoice,
  customer: Customer | null,
  companyRut: string,
  companyName: string,
): void {
  const csv = exportInvoiceSiiCsv({ invoice, customer, companyRut, companyName });
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `DTE_${invoice.document_type}_${invoice.folio ?? "sin_folio"}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  factura_electronica: "Factura Electrónica",
  factura_exenta: "Factura Exenta",
  boleta_electronica: "Boleta Electrónica",
  nota_credito: "Nota de Crédito",
  nota_debito: "Nota de Débito",
};

export const DOCUMENT_TYPE_SHORT: Record<string, string> = {
  factura_electronica: "FAC",
  factura_exenta: "FEX",
  boleta_electronica: "BOL",
  nota_credito: "NCR",
  nota_debito: "NDB",
};
