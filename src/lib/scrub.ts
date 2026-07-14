// Scrubbing helpers for auth secrets.
//
// KingsChat launches the miniapp with a temporary `authCode` on the URL, and
// the OAuth flow can put tokens in the URL fragment. None of these values may
// ever reach logs, error messages, telemetry, or third parties. Every place
// that reports errors or (in the future) sends telemetry MUST pass URLs and
// payloads through these helpers first.

const SENSITIVE_PARAMS = [
  "authcode",
  "code",
  "access_token",
  "accesstoken",
  "refresh_token",
  "refreshtoken",
  "id_token",
  "token",
];

function isSensitiveParam(name: string): boolean {
  return SENSITIVE_PARAMS.includes(name.toLowerCase());
}

function scrubParams(params: URLSearchParams): boolean {
  let changed = false;
  for (const key of Array.from(params.keys())) {
    if (isSensitiveParam(key)) {
      params.set(key, "REDACTED");
      changed = true;
    }
  }
  return changed;
}

/** Returns `url` with any auth code / token query or fragment params redacted. */
export function scrubUrl(url: string): string {
  try {
    const u = new URL(url, "http://localhost");
    scrubParams(u.searchParams);
    if (u.hash.length > 1) {
      const hashParams = new URLSearchParams(u.hash.slice(1));
      if (scrubParams(hashParams)) u.hash = hashParams.toString();
    }
    return url.startsWith("http") ? u.toString() : u.pathname + u.search + u.hash;
  } catch {
    // Unparseable — redact wholesale rather than risk leaking.
    return "REDACTED_URL";
  }
}

/** Redacts sensitive keys in an arbitrary payload (for telemetry/error reporting). */
export function scrubObject<T>(value: T): T {
  if (typeof value === "string") return scrubUrl(value) as unknown as T;
  if (Array.isArray(value)) return value.map(scrubObject) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = isSensitiveParam(k) ? "REDACTED" : scrubObject(v);
    }
    return out as T;
  }
  return value;
}

/**
 * Removes auth code / token params from the current browser URL (query AND
 * fragment) without reloading, so secrets don't linger in the address bar,
 * browser history, or referrer headers. Call before doing anything else with
 * a launch/callback URL — on failure paths too.
 */
export function stripAuthParamsFromLocation(): void {
  if (typeof window === "undefined") return;
  const { pathname, search, hash } = window.location;

  const query = new URLSearchParams(search);
  let changed = false;
  for (const key of Array.from(query.keys())) {
    if (isSensitiveParam(key)) {
      query.delete(key);
      changed = true;
    }
  }

  let nextHash = hash;
  if (hash.length > 1) {
    const hashParams = new URLSearchParams(hash.slice(1));
    let hashChanged = false;
    for (const key of Array.from(hashParams.keys())) {
      if (isSensitiveParam(key)) {
        hashParams.delete(key);
        hashChanged = true;
      }
    }
    if (hashChanged) {
      const rest = hashParams.toString();
      nextHash = rest ? `#${rest}` : "";
      changed = true;
    }
  }

  if (!changed) return;
  const rest = query.toString();
  window.history.replaceState(
    window.history.state,
    "",
    pathname + (rest ? `?${rest}` : "") + nextHash,
  );
}
