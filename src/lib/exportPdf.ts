import { getCompanyLogoUrl, getCompanyLogoBlob, getCompanyName, loadCompanyBranding } from "./logo";
import { LEGAL_DISCLAIMER_TEXT } from "./legal";
import { fmtCLP } from "./payroll";

export class ExportPdf {
  static async toPdf(
    title: string,
    headers: string[],
    body: (string | number)[][],
    fileName: string,
    subtitle?: string,
  ): Promise<void> {
    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    await loadCompanyBranding();
    const doc = new jsPDF({ orientation: "landscape" });
    const logoUrl = getCompanyLogoUrl();
    const companyName = getCompanyName();
    let startY = 32;

    if (logoUrl) {
      try {
        const imgData = await this.fetchLogoAsBase64();
        if (imgData) {
          const fmt = this.detectFormat(imgData);
          if (fmt) {
            doc.addImage(imgData, fmt, 14, 8, 28, 14);
            doc.setFontSize(16);
            doc.setTextColor(15, 23, 42);
            doc.text(title, 48, 18);
          } else {
            doc.setFontSize(16);
            doc.setTextColor(15, 23, 42);
            doc.text(title, 14, 18);
          }
        } else {
          doc.setFontSize(16);
          doc.setTextColor(15, 23, 42);
          doc.text(title, 14, 18);
        }
      } catch {
        doc.setFontSize(16);
        doc.setTextColor(15, 23, 42);
        doc.text(title, 14, 18);
      }
    } else {
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text(title, 14, 18);
    }

    if (subtitle) {
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(subtitle, logoUrl ? 48 : 14, 25);
    }

    doc.setFontSize(8);
    doc.setTextColor(30, 64, 175);
    doc.text(
      `${companyName} — Sistema Integrado de Gestión (SIG) · BJ Servicios Informáticos SpA`,
      logoUrl ? 48 : 14,
      subtitle ? 31 : 28,
    );

    if (subtitle) startY = 36;

    const processedBody = this.preProcess(body);

    autoTable(doc, {
      head: [headers],
      body: processedBody,
      startY,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255 },
      alternateRowStyles: { fillColor: [241, 245, 249] },
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Página ${i} de ${pageCount} — Generado el ${new Date().toLocaleString("es-CL")}`,
        doc.internal.pageSize.width - 80,
        doc.internal.pageSize.height - 8,
      );
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(LEGAL_DISCLAIMER_TEXT, 14, doc.internal.pageSize.height - 8);
    }

    doc.save(fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`);
  }

