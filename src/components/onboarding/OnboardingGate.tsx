"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { getInterestStatus } from "@/lib/api";
import { KC_AUTH_CODE_KEY } from "@/lib/kingschat";
import {
  hasSeenWelcome,
  wasInterestsDismissedThisSession,
} from "@/lib/onboarding";

/**
 * Decides, once the session is known, whether the visitor should see an
 * onboarding screen first. Port of the app's AppGate:
 *
 *  - signed out and never seen the welcome screen in this browser -> welcome
 *  - signed in with no interests saved (and not skipped this session) -> picker
 *
 * Only Home is gated. A shared link that opens straight into a video,
 * channel or clip is left alone, and a KingsChat launch that is still signing
 * the user in is never interrupted.
 */
export function OnboardingGate() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { token, isLoggedIn, loading } = useAuth();
  const handledRef = useRef<string | null>(null);

  // Read before AppShell strips it: child effects run before the parent's.
  const authPendingRef = useRef<boolean | null>(null);
  if (authPendingRef.current === null && typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    let stored = false;
    try {
      stored = Boolean(sessionStorage.getItem(KC_AUTH_CODE_KEY));
    } catch {
      stored = false;
    }
    authPendingRef.current = Boolean(params.get("authCode") || params.get("code") || stored);
  }

  // A KingsChat launch moves on to /auth/callback straight away. Once the app
  // has navigated anywhere, that launch is over and Home is gated as normal.
  const initialPathRef = useRef(pathname);
  useEffect(() => {
    if (pathname !== initialPathRef.current) authPendingRef.current = false;
  }, [pathname]);

  const atEntry = pathname === "/";

  const status = useQuery({
    queryKey: ["interest-status", token],
    queryFn: () => getInterestStatus(token),
    enabled: isLoggedIn,
    // Only the picker changes this, and it writes the result into the cache.
    staleTime: Infinity,
    retry: 1,
  });

  useEffect(() => {
    if (loading || !atEntry || authPendingRef.current) return;

    if (!isLoggedIn) {
      if (handledRef.current === "welcome") return;
      if (!hasSeenWelcome()) {
        handledRef.current = "welcome";
        router.replace("/welcome");
      }
      return;
    }

    if (status.isPending) return;

    // A failed status fetch leaves data undefined and must never trap the
    // user, so only a definite "nothing selected" prompts.
    const needsInterests = status.data ? status.data.selected_count === 0 : false;

    if (needsInterests && !wasInterestsDismissedThisSession()) {
      if (handledRef.current === token) return;
      handledRef.current = token;
      // Pushed over Home rather than replacing it, so "Skip for now" is an
      // instant back navigation.
      router.push("/interests?from=gate");
    }
  }, [loading, atEntry, isLoggedIn, token, status.isPending, status.data, router]);

  return null;
}
