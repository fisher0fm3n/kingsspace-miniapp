/**
 * Clip ids this browser has already watched, most recent first.
 *
 * The clips feed sends these to the API as `exclude` so the next page is
 * built from what the viewer has not seen. Signed-in viewers also get
 * server-side history from their taste profile, but that only covers views
 * the server recorded; this list is what stops a guest, or a fresh session,
 * from reopening Clips to the same ten videos every time. Port of the app's
 * services/clipHistory.ts, on localStorage instead of SecureStore.
 */

const STORAGE_KEY = "kingsspace.clips.viewed";

/** Enough to cover a long session while keeping the request body small. */
export const CLIP_HISTORY_LIMIT = 200;

let cache: string[] | null = null;
let writeTimer: ReturnType<typeof setTimeout> | null = null;

function persist() {
  if (writeTimer) clearTimeout(writeTimer);
  // Views arrive one per swipe; batching them keeps writes off the swipe path.
  writeTimer = setTimeout(() => {
    writeTimer = null;
    try {
      localStorage.setItem(STORAGE_KEY, (cache ?? []).join(","));
    } catch {
      /* storage full or blocked - history just won't persist */
    }
  }, 800);
}

/** Loads the list once per page load; later calls return the cached copy. */
export function loadViewedClipIds(): string[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cache = raw ? raw.split(",").filter(Boolean) : [];
  } catch {
    cache = [];
  }
  return cache;
}

export function rememberViewedClip(id: string | number) {
  const key = String(id);
  if (!key || key === "undefined" || key === "null") return;

  const current = loadViewedClipIds();
  // Re-watching moves the clip to the front rather than duplicating it, so the
  // cap always drops the least recently seen.
  cache = [key, ...current.filter((item) => item !== key)].slice(
    0,
    CLIP_HISTORY_LIMIT,
  );
  persist();
}
