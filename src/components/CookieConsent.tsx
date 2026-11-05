import { useEffect, useState } from "react";
import { Cookie, ShieldCheck, X } from "lucide-react";

const STORAGE_KEY = "bjsig_cookie_consent_v1";

type Consent = {
  necessary: true;
  functional: boolean;
  analytics: boolean;
  acceptedAt: string;
};

function save(consent: Omit<Consent, "acceptedAt" | "necessary">) {
  const value: Consent = { necessary: true, ...consent, acceptedAt: new Date().toISOString() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new CustomEvent("bjsig:cookie-consent", { detail: value }));
}

export function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(false);
  const [functional, setFunctional] = useState(true);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      stored = null;
    }
    if (!stored) {
      const t = window.setTimeout(() => setOpen(true), 700);
      return () => window.clearTimeout(t);
    }
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

  const close = (c: { functional: boolean; analytics: boolean }) => {
    save(c);
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Aviso de privacidad y cookies"
      className="cookie-banner fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-3xl rounded-2xl border border-white/15 bg-slate-900/95 p-5 text-white shadow-2xl shadow-blue-950/60 backdrop-blur-xl sm:inset-x-6 sm:bottom-6 sm:p-6"
    >
      <button
        type="button"
        onClick={() => close({ functional: false, analytics: false })}
        aria-label="Rechazar opcionales y cerrar"
        className="absolute right-3 top-3 rounded-lg p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white"
      >
        <X size={16} />
      </button>
      <div className="flex gap-4">
        <span className="cookie-icon hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 shadow-lg shadow-blue-500/30 sm:flex">
          <Cookie size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-black">Tu privacidad nos importa</h2>
          <p className="mt-1.5 text-sm leading-6 text-white/65">
            Usamos cookies y recolectamos datos técnicos (dispositivo, IP, actividad y, en los
            portales, ubicación GPS) solo para seguridad, funcionamiento del servicio y control
            operacional. No vendemos ni compartimos tus datos con terceros. Revisa nuestra{" "}
            <a href="/privacidad" className="font-semibold text-cyan-300 underline underline-offset-2 hover:text-white">
              Política de privacidad
            </a>{" "}
            y los{" "}
            <a href="/terminos" className="font-semibold text-cyan-300 underline underline-offset-2 hover:text-white">
              Términos y condiciones
            </a>{" "}
            y la{" "}
            <a href="/cookies" className="font-semibold text-cyan-300 underline underline-offset-2 hover:text-white">
              Política de cookies
            </a>
            . Las analíticas (Google Analytics) solo se activan si las aceptas.
          </p>

          {details && (
            <div className="cookie-details mt-4 space-y-2">
              {[
                { label: "Necesarias", desc: "Sesión, seguridad y preferencias básicas.", value: true, locked: true, set: () => {} },
                { label: "Funcionales", desc: "Recordar tema, idioma y ajustes de la interfaz.", value: functional, locked: false, set: setFunctional },
                { label: "Analíticas", desc: "Medición anónima de uso para mejorar la plataforma.", value: analytics, locked: false, set: setAnalytics },
              ].map((row) => (
                <label
                  key={row.label}
                  className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 transition hover:bg-white/[0.07]"
                >
                  <span>
                    <span className="flex items-center gap-1.5 text-sm font-bold">
                      {row.locked && <ShieldCheck size={14} className="text-emerald-300" />}
                      {row.label}
                    </span>
                    <span className="block text-xs text-white/50">{row.desc}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={row.value}
                    disabled={row.locked}
                    onChange={(e) => row.set(e.target.checked)}
                    className="h-5 w-5 accent-cyan-400"
                  />
                </label>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => close({ functional: true, analytics: true })}
              className="rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-bold shadow-lg shadow-blue-500/30 transition hover:-translate-y-0.5 hover:bg-blue-400"
            >
              Aceptar todo
            </button>
            {details ? (
              <button
                type="button"
                onClick={() => close({ functional, analytics })}
                className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-bold transition hover:bg-white/10"
              >
                Guardar preferencias
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setDetails(true)}
                className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-bold transition hover:bg-white/10"
              >
                Configurar
              </button>
            )}
            <button
              type="button"
              onClick={() => close({ functional: false, analytics: false })}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              Solo necesarias
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function openCookieSettings() {
  window.dispatchEvent(new Event("bjsig:open-cookie-settings"));
}

export default CookieConsent;
