"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  WatchEarnBeatError,
  getWatchEarnConfig,
  sendWatchEarnBeat,
  startWatchEarnSession,
  type WatchEarnBeatReport,
  type WatchEarnConfig,
  type WatchEarnEngagementAction,
  type WatchEarnEngagementResult,
  type WatchEarnMonth,
  type WatchEarnTermsState,
  type WatchEarnToday,
  type WatchEarnVideoProgress,
} from "@/lib/watchEarn";

/*
 * Reports a native <video> to Watch & Earn.
 *
 * Once `loadedmetadata` gives the duration a session opens; from then on,
 * every `interval_seconds`, the hook posts where the playhead is plus the
 * playing / visible / muted / rate flags read straight off the element. The
 * server decides what counts - this hook never claims watch time. Between
 * beats it keeps a provisional status from the element's own state so the
 * card can say "Unmute to earn" the moment autoplay starts muted, rather
 * than eighteen seconds later.
 *
 * Engagement (like, comment, share) is awarded elsewhere; the page feeds
 * those results in through `applyEngagement` so the same card shows them.
 */

export type WatchEarnStatus =
  | "idle"
  | "ineligible"
  | "earning"
  | "paused"
  | "maxed"
  | "capped"
  | "superseded";

export type WatchEarnReporterState = {
  status: WatchEarnStatus;
  /** The server's (or, between beats, the element's) reason for not crediting. */
  reason: string | null;
  balance: number | null;
  today: WatchEarnToday | null;
  month: WatchEarnMonth | null;
  video: WatchEarnVideoProgress | null;
  terms: WatchEarnTermsState | null;
  /** Date.now() of the last watch credit, for the "+5" flash. */
  lastCreditAt: number | null;
  lastCreditEsport: number;
  /** The last like / comment / share result, for its own flash. */
  lastEngagementAt: number | null;
  lastEngagementEsport: number;
  lastEngagementAction: WatchEarnEngagementAction | null;
  config: WatchEarnConfig | null;
};

export type WatchEarnReporter = WatchEarnReporterState & {
  /**
   * Folds a `watch_earn` result (from a like, a comment or the share claim)
   * into the card: bumps the balance, flashes the award, updates today's
   * split. A reversal (unlike) takes the action's Esport off again.
   */
  applyEngagement: (
    action: WatchEarnEngagementAction,
    result: WatchEarnEngagementResult | null | undefined,
    extra?: { today?: WatchEarnToday; video?: WatchEarnVideoProgress | null },
  ) => void;
  /**
   * After `terms/accept` succeeds: records the acceptance and, when the
   * start for the current video was refused with `terms_required`, re-runs
   * `session/start` so earning begins the moment the viewer joins.
   */
  markTermsAccepted: (terms?: WatchEarnTermsState | null) => void;
};

const INITIAL: WatchEarnReporterState = {
  status: "idle",
  reason: null,
  balance: null,
  today: null,
  month: null,
  video: null,
  terms: null,
  lastCreditAt: null,
  lastCreditEsport: 0,
  lastEngagementAt: null,
  lastEngagementEsport: 0,
  lastEngagementAction: null,
  config: null,
};

/** Fallback cadence until the config arrives. */
const DEFAULT_INTERVAL_SECONDS = 18;
const DEFAULT_MAX_RATE = 1.5;

type Inputs = {
  videoId: string | number;
  token: string;
  /** False for signed-out viewers, live items and anything else that never earns. */
  enabled: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
};

