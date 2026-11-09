import { useEffect, useState } from "react";
import { Cookie, X } from "lucide-react";

const STORAGE_KEY = "bjsig_privacy_notice_v2";
const NOTICE_TTL_MS = 365 * 24 * 60 * 60 * 1000;

type NoticeAcknowledgement = {
  acknowledgedAt: string;
};

function saveAcknowledgement() {
  const value: NoticeAcknowledgement = { acknowledgedAt: new Date().toISOString() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* El aviso seguirá visible si el almacenamiento no está disponible. */
  }
}

function hasFreshAcknowledgement() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const value = JSON.parse(raw) as Partial<NoticeAcknowledgement>;
    const acknowledgedAt = Date.parse(value.acknowledgedAt ?? "");
    if (!Number.isFinite(acknowledgedAt) || Date.now() - acknowledgedAt > NOTICE_TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(false);

  useEffect(() => {
    if (hasFreshAcknowledgement()) return;
    const timer = window.setTimeout(() => setOpen(true), 700);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const reopen = () => {
      setDetails(true);
      setOpen(true);
    };
    window.addEventListener("bjsig:open-cookie-settings", reopen);
    return () => window.removeEventListener("bjsig:open-cookie-settings", reopen);
  }, []);

  if (!open) return null;

  const close = () => {
    saveAcknowledgement();
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Aviso de almacenamiento y privacidad"
      className="cookie-banner fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-3xl rounded-2xl border border-white/15 bg-slate-900/95 p-4 text-white shadow-2xl shadow-blue-950/60 backdrop-blur-xl sm:inset-x-6 sm:bottom-6 sm:p-6"
    >
      <button
        type="button"
        onClick={close}
        aria-label="Cerrar aviso"
        className="absolute right-2 top-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-white/70 transition hover:bg-white/10 hover:text-white"
      >
        <X size={16} />
      </button>
      <div className="flex gap-4">
        <span className="cookie-icon hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-700 sm:flex">
          <Cookie size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-black">Aviso de almacenamiento y privacidad</h2>
          <p className="mt-1.5 text-sm leading-6 text-white/75">
            Esta versión usa almacenamiento local necesario para la sesión y este aviso. No carga
            Google Analytics ni envía eventos analíticos a Google desde el código revisado. Las
            conexiones web revelan la IP al servidor receptor; abrir documentos alojados en Google
            Drive conecta directamente tu navegador con Google. Consulta la{" "}
            <a
              href="/privacidad"
              className="font-semibold text-cyan-300 underline underline-offset-2 hover:text-white"
            >
              política de privacidad
            </a>
            , los{" "}
            <a
              href="/terminos"
              className="font-semibold text-cyan-300 underline underline-offset-2 hover:text-white"
            >
              términos
            </a>{" "}
            y la{" "}
            <a
              href="/cookies"
              className="font-semibold text-cyan-300 underline underline-offset-2 hover:text-white"
            >
              política de cookies
            </a>
            .
          </p>

          {details && (
            <div className="cookie-details mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs leading-5 text-white/70">
              <p>
                Sólo se guarda una constancia local de que el aviso fue leído durante un máximo de
                12 meses. No hay categorías de analítica o publicidad activas. La integración
                Turnstile/CAPTCHA se retiró del código local; cualquier proveedor futuro requerirá
                una revisión separada y un aviso actualizado.
              </p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={close}
              className="rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-bold shadow-lg shadow-blue-500/30 transition hover:-translate-y-0.5 hover:bg-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
            >
              Entendido
            </button>
            {!details && (
              <button
                type="button"
                onClick={() => setDetails(true)}
                className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-bold transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
              >
                Ver detalles
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- intentional settings event API
export function openCookieSettings() {
  window.dispatchEvent(new Event("bjsig:open-cookie-settings"));
}

export default CookieConsent;
