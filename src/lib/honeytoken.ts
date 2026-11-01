/**
 * Honeytoken trap utilities.
 *
 * Honeytokens are fake canary records (fake worker RUTs, fake document URLs)
 * planted in the database. If anyone accesses or touches them, the action is
 * logged to activity_logs with a high-severity flag. This detects unauthorized
 * data access per Chilean cybersecurity law (Ley 21.663).
 */

import { callEdgeFunction } from "./edgeFunctions";
import { honeytokenRepo } from "./repositories";
import type { Honeytoken } from "./types";

/**
 * Checks if a given RUT matches any honeytoken by delegating to the
 * honeytoken-check edge function. The server validates the session,
 * queries the honeytoken table, logs the security event, and marks
 * the token as triggered — all without exposing honeytoken records
 * to the browser.
 */
export async function checkHoneytokenRut(rut: string, context: string): Promise<boolean> {
  const { data, error } = await callEdgeFunction<{ triggered: boolean }>("honeytoken-check", {
    rut,
    context,
  });
  if (error) return false;
  return data?.triggered ?? false;
}

/**
 * Returns all honeytokens for display in the security panel.
 */
export async function fetchHoneytokens(): Promise<Honeytoken[]> {
  try {
    return await honeytokenRepo.getAll();
  } catch {
    return [];
  }
}
