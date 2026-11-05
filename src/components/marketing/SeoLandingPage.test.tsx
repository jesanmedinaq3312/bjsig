import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SeoLandingPage } from "./SeoLandingPage";

describe("SeoLandingPage demo interactiva", () => {
  it("permite explorar módulos y cambiar el alcance de sucursal", () => {
    render(<SeoLandingPage page="home" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Software multiempresa de RR. HH. y operaciones" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Administra personas y operaciones desde una plataforma SaaS",
      }),
    ).toBeTruthy();
    expect(screen.getByText("Administra personas, asistencia, turnos, prevención, documentos y procesos internos. Configura módulos, permisos e identidad para cada empresa.")).toBeTruthy();

    const demoHeading = screen.getByRole("heading", {
      name: "Prueba la demo interactiva de cómo funciona BJSIGAPP por dentro",
    });
    expect(demoHeading).toBeTruthy();
    expect(
      demoHeading.closest("section")?.querySelector(
        '[role="group"][aria-labelledby="device-showcase-caption"]',
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
