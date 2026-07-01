"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  exchangeKingsChatAuthCode,
  exchangeKingsChatToken,
} from "@/lib/kingschat";
import { Spinner } from "@/components/Skeletons";
import type { CurrentUser } from "@/lib/types";

export default function AuthCallback() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);

    // New flow: KingsChat launches the miniapp with an `authCode` on the URL.
    // Exchange it for KingsChat tokens, which are forwarded to /kingschat/user.
    const authCode = query.get("authCode") || query.get("code");

    // Legacy implicit flow: the access token is returned in the URL fragment.
    const accessToken =
      hash.get("access_token") ||
      hash.get("accessToken") ||
      query.get("access_token") ||
      query.get("accessToken");
    const refreshToken =
      hash.get("refresh_token") || query.get("refresh_token") || undefined;

    const exchange = authCode
      ? exchangeKingsChatAuthCode(authCode)
      : accessToken
        ? exchangeKingsChatToken(accessToken, refreshToken)
        : null;

    if (!exchange) {
      setError("No authCode or access token returned from KingsChat.");
      return;
    }

    exchange
      .then(({ token, user }) => {
        setSession(token, { ...(user as CurrentUser), token });
        router.replace("/profile");
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
