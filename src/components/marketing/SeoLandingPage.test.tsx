import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SeoLandingPage } from "./SeoLandingPage";

describe("SeoLandingPage demo interactiva", () => {
  it("explica la propuesta y sincroniza el área seleccionada en las pantallas", () => {
    render(<SeoLandingPage page="home" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Conecta personas y prevención" }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "RR. HH., turnos y seguridad en una plataforma configurable por empresa y sucursal.",
      ),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: /Explorar la demo/ })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Solicitar un recorrido" })).toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: "Explora la plataforma" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Preguntas frecuentes" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Sucursales" }));

    expect(screen.getByRole("button", { name: "Sucursales" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(
      screen.getByRole("img", { name: "Tablet: Sucursales, Todas las sucursales" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("img", { name: "Teléfono: Sucursales, Todas las sucursales" }),
    ).toBeTruthy();
  });

  it("propaga el alcance de ejemplo a tablet y teléfono", () => {
    render(<SeoLandingPage page="home" />);
    fireEvent.click(screen.getByRole("button", { name: "Terreno" }));
    fireEvent.change(screen.getByLabelText("Vista por sucursal"), {
      target: { value: "north" },
    });

    expect(
      screen.getByRole("img", { name: "Tablet: Terreno, Sucursal de ejemplo Norte" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("img", { name: "Teléfono: Terreno, Sucursal de ejemplo Norte" }),
    ).toBeTruthy();
  });
});
