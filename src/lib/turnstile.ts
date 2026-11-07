type TurnstileOptions = {
  sitekey: string;
  action: string;
  execution: "execute";
  appearance: "interaction-only";
  callback: (token: string) => void;
  "error-callback": () => void;
  "expired-callback": () => void;
};

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileOptions) => string;
  execute: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.turnstile) resolve(window.turnstile);
      else reject(new Error("No se pudo cargar la verificación de seguridad."));
    };
    script.onerror = () => reject(new Error("No se pudo cargar la verificación de seguridad."));
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    scriptPromise = null;
    throw error;
  });

  return scriptPromise;
}

export async function getTurnstileToken(action: string): Promise<string> {
  const sitekey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim();
  if (!sitekey) {
    throw new Error("La verificación de seguridad no está configurada. Contacta al administrador.");
  }

  const turnstile = await loadTurnstile();
  const container = document.createElement("div");
  container.setAttribute("aria-label", "Verificación de seguridad");
  container.style.position = "fixed";
  container.style.right = "12px";
  container.style.bottom = "12px";
  container.style.zIndex = "2147483647";
  document.body.appendChild(container);

  return await new Promise<string>((resolve, reject) => {
    let widgetId: string | null = null;
    let settled = false;
    const cleanup = () => {
      window.clearTimeout(timeout);
      if (widgetId) {
        try {
          turnstile.remove(widgetId);
        } catch {
          // Removing an already-expired widget must not block request cleanup.
        }
      }
      container.remove();
    };
    const finish = (value: string | Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (value instanceof Error) reject(value);
      else resolve(value);
    };
    const timeout = window.setTimeout(
      () => finish(new Error("La verificación tardó demasiado. Intenta nuevamente.")),
      30_000,
    );

    try {
      widgetId = turnstile.render(container, {
        sitekey,
        action,
        execution: "execute",
        appearance: "interaction-only",
        callback: (token) =>
          token ? finish(token) : finish(new Error("La verificación no devolvió un token válido.")),
        "error-callback": () =>
          finish(new Error("No se pudo completar la verificación de seguridad.")),
        "expired-callback": () => finish(new Error("La verificación expiró. Intenta nuevamente.")),
      });
      turnstile.execute(widgetId);
    } catch {
      finish(new Error("No se pudo iniciar la verificación de seguridad."));
    }
  });
}