export function useWatchEarnReporter({
  videoId,
  token,
  enabled,
  videoRef,
}: Inputs): WatchEarnReporter {
  const [state, setState] = useState<WatchEarnReporterState>(INITIAL);

  // Everything the timers and listeners need lives in refs so the effect below
  // runs once per video and never chases stale closures.
  const sessionRef = useRef<string | null>(null);
  const startingRef = useRef(false);
  const finishedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const beatInFlightRef = useRef(false);
  const configRef = useRef<WatchEarnConfig | null>(null);
  const terminalRef = useRef(false);
  // The last start answered `terms_required`: no session, nothing tracked,
  // until `markTermsAccepted` clears it and starts one.
  const termsRequiredRef = useRef(false);
  const restartRef = useRef<(() => void) | null>(null);

  const patch = useCallback(
    (next: Partial<WatchEarnReporterState>) =>
      setState((prev) => ({ ...prev, ...next })),
    [],
  );

  const applyEngagement = useCallback<WatchEarnReporter["applyEngagement"]>(
    (action, result, extra) => {
      if (!result || typeof result !== "object") return;
      setState((prev) => {
        const next: WatchEarnReporterState = { ...prev };
        const cfg = prev.config ?? configRef.current;

        if (result.reversed) {
          // An unlike: the award comes off. The server's balance wins; without
          // one, take the action's Esport off locally as far as it allows.
          if (typeof result.balance_esport === "number") {
            next.balance = result.balance_esport;
          } else {
            const amount = Number(cfg?.[`${action}_esport` as const] ?? 0) || 0;
            if (prev.balance != null && amount > 0) {
              next.balance = Math.max(0, prev.balance - amount);
            }
          }
          return next;
        }

        if (typeof result.balance_esport === "number") {
          next.balance = result.balance_esport;
        }
        const awarded = Number(result.awarded_esport || 0);
        if (awarded > 0) {
          next.lastEngagementAt = Date.now();
          next.lastEngagementEsport = awarded;
          next.lastEngagementAction = action;
        }
        if (extra?.today) next.today = extra.today;
        if (extra?.video) next.video = extra.video;

        // An engagement award can be the thing that maxes the video or
        // fills the day; the next beat says so too, but say it now.
        if (extra?.video?.maxed && prev.status === "earning") {
          next.status = "maxed";
          next.reason = "video_maxed";
          terminalRef.current = true;
        }
        return next;
      });
    },
    [],
  );

  const markTermsAccepted = useCallback<WatchEarnReporter["markTermsAccepted"]>(
    (terms) => {
      setState((prev) => ({
        ...prev,
        terms: {
          version: terms?.version ?? prev.terms?.version ?? 0,
          accepted: true,
          accepted_at: terms?.accepted_at ?? new Date().toISOString(),
        },
      }));
      // The viewer is in the programme now: open the session they were
      // refused a moment ago, for the video still on screen.
      if (termsRequiredRef.current) {
        termsRequiredRef.current = false;
        restartRef.current?.();
      }
    },
    [],
  );

  useEffect(() => {
    // Reset for a new video (or when earning switches off).
    sessionRef.current = null;
    startingRef.current = false;
    finishedRef.current = false;
    beatInFlightRef.current = false;
    terminalRef.current = false;
    termsRequiredRef.current = false;
    restartRef.current = null;
    setState(INITIAL);

    if (!enabled || !token) return;

    const el = videoRef.current;
    if (!el) return;

    let disposed = false;

    // The config is display data (interval, max rate); the start response
    // carries it too, but fetching early lets the first beat use the right
    // cadence even if start is slow.
    getWatchEarnConfig()
      .then((cfg) => {
        if (disposed) return;
        configRef.current = cfg;
        patch({ config: cfg });
      })
      .catch(() => {});

    const intervalMs = () =>
      Math.max(5, configRef.current?.interval_seconds ?? DEFAULT_INTERVAL_SECONDS) *
      1000;

    const readReport = (session: string): WatchEarnBeatReport => ({
      session,
      position: Number.isFinite(el.currentTime) ? el.currentTime : 0,
      playing: !el.paused && !el.ended && !el.seeking,
      visible:
        typeof document === "undefined" ||
        document.visibilityState === "visible",
      muted: el.muted || el.volume === 0,
      rate: el.playbackRate || 1,
    });

    /** What the element says right now, for the time between beats. */
    const localReason = (): string | null => {
      if (document.visibilityState !== "visible") return "hidden";
      if (el.paused || el.ended) return "paused";
      if (el.muted || el.volume === 0) return "muted";
      const maxRate = configRef.current?.max_playback_rate ?? DEFAULT_MAX_RATE;
      if ((el.playbackRate || 1) > maxRate + 0.001) return "too_fast";
      return null;
    };

    const applyLocal = () => {
      if (!sessionRef.current || terminalRef.current || finishedRef.current)
        return;
      const reason = localReason();
      patch(
        reason
          ? { status: "paused", reason }
          : { status: "earning", reason: null },
      );
    };

    const stopTimer = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    const startTimer = () => {
      stopTimer();
      if (!sessionRef.current || terminalRef.current || finishedRef.current)
        return;
      timerRef.current = setInterval(() => void beat(), intervalMs());
    };

    /** The totals every start / beat response carries. */
    const totals = (r: {
      balance_esport?: number;
      today?: WatchEarnToday;
      month?: WatchEarnMonth;
      video?: WatchEarnVideoProgress | null;
    }): Partial<WatchEarnReporterState> => {
      const next: Partial<WatchEarnReporterState> = {};
      if (typeof r.balance_esport === "number") next.balance = r.balance_esport;
      if (r.today) next.today = r.today;
      if (r.month) next.month = r.month;
      if (r.video) next.video = r.video;
      return next;
    };

    const applyBeatResult = (
      result: Awaited<ReturnType<typeof sendWatchEarnBeat>>,
    ) => {
      if (disposed || !result) return;

      const next: Partial<WatchEarnReporterState> = totals(result);

      const credited = Boolean(result.credited) && Number(result.earned_esport) > 0;
      if (credited) {
        next.lastCreditAt = Date.now();
        next.lastCreditEsport = Number(result.earned_esport || 0);
      }

      switch (result.reason) {
        case null:
        case undefined:
        case "":
          // Credited - but the element may already have paused or muted
          // since the position was read.
          Object.assign(next, { status: "earning", reason: localReason() });
          if (next.reason) next.status = "paused";
          break;
        case "video_maxed":
          next.status = "maxed";
          next.reason = result.reason;
          terminalRef.current = true;
          stopTimer();
          break;
        case "daily_cap":
        case "monthly_cap":
          next.status = "capped";
          next.reason = result.reason;
          terminalRef.current = true;
          stopTimer();
          break;
        case "disabled":
          next.status = "ineligible";
          next.reason = result.reason;
          terminalRef.current = true;
          stopTimer();
          break;
        case "too_soon":
          // Our beat overlapped the server's window; nothing to tell the viewer.
          break;
        default:
          next.status = "paused";
          next.reason = result.reason;
      }

      patch(next);
    };

    const handleBeatError = (err: unknown) => {
      if (disposed) return;
      if (err instanceof WatchEarnBeatError) {
        if (err.status === 409) {
          terminalRef.current = true;
          stopTimer();
          sessionRef.current = null;
          patch(
            err.sessionStatus === "superseded" || !err.sessionStatus
              ? { status: "superseded", reason: "superseded" }
              : { status: "idle", reason: err.sessionStatus },
          );
          return;
        }
        if (err.status === 404) {
          // Unknown session: nothing more to report against it.
          terminalRef.current = true;
          stopTimer();
          sessionRef.current = null;
          patch({ status: "idle", reason: null });
        }
      }
      // Anything else (network, 5xx) - keep the cadence; the next beat will
      // settle it, and the server bounds a gap to one interval anyway.
    };

    const beat = async (final = false, keepalive = false) => {
      const session = sessionRef.current;
      if (!session || terminalRef.current) return;
      if (beatInFlightRef.current && !final) return;
      beatInFlightRef.current = true;
      try {
        const result = await sendWatchEarnBeat(token, readReport(session), {
          final,
          keepalive,
        });
        applyBeatResult(result);
      } catch (err) {
        handleBeatError(err);
      } finally {
        beatInFlightRef.current = false;
      }
    };

    /** The last report. Safe to call more than once; only the first one posts. */
    const finish = (keepalive: boolean) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      stopTimer();
      const session = sessionRef.current;
      if (!session || terminalRef.current) return;
      sessionRef.current = null;
      sendWatchEarnBeat(token, readReport(session), { final: true, keepalive })
        .then((result) => {
          // On unmount `disposed` is set and the result is dropped.
          applyBeatResult(result);
        })
        .catch(handleBeatError);
    };

    const ensureSession = async () => {
      if (
        sessionRef.current ||
        startingRef.current ||
        terminalRef.current ||
        termsRequiredRef.current
      )
        return;
      const duration = Number.isFinite(el.duration) ? el.duration : 0;
      if (!duration) return;

      startingRef.current = true;
      finishedRef.current = false;
      try {
        const started = await startWatchEarnSession(
          token,
          videoId,
          duration,
          "miniapp",
        );
        if (disposed) return;

        if (started?.config) {
          configRef.current = started.config;
          patch({ config: started.config });
        }

        const next: Partial<WatchEarnReporterState> = totals(started ?? {});
        if (started?.terms) next.terms = started.terms;

        if (!started?.session) {
          if (started?.reason === "terms_required") {
            // Not in the programme yet: nothing is tracked or credited until
            // the viewer accepts the rules; `markTermsAccepted` then starts
            // the session for this video. Not terminal, but no retries on
            // `play` either - the answer will not change on its own.
            termsRequiredRef.current = true;
            patch({ ...next, status: "ineligible", reason: "terms_required" });
            return;
          }
          // Nothing opened: the viewer cannot earn on this video at all.
          terminalRef.current = true;
          patch({
            ...next,
            status: "ineligible",
            reason: started?.reason ?? "not_found",
          });
          return;
        }

        sessionRef.current = started.session;

        if (started.reason === "video_maxed") {
          terminalRef.current = true;
          patch({ ...next, status: "maxed", reason: started.reason });
          return;
        }
        if (started.reason === "daily_cap" || started.reason === "monthly_cap") {
          terminalRef.current = true;
          patch({ ...next, status: "capped", reason: started.reason });
          return;
        }

        const reason = localReason();
        patch({
          ...next,
          status: reason ? "paused" : "earning",
          reason,
        });

        if (document.visibilityState === "visible") startTimer();
      } catch {
        // A failed start is silent: the player works the same, it just
        // does not earn. A later `play` tries again.
        if (!disposed) patch({ status: "idle", reason: null });
      } finally {
        startingRef.current = false;
      }
    };

    // ---- element events ----------------------------------------------------
    const onLoadedMetadata = () => void ensureSession();
    const onPlay = () => {
      // Replaying after the end, or retrying a failed start.
      if (!sessionRef.current && !terminalRef.current) {
        finishedRef.current = false;
        void ensureSession();
        return;
      }
      applyLocal();
      if (!timerRef.current && document.visibilityState === "visible") {
        startTimer();
      }
    };
    const onLocalChange = () => applyLocal();
    const onEnded = () => {
      applyLocal();
      finish(false);
    };

    el.addEventListener("loadedmetadata", onLoadedMetadata);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onLocalChange);
    el.addEventListener("volumechange", onLocalChange);
    el.addEventListener("ratechange", onLocalChange);
    el.addEventListener("seeking", onLocalChange);
    el.addEventListener("seeked", onLocalChange);
    el.addEventListener("ended", onEnded);

    // Metadata may already be in when the effect runs (cached source).
    if (el.readyState >= 1 && el.duration) void ensureSession();

    restartRef.current = () => {
      if (disposed) return;
      finishedRef.current = false;
      void ensureSession();
    };

    // ---- page events ---------------------------------------------------------
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        applyLocal();
        startTimer();
      } else {
        // One honest "not visible" report, then quiet until we are back.
        stopTimer();
        applyLocal();
        void beat();
      }
    };
    const onPageHide = () => finish(true);

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      disposed = true;
      restartRef.current = null;
      el.removeEventListener("loadedmetadata", onLoadedMetadata);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onLocalChange);
      el.removeEventListener("volumechange", onLocalChange);
      el.removeEventListener("ratechange", onLocalChange);
      el.removeEventListener("seeking", onLocalChange);
      el.removeEventListener("seeked", onLocalChange);
      el.removeEventListener("ended", onEnded);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      // Unmount or a new video: the last report rides keepalive so a
      // navigation away does not lose the final seconds.
      finish(true);
      stopTimer();
    };
  }, [videoId, token, enabled, videoRef, patch]);

  return { ...state, applyEngagement, markTermsAccepted };
}
