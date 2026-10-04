"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatEsport } from "@/lib/watchEarn";
import { CoinIcon } from "@/components/Icons";
import type { WatchEarnReporterState } from "./useWatchEarnReporter";

/*
 * The Watch & Earn card under the video: the viewer's live balance ticking
 * up, a brief "+N" flash per credit, and one short line only when earning
 * has stopped for a reason the viewer can act on or should know. The icon
 * carries the state: green while earning, blue once this video has paid out
 * its share (no words, just the balance), amber when the viewer needs to do
 * something, grey otherwise. Tapping it
 * opens the wallet; signed out it offers sign-in instead. Watch & Earn is
 * opt-in: a signed-in viewer who has not accepted the rules is not in the
 * programme and has nothing tracked, so the card is an invitation to the
 * rules page instead of a counter.
 */

const FLASH_MS = 1600;
const TICK_MS = 650;

/** Shows a number rolling towards its new value rather than jumping. */
function useTickingNumber(target: number | null): number | null {
  const [shown, setShown] = useState<number | null>(target);
  const fromRef = useRef<number | null>(target);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (target == null) {
      setShown(null);
      fromRef.current = null;
      return;
    }
    const from = fromRef.current;
    if (from == null || from === target) {
      fromRef.current = target;
      setShown(target);
      return;
    }

    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / TICK_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = Math.round(from + (target - from) * eased);
      setShown(value);
      if (t < 1) frameRef.current = requestAnimationFrame(step);
      else fromRef.current = target;
    };
    frameRef.current = requestAnimationFrame(step);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target]);

  return shown;
}

/** "+5" beside the balance for a moment after a credit; keyed by its time. */
function useFlash(at: number | null, amount: number): number | null {
  const [flash, setFlash] = useState<number | null>(null);
  useEffect(() => {
    if (!at || !amount) return;
    setFlash(amount);
    const t = setTimeout(() => setFlash(null), FLASH_MS);
    return () => clearTimeout(t);
  }, [at, amount]);
  return flash;
}

type Tone = "neutral" | "attention";

const LIMIT_TEXT = "Limit reached · back soon";

/**
 * One line, only when earning has stopped for a reason worth saying. Null
 * while earning, while starting, and once the video is maxed; seeks and
 * buffering resume on their own, so they say nothing either.
 */
function describe(state: WatchEarnReporterState): { text: string; tone: Tone } | null {
  switch (state.status) {
    case "superseded":
      return { text: "Earning on another device", tone: "attention" };
    case "capped":
      return { text: LIMIT_TEXT, tone: "neutral" };
    case "ineligible":
      switch (state.reason) {
        case "live":
          return { text: "Live videos don't earn", tone: "neutral" };
        case "clips":
          return { text: "Clips don't earn", tone: "neutral" };
        case "own_video":
          return { text: "Your own videos don't earn", tone: "neutral" };
        case "disabled":
          return { text: "Watch & Earn is paused", tone: "neutral" };
        case "daily_cap":
        case "monthly_cap":
          return { text: LIMIT_TEXT, tone: "neutral" };
        case "video_maxed":
          return null;
        default:
          return { text: "Not available on this video", tone: "neutral" };
      }
    case "paused":
      switch (state.reason) {
        case "muted":
          return { text: "Unmute to earn", tone: "attention" };
        case "too_fast":
          return { text: "Slow down to earn", tone: "attention" };
        case "hidden":
          return { text: "Paused in the background", tone: "neutral" };
        case "daily_cap":
        case "monthly_cap":
          return { text: LIMIT_TEXT, tone: "neutral" };
        case "paused":
        case null:
          return { text: "Paused", tone: "neutral" };
        default:
          return null;
      }
    case "idle":
    case "earning":
    case "maxed":
    default:
      return null;
  }
}

const STATUS_CLASS: Record<Tone, string> = {
  neutral: "text-subtext",
  attention: "text-warning",
};

const ENGAGEMENT_LABEL = { like: "like", comment: "comment", share: "share" } as const;

