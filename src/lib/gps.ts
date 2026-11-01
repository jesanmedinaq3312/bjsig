/**
 * GPS coordinates and device fingerprint utilities.
 *
 * Used by the QR scanner to enforce that every attendance scan records the
 * supervisor's physical location and the unique identifier of the device
 * used, per Chilean cybersecurity (Ley 21.663) and personal data protection
 * (Ley 19.628) compliance requirements.
 */

import { supabase } from "./supabase";
import { logger } from "./logger";
import { callEdgeFunction } from "./edgeFunctions";

export interface GpsPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface ScanContext {
  gps: GpsPosition | null;
  deviceId: string;
}

const GPS_CACHE_KEY = "gyc_gps_cache";
const GPS_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

let cachedGps: GpsPosition | null = null;
let cachedGpsAt = 0;
let gpsPromise: Promise<GpsPosition | null> | null = null;
let gpsDenied = false;

let cachedServerDeviceId: string | null = null;
let deviceIdPromise: Promise<string> | null = null;

/**
 * Returns a server-issued device ID by calling the register-device edge
 * function. The server derives the ID from email + tenant + user-agent +
 * IP prefix, so it cannot be forged by the client. Falls back to the
 * legacy local ID if the edge function is unreachable.
 *
 * The result is cached for the session and the in-flight promise is
 * deduplicated so concurrent callers share a single network request.
 */
export async function getServerDeviceId(): Promise<string> {
  if (cachedServerDeviceId) return cachedServerDeviceId;
  if (deviceIdPromise) return deviceIdPromise;

  deviceIdPromise = (async () => {
    try {
      // Sin sesión activa la función del servidor no puede registrar el
      // dispositivo (responde 500), así que usamos el ID local directamente.
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        return getLocalDeviceId();
      }

      const clientFingerprint = getLocalDeviceId();
      const { data, error } = await callEdgeFunction<{ device_id: string }>("register-device", {
        client_fingerprint: clientFingerprint,
      });
      if (error) throw new Error(error);
      if (data?.device_id) {
        cachedServerDeviceId = data.device_id as string;
        return cachedServerDeviceId;
      }
      // Sin respuesta utilizable (función deshabilitada o vacía): respaldo local.
      cachedServerDeviceId = getLocalDeviceId();
      return cachedServerDeviceId;
    } catch (err) {
      logger.warn("[gps] server device ID failed, using local fallback:", err);
      const fallback = getLocalDeviceId();
      cachedServerDeviceId = fallback;
      return fallback;
    } finally {
      deviceIdPromise = null;
    }
  })();

  return deviceIdPromise;
}

/**
 * Legacy client-side device fingerprint, kept as a fallback when the
 * register-device edge function is unreachable (e.g. offline).
 */
export function getLocalDeviceId(): string {
  const STORAGE_KEY = "gyc_device_id";
  let id = localStorage.getItem(STORAGE_KEY);
  if (id) return id;

  const parts = [
    navigator.platform || "unknown",
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown",
    navigator.language || "unknown",
    navigator.hardwareConcurrency?.toString() || "unknown",
  ];
  const random = crypto.randomUUID();
  id = `dev_${btoa(parts.join("|")).slice(0, 16)}_${random.slice(0, 8)}`;
  localStorage.setItem(STORAGE_KEY, id);
  return id;
}

/**
 * Requests a single high-accuracy GPS position from the browser.
 * Returns null if GPS is unavailable, denied, or times out.
 *
 * This is the low-level one-shot fetch. Prefer getCachedGps() for
 * audit/log calls — it reuses a cached position so GPS is only
 * requested once per session instead of on every action.
 */
export function getGpsPosition(timeoutMs = 12000): Promise<GpsPosition | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      resolve(null);
      return;
    }

    let settled = false;
    const finish = (pos: GpsPosition | null) => {
      if (!settled) {
        settled = true;
        resolve(pos);
      }
    };

    // First attempt: high accuracy, allows cached position up to 60s old
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        finish({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      () => {
        // High-accuracy failed — retry with low accuracy and longer timeout
        navigator.geolocation.getCurrentPosition(
          (pos) =>
            finish({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            }),
          () => finish(null),
          { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 300000 },
        );
      },
      { enableHighAccuracy: true, timeout: Math.min(timeoutMs, 8000), maximumAge: 60000 },
    );
  });
}

/**
 * Loads a cached GPS position from localStorage if it's still fresh
 * (within GPS_CACHE_TTL_MS). Returns null if no cache or stale.
 */
