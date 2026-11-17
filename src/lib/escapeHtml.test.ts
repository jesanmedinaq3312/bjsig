import { describe, expect, it } from "vitest";
import { escapeHtml } from "./escapeHtml";

describe("escapeHtml", () => {
  it("escapa etiquetas, atributos y ampersands antes de renderizar texto no confiable", () => {
    expect(escapeHtml('<img src=x onerror="alert(1)"> & RUT')).toBe(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; RUT",
    );
  });

  it("no vuelve a interpretar las entidades después de escapar", () => {
    expect(escapeHtml("&#x3C;script&#x3E;")).toBe("&amp;#x3C;script&amp;#x3E;");
  });
});
