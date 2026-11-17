import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CompetitiveComparison } from "./CompetitiveComparison";

describe("CompetitiveComparison", () => {
  it("destaca el flujo operativo de BJSIGAPP y diferencia los enfoques de la competencia", () => {
    render(<CompetitiveComparison />);

    expect(
      screen.getByRole("heading", {
        name: "BJSIGAPP conecta RR. HH. con prevención y terreno",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "Una operación conectada, no solo una lista de módulos",
      }),
    ).toBeVisible();
    for (const platform of ["Buk", "Talana", "GeoVictoria", "Factorial", "Rex+"]) {
      expect(screen.getAllByRole("heading", { name: platform }).length).toBeGreaterThan(0);
    }
    expect(screen.getByText(/Seguimiento por empresa/)).toBeInTheDocument();
    expect(screen.getByText(/No verificado.*no significa que la función no exista/i)).toBeVisible();
    expect(screen.getByRole("link", { name: /Verlo en una demo/i })).toHaveAttribute(
      "href",
      "#contacto",
    );
  });

  it("expone fuentes oficiales enlazadas con apertura segura", () => {
    render(<CompetitiveComparison />);
    fireEvent.click(screen.getByText("Ver todas las fuentes oficiales consultadas"));

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
