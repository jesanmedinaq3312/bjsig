import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { WorkerPortalData } from "@/hooks/useWorkerData";
import { circularAckRepo } from "@/lib/repositories";
import { ComunicacionesTab } from "./ComunicacionesTab";

vi.mock("@/components/Toast", () => ({
  useToast: () => ({ error: vi.fn(), success: vi.fn() }),
}));

vi.mock("@/lib/repositories", () => ({
  circularAckRepo: { ackCircular: vi.fn() },
}));

const data = {
  circulars: [
    {
      id: "circular-1",
      category: "informacion",
      title: "Aviso de prueba",
      body: "Contenido de prueba",
      published_at: "2026-11-01T12:00:00Z",
      ack_required: true,
      acked: false,
    },
  ],
} as WorkerPortalData;

describe("ComunicacionesTab preview", () => {
  it("hides acknowledgement actions and does not persist them", () => {
    render(<ComunicacionesTab data={data} workerRut="12345678-9" isPreview />);

    expect(screen.queryByRole("button", { name: /confirmar lectura/i })).not.toBeInTheDocument();
    expect(circularAckRepo.ackCircular).not.toHaveBeenCalled();
  });
});
