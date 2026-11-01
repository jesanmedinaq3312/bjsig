import { lazy, Suspense } from "react";

const BjsigApp = lazy(() => import("@/components/BjsigApp"));

function Fallback() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#64748b",
        font: "14px/1.5 system-ui, sans-serif",
      }}
    >
      Cargando…
    </div>
  );
}

export function BjsigShell() {
  return (
    <Suspense fallback={<Fallback />}>
      <BjsigApp />
    </Suspense>
  );
}