function loadCachedGps(): GpsPosition | null {
  try {
    const raw = localStorage.getItem(GPS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { lat: number; lng: number; acc: number; ts: number };
    if (Date.now() - parsed.ts > GPS_CACHE_TTL_MS) return null;
    return { latitude: parsed.lat, longitude: parsed.lng, accuracy: parsed.acc };
  } catch {
    return null;
  }
}

/**
 * Saves a GPS position to localStorage cache.
 */
function saveCachedGps(pos: GpsPosition): void {
  try {
    localStorage.setItem(
      GPS_CACHE_KEY,
      JSON.stringify({
        lat: pos.latitude,
        lng: pos.longitude,
        acc: pos.accuracy,
        ts: Date.now(),
      }),
    );
  } catch {
    /* ignore quota errors */
  }
}

/**
 * Returns a cached GPS position, requesting it only once per session.
 * The position is stored in memory and localStorage (30-minute TTL)
 * so subsequent audit/log calls reuse it without re-prompting the user.
 *
 * If GPS was already requested and returned null (denied/unavailable),
 * that null is cached too — we don't re-prompt on every action.
 */
export function getCachedGps(): Promise<GpsPosition | null> {
  // Return in-memory cache if fresh
  if (cachedGps && Date.now() - cachedGpsAt < GPS_CACHE_TTL_MS) {
    return Promise.resolve(cachedGps);
  }
  // Try localStorage cache (survives page reload)
  const stored = loadCachedGps();
  if (stored) {
    cachedGps = stored;
    cachedGpsAt = Date.now();
    return Promise.resolve(cachedGps);
  }
  // Already fetching? Share the in-flight promise
  if (gpsPromise) return gpsPromise;

  gpsPromise = (async () => {
    const pos = await getGpsPosition(8000);
    if (pos) {
      cachedGps = pos;
      cachedGpsAt = Date.now();
      saveCachedGps(pos);
      gpsDenied = false;
    } else {
      gpsDenied = true;
    }
    gpsPromise = null;
    return pos;
  })();

  return gpsPromise;
}

/**
 * Forces a fresh GPS request, bypassing the cache. Used by the
 * explicit "enable GPS" button on the login screen.
 */
export async function refreshGpsCache(timeoutMs = 10000): Promise<GpsPosition | null> {
  gpsPromise = null; // cancel any in-flight cache fetch
  const pos = await getGpsPosition(timeoutMs);
  cachedGps = pos;
  cachedGpsAt = Date.now();
  if (pos) saveCachedGps(pos);
  return pos;
}

/**
 * Clears the cached GPS position (used on sign-out).
 */
export function clearGpsCache(): void {
  cachedGps = null;
  cachedGpsAt = 0;
  gpsPromise = null;
  gpsDenied = false;
  try {
    localStorage.removeItem(GPS_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Returns true if the browser supports geolocation at all.
 */
export function gpsSupported(): boolean {
  return "geolocation" in navigator;
}

export function isGpsDenied(): boolean {
  return gpsDenied;
}

export function hasGpsCache(): boolean {
  return cachedGps !== null;
}

/**
 * Collects a browser fingerprint from non-sensitive, stable attributes.
 * This is used for audit logging to identify repeated sessions from the
 * same device without storing any personal data.
 */
export function getBrowserFingerprint(): string {
  const parts = [
    navigator.platform || "unknown",
    navigator.language || "unknown",
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown",
    navigator.hardwareConcurrency?.toString() || "unknown",
    navigator.maxTouchPoints?.toString() || "0",
    new Date().getTimezoneOffset().toString(),
  ];
  return btoa(parts.join("|")).slice(0, 32);
}

/**
 * Collects non-sensitive cookie information for audit logging.
 * Only records cookie names and whether they exist (not values),
 * to avoid storing sensitive session tokens in audit logs.
 */
export function getCookieMetadata(): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  try {
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const name = cookie.trim().split("=")[0];
      if (name) result[name] = true;
    }
  } catch {
    /* ignore */
  }
  return result;
}

/**
 * Returns session timing info — when the session started (stored at login)
 * and the current duration in seconds.
 */
const SESSION_START_KEY = "gyc_session_start";

export function recordSessionStart(): void {
  try {
    localStorage.setItem(SESSION_START_KEY, Date.now().toString());
  } catch {
    /* ignore */
  }
}

export function getSessionStart(): number | null {
  try {
    const raw = localStorage.getItem(SESSION_START_KEY);
    return raw ? parseInt(raw, 10) : null;
  } catch {
    return null;
  }
}

export function clearSessionStart(): void {
  try {
    localStorage.removeItem(SESSION_START_KEY);
  } catch {
    /* ignore */
  }
}

export function getSessionDurationSeconds(): number | null {
  const start = getSessionStart();
  if (!start) return null;
  return Math.floor((Date.now() - start) / 1000);
}

/**
 * Returns the referrer URL and viewport size for audit context.
 */
export function getNavigationContext(): { referrer: string | null; viewport: string | null } {
  return {
    referrer: document.referrer || null,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
  };
}
