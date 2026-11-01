import { getCompanyLogoUrl, getCompanyLogoBlob, getCompanyName, loadCompanyBranding } from "./logo";
import { LEGAL_DISCLAIMER_TEXT } from "./legal";

export interface ExcelSheet {
  name: string;
  rows: Record<string, unknown>[];
}

export class ExportExcel {
  static async toExcel<T extends Record<string, unknown>>(
    rows: T[],
    sheetName: string,
    fileName: string,
  ): Promise<void> {
    await this.toMultiSheetExcel([{ name: sheetName, rows }], fileName);
  }

  static async toMultiSheetExcel(sheets: ExcelSheet[], fileName: string): Promise<void> {
    const ExcelJS = await import("exceljs");
    const { saveAs } = await import("file-saver");
    await loadCompanyBranding();

    const companyName = getCompanyName();
    const logoUrl = getCompanyLogoUrl();
    const tagline = `${companyName} — Sistema Integrado de Gestión (SIG) · BJ Servicios Informáticos SpA`;

    const wb = new ExcelJS.Workbook();
    wb.creator = `${companyName} SIG`;
    wb.title = companyName;
    wb.description = tagline;

    let logoBuffer: Uint8Array | null = null;
    let logoExt: string | null = null;
    if (logoUrl) {
      try {
        const fetched = await this.fetchLogoAsBuffer();
        if (fetched) {
          logoBuffer = fetched.buffer;
          logoExt = fetched.ext;
        }
      } catch {
        // skip logo on error
      }
    }

    let logoId: number | null = null;
    if (logoBuffer && logoExt) {
      try {
        logoId = wb.addImage({
          buffer: logoBuffer.buffer as ArrayBuffer,
          extension: logoExt as "png" | "jpeg",
        });
      } catch {
        // skip logo on error
      }
    }

    for (const sheet of sheets) {
      const ws = wb.addWorksheet(sheet.name.slice(0, 31));
      const filtered = this.preProcess(sheet.rows);
      const keys = filtered.length > 0 ? Object.keys(filtered[0]) : ["A"];

      // Branding header rows
      ws.addRow([companyName]);
      ws.addRow([""]);
      ws.addRow([tagline]);
      ws.addRow([]);

      // Header row
      const headerRow = ws.addRow(keys);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
        cell.alignment = { vertical: "middle", horizontal: "left" };
      });

      // Data rows
      for (const row of filtered) {
        ws.addRow(keys.map((k) => (row as Record<string, unknown>)[k] ?? ""));
      }

      // Column widths
      ws.columns = keys.map(() => ({ width: 18 }));

      // Merge branding rows across all columns
      const numCols = keys.length;
      for (let i = 1; i <= 4; i++) {
        ws.mergeCells(i, 1, i, Math.max(numCols, 1));
      }

      // Style branding rows
      ws.getCell("A1").font = { bold: true, size: 14, color: { argb: "FF1E40AF" } };
      ws.getCell("A3").font = { size: 10, color: { argb: "FF64748B" } };

      // Embed logo image
      if (logoId) {
        try {
          ws.addImage(logoId, "A2");
        } catch {
          // skip logo on error
        }
      }

      // Legal disclaimer footer
      ws.addRow([]);
      ws.addRow([LEGAL_DISCLAIMER_TEXT]);
      const lastRowNum = ws.rowCount;
      ws.getCell(`A${lastRowNum}`).font = { size: 9, color: { argb: "FF94A3B8" }, italic: true };
      ws.mergeCells(lastRowNum, 1, lastRowNum, Math.max(numCols, 1));

      // Freeze header
      ws.views = [{ state: "frozen", ySplit: 5 }];
    }

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`);
  }

  private static async fetchLogoAsBuffer(): Promise<{ buffer: Uint8Array; ext: string } | null> {
    try {
      const blob = await getCompanyLogoBlob();
      if (!blob) return null;
      const ext = blob.type.includes("png")
        ? "png"
        : blob.type.includes("jpeg") || blob.type.includes("jpg")
          ? "jpeg"
          : blob.type.includes("webp")
            ? "png"
            : "png";
      const arrayBuffer = await blob.arrayBuffer();
      return { buffer: new Uint8Array(arrayBuffer), ext };
    } catch {
      return null;
    }
  }

  private static preProcess<T extends Record<string, unknown>>(rows: T[]): T[] {
    return rows.map((row) => {
      const out: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(row)) {
        if (val === null || val === undefined) {
          out[key] = "";
          continue;
        }
        if (val instanceof Date) {
          out[key] = val.toISOString().slice(0, 10);
          continue;
        }
        if (Array.isArray(val)) {
          out[key] = val.join(", ");
          continue;
        }
        if (typeof val === "boolean") {
          out[key] = val ? "Sí" : "No";
          continue;
        }
        out[key] = val;
      }
      return out as T;
    });
  }
}
