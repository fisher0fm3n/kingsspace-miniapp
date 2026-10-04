"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  ESPEES_WALLET_ADDRESS_RE,
  formatEspeesFromEsport,
  formatEsport,
  formatReleaseDate,
  getWatchEarnWallet,
  roundEsport,
  setWatchEarnWalletAddress,
  swapWatchEarnEsport,
  watchEarnWalletKey,
  type WatchEarnConfig,
  type WatchEarnEntry,
  type WatchEarnSwap,
  type WatchEarnWallet,
} from "@/lib/watchEarn";
import { timeAgo } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { Spinner } from "@/components/Skeletons";
import { EmptyState } from "@/components/EmptyState";
import { CoinIcon, WalletIcon } from "@/components/Icons";

/*
 * Watch & Earn wallet: the Esport a viewer has earned for verified watching
 * and engagement, today's allowance split in two, this month's limit, and
 * the swap to Espees (held for review before it pays). Every number comes
 * from the wallet response / config; nothing here is hard-coded.
 */

export default function WalletPage() {
  const { token, isLoggedIn, loading } = useAuth();

  const {
    data: wallet,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: watchEarnWalletKey(token),
    queryFn: () => getWatchEarnWallet(token),
    enabled: isLoggedIn,
    retry: false,
    staleTime: 1000 * 30,
  });

  const header = (
    <PageHeader
      title="Watch & Earn"
      right={
        <Link
          href="/wallet/terms"
          className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-bold text-primary"
        >
          Rules &amp; terms
        </Link>
      }
    />
  );

  if (loading)
    return (
      <div>
        {header}
        <div className="flex justify-center p-10">
          <Spinner />
        </div>
      </div>
    );

  if (!isLoggedIn)
    return (
      <div>
        {header}
        <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-card text-primary">
            <CoinIcon size={32} />
          </span>
          <h1 className="text-xl font-bold">Earn Esport as you watch</h1>
          <p className="max-w-xs text-sm text-subtext">
            Sign in to earn Esport for the videos you watch, like, comment on
            and share, and swap it for Espees.
          </p>
          <Link
            href="/login"
            className="rounded-xl bg-primary px-6 py-3 font-bold text-white"
          >
            Log in
          </Link>
          <Link href="/wallet/terms" className="text-sm font-semibold text-primary">
            Read the rules ›
          </Link>
        </div>
      </div>
    );

  return (
    <div className="pb-10">
      {header}

      {isLoading ? (
        <div className="flex justify-center p-10">
          <Spinner />
        </div>
      ) : error || !wallet ? (
        <div className="py-6">
          <EmptyState
            icon={<CoinIcon size={22} />}
            title="Couldn't load your wallet"
            body={(error as Error)?.message || "Please try again."}
            action={{ label: "Try again", onClick: () => refetch() }}
          />
        </div>
      ) : (
        <WalletBody wallet={wallet} token={token} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function pct(value: number, cap: number): number {
  return cap > 0 ? Math.min(100, Math.max(0, (value / cap) * 100)) : 0;
}

function WalletBody({ wallet, token }: { wallet: WatchEarnWallet; token: string }) {
  const perEspee = Math.max(1, wallet.swap.esport_per_espee || wallet.config.esport_per_espee);
  const today = wallet.today;
  // An API still on the previous ruleset sends no `month`; show it as empty.
  const month = wallet.month ?? {
    esport: 0,
    cap: Number(wallet.config.monthly_cap_esport || 0),
    remaining: Number(wallet.config.monthly_cap_esport || 0),
  };
  const nextPct = Math.min(100, Math.max(0, wallet.espees.next_progress * 100));
  const termsPending = wallet.terms && !wallet.terms.accepted;

  return (
    <div className="space-y-3.5 p-4">
      {/* ---------------------------------------------------------- balance */}
      <div className="rounded-2xl border border-border bg-card p-[18px]">
        <p className="flex items-center gap-1.5 text-[13px] font-medium text-subtext">
          <CoinIcon size={15} className="text-warning" />
          Your Esport
        </p>
        <p className="mt-1.5 text-[34px] font-bold leading-tight tabular-nums">
          {formatEsport(wallet.balance_esport)}
          <span className="text-base font-medium text-subtext"> Esport</span>
        </p>
        <p className="mt-1 text-sm text-subtext">
          ≈ <span className="font-semibold text-text">{wallet.espees.balance_display}</span>{" "}
          Espees
        </p>

        <div className="mt-4">
          <div className="flex items-center justify-between text-[12px] text-subtext">
            <span>Next Espee</span>
            <span className="tabular-nums">
              {wallet.espees.esport_to_next > 0
                ? `${formatEsport(wallet.espees.esport_to_next)} Esport to go`
                : "Reached"}
            </span>
          </div>
          <Bar percent={nextPct} className="mt-1.5" tone="primary" />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3.5">
          <div>
            <p className="text-[15px] font-bold tabular-nums">{formatEsport(wallet.lifetime_esport)}</p>
            <p className="mt-0.5 text-[11px] text-subtext">Earned all time</p>
          </div>
          <div>
            <p className="text-[15px] font-bold tabular-nums">
              {formatEsport(wallet.lifetime_swapped_esport)}
            </p>
            <p className="mt-0.5 text-[11px] text-subtext">Swapped</p>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------ rules */}
      <Link
        href="/wallet/terms"
        className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
          termsPending ? "border-warning/60 bg-warning/10" : "border-border bg-card"
        }`}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">Rules &amp; terms</span>
          <span className="block text-[12px] text-subtext">
            {termsPending
              ? "Join Watch & Earn — you earn nothing until you accept the rules. Nothing is tracked or credited before that."
              : "How earning, limits and swaps work. Numbers can change."}
          </span>
        </span>
        <span className="shrink-0 text-xs font-bold text-primary">
          {termsPending ? "Read & accept ›" : "Read ›"}
        </span>
      </Link>

      {/* ------------------------------------------------------------ today */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium text-subtext">Today</p>
          <p className="text-[12px] tabular-nums text-subtext">
            {formatEsport(today.esport)} / {formatEsport(today.cap)} Esport
          </p>
        </div>

        <div className="mt-3 space-y-3">
          <SplitRow
            label="Watching"
            value={today.watch}
            cap={today.watch_cap}
            tone={today.watch_remaining > 0 ? "success" : "subtext"}
          />
          <SplitRow
            label="Engagement"
            value={today.engagement}
            cap={today.engagement_cap}
            tone={today.engagement_remaining > 0 ? "primary" : "subtext"}
          />
        </div>

        <p className="mt-3 text-[12px] text-subtext">
          {today.remaining <= 0
            ? "You've hit today's limit. Earning resumes at midnight UTC."
            : today.watch_remaining <= 0
              ? "Today's watching is done — likes, comments and shares still earn. Resets at midnight UTC."
              : `${formatEsport(today.remaining)} Esport left today. Resets at midnight UTC.`}
        </p>
      </div>

      {/* ------------------------------------------------------------ month */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium text-subtext">This month</p>
          <p className="text-[12px] tabular-nums text-subtext">
            {formatEsport(month.esport)} / {formatEsport(month.cap)} Esport
          </p>
        </div>
        <Bar
          percent={pct(month.esport, month.cap)}
          className="mt-2"
          tone={month.remaining > 0 ? "warning" : "subtext"}
        />
        <p className="mt-2 text-[12px] text-subtext">
          {month.remaining > 0
            ? `Up to ${formatEspeesFromEsport(month.cap, perEspee)} Espees a month. ${formatEsport(month.remaining)} Esport to go.`
            : "You've reached this month's limit. Earning resumes next month."}
        </p>
      </div>

      {/* ------------------------------------------------------------- swap */}
      <SwapCard wallet={wallet} token={token} perEspee={perEspee} />

      {/* --------------------------------------------------------- activity */}
      <Activity entries={wallet.entries} />

      {wallet.swaps.length > 0 && <Swaps swaps={wallet.swaps} />}

      {/* ----------------------------------------------------- how it works */}
      <HowItWorks config={wallet.config} perEspee={perEspee} />
    </div>
  );
}

// ---------------------------------------------------------------------------

function Bar({
  percent,
  tone,
  className = "",
}: {
  percent: number;
  tone: "primary" | "success" | "warning" | "subtext";
  className?: string;
}) {
  const color =
    tone === "primary"
      ? "bg-primary"
      : tone === "success"
        ? "bg-success"
        : tone === "warning"
          ? "bg-warning"
          : "bg-subtext";
  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full bg-background ${className}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
    >
      <div
        className={`h-full rounded-full ${color} transition-[width] duration-500`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function SplitRow({
  label,
  value,
  cap,
  tone,
}: {
  label: string;
  value: number;
  cap: number;
  tone: "primary" | "success" | "subtext";
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-[12px]">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-subtext">
          {formatEsport(value)} / {formatEsport(cap)}
        </span>
      </div>
      <Bar percent={pct(value, cap)} className="mt-1.5" tone={tone} />
    </div>
  );
}

// ---------------------------------------------------------------------------

function SwapCard({
  wallet,
  token,
  perEspee,
}: {
  wallet: WatchEarnWallet;
  token: string;
  perEspee: number;
}) {
  const queryClient = useQueryClient();
  const { swap } = wallet;

  const [esportInput, setEsportInput] = useState("");
  const [address, setAddress] = useState(swap.wallet_address ?? "");
  const [editingAddress, setEditingAddress] = useState(!swap.wallet_address);
  const [savingAddress, setSavingAddress] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // A fresh wallet (after a swap or a save) resets the form's view of it.
  useEffect(() => {
    setAddress(swap.wallet_address ?? "");
    setEditingAddress(!swap.wallet_address);
  }, [swap.wallet_address]);

  // Decimals are fine (the API takes three places); anything else is dropped.
  const esport = useMemo(() => roundEsport(Number(esportInput) || 0), [esportInput]);

  const addressValid = ESPEES_WALLET_ADDRESS_RE.test(address.trim());
  const savedAddress = Boolean(swap.wallet_address);
  // One swap at a time: a held one must pay (or be rejected) first.
  const pending = wallet.swaps.find((s) => s.status === "HELD" || s.status === "PROCESSING");
  const holdDays = Number(swap.hold_days ?? wallet.config.swap_hold_days ?? 0);

  // The first reason the swap cannot go, in the order the viewer can fix it.
  const blocker: string | null = !swap.enabled
    ? "Swaps are coming soon — your Esport is safe."
    : pending
      ? pending.status === "HELD"
        ? `A swap is in review${pending.release_at ? ` · pays on ${formatReleaseDate(pending.release_at)}` : ""}.`
        : "A swap is already being sent."
      : wallet.balance_esport < swap.min_esport
        ? `You need at least ${formatEsport(swap.min_esport)} Esport (${formatEspeesFromEsport(swap.min_esport, perEspee)} Espees) to swap.`
        : !savedAddress
          ? "Add your Espees wallet address first."
          : esport <= 0
            ? null
            : esport < swap.min_esport
              ? `Minimum swap is ${formatEsport(swap.min_esport)} Esport.`
              : esport > wallet.balance_esport
                ? "That's more than you have."
                : null;

  const canSwap =
    swap.enabled &&
    !pending &&
    savedAddress &&
    esport >= swap.min_esport &&
    esport <= wallet.balance_esport &&
    !swapping;

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: watchEarnWalletKey(token) });

  const onSaveAddress = async () => {
    setNotice(null);
    setActionError(null);
    if (!addressValid) {
      setActionError("Enter a valid Espees wallet address: 0x followed by 40 hex characters.");
      return;
    }
    setSavingAddress(true);
    try {
      await setWatchEarnWalletAddress(token, address);
      setNotice("Wallet address saved.");
      setEditingAddress(false);
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't save the address.");
    } finally {
      setSavingAddress(false);
    }
  };

  const onSwap = async () => {
    if (!canSwap) return;
    setNotice(null);
    setActionError(null);
    setSwapping(true);
    try {
      const res = await swapWatchEarnEsport(token, esport);
      const release = formatReleaseDate(res.swap?.release_at);
      setNotice(
        res.swap?.status === "HELD"
          ? `Swap received. It's held for review${release ? ` and pays on ${release}` : holdDays ? ` for ${holdDays} days` : ""}.`
          : res.message || "Sent to your Espees wallet.",
      );
      setEsportInput("");
      await refresh();
    } catch (err) {
      // 503 (swaps paused), 422 (minimum / address / balance) and 409 all
      // arrive as the API's own message.
      setActionError(err instanceof Error ? err.message : "The swap could not be sent.");
      await refresh();
    } finally {
      setSwapping(false);
    }
  };

  const useMax = () => setEsportInput(String(roundEsport(wallet.balance_esport)));

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-base font-bold">
          <WalletIcon size={18} />
          Swap for Espees
        </p>
        <p className="text-[12px] text-subtext">
          {formatEsport(perEspee)} Esport = 1 Espee
        </p>
      </div>

      <p className="mt-2 text-[12px] text-subtext">
        Minimum {formatEsport(swap.min_esport)} Esport (
        {formatEspeesFromEsport(swap.min_esport, perEspee)} Espees).
        {holdDays > 0 &&
          ` Every swap is held ${holdDays} day${holdDays === 1 ? "" : "s"} for review before it's paid.`}
      </p>

      {notice && (
        <p className="mt-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          {notice}
        </p>
      )}
      {actionError && (
        <p className="mt-3 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {actionError}
        </p>
      )}

      {/* Amount */}
      <label className="mt-4 block">
        <span className="text-[12px] font-medium text-subtext">Esport to swap</span>
        <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-background px-3">
          <input
            inputMode="decimal"
            placeholder={formatEsport(swap.min_esport)}
            value={esportInput}
            onChange={(e) =>
              setEsportInput(
                e.target.value
                  .replace(/,/g, ".")
                  .replace(/[^\d.]/g, "")
                  .replace(/^(\d*\.\d{0,3}).*$/, "$1"),
              )
            }
            disabled={!swap.enabled}
            className="min-w-0 flex-1 bg-transparent py-3 text-base font-semibold tabular-nums outline-none placeholder:text-subtext/60 disabled:opacity-60"
          />
          <button
            type="button"
            onClick={useMax}
            disabled={!swap.enabled || wallet.balance_esport <= 0}
            className="rounded-full border border-border px-2.5 py-1 text-[11px] font-bold text-subtext disabled:opacity-40"
          >
            Max
          </button>
        </div>
        <p className="mt-1.5 flex items-center justify-between text-[12px] text-subtext">
          <span>
            ≈{" "}
            <span className="font-semibold text-text">
              {formatEspeesFromEsport(esport, perEspee)}
            </span>{" "}
            Espees
          </span>
          <span>Min {formatEsport(swap.min_esport)} Esport</span>
        </p>
      </label>

      {/* Address */}
      <div className="mt-4">
        <span className="text-[12px] font-medium text-subtext">Espees wallet address</span>
        {editingAddress ? (
          <div className="mt-1.5 flex gap-2">
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value.trim())}
              placeholder="0x…"
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
              className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-3 font-mono text-[13px] outline-none placeholder:text-subtext/60"
            />
            <button
              type="button"
              onClick={onSaveAddress}
              disabled={!addressValid || savingAddress}
              className="flex h-[46px] shrink-0 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-white disabled:opacity-50"
            >
              {savingAddress ? <Spinner size={16} /> : "Save"}
            </button>
          </div>
        ) : (
          <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-3">
            <span className="min-w-0 flex-1 truncate font-mono text-[13px]">{address}</span>
            <button
              type="button"
              onClick={() => setEditingAddress(true)}
              className="shrink-0 text-xs font-bold text-primary"
            >
              Change
            </button>
          </div>
        )}
        {editingAddress && address && !addressValid && (
          <p className="mt-1.5 text-[12px] text-warning">
            An Espees address is 0x followed by 40 hex characters.
          </p>
        )}
      </div>

      {/* Why not, before the button rather than after the tap. */}
      {blocker && (
        <p
          className={`mt-3.5 text-xs font-medium ${
            !swap.enabled ? "text-primary" : "text-subtext"
          }`}
        >
          {blocker}
        </p>
      )}

      <button
        type="button"
        onClick={onSwap}
        disabled={!canSwap}
        className="mt-3.5 flex h-11 w-full items-center justify-center rounded-full text-sm font-bold disabled:opacity-60"
        style={{
          background: canSwap ? "var(--primary)" : "var(--background)",
          color: canSwap ? "#fff" : "var(--subtext)",
        }}
      >
        {swapping ? (
          <Spinner size={16} />
        ) : !swap.enabled ? (
          "Swaps coming soon"
        ) : pending ? (
          pending.status === "HELD" ? "Swap in review" : "Swap in progress"
        ) : esport > 0 ? (
          `Swap ${formatEsport(esport)} Esport for ${formatEspeesFromEsport(esport, perEspee)} Espees`
        ) : (
          "Swap"
        )}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------

