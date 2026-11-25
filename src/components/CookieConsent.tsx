import { useEffect, useState } from "react";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";

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

export function CookieConsent({ inlineMobile = false }: { inlineMobile?: boolean }) {
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
      className={`cookie-banner ${inlineMobile ? "relative md:fixed md:inset-x-4 md:bottom-4" : "fixed inset-x-2.5 bottom-2.5 sm:inset-x-4 sm:bottom-4"} z-[60] mx-auto max-w-4xl rounded-lg border border-border bg-primary px-3.5 py-2.5 text-primary-foreground sm:px-4 sm:py-3`}
    >
      <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:gap-4">
        <span className="cookie-icon hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10 md:flex">
          <Cookie size={16} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 pr-7 md:pr-0">
          <h2 className="sr-only">Aviso de almacenamiento y privacidad</h2>
          <p className="text-xs leading-[1.15rem] text-primary-foreground/80 sm:text-[13px] sm:leading-5">
            Usamos almacenamiento local solo para la sesión y este aviso (sin Google Analytics).{" "}
            <a
              href="/privacidad"
              className="font-semibold text-primary-foreground underline underline-offset-2"
            >
              Privacidad
            </a>
            ,{" "}
            <a
              href="/terminos"
              className="font-semibold text-primary-foreground underline underline-offset-2"
            >
              términos
            </a>{" "}
            y{" "}
            <a
              href="/cookies"
              className="font-semibold text-primary-foreground underline underline-offset-2"
            >
              cookies
            </a>
            .
          </p>

          {details && (
            <div className="cookie-details mt-2.5 space-y-1.5 rounded-lg border border-primary-foreground/10 bg-primary-foreground/5 p-2.5 text-xs leading-5 text-primary-foreground/75">
              <p>
                Las conexiones web revelan la IP al servidor receptor; abrir documentos alojados en
                Google Drive conecta directamente tu navegador con Google.
              </p>
              <p>
                Sólo se guarda una constancia local de que el aviso fue leído durante un máximo de
                12 meses. No hay categorías de analítica o publicidad activas. La integración
                Turnstile/CAPTCHA se retiró del código local; cualquier proveedor futuro requerirá
                una revisión separada y un aviso actualizado.
              </p>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            onClick={close}
            variant="secondary"
            className="min-h-9 flex-1 px-3 text-xs font-bold md:flex-none"
          >
            Entendido
          </Button>
          {!details && (
            <Button
              type="button"
              onClick={() => setDetails(true)}
              variant="ghost"
              className="min-h-9 flex-1 border border-primary-foreground/20 px-3 text-xs font-semibold md:flex-none"
            >
              Ver detalles
            </Button>
          )}
          <Button
            type="button"
            onClick={close}
            aria-label="Cerrar aviso"
            variant="ghost"
            size="icon"
            className="absolute right-1.5 top-1.5 h-8 w-8 text-primary-foreground/70 md:static"
          >
            <X size={15} />
          </Button>
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
