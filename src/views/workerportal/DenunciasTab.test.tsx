import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { callEdgeFunction } from "@/lib/edgeFunctions";
import { DenunciasTab } from "./DenunciasTab";

vi.mock("@/lib/edgeFunctions", () => ({
  callEdgeFunction: vi.fn(),
}));

vi.mock("@/components/Toast", () => ({
  useToast: () => ({ error: vi.fn(), success: vi.fn() }),
}));

describe("DenunciasTab preview", () => {
  it("does not render a submission form or call the edge function", () => {
    render(<DenunciasTab workerRut="12345678-9" isPreview />);

    expect(screen.getByText(/envío de denuncias está deshabilitado/i)).toBeVisible();
    expect(screen.queryByRole("button", { name: /enviar denuncia/i })).not.toBeInTheDocument();
    expect(callEdgeFunction).not.toHaveBeenCalled();
  });
});
