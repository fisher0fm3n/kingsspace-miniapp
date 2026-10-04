"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  acceptWatchEarnTerms,
  getWatchEarnTerms,
  watchEarnTermsKey,
  type WatchEarnTermsState,
} from "@/lib/watchEarn";
import { Spinner } from "@/components/Skeletons";
import { CoinIcon } from "@/components/Icons";

/*
 * Bottom sheet shown when `session/start` answers `terms_required` for a
 * signed-in viewer: the server's one-paragraph summary, the "numbers can
 * change" notice and a link to the full rules. Watch & Earn is opt-in -
 * nothing is tracked or credited until they accept. "Accept and join" posts
 * the acceptance and the page then starts the session; "Not now" closes it
 * for the visit and leaves the card's invitation showing.
 */
export function TermsSheet({
  token,
  onAccepted,
  onClose,
}: {
  token: string;
  onAccepted: (terms: WatchEarnTermsState) => void;
  onClose: () => void;
}) {
  const { data: terms, isLoading } = useQuery({
    queryKey: watchEarnTermsKey,
    queryFn: getWatchEarnTerms,
    staleTime: 5 * 60_000,
    retry: false,
  });
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = async () => {
    setAccepting(true);
    setError(null);
    try {
      const result = await acceptWatchEarnTerms(token);
      onAccepted(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that. Try again.");
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="earn-terms-title"
        className="relative z-10 w-full max-w-[480px] rounded-t-2xl border-t border-border bg-background p-4 pb-8"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
            <CoinIcon size={22} aria-hidden />
          </span>
          <h3 id="earn-terms-title" className="text-lg font-bold">
            Watch &amp; Earn rules
          </h3>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <>
            <p className="mt-3 text-sm leading-6">
              {terms?.summary ??
                "Earn Esport for watching and engaging with videos, and swap it for Espees."}
            </p>
            {terms?.notice && (
              <p className="mt-3 rounded-xl border border-warning/40 bg-warning/10 px-3.5 py-3 text-[12px] leading-5 text-warning">
                {terms.notice}
              </p>
            )}
            <Link
              href="/wallet/terms"
              className="mt-3 inline-block text-sm font-semibold text-primary"
            >
              Read the full rules ›
            </Link>
          </>
        )}

        {error && (
          <p className="mt-3 rounded-xl border border-error/30 bg-error/10 px-3.5 py-2.5 text-sm text-error">
            {error}
          </p>
        )}

        <p className="mt-4 text-[12px] leading-5 text-subtext">
          You are not part of Watch &amp; Earn, and nothing is tracked or credited, until you
          accept.
        </p>

        <div className="mt-3 space-y-2.5">
          <button
            type="button"
            onClick={accept}
            disabled={accepting || isLoading}
            className="flex h-12 w-full items-center justify-center rounded-full bg-primary font-bold text-white disabled:opacity-60"
          >
            {accepting ? <Spinner size={18} /> : "Accept and join Watch & Earn"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={accepting}
            className="flex h-12 w-full items-center justify-center rounded-full border border-border font-bold"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
