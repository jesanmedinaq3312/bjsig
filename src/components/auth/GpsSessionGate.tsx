import { useState } from "react";
import { LogOut, MapPin } from "lucide-react";
import { useGpsCapture } from "@/hooks/useGpsCapture";
import { friendlyError } from "@/lib/networkError";
import type { GpsPosition } from "@/lib/gps";
import { GpsCaptureCard } from "./GpsCaptureCard";

interface GpsSessionGateProps {
  onVerify: (position: GpsPosition) => Promise<void>;
  onSignOut: () => void;
}

export function GpsSessionGate({ onVerify, onSignOut }: GpsSessionGateProps) {
  const { position, status, error, capture } = useGpsCapture();
  const [verifying, setVerifying] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  async function verifyLocation() {
    const current = await capture();
    if (!current) return;
    setVerifying(true);
    setServerError(null);
    try {
      await onVerify(current);
      window.location.reload();
    } catch (err) {
      setServerError(friendlyError(err));
    } finally {
      setVerifying(false);
    }
  }

  return (
    <main className="min-h-dvh bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto flex min-h-[70dvh] max-w-lg flex-col justify-center">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
          <MapPin size={22} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Verifica tu ubicación</h1>
        <p className="mt-2 max-w-prose text-sm leading-6 text-slate-300">
          Para continuar en esta sesión, comparte una captura GPS actual (máximo 2 minutos de
          antigüedad).
        </p>
        <div className="mt-6">
          <GpsCaptureCard
            status={verifying ? "capturing" : status}
            position={position}
            error={error ?? serverError}
            onCapture={() => void verifyLocation()}
            variant="dark"
          />
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="mt-5 inline-flex w-fit items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          <LogOut size={16} /> Cerrar sesión
        </button>
      </div>
    </main>
  );
}