/** This video has paid out everything it pays this viewer. */
function isDone(state: WatchEarnReporterState): boolean {
  return (
    state.status === "maxed" ||
    Boolean(state.video?.maxed) ||
    (state.status === "ineligible" && state.reason === "video_maxed")
  );
}

/** Signed in but not in the programme: the start answered `terms_required`. */
function needsToJoin(state: WatchEarnReporterState): boolean {
  if (state.reason === "terms_required") return true;
  return state.status === "ineligible" && state.terms != null && !state.terms.accepted;
}

export function EarnCard({
  state,
  signedIn,
}: {
  state: WatchEarnReporterState;
  signedIn: boolean;
}) {
  const balance = useTickingNumber(signedIn ? state.balance : null);
  const creditFlash = useFlash(state.lastCreditAt, state.lastCreditEsport);
  const engageFlash = useFlash(state.lastEngagementAt, state.lastEngagementEsport);

  const done = signedIn && isDone(state);
  const status = signedIn && !done ? describe(state) : null;
  const earningNow = signedIn && !done && state.status === "earning" && !state.reason;
  const attention = status?.tone === "attention";

  const cardClass = `flex items-center gap-3 px-4 py-3 ${
    attention ? "bg-warning/10" : "bg-card"
  }`;
  const frameClass = `overflow-hidden rounded-xl border ${
    attention ? "border-warning/60" : "border-border"
  }`;

  if (!signedIn) {
    return (
      <div className={frameClass}>
        <Link href="/login" className={cardClass}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
            <CoinIcon size={20} aria-hidden />
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">
            Sign in to earn Esport while you watch
          </span>
          <span className="shrink-0 text-xs font-semibold text-primary">
            Sign in ›
          </span>
        </Link>
      </div>
    );
  }

  if (needsToJoin(state)) {
    return (
      <div className="overflow-hidden rounded-xl border border-warning/60">
        <Link href="/wallet/terms" className="flex items-center gap-3 bg-warning/10 px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
            <CoinIcon size={20} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">
              Join Watch &amp; Earn
            </span>
            <span className="mt-0.5 block truncate text-xs text-subtext">
              Earn Esport while you watch · read and accept the rules
            </span>
          </span>
          <span className="shrink-0 text-xs font-semibold text-primary">›</span>
        </Link>
      </div>
    );
  }

  return (
    <div className={frameClass}>
      <Link href="/wallet" className={cardClass} aria-live="polite">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            done
              ? "bg-primary/15 text-primary"
              : earningNow
                ? "bg-success/15 text-success"
                : attention
                  ? "bg-warning/15 text-warning"
                  : "bg-white/5 text-subtext"
          }`}
        >
          <CoinIcon size={20} aria-hidden />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-1.5">
            <span className="text-[15px] font-bold tabular-nums leading-5">
              {balance != null ? formatEsport(balance) : "—"}
            </span>
            <span className="text-xs text-subtext">Esport</span>
            {creditFlash != null && (
              <span
                key={`w${state.lastCreditAt ?? 0}`}
                className="earn-flash rounded-full bg-success/15 px-1.5 text-[11px] font-bold tabular-nums text-success"
              >
                +{formatEsport(creditFlash)}
              </span>
            )}
            {engageFlash != null && (
              <span
                key={`e${state.lastEngagementAt ?? 0}`}
                className="earn-flash rounded-full bg-primary/15 px-1.5 text-[11px] font-bold tabular-nums text-primary"
              >
                +{formatEsport(engageFlash)}
                {state.lastEngagementAction
                  ? ` ${ENGAGEMENT_LABEL[state.lastEngagementAction]}`
                  : ""}
              </span>
            )}
          </span>

          {status && (
            <span
              className={`mt-0.5 block truncate text-xs ${attention ? "font-semibold" : "font-medium"} ${STATUS_CLASS[status.tone]}`}
            >
              {status.text}
            </span>
          )}
        </span>

        <span className="shrink-0 text-xs font-semibold text-subtext">
          Wallet ›
        </span>
      </Link>
    </div>
  );
}
