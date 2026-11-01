import { supabase } from "./supabase";
import type { QueryClient } from "@tanstack/react-query";

type RowWithId = { id: string };

function upsertRow<T extends RowWithId>(list: T[], incoming: T): T[] {
  const idx = list.findIndex((r) => r.id === incoming.id);
  if (idx === -1) return [incoming, ...list];
  const copy = [...list];
  copy[idx] = incoming;
  return copy;
}

function deleteRow<T extends RowWithId>(list: T[], id: string): T[] {
  return list.filter((r) => r.id !== id);
}

interface RealtimeBinding {
  queryKey: readonly string[];
  table: string;
  tenantId: string;
}

/**
 * Subscribes to realtime changes for the given tables using a SINGLE shared
 * channel, keeping the React Query cache in sync. Returns a cleanup fn.
 *
 * Using one channel instead of N channels reduces the number of concurrent
 * WebSocket connections to Supabase, which is critical with 30+ users.
 */
export function subscribeRealtime(
  queryClient: QueryClient,
  bindings: RealtimeBinding[],
): () => void {
  if (bindings.length === 0) return () => {};

  const channelName = `rt_shared_${bindings.map((b) => b.table).join("_")}`;

  let ch = supabase.channel(channelName);

  for (const { queryKey, table, tenantId } of bindings) {
    const filter = `tenant_id=eq.${tenantId}`;
    ch = ch
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table, filter },
        (payload: { new: RowWithId }) => {
          queryClient.setQueryData<RowWithId[]>(queryKey, (prev) =>
            prev ? upsertRow(prev, payload.new) : [payload.new],
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table, filter },
        (payload: { new: RowWithId }) => {
          queryClient.setQueryData<RowWithId[]>(queryKey, (prev) =>
            prev ? upsertRow(prev, payload.new) : [payload.new],
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table, filter },
        (payload: { old: { id?: string } }) => {
          const oldId = payload.old?.id;
          if (oldId)
            queryClient.setQueryData<RowWithId[]>(queryKey, (prev) =>
              prev ? deleteRow(prev, oldId) : [],
            );
        },
      );
  }

  ch.subscribe();

  return () => {
    supabase.removeChannel(ch);
  };
}
