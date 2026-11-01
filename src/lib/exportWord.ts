/**
 * exportWord.ts — Word (.docx) export utility using the docx library.
 * Generates formatted documents with corporate letterhead (logo image +
 * company name), headings, paragraphs, and styled tables.
 */
import { getCompanyLogoUrl, getCompanyLogoBlob, getCompanyName, loadCompanyBranding } from "./logo";
import { LEGAL_DISCLAIMER_TEXT } from "./legal";

export interface WordSection {
  heading: string;
  paragraphs: string[];
}

export interface WordTableData {
  headers: string[];
  rows: (string | number)[][];
}

export class ExportWord {
  static async toWord(
    title: string,
    subtitle: string,
    sections: WordSection[],
    tableData: WordTableData | null,
    fileName: string,
  ): Promise<void> {
    const {
      Document,
      Packer,
      Paragraph,
      HeadingLevel,
      TextRun,
      Table,
      TableRow,
      TableCell,
      WidthType,
      AlignmentType,
      ImageRun,
    } = await import("docx");
    const { saveAs } = await import("file-saver");
    await loadCompanyBranding();
    const companyName = getCompanyName();
    const logoUrl = getCompanyLogoUrl();
    const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [];

    // Corporate letterhead — logo image + company name
    const letterheadChildren: (InstanceType<typeof TextRun> | InstanceType<typeof ImageRun>)[] = [];

    if (logoUrl) {
      try {
        const imgData = await this.fetchLogoAsBase64();
        if (imgData) {
          const imgBuffer = this.dataUrlToBuffer(imgData);
          if (imgBuffer) {
            letterheadChildren.push(
              new ImageRun({
                data: imgBuffer as Uint8Array<ArrayBuffer>,
                transformation: { width: 120, height: 60 },
              } as ConstructorParameters<typeof ImageRun>[0]),
            );
          }
        }
      } catch {
        // skip logo on error
      }
    }

    letterheadChildren.push(
      new TextRun({
        text: `${companyName} — Sistema Integrado de Gestión (SIG)`,
        bold: true,
        size: 28,
        color: "1E40AF",
      }),
    );

    children.push(
      new Paragraph({
        children: letterheadChildren,
        alignment: AlignmentType.LEFT,
      }),
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: "BJ Servicios Informáticos SpA", size: 18, color: "64748B" }),
        ],
      }),
    );
    children.push(new Paragraph({ children: [new TextRun({ text: "" })] }));

    children.push(
      new Paragraph({
        children: [new TextRun({ text: title, bold: true, size: 32 })],
        heading: HeadingLevel.HEADING_1,
      }),
    );
    children.push(
      new Paragraph({
        children: [new TextRun({ text: subtitle, size: 20, color: "64748B", italics: true })],
      }),
    );
    children.push(new Paragraph({ children: [new TextRun({ text: "" })] }));

    for (const section of sections) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: section.heading, bold: true, size: 24 })],
          heading: HeadingLevel.HEADING_2,
        }),
      );
      for (const p of section.paragraphs) {
        children.push(new Paragraph({ children: [new TextRun({ text: p, size: 20 })] }));
      }
      children.push(new Paragraph({ children: [new TextRun({ text: "" })] }));
    }

    if (tableData) {
      const processed = this.preProcess(tableData);
      children.push(
        new Paragraph({
          children: [new TextRun({ text: "Datos Tabulados", bold: true, size: 24 })],
          heading: HeadingLevel.HEADING_2,
        }),
      );

      const headerRow = new TableRow({
        children: processed.headers.map(
          (h) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: h, bold: true, size: 18, color: "FFFFFF" })],
                }),
              ],
              shading: { fill: "1E40AF" },
              width: {
                size: Math.floor(100 / processed.headers.length),
                type: WidthType.PERCENTAGE,
              },
            }),
        ),
      });

      const bodyRows = processed.rows.map(
        (row) =>
          new TableRow({
            children: row.map(
              (cell) =>
                new TableCell({
                  children: [
                    new Paragraph({ children: [new TextRun({ text: String(cell), size: 18 })] }),
                  ],
                  width: { size: Math.floor(100 / row.length), type: WidthType.PERCENTAGE },
                }),
            ),
          }),
      );

      children.push(
        new Table({
          rows: [headerRow, ...bodyRows],
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
      );
    }

    // Footer
    children.push(new Paragraph({ children: [new TextRun({ text: "" })] }));
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Documento generado el ${new Date().toLocaleString("es-CL")} — ${companyName} SIG`,
            size: 16,
            color: "94A3B8",
            italics: true,
          }),
        ],
        alignment: AlignmentType.CENTER,
      }),
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: LEGAL_DISCLAIMER_TEXT,
            size: 16,
            color: "94A3B8",
            italics: true,
          }),
        ],
        alignment: AlignmentType.CENTER,
      }),
    );

    const doc = new Document({
      sections: [{ properties: {}, children }],
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, fileName.endsWith(".docx") ? fileName : `${fileName}.docx`);
  }

  private static async fetchLogoAsBase64(): Promise<string | null> {
    try {
      const blob = await getCompanyLogoBlob();
      if (!blob) return null;
      return await new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  private static dataUrlToBuffer(dataUrl: string): Uint8Array | null {
    try {
      const base64 = dataUrl.split(",")[1];
      if (!base64) return null;
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    } catch {
      return null;
    }
  }

  /**
   * Pre-process table data: stringify all values, convert null/undefined
   * to '—', and normalize booleans to Spanish text.
   */
  private static preProcess(tableData: WordTableData): WordTableData {
    return {
      headers: tableData.headers,
      rows: tableData.rows.map((row) =>
        row.map((cell) => {
          if (cell === null || cell === undefined || cell === "") return "—";
          if (typeof cell === "boolean") return cell ? "Sí" : "No";
          return cell;
        }),
      ),
    };
  }
}
