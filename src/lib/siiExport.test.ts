import { describe, expect, it } from "vitest";
import { escapeCsv, exportInvoiceSiiCsv } from "./siiExport";
import type { Customer, Invoice } from "./types";

describe("siiExport CSV formula neutralization", () => {
  it.each([
    ["=SUM(A1:A5)", "'=SUM(A1:A5)"],
    ["+cmd|' /C calc'!A0", "'+cmd|' /C calc'!A0"],
    ["-2+3", "'-2+3"],
    ["@SUM(1+1)", "'@SUM(1+1)"],
    ["\t=1+1", "'\t=1+1"],
    ['  =HYPERLINK("http://evil.example")', '"\'  =HYPERLINK(""http://evil.example"")"'],
  ])("neutralizes leading formula payload %j", (input, expected) => {
    expect(escapeCsv(input)).toBe(expected);
  });

  it("preserves plain text and quotes delimiter/newline characters", () => {
    expect(escapeCsv("Servicio eléctrico")).toBe("Servicio eléctrico");
    expect(escapeCsv("A;B")).toBe('"A;B"');
    expect(escapeCsv('Con "comillas"')).toBe('"Con ""comillas"""');
    expect(escapeCsv("=1+1;extra")).toBe('"\'=1+1;extra"');
    expect(escapeCsv(null)).toBe("");
  });

  it("neutralizes formula payloads across exported invoice and customer fields", () => {
    const invoice = {
      id: "inv-1",
      document_type: "factura_electronica",
      folio: "1001",
      issue_date: "2026-11-24",
      subtotal: 1000,
      exempt_amount: 0,
      tax_rate: 19,
      tax_amount: 190,
      total: 1190,
      sii_status: "emitida",
      payment_method: "transferencia",
      due_date: "2026-12-24",
      items: [
        {
          description: '=HYPERLINK("https://attacker.example","Abrir")',
          quantity: 1,
          unit_price: 1000,
          line_subtotal: 1000,
          exemption_flag: false,
        },
      ],
    } as unknown as Invoice;

    const customer = {
      rut: "76.123.456-7",
      name: "+SUM(1,2)",
      address: "-Av. Principal 123",
      city: "@Santiago",
    } as unknown as Customer;

    const csv = exportInvoiceSiiCsv({
      invoice,
      customer,
      companyRut: "77.000.000-1",
      companyName: "=MiEmpresa",
    });

    const dataLine = csv.split("\n")[1] ?? "";
    expect(dataLine).toContain("'=MiEmpresa");
    expect(dataLine).toContain("'+SUM(1,2)");
    expect(dataLine).toContain("'-Av. Principal 123");
    expect(dataLine).toContain("'@Santiago");
    expect(dataLine).toContain('"\'=HYPERLINK(""https://attacker.example"",""Abrir"")"');
  });
});
