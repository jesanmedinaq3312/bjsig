/**
 * Offline write queue for QR attendance scans.
 *
 * When a supervisor is in the field with poor signal, QR scans are
 * stored locally in IndexedDB and replayed automatically when
 * connectivity returns. Each queued scan carries a client-generated
 * idempotency key so duplicate replays are safe.
 *
 * The service worker's Background Sync handles generic REST mutations,
 * but QR scans go through edge functions which the SW deliberately
 * doesn't intercept — so this module manages its own queue.
 */

import { supabase } from "./supabase";
import { getServerDeviceId } from "./gps";
import { logger } from "./logger";
import { isNetworkError } from "./networkError";

const DB_NAME = "gyc_offline_queue";
const STORE = "pending_scans";
const DB_VERSION = 3;

interface QueuedScan {
  id: string;
  idempotency_key: string;
  worker_rut: string;
  scan_type: string;
  scan_date: string;
  scan_time: string;
  captured_scan_date: string;
  captured_scan_time: string;
  latitude: number | null;
  longitude: number | null;
  gps_accuracy: number | null;
  device_id: string;
  gps_missing: boolean;
  notes: string | null;
  queued_at: number;
  retry_count: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      } else if (req.transaction) {
        const store = req.transaction.objectStore(STORE);
        const cursorRequest = store.openCursor();
        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result;
          if (!cursor) return;
          const scan = cursor.value as QueuedScan;
          cursor.update({
            ...scan,
            captured_scan_date: scan.captured_scan_date ?? scan.scan_date,
            captured_scan_time: scan.captured_scan_time ?? scan.scan_time,
          });
          cursor.continue();
        };
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function queueScan(
  scan: Omit<QueuedScan, "id" | "idempotency_key" | "queued_at" | "retry_count">,
): Promise<string> {
  const id = crypto.randomUUID();
  const entry: QueuedScan = {
    ...scan,
    id,
    idempotency_key: id,
    queued_at: Date.now(),
    retry_count: 0,
  };
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return entry.id;
}

export async function getQueuedScans(): Promise<QueuedScan[]> {
  const db = await openDB();
  const result = await new Promise<QueuedScan[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as QueuedScan[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result.sort((a, b) => a.queued_at - b.queued_at);
}

export async function removeQueuedScan(id: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function incrementRetry(id: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const entry = getReq.result as QueuedScan | undefined;
      if (entry) {
        entry.retry_count++;
        store.put(entry);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getQueuedCount(): Promise<number> {
  const db = await openDB();
  const result = await new Promise<number>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

interface SyncResult {
  synced: number;
  failed: number;
  duplicates: number;
  discarded: number;
}

let syncing = false;

export async function syncQueuedScans(): Promise<SyncResult> {
  if (syncing) return { synced: 0, failed: 0, duplicates: 0, discarded: 0 };
  syncing = true;

  try {
    const scans = await getQueuedScans();
    if (scans.length === 0) return { synced: 0, failed: 0, duplicates: 0, discarded: 0 };

    let synced = 0;
    let failed = 0;
    let duplicates = 0;
    let discarded = 0;

    for (const scan of scans) {
      if (scan.retry_count >= 5) {
        logger.warn(`[offline-queue] dropping scan ${scan.id} after 5 retries`);
        await removeQueuedScan(scan.id);
        discarded++;
        continue;
      }

      try {
        const { data, error } = await supabase
          .from("qr_scan_events")
          .insert({
            idempotency_key: scan.idempotency_key,
            worker_rut: scan.worker_rut,
            scan_type: scan.scan_type,
            scan_date: scan.scan_date,
            scan_time: scan.scan_time,
            captured_scan_date: scan.captured_scan_date,
            captured_scan_time: scan.captured_scan_time,
            validated: true,
            notes: scan.notes,
            latitude: scan.latitude,
            longitude: scan.longitude,
            gps_accuracy: scan.gps_accuracy,
            device_id: scan.device_id,
            gps_missing: scan.gps_missing,
          })
          .select()
          .maybeSingle();

        if (error) {
          if (error.code === "23505") {
            await removeQueuedScan(scan.id);
            duplicates++;
          } else {
            await incrementRetry(scan.id);
            failed++;
          }
        } else if (data) {
          await removeQueuedScan(scan.id);
          synced++;
        }
      } catch (err) {
        logger.warn(`[offline-queue] sync failed for scan ${scan.id}:`, err);
        await incrementRetry(scan.id);
        failed++;
      }
    }

    if (discarded > 0) {
      window.dispatchEvent(new CustomEvent("offline-queue:discarded", { detail: { discarded } }));
    }

    return { synced, failed, duplicates, discarded };
  } finally {
    syncing = false;
  }
}

let autoSyncRegistered = false;

export function initAutoSync(): void {
  if (autoSyncRegistered) return;
  autoSyncRegistered = true;

  window.addEventListener("online", () => {
    syncQueuedScans().catch((err) => logger.warn("[offline-queue] auto-sync failed:", err));
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && navigator.onLine) {
      syncQueuedScans().catch(() => {});
    }
  });
}

/**
 * Attempts to save a QR scan. If offline, queues it locally and returns
 * a flag indicating it was queued. The caller can show a different toast
 * message for queued vs. immediately-saved scans.
 */
export async function saveScanOrQueue(scan: {
  worker_rut: string;
  scan_type: string;
  scan_date: string;
  scan_time: string;
  captured_scan_date?: string;
  captured_scan_time?: string;
  latitude: number | null;
  longitude: number | null;
  gps_accuracy: number | null;
  gps_missing: boolean;
  notes: string | null;
}): Promise<{ queued: boolean; duplicate: boolean }> {
  const deviceId = await getServerDeviceId();
  const idempotencyKey = crypto.randomUUID();
  const payload = {
    ...scan,
    captured_scan_date: scan.captured_scan_date ?? scan.scan_date,
    captured_scan_time: scan.captured_scan_time ?? scan.scan_time,
    device_id: deviceId,
    idempotency_key: idempotencyKey,
  };

  if (!navigator.onLine) {
    await queueScan(payload);
    return { queued: true, duplicate: false };
  }

  try {
    const { error } = await supabase
      .from("qr_scan_events")
      .insert({
        idempotency_key: payload.idempotency_key,
        worker_rut: payload.worker_rut,
        scan_type: payload.scan_type,
        scan_date: payload.scan_date,
        scan_time: payload.scan_time,
        captured_scan_date: payload.captured_scan_date,
        captured_scan_time: payload.captured_scan_time,
        validated: true,
        notes: payload.notes,
        latitude: payload.latitude,
        longitude: payload.longitude,
        gps_accuracy: payload.gps_accuracy,
        device_id: payload.device_id,
        gps_missing: payload.gps_missing,
      })
      .select()
      .maybeSingle();

    if (error) {
      if (error.code === "23505") return { queued: false, duplicate: true };
      throw error;
    }
    return { queued: false, duplicate: false };
  } catch (err) {
    if (isNetworkError(err)) {
      logger.warn("[offline-queue] network error, queuing scan:", err);
      await queueScan(payload);
      return { queued: true, duplicate: false };
    }
    throw err;
  }
}
