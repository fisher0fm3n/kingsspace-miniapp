"use client";

import {
  QueryClient,
  QueryClientProvider,
  dehydrate,
  hydrate,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";

// Persisted-cache config.
//
// The React Query cache is in-memory, so a reload/relaunch refetches everything.
// We persist ONLY public feed queries (home, news, collections, clips) to
// localStorage so returning to the app renders instantly from cache while it
// revalidates in the background. User- or token-scoped queries (profile,
// channel, watch, subscriptions, …) are deliberately NOT persisted — no private
// data touches storage and there's no cross-account bleed.
const CACHE_KEY = "kingsspace.query-cache.v1";
const CACHE_TTL = 1000 * 60 * 60 * 6; // 6h
const PERSIST_PREFIXES = ["home", "news", "collections", "collection", "clips"];

function isPublicQueryKey(key: readonly unknown[]): boolean {
  return typeof key[0] === "string" && PERSIST_PREFIXES.includes(key[0]);
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,
            gcTime: 1000 * 60 * 60 * 24,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  // Hydrate once on mount from a fresh-enough snapshot.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed?.savedAt &&
          Date.now() - parsed.savedAt < CACHE_TTL &&
          parsed.state
        ) {
          hydrate(client, parsed.state);
        } else {
          localStorage.removeItem(CACHE_KEY);
        }
      }
    } catch {
      /* corrupt/unavailable — ignore */
    }
  }, [client]);

  // Persist the public feed queries on cache changes (debounced).
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const save = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          const state = dehydrate(client, {
            shouldDehydrateQuery: (q) =>
              q.state.status === "success" && isPublicQueryKey(q.queryKey),
          });
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ savedAt: Date.now(), state }),
          );
        } catch {
          /* quota / serialization — skip this write */
        }
      }, 1000);
    };
    const unsub = client.getQueryCache().subscribe(save);
    return () => {
      if (timer) clearTimeout(timer);
      unsub();
    };
  }, [client]);

  return (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}
