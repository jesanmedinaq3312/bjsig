import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardPreview } from "./DashboardPreview";

describe("DashboardPreview", () => {
  it("mantiene una silueta de laptop mientras cambia el área ilustrativa", () => {
    const { container } = render(<DashboardPreview />);
    const frame = container.querySelector(".landing-device-frame");

    expect(frame).toHaveClass("landing-device-frame--laptop");
    expect(container.querySelector(".landing-laptop-viewport")).toBeInTheDocument();
    expect(
      screen.getByRole("group", {
        name: "Vista demostrativa e interactiva de BJSIGAPP en laptop",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "La operación, en contexto" })).toBeVisible();

    fireEvent.click(screen.getAllByRole("button", { name: "Personas" })[0]);
    expect(screen.getByRole("heading", { name: "Personas y procesos de RR. HH." })).toBeVisible();
    expect(frame).toHaveClass("landing-device-frame--laptop");
    expect(container.querySelector(".landing-device-frame--phone")).not.toBeInTheDocument();
    expect(container.querySelector(".landing-device-frame--tablet")).not.toBeInTheDocument();
  });
});
