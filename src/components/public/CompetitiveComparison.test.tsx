import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CompetitiveComparison } from "./CompetitiveComparison";

describe("CompetitiveComparison", () => {
  it("compara seis sistemas sin presentar lo no verificado como función inexistente", () => {
    render(<CompetitiveComparison />);

    expect(
      screen.getByRole("heading", { name: "Compara por lo que tu operación necesita conectar" }),
    ).toBeVisible();
    const table = screen.getByRole("table");
    for (const platform of ["BJSIGAPP", "Buk", "Talana", "GeoVictoria", "Factorial", "Rex+"]) {
      expect(within(table).getByText(platform)).toBeInTheDocument();
    }
    expect(
      within(table).getAllByText(/No verificado en las páginas oficiales consultadas/).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/no significa que no exista/i)).toBeInTheDocument();
    expect(screen.getAllByText(/matrices IPER/).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /Revisar un flujo real/i })).toHaveAttribute(
      "href",
      "#contacto",
    );
  });

  it("expone fuentes oficiales enlazadas con apertura segura", () => {
    render(<CompetitiveComparison />);
    fireEvent.click(screen.getByText("Ver fuentes oficiales consultadas"));

    const source = screen
      .getAllByRole("link", { name: "Control de asistencia" })
      .find(
        (link) =>
          link.getAttribute("href") ===
          "https://www.buk.cl/productos/administracion/control-de-asistencia",
      );
    expect(source).toBeDefined();
    expect(source).toHaveAttribute(
      "href",
      "https://www.buk.cl/productos/administracion/control-de-asistencia",
    );
    expect(source).toHaveAttribute("target", "_blank");
    expect(source).toHaveAttribute("rel", "noopener noreferrer");
  });
});
