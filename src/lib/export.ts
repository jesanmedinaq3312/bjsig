export type { ExcelSheet } from "./exportExcel";
export type { WordSection, WordTableData } from "./exportWord";

// ExportService intentionally does NOT statically import ExportExcel/ExportPdf/
// ExportWord. Those three pull in exceljs, jspdf+jspdf-autotable, and docx
// respectively — all sizeable libraries. Views that only ever export to Excel
// (the common case) shouldn't also ship jspdf and docx in their lazy chunk.
// Dynamic import() means each one is only fetched the moment it's actually used.
export class ExportService {
  static async toExcel<T extends Record<string, unknown>>(
    rows: T[],
    sheetName: string,
    fileName: string,
  ): Promise<void> {
    const { ExportExcel } = await import("./exportExcel");
    await ExportExcel.toExcel(rows, sheetName, fileName);
  }

  static async toPdf(
    title: string,
    headers: string[],
    body: (string | number)[][],
    fileName: string,
    subtitle?: string,
  ): Promise<void> {
    const { ExportPdf } = await import("./exportPdf");
    await ExportPdf.toPdf(title, headers, body, fileName, subtitle);
  }

  static async toWord(
    title: string,
    subtitle: string,
    sections: { heading: string; paragraphs: string[] }[],
    tableData: { headers: string[]; rows: (string | number)[][] } | null,
    fileName: string,
  ): Promise<void> {
    const { ExportWord } = await import("./exportWord");
    await ExportWord.toWord(title, subtitle, sections, tableData, fileName);
  }
}
