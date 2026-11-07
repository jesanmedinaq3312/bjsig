import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWorkerData } from "@/hooks/useWorkerData";
import { WorkerPortal } from "./WorkerPortal";

vi.mock("@/hooks/useWorkerData", () => ({
  useWorkerData: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ session: null }),
}));

vi.mock("./workerportal/WelcomeHero", () => ({
  WelcomeHero: () => null,
}));

vi.mock("./workerportal/MotivationalBanner", () => ({
  MotivationalBanner: () => null,
}));

vi.mock("@/components/WorkerAvatar", () => ({
  WorkerAvatar: () => null,
}));

vi.mock("./workerportal/components", () => ({
  StatCard: () => null,
}));

vi.mock("./workerportal/ResumenTab", () => ({
  ResumenTab: () => null,
}));

const missingProfileData = {
  profile: null,
  shifts: [],
  qr_scans: [],
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
};

describe("WorkerPortal profile loading", () => {
  beforeEach(() => {
    vi.mocked(useWorkerData).mockReturnValue({
      data: missingProfileData,
      loading: false,
      error: null,
      createRequest: vi.fn(),
    } as never);
  });

  it("does not report 'Sin cargo' when the worker profile was not found", () => {
    render(<WorkerPortal workerRut="" />);

    expect(screen.getByText(/no se encontró la ficha laboral/i)).toBeVisible();
    expect(screen.queryByText("Sin cargo")).not.toBeInTheDocument();
  });

  it("shows profile query errors instead of silently falling back to 'Sin cargo'", () => {
    vi.mocked(useWorkerData).mockReturnValue({
      data: null,
      loading: false,
      error: new Error("falló la consulta del perfil"),
      createRequest: vi.fn(),
    } as never);

    render(<WorkerPortal workerRut="" />);

    expect(screen.getByText(/Error: falló la consulta del perfil/i)).toBeVisible();
    expect(screen.queryByText("Sin cargo")).not.toBeInTheDocument();
  });

  it("shows an explicit label instead of a blank position", async () => {
    vi.mocked(useWorkerData).mockReturnValue({
      data: {
        ...missingProfileData,
        profile: {
          rut: "12345678-9",
          full_name: "Trabajador de prueba",
          position: "  ",
          department_id: null,
          department_name: null,
          photo_url: null,
          phone: null,
          email: null,
          hire_date: null,
          contract_type: null,
          birth_date: null,
        },
      },
      loading: false,
      error: null,
      createRequest: vi.fn(),
    } as never);

    render(<WorkerPortal workerRut="" />);

    expect(await screen.findByText(/Cargo no informado · Sin departamento/)).toBeVisible();
  });
});
