"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  KC_AUTH_CODE_KEY,
  exchangeKingsChatAuthCode,
  exchangeKingsChatPostedTokens,
  exchangeKingsChatToken,
} from "@/lib/kingschat";
import { stripAuthParamsFromLocation } from "@/lib/scrub";
import { Spinner } from "@/components/Skeletons";
import type { CurrentUser } from "@/lib/types";

function readRedirectPayload(
  query: URLSearchParams,
  hash: URLSearchParams,
): Record<string, unknown> | null {
  const candidates = [
    query.get("payload"),
    query.get("data"),
    query.get("result"),
    query.get("response"),
    hash.get("payload"),
    hash.get("data"),
    hash.get("result"),
    hash.get("response"),
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const trimmed = candidate.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // Ignore non-JSON payloads and fall through to other fallbacks.
    }
  }

  return null;
}

export default function AuthCallback() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    const payload = readRedirectPayload(query, hash);

    // Preferred handoff: the entry page stashes the launch authCode in
    // sessionStorage so it never reappears on a URL. Consume it immediately.
    let authCode = "";
    try {
      authCode = sessionStorage.getItem(KC_AUTH_CODE_KEY) || "";
      if (authCode) sessionStorage.removeItem(KC_AUTH_CODE_KEY);
    } catch {
      /* sessionStorage unavailable */
    }

    // Fallback: authCode directly on the callback URL (KingsChat may launch
    // straight into this route), or a legacy token-fragment response.
    if (!authCode) authCode = query.get("authCode") || query.get("code") || "";
    if (!authCode && typeof payload?.code === "string") {
      authCode = payload.code;
    }

    const accessToken =
      hash.get("access_token") ||
      hash.get("accessToken") ||
      query.get("access_token") ||
      query.get("accessToken") ||
      (typeof payload?.accessToken === "string" ? payload.accessToken : "") ||
      (typeof payload?.access_token === "string" ? payload.access_token : "");
    const refreshToken =
      hash.get("refresh_token") ||
      query.get("refresh_token") ||
      (typeof payload?.refreshToken === "string"
        ? payload.refreshToken
        : undefined) ||
      (typeof payload?.refresh_token === "string"
        ? payload.refresh_token
        : undefined);

    // Manual login: accounts.kingsch.at POSTed the tokens to
    // /api/kingschat/callback, which parked them in httpOnly cookies and
    // redirected here with kcpost=1. Exchange reads the cookies server-side.
    const postedFlow = query.get("kcpost") === "1";

    // SECURITY: scrub the address bar before anything else runs, so the code/
    // token is out of the URL, history, and referrers on success AND failure.
    stripAuthParamsFromLocation();

    const exchange = authCode
      ? exchangeKingsChatAuthCode(authCode)
      : accessToken
        ? exchangeKingsChatToken(accessToken, refreshToken)
        : postedFlow
          ? exchangeKingsChatPostedTokens()
          : null;

    if (!exchange) {
      setError("No authCode or access token returned from KingsChat.");
      return;
    }

    exchange
      .then(({ token, user }) => {
        setSession(token, { ...(user as CurrentUser), token });

        if (window.opener && window.opener !== window) {
          window.opener.postMessage(
            { type: "kingschat-login-success", token, user },
            window.location.origin,
          );
          window.close();
        } else {
          router.replace("/profile");
        }
      })
      .catch((err) => setError(err.message));
  }, [router, setSession]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      {error ? (
        <>
          <p className="text-error">{error}</p>
          <button
            onClick={() => router.replace("/login")}
            className="rounded-lg bg-primary px-5 py-2 font-bold text-white"
          >
            Back to login
          </button>
        </>
      ) : (
        <>
          <Spinner size={30} />
          <p className="text-subtext">Signing you in…</p>
        </>
      )}
    </div>
  );
}
