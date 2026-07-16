// KingsChat OAuth (web). Mirrors services/kingschat.ts from the RN app.
//
// SECURITY NOTES (KingsChat Services onboarding, authRequired == true):
// - The temporary authCode passed on the launch URL is exchanged SERVER-SIDE
//   only (via /api/kingschat/token). It must never be logged, never re-embedded
//   in a URL, and must be stripped from the address bar on success AND failure
//   (see src/lib/scrub.ts).
// - Auth codes, access tokens and refresh tokens must never appear in
//   console output, error messages, or telemetry.

// KingsSpace's developer client ID — the same one /api/kingschat/token uses to
// exchange the authCode. clientId is public (it only identifies the app).
export const KINGSCHAT_CLIENT_ID = "15c51472-34fc-4d36-ba2c-907702b19bbf";
export const KINGSCHAT_AUTH_ENDPOINT =
  "https://accounts.kingschat.online/log-in";

// sessionStorage key used to hand the launch authCode from the entry page to
// /auth/callback without putting it back on a URL.
export const KC_AUTH_CODE_KEY = "kingsspace.kc_auth_code";

// Public base URL of this app. Set NEXT_PUBLIC_APP_URL per environment
// (e.g. http://localhost:3200 locally, https://your-domain.com in prod) so the
// OAuth redirect_uri always matches what's registered in the KingsChat app.
// Falls back to the browser's current origin when unset.
export function getAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

// Manual login uses the new KingsChat accounts URL:
//   https://accounts.kingschat.online/log-in?clientId=<developer client id>
// No redirect_uri/scopes params — the redirect is registered against the
// clientId in the KingsChat developer portal. After login, KingsChat sends the
// user back with an `authCode` on the URL, which flows through the same path
// as a KingsChat superapp launch (AppShell → /auth/callback →
// /api/kingschat/token).
export function buildAuthorizeUrl(): string {
  const params = new URLSearchParams({ clientId: KINGSCHAT_CLIENT_ID });
  return `${KINGSCHAT_AUTH_ENDPOINT}?${params.toString()}`;
}

// Exchange a KingsChat authCode (passed on the launch URL) for a KingsSpace
// session via our route, which forwards the token to /kingschat/user.
export async function exchangeKingsChatAuthCode(code: string) {
  const res = await fetch("/api/kingschat/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const json = await res.json();
  if (!json?.status) throw new Error(json?.message || "KingsChat login failed");
  return json as { token: string; user: Record<string, unknown> };
}

// Complete a manual "Continue with KingsChat" login: accounts.kingsch.at
// POSTed the tokens to /api/kingschat/callback, which parked them in httpOnly
// cookies. /api/kingschat/exchange reads them from those cookies, so no token
// ever touches client-side code or a URL.
export async function exchangeKingsChatPostedTokens() {
  const res = await fetch("/api/kingschat/exchange", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const json = await res.json();
  if (!json?.status) throw new Error(json?.message || "KingsChat login failed");
  return json as { token: string; user: Record<string, unknown> };
}

// Exchange a KingsChat access token for a KingsSpace session via our route.
export async function exchangeKingsChatToken(
  accessToken: string,
  refreshToken?: string,
) {
  const res = await fetch("/api/kingschat/exchange", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken, refreshToken }),
  });
  const json = await res.json();
  if (!json?.status) throw new Error(json?.message || "KingsChat login failed");
  return json as { token: string; user: Record<string, unknown> };
}
