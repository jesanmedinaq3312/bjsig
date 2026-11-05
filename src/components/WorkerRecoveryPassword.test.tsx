import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PASSWORD_POLICY_MESSAGE } from "@/lib/passwordPolicy";
import { WorkerRecoveryPassword } from "./WorkerRecoveryPassword";

const { updateUser } = vi.hoisted(() => ({ updateUser: vi.fn() }));

vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { updateUser } },
}));

describe("WorkerRecoveryPassword", () => {
  beforeEach(() => updateUser.mockReset());

  it("rejects a password without an allowed symbol before calling Auth", async () => {
    const { container } = render(<WorkerRecoveryPassword email="worker@example.test" />);
    const inputs = container.querySelectorAll("input[type='password']");
    fireEvent.change(inputs[0], { target: { value: "Abcdefg1" } });
    fireEvent.change(inputs[1], { target: { value: "Abcdefg1" } });
    fireEvent.click(screen.getByRole("button", { name: /restablecer contraseña/i }));

    await waitFor(() => expect(screen.getByText(PASSWORD_POLICY_MESSAGE)).toBeInTheDocument());
    expect(updateUser).not.toHaveBeenCalled();
  });
});
