import { useEffect, useState, useRef } from "react";
import { getQueuedCount, syncQueuedScans, initAutoSync } from "@/lib/offlineQueue";
import { logger } from "@/lib/logger";

export interface OnlineStatus {
  online: boolean;
  wasOffline: boolean;
  queuedCount: number;
  syncInProgress: boolean;
}

type Listener = (status: Partial<OnlineStatus>) => void;
const listeners = new Set<Listener>();
let currentOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
let currentQueued = 0;
let currentSync = false;

function notify() {
  listeners.forEach((fn) =>
    fn({
      online: currentOnline,
      queuedCount: currentQueued,
      syncInProgress: currentSync,
    }),
  );
}

async function refreshQueuedCount() {
  try {
    currentQueued = await getQueuedCount();
    notify();
  } catch {
    /* ignore */
  }
}

if (typeof window !== "undefined") {
  initAutoSync();

  window.addEventListener("online", async () => {
    currentOnline = true;
    currentSync = true;
    notify();
    try {
      const result = await syncQueuedScans();
      logger.info("[online-status] sync result:", result);
    } catch (err) {
      logger.warn("[online-status] sync failed:", err);
    }
    currentSync = false;
    await refreshQueuedCount();
  });

  window.addEventListener("offline", () => {
    currentOnline = false;
    notify();
  });

  navigator.serviceWorker?.addEventListener("message", (event) => {
    if (event.data?.type === "BACKGROUND_SYNC_COMPLETE") {
      currentQueued = 0;
      currentSync = false;
      notify();
    }
    if (event.data?.type === "SYNC_STARTED") {
      currentSync = true;
      notify();
    }
  });

  // Check for pending scans on initial load
  refreshQueuedCount();
}

/**
 * Tracks browser online/offline state. When the connection drops,
 * mutations are queued by the service worker's Background Sync. When
 * connectivity returns, queued requests are replayed automatically.
 */
export function useOnlineStatus(): OnlineStatus {
  const [status, setStatus] = useState<OnlineStatus>({
    online: currentOnline,
    wasOffline: false,
    queuedCount: currentQueued,
    syncInProgress: currentSync,
  });
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    const listener: Listener = (patch) => {
      setStatus((prev) => {
        const online = patch.online ?? prev.online;
        if (!online) wasOfflineRef.current = true;
        return {
          online,
          wasOffline: wasOfflineRef.current,
          queuedCount: patch.queuedCount ?? prev.queuedCount,
          syncInProgress: patch.syncInProgress ?? prev.syncInProgress,
        };
      });
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return status;
}

/**
 * Queues a mutation for Background Sync if offline, or executes it
 * immediately if online. Returns true if the request was queued.
 */
export function queueMutationIfOffline(execute: () => Promise<Response>): {
  queued: boolean;
  promise: Promise<void>;
} {
  if (currentOnline) {
    return { queued: false, promise: execute().then(() => {}) };
  }
  currentQueued++;
  notify();
  return {
    queued: true,
    promise: new Promise((resolve) => {
      // The service worker will replay this when connectivity returns
      resolve();
    }),
  };
}

export const isOnline = () => currentOnline;
