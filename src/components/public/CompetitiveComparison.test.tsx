import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CompetitiveComparison } from "./CompetitiveComparison";

describe("CompetitiveComparison", () => {
  it("destaca funciones propias de BJSIGAPP y diferencias concretas por plataforma", () => {
    render(<CompetitiveComparison />);

    expect(
      screen.getByRole("heading", {
        name: "BJSIGAPP conecta RR. HH. con prevención y terreno",
      }),
    ).toBeVisible();
    expect(screen.getByText("BJSIGAPP sí tiene")).toBeVisible();
    expect(screen.getByText(/EPP con trazabilidad/)).toBeInTheDocument();
    expect(screen.getByText(/Prevención operativa/)).toBeInTheDocument();

    for (const platform of ["Buk", "Talana", "GeoVictoria", "Factorial", "Rex+"]) {
      expect(screen.getByRole("heading", { name: platform })).toBeInTheDocument();
    }
    expect(
      screen.getByText(
        /No encontramos descrito un flujo de registro y seguimiento de incidentes SST/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/el canal Ley Karin es un flujo diferente/i)).toBeInTheDocument();
    expect(screen.getByText(/no confirma que el proveedor no tenga esa función/i)).toBeVisible();
  });

  it("no enlaza a sitios de competidores y mantiene las rutas de BJSIGAPP", () => {
    render(<CompetitiveComparison />);

    const comparison = document.getElementById("comparativa");
    expect(comparison).not.toBeNull();
    expect(comparison?.querySelectorAll('a[href^="https://"]')).toHaveLength(0);
    expect(screen.getByRole("link", { name: /Ver módulos BJSIGAPP/i })).toHaveAttribute(
      "href",
      "/modulos/prevencion-de-riesgos",
    );
    expect(screen.getByRole("link", { name: /Solicitar demo/i })).toHaveAttribute(
      "href",
      "#contacto",
    );
  });
});
