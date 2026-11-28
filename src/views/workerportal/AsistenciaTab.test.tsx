import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { WorkerPortalData } from "@/hooks/useWorkerData";
import { AsistenciaTab } from "./AsistenciaTab";

const rectification = {
  id: "rectification-1",
  tenant_id: "tenant-a",
  scan_event_id: "scan-1",
  worker_rut: "12345678-9",
  proposed_scan_type: "entrada",
  proposed_at: "2026-11-27T11:00:00.000Z",
  reason: "La hora de entrada requiere revisión.",
  requested_by: "rrhh@example.test",
  status: "pendiente",
  worker_response_at: null,
  worker_comment: null,
  worker_ip: null,
  prev_hash: null,
  row_hash: null,
  response_hash: null,
  created_at: "2026-11-27T11:10:00.000Z",
};

const data = {
  profile: null,
  shifts: [],
  qr_scans: [],
  rectifications: [rectification],
  rectificationsError: null,
  trainings: [],
  attendance: [],
  payroll_items: [],
  payroll_periods: [],
  objectives: [],
  evaluations: [],
  feedback: [],
  documents: [],
  epp: [],
  incidents: [],
  assignments: [],
  shift_change_logs: [],
  requests: [],
  shift_definitions: [],
  circulars: [],
} as unknown as WorkerPortalData;

describe("AsistenciaTab regularization proposals", () => {
  it("lets a worker record acceptance through the response handler", async () => {
    const onRespondRectification = vi.fn().mockResolvedValue({ error: null });
    render(<AsistenciaTab data={data} onRespondRectification={onRespondRectification} />);

    expect(screen.getByText(/no modifica ni sobrescribe la marca QR original/i)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Revisar propuesta" }));

    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Comentario (opcional)"), {
      target: { value: "Estoy de acuerdo con la hora indicada." },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Aceptar propuesta" }));

    await waitFor(() =>
      expect(onRespondRectification).toHaveBeenCalledWith(
        "rectification-1",
        true,
        "Estoy de acuerdo con la hora indicada.",
      ),
    );
  });

  it("does not allow a response from administrative preview", () => {
    render(
      <AsistenciaTab
        data={data}
        isPreview
        onRespondRectification={vi.fn().mockResolvedValue({ error: null })}
      />,
    );

    expect(screen.queryByRole("button", { name: "Revisar propuesta" })).not.toBeInTheDocument();
    expect(screen.getByText(/deshabilitada en la vista previa administrativa/i)).toBeVisible();
  });
});
