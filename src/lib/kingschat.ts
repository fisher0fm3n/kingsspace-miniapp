// KingsChat OAuth (web). Mirrors services/kingschat.ts from the RN app.
// The RN app used clientId "com.kingschat", scope "conference_calls" against
// accounts.kingsch.at. For web we use the implicit flow and read the returned
// access token from the redirect URL fragment, then exchange it server-side.

export const KINGSCHAT_CLIENT_ID = "com.kingschat";
export const KINGSCHAT_SCOPES = ["conference_calls"];
export const KINGSCHAT_AUTH_ENDPOINT = "https://accounts.kingsch.at/";

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

export function getRedirectUri(): string {
  const base = getAppUrl();
  return base ? `${base}/auth/callback` : "";
}

export function buildAuthorizeUrl(): string {
  const params = new URLSearchParams({
    client_id: KINGSCHAT_CLIENT_ID,
    scopes: JSON.stringify(KINGSCHAT_SCOPES),
    redirect_uri: getRedirectUri(),
    response_type: "token",
  });
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
