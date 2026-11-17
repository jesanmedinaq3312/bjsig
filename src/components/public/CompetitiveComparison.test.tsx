import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CompetitiveComparison } from "./CompetitiveComparison";

describe("CompetitiveComparison", () => {
  it("destaca funciones propias de BJSIGAPP y por qué elegirlo frente a cada software", () => {
    render(<CompetitiveComparison />);

    expect(
      screen.getByRole("heading", {
        name: "BJSIGAPP conecta RR. HH. con prevención y terreno",
      }),
    ).toBeVisible();
    expect(screen.getByText("BJSIGAPP sí tiene")).toBeVisible();
    expect(screen.getByText(/EPP con trazabilidad/)).toBeInTheDocument();
    expect(screen.getByText(/Prevención operativa/)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "¿Por qué elegir BJSIGAPP frente a cada software?",
      }),
    ).toBeInTheDocument();

    for (const platform of ["Buk", "Talana", "GeoVictoria", "Factorial", "Rex+"]) {
      expect(screen.getByRole("heading", { name: platform })).toBeInTheDocument();
    }
    expect(screen.getAllByText("BJSIGAPP es mejor opción si...")).toHaveLength(5);
    expect(screen.getByText(/Tu operación necesita unir la ficha del trabajador/)).toBeVisible();
    expect(
      screen.getByText(/No encontramos control operativo de entregas EPP/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/El canal Ley Karin publicado es un flujo diferente/i),
    ).toBeInTheDocument();
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
