"use client";

// User-facing "Block user" capability (KingsChat Services onboarding
// requirement). Blocking a user hides their comments; blocking a channel
// hides its videos from feeds.
//
// Storage model: the block list is authoritative on the CeFlix backend
// (/user/block, /user/unblock, /user/blocks) and mirrored in localStorage as
// an offline/optimistic cache. `isBlocked`/`getBlocked` read the synchronous
// local cache so rendering stays instant and works while signed-out; writes
// update the cache immediately AND write through to the API when a token is
// available; `syncBlockedFromServer` hydrates the cache from the server on
// login. See docs/MODERATION.md.

import { blockContent, getBlockedContent, unblockContent } from "./api";

const KEY = "kingsspace.blocked";

export type BlockedKind = "user" | "channel";

export type BlockedEntry = {
  kind: BlockedKind;
  id: string;
  name?: string;
  blockedAt: number;
};

function read(): BlockedEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function write(list: BlockedEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new Event("kingsspace:blocklist"));
  } catch {
    /* storage unavailable */
  }
}

/** Stable identity for a comment author across the varying API field names. */
export function commentAuthorId(c: {
  userID?: string | number;
  user_id?: string | number;
  username?: string;
  name?: string;
  fname?: string;
}): string {
  const id = c.userID ?? c.user_id ?? c.username ?? c.name ?? c.fname ?? "";
  return String(id).trim();
}

export function commentAuthorName(c: {
  username?: string;
  name?: string;
  fname?: string;
}): string {
  return String(c.name || c.username || c.fname || "this user").trim();
}

export function getBlocked(): BlockedEntry[] {
  return read();
}

export function isBlocked(
  kind: BlockedKind,
  id: string | number | undefined | null,
): boolean {
  const key = String(id ?? "").trim();
  if (!key) return false;
  return read().some((b) => b.kind === kind && b.id === key);
}

export function block(
  kind: BlockedKind,
  id: string | number,
  name?: string,
  token?: string,
) {
  const key = String(id).trim();
  if (!key) return;
  const list = read();
  if (!list.some((b) => b.kind === kind && b.id === key)) {
    write([...list, { kind, id: key, name, blockedAt: Date.now() }]);
  }
  // Write through to the server (best-effort; local cache already updated).
  if (token) blockContent(kind, key, token).catch(() => {});
}

export function unblock(
  kind: BlockedKind,
  id: string | number,
  token?: string,
) {
  const key = String(id).trim();
  write(read().filter((b) => !(b.kind === kind && b.id === key)));
  if (token) unblockContent(kind, key, token).catch(() => {});
}

/**
 * Hydrate the local cache from the server (call on login). The server is
 * authoritative for signed-in users; names are preserved from the existing
 * local cache where the entry is already known.
 */
export async function syncBlockedFromServer(token: string): Promise<void> {
  if (!token) return;
  try {
    const rows = await getBlockedContent(token);
    const local = read();
    const merged: BlockedEntry[] = rows.map((r: any) => {
      const kind: BlockedKind = r.blocked_kind === "channel" ? "channel" : "user";
      const id = String(r.blocked_id ?? "").trim();
      const existing = local.find((b) => b.kind === kind && b.id === id);
      const ts = r.created_at ? Date.parse(r.created_at) : NaN;
      return {
        kind,
        id,
        name: existing?.name,
        blockedAt: Number.isNaN(ts) ? existing?.blockedAt ?? Date.now() : ts,
      };
    });
    write(merged);
  } catch {
    /* offline / unauthenticated — keep the local cache as-is */
  }
}
