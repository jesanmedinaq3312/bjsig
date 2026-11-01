import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { callEdgeFunction, callEdgeFunctionKeepalive } from "@/lib/edgeFunctions";
import { isRemoteAuditDisabled } from "@/lib/audit";
import {
  getServerDeviceId,
  getCachedGps,
  getBrowserFingerprint,
  getCookieMetadata,
  getSessionDurationSeconds,
  getNavigationContext,
} from "@/lib/gps";

function buildPageViewPayload(
  prevPath: string,
  duration: number,
  reason?: string,
): Record<string, unknown> {
  return {
    action: "page_view",
    entity: "navigation",
    entity_label: prevPath,
    details: { duration_seconds: duration, page_path: prevPath, ...(reason ? { reason } : {}) },
    page_path: prevPath,
    session_duration: duration,
    session_id: null as string | null,
    device_id: null as string | null,
    client_ua: navigator.userAgent,
    fingerprint: getBrowserFingerprint(),
    cookie_data: getCookieMetadata(),
    session_total_duration: getSessionDurationSeconds(),
    referrer: getNavigationContext().referrer,
    viewport: getNavigationContext().viewport,
    latitude: null as number | null,
    longitude: null as number | null,
  };
}

function logPageView(payload: Record<string, unknown>) {
  if (isRemoteAuditDisabled()) return;
  // Sin sesión activa el registro no tiene permisos: se omite en silencio.
  supabase.auth.getSession().then(({ data }) => {
    if (!data?.session) return;
    callEdgeFunction("log-activity", payload).then(({ error, errorCode }) => {
      if (error && errorCode !== "MFA_REQUIRED")
        logger.warn("[tracking] log-activity error:", error);
    });
  });
}

export function useNavigationTracking(
  pagePath: string,
  sessionId: string | null,
  userEmail: string | null,
  userRole: string | null,
) {
  const startTimeRef = useRef<number>(Date.now());
  const prevPathRef = useRef<string>(pagePath);
  const sessionIdRef = useRef<string | null>(sessionId);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      tokenRef.current = data?.session?.access_token ?? null;
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      tokenRef.current = session?.access_token ?? null;
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const now = Date.now();
    const duration = Math.floor((now - startTimeRef.current) / 1000);
    const prevPath = prevPathRef.current;

    if (prevPath && duration > 0) {
      const basePayload = buildPageViewPayload(prevPath, duration);
      basePayload.session_id = sessionIdRef.current;

      Promise.all([getServerDeviceId(), getCachedGps()])
        .then(([deviceId, gps]) => {
          basePayload.device_id = deviceId;
          if (gps) {
            basePayload.latitude = gps.latitude;
            basePayload.longitude = gps.longitude;
          }
          logPageView(basePayload);
        })
        .catch(() => {
          logPageView(basePayload);
        });
    }

    startTimeRef.current = now;
    prevPathRef.current = pagePath;
  }, [pagePath, userEmail, userRole]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const path = prevPathRef.current;
        if (path && duration > 0) {
          const payload = buildPageViewPayload(path, duration, "tab_hidden");
          payload.session_id = sessionIdRef.current;
          getCachedGps()
            .then((gps) => {
              if (gps) {
                payload.latitude = gps.latitude;
                payload.longitude = gps.longitude;
              }
              logPageView(payload);
            })
            .catch(() => logPageView(payload));
        }
      } else {
        startTimeRef.current = Date.now();
      }
    };

    const handleBeforeUnload = () => {
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const path = prevPathRef.current;
      if (path && duration > 0 && tokenRef.current) {
        const payload = buildPageViewPayload(path, duration, "unload");
        payload.session_id = sessionIdRef.current;
        callEdgeFunctionKeepalive("log-activity", payload);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [userEmail, userRole]);
}
