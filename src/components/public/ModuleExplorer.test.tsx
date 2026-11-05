import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ModuleExplorer } from "./ModuleExplorer";

describe("ModuleExplorer", () => {
  it("muestra todas las fichas y preguntas en la ruta del catálogo", () => {
    render(<ModuleExplorer catalog />);

    expect(screen.getByRole("heading", { name: "Todos los módulos de BJSIGAPP" })).toBeVisible();
    expect(screen.getByRole("link", { name: /Portal del trabajador/i })).toHaveAttribute(
      "href",
      "/modulos/portal-del-trabajador",
    );
    expect(screen.getAllByRole("link")).toHaveLength(14);
    expect(screen.getByText("¿Tengo que activar todos los módulos?")).toBeVisible();
  });

  it("filtra por área y abre una respuesta relevante", () => {
    render(<ModuleExplorer />);

    fireEvent.click(screen.getByRole("button", { name: "Prevención y terreno" }));
    expect(screen.getByRole("heading", { name: "Prevención y equipos en terreno" })).toBeVisible();
    expect(screen.getByRole("link", { name: /Prevención de riesgos y terreno/i })).toHaveAttribute(
      "href",
      "/modulos/prevencion-de-riesgos",
    );
    expect(screen.queryByRole("link", { name: /Portal del trabajador/i })).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByText("¿La plataforma reemplaza una revisión profesional de prevención?"),
    );
    expect(
      screen.getByText(/no sustituye la evaluación profesional ni determina por sí sola/i),
    ).toBeVisible();
  });
});
