"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  formatEspees,
  getEarnings,
  requestPayout,
  type ChannelEarnings,
} from "@/lib/api";
import { clean } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { Spinner } from "@/components/Skeletons";
import { EmptyState } from "@/components/EmptyState";
import { TvIcon } from "@/components/Icons";

/**
 * What ads earned the creator, per channel, with a withdrawal to the
 * channel's Espees wallet. Port of the app's Ad Earnings screen; withdrawals
 * need no PIN - the money goes to the wallet already on the channel.
 */
export default function AdEarningsPage() {
  const router = useRouter();
  const { token, isLoggedIn, loading } = useAuth();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isLoggedIn) router.replace("/login");
  }, [loading, isLoggedIn, router]);

  const { data: summary, isLoading, error, refetch } = useQuery({
    queryKey: ["earnings", token],
    queryFn: () => getEarnings(token),
    enabled: isLoggedIn,
    retry: false,
  });

  const onPayout = async (channel: ChannelEarnings) => {
    setBusyId(channel.channel_id);
    setNotice(null);
    setActionError(null);
    try {
      const res = await requestPayout(token, channel.channel_id);
      setNotice(res?.message || "The Espees are on their way to your channel wallet.");
      await refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't request the payout.");
    } finally {
      setBusyId(null);
    }
  };

  const channels = summary?.channels ?? [];

  return (
    <div className="pb-10">
      <PageHeader title="Ad Earnings" />

      {loading || isLoading ? (
        <div className="flex justify-center p-10">
          <Spinner />
        </div>
      ) : error ? (
        <div className="py-6">
          <EmptyState
            title="Couldn't load earnings"
            body={(error as Error).message}
            action={{ label: "Try again", onClick: () => refetch() }}
          />
        </div>
      ) : (
        <div className="space-y-3.5 p-4">
          {notice && (
            <p className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
              {notice}
            </p>
          )}
          {actionError && (
            <p className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
              {actionError}
            </p>
          )}

          <div className="rounded-2xl border border-border bg-card p-[18px]">
            <p className="text-[13px] font-medium text-subtext">Available to withdraw</p>
            <p className="mt-1.5 text-[32px] font-bold leading-tight">
              {formatEspees(summary?.total_balance_micros)}
              <span className="text-base font-medium text-subtext"> Espees</span>
            </p>
            {summary && (
              <p className="mt-2.5 text-[13px] leading-5 text-subtext">
                You earn {summary.creator_share_percent}% of every ad that plays
                against your videos. Minimum payout is {summary.min_payout_display}{" "}
                Espees.
              </p>
            )}
          </div>

          {channels.length === 0 ? (
            <EmptyState
              icon={<TvIcon size={22} />}
              title="No channels yet"
              body="Ad earnings show up here once you have a channel with videos."
              action={{ label: "Create a channel", href: "/studio/createchannel" }}
            />
          ) : (
            channels.map((channel) => {
              const canPayout =
                channel.balance_micros >= (summary?.min_payout_micros ?? 0) &&
                channel.has_wallet &&
                channel.pending_payout_micros === 0;
              const busy = busyId === channel.channel_id;

              return (
                <div
                  key={channel.channel_id}
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  <p className="truncate text-base font-bold">
                    {clean(channel.channel_name)}
                  </p>

                  <div className="mt-3.5 grid grid-cols-3 gap-3">
                    {(
                      [
                        ["Available", channel.balance_micros],
                        ["Earned all time", channel.lifetime_earned_micros],
                        ["Paid out", channel.lifetime_paid_micros],
                      ] as const
                    ).map(([label, value]) => (
                      <div key={label}>
                        <p className="text-[15px] font-bold">{formatEspees(value)}</p>
                        <p className="mt-0.5 text-[11px] text-subtext">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Say why the button is unavailable rather than just
                      disabling it. */}
                  {!channel.has_wallet ? (
                    <p className="mt-3 text-xs font-medium text-warning">
                      Add an Espees wallet to this channel before you can withdraw.
                    </p>
                  ) : channel.pending_payout_micros > 0 ? (
                    <p className="mt-3 text-xs font-medium text-primary">
                      Withdrawal of {formatEspees(channel.pending_payout_micros)} Espees
                      is being sent.
                    </p>
                  ) : !canPayout ? (
                    <p className="mt-3 text-xs font-medium text-subtext">
                      {summary?.min_payout_display} Espees minimum to withdraw.
                    </p>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => onPayout(channel)}
                    disabled={!canPayout || busy}
                    className="mt-3.5 flex h-11 w-full items-center justify-center rounded-full text-sm font-bold disabled:opacity-60"
                    style={{
                      background: canPayout ? "var(--primary)" : "var(--background)",
                      color: canPayout ? "#fff" : "var(--subtext)",
                    }}
                  >
                    {busy ? <Spinner size={16} /> : "Withdraw"}
                  </button>
                </div>
              );
            })
          )}

          <Link href="/studio" className="block pt-2 text-center text-sm font-semibold text-primary">
            Back to Creator Dashboard
          </Link>
        </div>
      )}
    </div>
  );
}
