import { describe, expect, it } from "vitest";
import { buildQrPrintDocument } from "./QrCardGenerator";

describe("QR print document", () => {
  it("writes the company name as title text and adds no inline script", () => {
    const doc = document.implementation.createHTMLDocument("initial");
    const content = document.createElement("div");
    content.textContent = "Printable cards";
    const companyName = '<img src=x onerror="alert(1)">';

    buildQrPrintDocument(doc, companyName, content);

    expect(doc.querySelector("title")?.textContent).toBe(`Tarjetas QR — ${companyName}`);
    expect(doc.head.querySelector("img")).toBeNull();
    expect(doc.body.textContent).toBe("Printable cards");
    expect(doc.querySelector("script")).toBeNull();
  });
});
