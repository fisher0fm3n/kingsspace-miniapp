"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  acceptWatchEarnTerms,
  getWatchEarnTerms,
  getWatchEarnWallet,
  watchEarnTermsKey,
  watchEarnWalletKey,
} from "@/lib/watchEarn";
import { PageHeader } from "@/components/PageHeader";
import { Spinner } from "@/components/Skeletons";
import { EmptyState } from "@/components/EmptyState";
import { CoinIcon } from "@/components/Icons";

/*
 * The Watch & Earn rules, rendered from `GET watch-earn/terms` so what the
 * viewer reads is what the server enforces. Watch & Earn is opt-in: a
 * signed-in viewer joins by accepting the current version here (or in the
 * watch page's sheet); signed-out visitors can read it. Accepting here just
 * shows the accepted state - the next video they open starts a session.
 */
export default function WatchEarnTermsPage() {
  const { token, isLoggedIn } = useAuth();
  const queryClient = useQueryClient();

  const { data: terms, isLoading, error, refetch } = useQuery({
    queryKey: watchEarnTermsKey,
    queryFn: getWatchEarnTerms,
    staleTime: 5 * 60_000,
    retry: false,
  });

  // Whether this version is already accepted comes with the wallet.
  const { data: wallet } = useQuery({
    queryKey: watchEarnWalletKey(token),
    queryFn: () => getWatchEarnWallet(token),
    enabled: isLoggedIn,
    retry: false,
    staleTime: 1000 * 30,
  });

  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const alreadyAccepted =
    accepted ||
    Boolean(
      wallet?.terms?.accepted && terms && wallet.terms.version >= terms.version,
    );

  const accept = async () => {
    setAccepting(true);
    setAcceptError(null);
    try {
      await acceptWatchEarnTerms(token);
      setAccepted(true);
      queryClient.invalidateQueries({ queryKey: watchEarnWalletKey(token) });
    } catch (err) {
      setAcceptError(err instanceof Error ? err.message : "Couldn't save that. Try again.");
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div className="pb-10">
      <PageHeader title="Rules & terms" />

      {isLoading ? (
        <div className="flex justify-center p-10">
          <Spinner />
        </div>
      ) : error || !terms ? (
        <div className="py-6">
          <EmptyState
            icon={<CoinIcon size={22} />}
            title="Couldn't load the rules"
            body={(error as Error)?.message || "Please try again."}
            action={{ label: "Try again", onClick: () => refetch() }}
          />
        </div>
      ) : (
        <div className="px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
              <CoinIcon size={24} aria-hidden />
            </span>
            <div className="min-w-0">
              <h1 className="text-lg font-bold leading-tight">{terms.title}</h1>
              <p className="mt-0.5 text-xs text-subtext">Version {terms.version}</p>
            </div>
          </div>

          <p className="mt-4 text-[15px] leading-6">{terms.summary}</p>

          <div className="mt-4 rounded-xl border border-warning/50 bg-warning/10 px-4 py-3">
            <p className="text-[12px] font-bold uppercase tracking-wide text-warning">
              These numbers can change
            </p>
            <p className="mt-1 text-[13px] leading-5 text-warning">{terms.notice}</p>
          </div>

          {terms.sections.map((section) => (
            <section key={section.title} className="mt-6">
              <h2 className="text-base font-bold">{section.title}</h2>
              <ul className="mt-2 space-y-1.5 text-sm leading-6 text-subtext">
                {section.items.map((item, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span aria-hidden className="mt-[11px] h-1 w-1 shrink-0 rounded-full bg-subtext" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <div className="mt-8 border-t border-border pt-5">
            {acceptError && (
              <p className="mb-3 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
                {acceptError}
              </p>
            )}
            {!isLoggedIn ? (
              <Link
                href="/login"
                className="flex h-12 w-full items-center justify-center rounded-full bg-primary font-bold text-white"
              >
                Sign in to start earning
              </Link>
            ) : alreadyAccepted ? (
              <p className="flex items-center justify-center gap-2 rounded-full border border-success/40 bg-success/10 py-3 text-sm font-bold text-success">
                You&apos;ve accepted version {terms.version}
              </p>
            ) : (
              <>
                <p className="mb-3 text-[13px] leading-5 text-subtext">
                  You are not part of Watch &amp; Earn, and nothing is tracked or credited, until
                  you accept.
                </p>
                <button
                  type="button"
                  onClick={accept}
                  disabled={accepting}
                  className="flex h-12 w-full items-center justify-center rounded-full bg-primary font-bold text-white disabled:opacity-60"
                >
                  {accepting ? <Spinner size={18} /> : "Accept and join Watch & Earn"}
                </button>
              </>
            )}
            <Link
              href="/wallet"
              className="mt-3 block text-center text-sm font-semibold text-primary"
            >
              Back to your wallet ›
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