  static async toPdfBlob(
    title: string,
    headers: string[],
    body: (string | number)[][],
    fileName: string,
    subtitle?: string,
  ): Promise<Blob> {
    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    await loadCompanyBranding();
    const doc = new jsPDF({ orientation: "landscape" });
    const logoUrl = getCompanyLogoUrl();
    const companyName = getCompanyName();
    let startY = 32;

    let hasLogo = false;
    if (logoUrl) {
      try {
        const imgData = await this.fetchLogoAsBase64();
        if (imgData) {
          const fmt = this.detectFormat(imgData);
          if (fmt) {
            doc.addImage(imgData, fmt, 14, 8, 28, 14);
            hasLogo = true;
          }
        }
      } catch {
        /* skip logo */
      }
    }
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text(title, hasLogo ? 48 : 14, 18);

    if (subtitle) {
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(subtitle, hasLogo ? 48 : 14, 25);
    }

    doc.setFontSize(8);
    doc.setTextColor(30, 64, 175);
    doc.text(
      `${companyName} — Sistema Integrado de Gestión (SIG) · BJ Servicios Informáticos SpA`,
      hasLogo ? 48 : 14,
      subtitle ? 31 : 28,
    );

    if (subtitle) startY = 36;

    const processedBody = this.preProcess(body);

    autoTable(doc, {
      head: [headers],
      body: processedBody,
      startY,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255 },
      alternateRowStyles: { fillColor: [241, 245, 249] },
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Página ${i} de ${pageCount} — Generado el ${new Date().toLocaleString("es-CL")}`,
        doc.internal.pageSize.width - 80,
        doc.internal.pageSize.height - 8,
      );
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(LEGAL_DISCLAIMER_TEXT, 14, doc.internal.pageSize.height - 8);
    }

    return doc.output("blob");
  }

  static async toFiniquitoPdf(data: {
    workerName: string;
    workerRut: string;
    hireDate: string;
    endDate: string;
    reason: string;
    baseSalary: number;
    yearsOfService: number;
    monthsOfService: number;
    vacationDaysPending: number;
    indemnizacionAnios: number;
    indemnizacionSustitutiva: number;
    vacacionesNoGozadas: number;
    gratificacion: number;
    total: number;
    notes?: string | null;
  }): Promise<Blob> {
    const { jsPDF } = await import("jspdf");
    await loadCompanyBranding();
    const doc = new jsPDF({ orientation: "portrait" });
    const logoUrl = getCompanyLogoUrl();
    const companyName = getCompanyName();
    const pageWidth = doc.internal.pageSize.width;
    let cursorY = 20;

    if (logoUrl) {
      try {
        const imgData = await this.fetchLogoAsBase64();
        if (imgData) {
          const fmt = this.detectFormat(imgData);
          if (fmt) {
            doc.addImage(imgData, fmt, 14, 10, 30, 15);
          }
        }
      } catch {
        /* skip logo */
      }
    }

    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text("Finiquito de Trabajo", pageWidth / 2, 18, { align: "center" });
    cursorY = 32;

    doc.setFontSize(8);
    doc.setTextColor(30, 64, 175);
    doc.text(`${companyName} — Sistema Integrado de Gestión (SIG)`, pageWidth / 2, 26, {
      align: "center",
    });
    cursorY = 36;

    doc.setDrawColor(226, 232, 240);
    doc.line(14, cursorY, pageWidth - 14, cursorY);
    cursorY += 8;

    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    const labelStyle = (label: string, value: string, x: number, y: number) => {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(label, x, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(value, x + 50, y);
    };

    labelStyle("Trabajador:", data.workerName, 14, cursorY);
    cursorY += 6;
    labelStyle("RUT:", data.workerRut, 14, cursorY);
    cursorY += 6;
    labelStyle("Fecha de Ingreso:", data.hireDate, 14, cursorY);
    cursorY += 6;
    labelStyle("Fecha de Termino:", data.endDate, 14, cursorY);
    cursorY += 6;
    labelStyle("Causal:", data.reason, 14, cursorY);
    cursorY += 6;
    labelStyle("Sueldo Base:", fmtCLP(data.baseSalary), 14, cursorY);
    cursorY += 6;
    labelStyle(
      "Anios de Servicio:",
      `${data.yearsOfService} anos ${data.monthsOfService} meses`,
      14,
      cursorY,
    );
    cursorY += 6;
    labelStyle("Dias Vacaciones Pend.:", String(data.vacationDaysPending), 14, cursorY);
    cursorY += 10;

    doc.setDrawColor(226, 232, 240);
    doc.line(14, cursorY, pageWidth - 14, cursorY);
    cursorY += 8;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Detalle de Haberes", 14, cursorY);
    cursorY += 8;

    const rows: [string, string][] = [
      ["Indemnizacion Anios de Servicio", fmtCLP(data.indemnizacionAnios)],
      ["Indemnizacion Sustitutiva", fmtCLP(data.indemnizacionSustitutiva)],
      ["Vacaciones No Gozadas", fmtCLP(data.vacacionesNoGozadas)],
      ["Gratificacion", fmtCLP(data.gratificacion)],
    ];

    doc.setFontSize(10);
    for (const [label, val] of rows) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(label, 14, cursorY);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(val, pageWidth - 14, cursorY, { align: "right" });
      cursorY += 6;
    }

    cursorY += 2;
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.5);
    doc.line(14, cursorY, pageWidth - 14, cursorY);
    cursorY += 8;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 64, 175);
    doc.text("Total Finiquito:", 14, cursorY);
    doc.text(fmtCLP(data.total), pageWidth - 14, cursorY, { align: "right" });
    cursorY += 12;

    if (data.notes) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 116, 139);
      const splitNotes = doc.splitTextToSize(`Notas: ${data.notes}`, pageWidth - 28);
      doc.text(splitNotes, 14, cursorY);
      cursorY += splitNotes.length * 5 + 6;
    }

    cursorY += 20;
    doc.setDrawColor(226, 232, 240);
    doc.line(14, cursorY, 80, cursorY);
    doc.line(pageWidth - 80, cursorY, pageWidth - 14, cursorY);
    cursorY += 5;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Firma Trabajador", 14, cursorY);
    doc.text("Firma Empleador", pageWidth - 80, cursorY);

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Pagina ${i} de ${pageCount} — Generado el ${new Date().toLocaleString("es-CL")}`,
        pageWidth - 60,
        doc.internal.pageSize.height - 8,
      );
      doc.text(LEGAL_DISCLAIMER_TEXT, 14, doc.internal.pageSize.height - 8);
    }

    return doc.output("blob");
  }

  private static async fetchLogoAsBase64(): Promise<string | null> {
    try {
      const blob = await getCompanyLogoBlob();
      if (!blob || blob.size === 0) return null;
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

  private static detectFormat(dataUrl: string): "PNG" | "JPEG" | "WEBP" | null {
    if (dataUrl.startsWith("data:image/png")) return "PNG";
    if (dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg"))
      return "JPEG";
    if (dataUrl.startsWith("data:image/webp")) return "WEBP";
    return null;
  }

  private static preProcess(body: (string | number)[][]): string[][] {
    return body.map((row) =>
      row.map((cell) => {
        if (cell === null || cell === undefined || cell === "") return "—";
        return String(cell);
      }),
    );
  }
}