const ENTRY_LABEL: Record<string, string> = {
  watch: "Watch time",
  engagement: "Engagement",
  engagement_reversal: "Engagement undone",
  swap: "Swap to Espees",
  swap_reversal: "Swap returned",
  adjustment: "Adjustment",
};

function Activity({ entries }: { entries: WatchEarnEntry[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-base font-bold">Activity</p>
      {entries.length === 0 ? (
        <p className="mt-2 text-sm text-subtext">
          Nothing yet. Watch a video with the sound on, or like, comment or
          share one, and your first Esport lands here.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {entries.map((entry) => {
            const credit = entry.direction === "credit";
            return (
              <li key={entry.id} className="flex items-center gap-3 py-2.5">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    credit ? "bg-success/15 text-success" : "bg-background text-subtext"
                  }`}
                >
                  <CoinIcon size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {ENTRY_LABEL[entry.reason] ?? humanise(entry.reason)}
                  </p>
                  <p className="truncate text-[12px] text-subtext">
                    {[entry.note, entry.at ? timeAgo(entry.at) : ""]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <p
                  className={`shrink-0 text-sm font-bold tabular-nums ${
                    credit ? "text-success" : "text-subtext"
                  }`}
                >
                  {credit ? "+" : "−"}
                  {formatEsport(entry.esport)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const SWAP_STATUS: Record<string, { label: string; className: string }> = {
  HELD: { label: "In review", className: "bg-warning/15 text-warning" },
  PROCESSING: { label: "Sending", className: "bg-primary/15 text-primary" },
  PAID: { label: "Paid", className: "bg-success/15 text-success" },
  FAILED: { label: "Returned", className: "bg-error/15 text-error" },
  REVIEW: { label: "Checking", className: "bg-warning/15 text-warning" },
  REJECTED: { label: "Rejected", className: "bg-error/15 text-error" },
};

function swapNote(swap: WatchEarnSwap): string | null {
  switch (swap.status) {
    case "HELD": {
      const release = formatReleaseDate(swap.release_at);
      return release ? `In review · pays on ${release}` : "In review · pays when the hold ends";
    }
    case "REJECTED":
      return swap.notes
        ? `Rejected — the Esport is back in your wallet. ${swap.notes}`
        : "Rejected — the Esport is back in your wallet.";
    case "REVIEW":
      return "We couldn't confirm this transfer. Support is checking it; the Esport is held against it and won't be lost.";
    case "FAILED":
      return "The transfer failed and the Esport was returned.";
    default:
      return null;
  }
}

function Swaps({ swaps }: { swaps: WatchEarnSwap[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-base font-bold">Swaps</p>
      <ul className="mt-2 divide-y divide-border">
        {swaps.map((swap) => {
          const status = SWAP_STATUS[swap.status] ?? {
            label: humanise(swap.status),
            className: "bg-background text-subtext",
          };
          const note = swapNote(swap);
          return (
            <li key={swap.id} className="py-2.5">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {formatEsport(swap.esport)} Esport →{" "}
                    <span className="font-bold">{swap.espees_display}</span> Espees
                  </p>
                  <p className="truncate text-[12px] text-subtext">
                    {[
                      swap.created_at ? timeAgo(swap.created_at) : "",
                      swap.reference ? `Ref ${swap.reference}` : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${status.className}`}
                >
                  {status.label}
                </span>
              </div>
              {note && (
                <p
                  className={`mt-1.5 text-[12px] ${
                    swap.status === "HELD" ? "text-warning" : "text-subtext"
                  }`}
                >
                  {note}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function HowItWorks({ config: cfg, perEspee }: { config: WatchEarnConfig; perEspee: number }) {
  const watchMinutes = Math.round((cfg.max_watch_seconds_per_video || 0) / 60);
  const rows: Array<[string, string]> = [
    [
      "Watch",
      `${formatEsport(cfg.esport_per_hour)} Esport an hour of real watching — about 1 every ${formatEsport(cfg.seconds_per_esport)} seconds. Up to ${watchMinutes} minutes count per video; leftover seconds carry over.`,
    ],
    [
      "Engage",
      `Like ${formatEsport(cfg.like_esport)} · comment ${formatEsport(cfg.comment_esport)} (at least ${cfg.comment_min_chars} characters, no repeats) · share ${formatEsport(cfg.share_esport)}. Once per video; unliking or deleting a comment takes it back.`,
    ],
    [
      "Per video",
      `At most ${formatEsport(cfg.max_esport_per_video)} Esport from watching and engagement combined. Reaching the daily limit takes at least ${cfg.min_videos_for_daily_cap} videos.`,
    ],
    [
      "Daily",
      `${formatEsport(cfg.daily_cap_esport)} Esport a day: ${formatEsport(cfg.daily_watch_cap_esport)} from watching (about ${cfg.daily_watch_minutes} minutes) and ${formatEsport(cfg.daily_engagement_cap_esport)} from engagement. Resets at midnight UTC.`,
    ],
    [
      "Monthly",
      `${formatEsport(cfg.monthly_cap_esport)} Esport (${formatEspeesFromEsport(cfg.monthly_cap_esport, perEspee)} Espees) per calendar month.`,
    ],
    [
      "Counts",
      `Sound on, screen on, at up to ${String(Number(cfg.max_playback_rate.toFixed(2)))}× speed. Skipping ahead, muting and background play don't count. One device at a time.`,
    ],
    [
      "Swap",
      `${formatEsport(perEspee)} Esport = 1 Espee. Minimum ${formatEsport(cfg.min_swap_esport)} Esport (${formatEspeesFromEsport(cfg.min_swap_esport, perEspee)} Espees); every swap is held ${cfg.swap_hold_days} days for review.`,
    ],
  ];
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-base font-bold">How it works</p>
      <dl className="mt-2 space-y-2.5">
        {rows.map(([term, text]) => (
          <div key={term} className="flex gap-3">
            <dt className="w-[76px] shrink-0 text-[12px] font-bold uppercase tracking-wide text-subtext">
              {term}
            </dt>
            <dd className="text-[13px] leading-5">{text}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[12px] text-subtext">
        Live videos{cfg.earn_on_clips ? "" : ", clips"} and your own uploads don&apos;t
        earn.
      </p>
      <Link
        href="/wallet/terms"
        className="mt-3 inline-block text-sm font-semibold text-primary"
      >
        Full rules &amp; terms ›
      </Link>
    </div>
  );
}

function humanise(value: string): string {
  const s = String(value || "").replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
