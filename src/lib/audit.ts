import { supabase } from "./supabase";
import { callEdgeFunction } from "./edgeFunctions";
import { logger } from "./logger";

export interface AuditEntry {
  action: string;
  entity: string;
  entity_id?: string | null;
  tenant_id?: string | null;
  entity_label?: string | null;
  details?: Record<string, unknown> | null;
  /** Kept for backwards compatibility; never collected automatically. */
  device_id?: string | null;
  /** Kept for backwards compatibility; never collected automatically. */
  latitude?: number | null;
  /** Kept for backwards compatibility; never collected automatically. */
  longitude?: number | null;
}

/**
 * Appends a single audit entry through the `log-activity` edge function.
 *
 * The browser deliberately sends only the event context. Identity, tenant
 * boundary, IP address, user-agent and authenticated role are resolved by the
 * server. This prevents spoofed audit records and avoids collecting cookies,
 * browser fingerprints, referrers, GPS or session identifiers by default.
 */

const AUDIT_QUEUE_DB = "gyc_audit_queue";
const AUDIT_QUEUE_STORE = "pending_logs";
const AUDIT_QUEUE_VERSION = 1;

/**
 * Cuando el servidor rechaza el registro por permisos, reintentarlo solo
 * genera errores repetidos durante esta sesión.
 */
let remoteAuditDisabled = false;

function isPermissionError(message: string | null | undefined): boolean {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return normalized.includes("permission denied") || normalized.includes("no tienes permisos");
}

export function isRemoteAuditDisabled(): boolean {
  return remoteAuditDisabled;
}

interface QueuedAuditLog {
  id: string;
  payload: Record<string, unknown>;
  queued_at: number;
  retry_count: number;
}

const SENSITIVE_KEY = /(password|token|secret|credential|authorization|cookie|api[_-]?key)/i;

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > 2) return "[truncated]";
  if (value === null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return value.slice(0, 500);
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitizeValue(item, depth + 1));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !SENSITIVE_KEY.test(key))
        .slice(0, 40)
        .map(([key, item]) => [key.slice(0, 80), sanitizeValue(item, depth + 1)]),
    );
  }
  return String(value).slice(0, 200);
}

function buildPayload(entry: AuditEntry): Record<string, unknown> {
  return {
    action: entry.action.trim().slice(0, 120),
    entity: entry.entity.trim().slice(0, 80),
    entity_id: entry.entity_id?.trim().slice(0, 120) || null,
    tenant_id: entry.tenant_id ?? null,
    entity_label: entry.entity_label?.slice(0, 240) || null,
    details: entry.details ? sanitizeValue(entry.details) : null,
  };
}

function openAuditDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(AUDIT_QUEUE_DB, AUDIT_QUEUE_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(AUDIT_QUEUE_STORE)) {
        db.createObjectStore(AUDIT_QUEUE_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function queueAuditLog(payload: Record<string, unknown>): Promise<void> {
  try {
    const entry: QueuedAuditLog = {
      id: crypto.randomUUID(),
      payload,
      queued_at: Date.now(),
      retry_count: 0,
    };
    const db = await openAuditDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(AUDIT_QUEUE_STORE, "readwrite");
      tx.objectStore(AUDIT_QUEUE_STORE).add(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    logger.info("[audit] queued offline:", payload.action);
  } catch (err) {
    logger.warn("[audit] failed to queue offline log:", err);
  }
}

let auditSyncing = false;

export async function syncQueuedAuditLogs(): Promise<void> {
  if (auditSyncing || remoteAuditDisabled || !navigator.onLine) return;
  auditSyncing = true;

  try {
    const db = await openAuditDB();
    const entries = await new Promise<QueuedAuditLog[]>((resolve, reject) => {
      const tx = db.transaction(AUDIT_QUEUE_STORE, "readonly");
      const req = tx.objectStore(AUDIT_QUEUE_STORE).getAll();
      req.onsuccess = () => resolve(req.result as QueuedAuditLog[]);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (entries.length === 0) return;

    for (const entry of entries) {
      if (entry.retry_count >= 5) {
        const db2 = await openAuditDB();
        await new Promise<void>((resolve, reject) => {
          const tx = db2.transaction(AUDIT_QUEUE_STORE, "readwrite");
          tx.objectStore(AUDIT_QUEUE_STORE).delete(entry.id);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
        db2.close();
        continue;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) break;

      const { error: fnError, errorCode } = await callEdgeFunction("log-activity", entry.payload);
      // A pending second factor is temporary, not a permission denial or failed retry.
      if (errorCode === "MFA_REQUIRED") break;
      if (isPermissionError(fnError)) {
        remoteAuditDisabled = true;
        logger.warn("[audit] remote audit disabled:", fnError);
        break;
      }

      const db2 = await openAuditDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db2.transaction(AUDIT_QUEUE_STORE, "readwrite");
        const store = tx.objectStore(AUDIT_QUEUE_STORE);
        if (!fnError) {
          store.delete(entry.id);
        } else {
          const getReq = store.get(entry.id);
          getReq.onsuccess = () => {
            const queued = getReq.result as QueuedAuditLog | undefined;
            if (queued) {
              queued.retry_count += 1;
              store.put(queued);
            }
          };
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db2.close();
    }
  } catch (err) {
    logger.warn("[audit] sync error:", err);
  } finally {
    auditSyncing = false;
  }
}

let autoSyncInitialized = false;

export function initAuditAutoSync(): void {
  if (autoSyncInitialized) return;
  autoSyncInitialized = true;

  window.addEventListener("online", () => {
    syncQueuedAuditLogs().catch(() => {});
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && navigator.onLine) syncQueuedAuditLogs().catch(() => {});
  });
}

export async function audit(entry: AuditEntry): Promise<void> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    // Never queue unauthenticated events: a later session must not be able to
    // impersonate the actor of an earlier failed login attempt.
    if (!sessionData?.session || remoteAuditDisabled) return;

    const payload = buildPayload(entry);
    if (!navigator.onLine) {
      await queueAuditLog(payload);
      return;
    }

    const { error: fnError, errorCode } = await callEdgeFunction("log-activity", payload);
    // Pre-verification events must not be replayed under a later user's session.
    // The verified authentication event is recorded after MFA by useAuth.
    if (errorCode === "MFA_REQUIRED") return;
    if (isPermissionError(fnError)) {
      remoteAuditDisabled = true;
      logger.warn("[audit] remote audit disabled:", fnError);
    } else if (fnError) {
      // Direct browser inserts are intentionally not used as a fallback. The
      // edge function is the only trusted write path for activity_logs.
      await queueAuditLog(payload);
    }
  } catch (err) {
    logger.warn("[audit] error:", err);
  }
}
