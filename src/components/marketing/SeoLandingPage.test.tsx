import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SeoLandingPage } from "./SeoLandingPage";

describe("SeoLandingPage demo interactiva", () => {
  it("permite explorar módulos y cambiar el alcance de sucursal", () => {
    render(<SeoLandingPage page="home" />);

    const demoHeading = screen.getByRole("heading", {
      name: "Prueba la demo interactiva de cómo funciona BJSIGAPP por dentro",
    });
    expect(demoHeading).toBeTruthy();
    expect(
      demoHeading.closest("section")?.querySelector(
        '[aria-label="Demostración interactiva de módulos BJSIGAPP"]',
      ),
    ).toBeTruthy();

    fireEvent.click(screen.getAllByRole("button", { name: "Sucursales" })[0]);
    expect(
      screen.getByRole("heading", { name: "La gestión, organizada por sucursal" }),
    ).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Alcance de ejemplo"), {
      target: { value: "north" },
    });
    expect(screen.getAllByText("Sucursal de ejemplo Norte", { exact: true }).length).toBeGreaterThan(1);
  });
});
