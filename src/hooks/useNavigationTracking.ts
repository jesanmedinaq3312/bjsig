import { useCallback, useEffect, useRef } from "react";
import { audit, isRemoteAuditDisabled, type AuditEntry } from "@/lib/audit";
import { canSubmitActivityAudit } from "@/lib/activityAuth";
import { callEdgeFunction, callEdgeFunctionKeepalive } from "@/lib/edgeFunctions";
import { logger } from "@/lib/logger";
import { supabase } from "@/lib/supabase";

const MAX_RECORDED_SECONDS = 24 * 60 * 60;
type SendStatus = "sent" | "queued" | "mfa" | "failed" | "disabled";

function normalizePagePath(value: string): string {
  const path = value.trim().split(/[?#]/, 1)[0] || "/";
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return "/unknown";
  return path.slice(0, 240);
}

function secondsBetween(startedAt: number, endedAt: number): number {
  return Math.min(MAX_RECORDED_SECONDS, Math.max(0, Math.floor((endedAt - startedAt) / 1000)));
}

export function useNavigationTracking(pagePath: string, userEmail: string | null) {
  const pathRef = useRef(normalizePagePath(pagePath));
  const userRef = useRef<string | null>(null);
  const activeSinceRef = useRef<number | null>(null);
  const pendingPageViewRef = useRef<string | null>(null);

  const sendEvent = useCallback(
    async (payload: Record<string, unknown>, keepalive = false): Promise<SendStatus> => {
      if (isRemoteAuditDisabled()) return "disabled";
      if (keepalive) {
        callEdgeFunctionKeepalive("log-activity", payload);
        return "sent";
      }

      const result = await callEdgeFunction("log-activity", payload);
      if (result.errorCode === "MFA_REQUIRED") return "mfa";
      if (result.error) {
        if (!navigator.onLine) {
          await audit(payload as unknown as AuditEntry);
          return "queued";
        }
        logger.warn("[tracking] log-activity error:", result.error);
        return "failed";
      }
      return "sent";
    },
    [],
  );

  const recordPageView = useCallback(
    (path: string) => {
      pendingPageViewRef.current = path;
      const payload = {
        action: "page_view",
        entity: "navigation",
        entity_label: path,
        page_path: path,
        details: { event: "view_entered" },
      };
      void sendEvent(payload).then((status) => {
        if (status !== "mfa" && pendingPageViewRef.current === path) {
          pendingPageViewRef.current = null;
        }
      });
    },
    [sendEvent],
  );

  const recordPageTime = useCallback(
    (reason: string, keepalive = false) => {
      const startedAt = activeSinceRef.current;
      activeSinceRef.current = null;
      if (startedAt === null) return;

      const seconds = secondsBetween(startedAt, performance.now());
      if (seconds < 1) return;

      const path = pathRef.current;
      const payload = {
        action: "page_time",
        entity: "navigation",
        entity_label: path,
        page_path: path,
        session_duration: seconds,
        details: { duration_seconds: seconds, page_path: path, reason },
      };
      void sendEvent(payload, keepalive).catch((error) => {
        logger.warn("[tracking] page_time send failed:", error);
      });
    },
    [sendEvent],
  );

  useEffect(() => {
    if (!userEmail) {
      userRef.current = null;
      pathRef.current = normalizePagePath(pagePath);
      activeSinceRef.current = null;
      pendingPageViewRef.current = null;
      return;
    }

    const normalizedPath = normalizePagePath(pagePath);
    const normalizedUser = userEmail.trim().toLowerCase();

    if (userRef.current !== normalizedUser) {
      if (userRef.current) recordPageTime("identity_changed");
      userRef.current = normalizedUser;
      pathRef.current = normalizedPath;
      activeSinceRef.current = document.visibilityState === "hidden" ? null : performance.now();
      recordPageView(normalizedPath);
      return;
    }

    if (pathRef.current !== normalizedPath) {
      recordPageTime("route_change");
      pathRef.current = normalizedPath;
      activeSinceRef.current = document.visibilityState === "hidden" ? null : performance.now();
      recordPageView(normalizedPath);
    }
  }, [pagePath, recordPageTime, recordPageView, userEmail]);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const pendingPath = pendingPageViewRef.current;
      if (
        pendingPath &&
        userRef.current &&
        session?.access_token &&
        canSubmitActivityAudit(session.access_token)
      ) {
        pendingPageViewRef.current = null;
        recordPageView(pendingPath);
      }
    });

    return () => data.subscription.unsubscribe();
  }, [recordPageView]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        recordPageTime("tab_hidden");
      } else if (userRef.current) {
        activeSinceRef.current = performance.now();
      }
    };
    const handleBeforeUnload = () => recordPageTime("unload", true);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      recordPageTime("component_unmount", true);
    };
  }, [recordPageTime]);
}
