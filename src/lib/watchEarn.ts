// Watch & Earn: Esport for verified watch time and engagement, swapped for
// Espees. 1,000 Esport = 1 Espee; amounts are decimals (up to 3 dp).
//
// Typed client for the `watch-earn/*` endpoints (CeFlix-API docs/watch-earn.md).
// The server does the verifying; the player only reports where the playhead
// is together with a few flags. Likes and comments are awarded by the
// endpoints that record them; only a share is claimed from here. Everything
// goes through the local `/api/ceflix` proxy like the rest of `api.ts`.
import { ceflix } from "./api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** `GET watch-earn/config` - every number the UI shows comes from here. */
export type WatchEarnConfig = {
  enabled: boolean;
  unit: "Esport" | string;
  terms_version: number;
  interval_seconds: number;

  esport_per_hour: number;
  esport_per_minute: number;
  seconds_per_esport: number;
  esport_per_interval: number;
  max_watch_seconds_per_video: number;
  max_esport_per_video: number;

  daily_cap_esport: number;
  daily_watch_cap_esport: number;
  daily_watch_minutes: number;
  daily_engagement_cap_esport: number;
  monthly_cap_esport: number;

  like_esport: number;
  comment_esport: number;
  share_esport: number;
  comment_min_chars: number;
  min_videos_for_daily_cap: number;

  esport_per_espee: number;
  min_swap_esport: number;
  swap_hold_days: number;
  swaps_enabled: boolean;

  max_playback_rate: number;
  earn_on_clips: boolean;

  projections: {
    watch_only_month: number;
    full_month: number;
    casual_month: number;
  };
};

export type WatchEarnToday = {
  esport: number;
  cap: number;
  remaining: number;
  watch: number;
  watch_cap: number;
  watch_remaining: number;
  engagement: number;
  engagement_cap: number;
  engagement_remaining: number;
};

export type WatchEarnMonth = {
  esport: number;
  cap: number;
  remaining: number;
};

/** Whether the viewer has accepted the current terms version. */
export type WatchEarnTermsState = {
  version: number;
  accepted: boolean;
  accepted_at?: string | null;
};

/** `GET watch-earn/terms`: the rules, rendered by the server from the live config. */
export type WatchEarnTermsDocument = {
  version: number;
  title: string;
  summary: string;
  sections: Array<{ title: string; items: string[] }>;
  notice: string;
};

export type WatchEarnVideoProgress = {
  video_id: number;
  duration_seconds: number;
  earned_seconds: number;
  max_watch_seconds: number;
  esport_earned: number;
  engagement_esport: number;
  esport_cap: number;
  maxed: boolean;
};

/** Why a session could not be opened, or opened without earning. */
export type WatchEarnStartReason =
  | "terms_required"
  | "live"
  | "clips"
  | "own_video"
  | "not_found"
  | "no_duration"
  | "disabled"
  | "video_maxed"
  | "daily_cap"
  | "monthly_cap";

/** Why a heartbeat credited nothing. */
export type WatchEarnBeatReason =
  | "paused"
  | "hidden"
  | "muted"
  | "too_fast"
  | "seek_ahead"
  | "seek_back"
  | "stalled"
  | "idle"
  | "daily_cap"
  | "monthly_cap"
  | "video_maxed"
  | "disabled"
  | "too_soon";

/** Why a like, comment or share earned nothing. */
export type WatchEarnEngagementReason =
  | "terms_required"
  | "already_earned"
  | "comment_too_short"
  | "comment_repeated"
  | "daily_cap"
  | "monthly_cap"
  | "video_maxed"
  | "own_video"
  | "disabled"
  | "signed_out"
  | "live"
  | "clips"
  | "not_found";

export type WatchEarnEngagementAction = "like" | "comment" | "share";

/**
 * The `watch_earn` field on `user/video/like` and `video/comment/add`
 * responses, and the body of `watch-earn/engage`. `reversed` is what an
 * unlike carries instead; `null` when the hook on the server failed.
 */
export type WatchEarnEngagementResult = {
  awarded_esport?: number;
  reason?: WatchEarnEngagementReason | string | null;
  balance_esport?: number;
  reversed?: boolean;
};

export type WatchEarnEngageResponse = WatchEarnEngagementResult & {
  today?: WatchEarnToday;
  video?: WatchEarnVideoProgress | null;
};

export type WatchEarnSessionStart = {
  eligible: boolean;
  reason: WatchEarnStartReason | string | null;
  /** The session token the heartbeats carry; null when nothing was opened. */
  session: string | null;
  video?: WatchEarnVideoProgress;
  balance_esport?: number;
  today?: WatchEarnToday;
  month?: WatchEarnMonth;
  terms?: WatchEarnTermsState;
  config: WatchEarnConfig;
};

export type WatchEarnBeatReport = {
  session: string;
  position: number;
  playing: boolean;
  visible: boolean;
  muted: boolean;
  rate: number;
};

export type WatchEarnBeatResult = {
  credited: boolean;
  earned_esport: number;
  reason: WatchEarnBeatReason | string | null;
  session_status: string;
  balance_esport: number;
  today: WatchEarnToday;
  month?: WatchEarnMonth;
  video: WatchEarnVideoProgress | null;
};

export type WatchEarnEntry = {
  id: number;
  direction: "credit" | "debit" | string;
  esport: number;
  reason: string;
  note: string | null;
  balance_after_esport: number;
  at: string | null;
};

export type WatchEarnSwapStatus =
  | "HELD"
  | "PROCESSING"
  | "PAID"
  | "FAILED"
  | "REVIEW"
  | "REJECTED";

export type WatchEarnSwap = {
  id: number;
  user_id: number;
  esport: number;
  espees_micros: number;
  espees_display: string;
  wallet_address: string | null;
  status: WatchEarnSwapStatus | string;
  /** When a HELD swap's review hold ends and it is paid. */
  release_at: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string | null;
  processed_at: string | null;
};

export type WatchEarnWallet = {
  balance_esport: number;
  lifetime_esport: number;
  lifetime_swapped_esport: number;
  today: WatchEarnToday;
  month: WatchEarnMonth;
  terms: WatchEarnTermsState;
  espees: {
    balance_micros: number;
    balance_display: string;
    /** Progress towards the next whole Espee, 0..1. */
    next_progress: number;
    esport_to_next: number;
    whole_espees: number;
  };
  swap: {
    enabled: boolean;
    min_esport: number;
    esport_per_espee: number;
    hold_days: number;
    wallet_address: string | null;
    can_swap: boolean;
  };
  entries: WatchEarnEntry[];
  swaps: WatchEarnSwap[];
  config: WatchEarnConfig;
};

/** A heartbeat the server refused; `status` tells the player what to do. */
export class WatchEarnBeatError extends Error {
  status: number;
  sessionStatus: string | null;

  constructor(message: string, status: number, sessionStatus: string | null) {
    super(message);
    this.name = "WatchEarnBeatError";
    this.status = status;
    this.sessionStatus = sessionStatus;
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export const ESPEES_WALLET_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

/** Esport = 1 Espee when the config has not arrived yet. */
export const DEFAULT_ESPORT_PER_ESPEE = 1000;
/** Esport a minute of watching pays by default (1,000 an hour). */
export const DEFAULT_ESPORT_PER_MINUTE = 1000 / 60;

/**
 * "12.3", "0.1", "1,250" - Esport with up to two decimals, trailing zeros
 * trimmed, thousands grouped. Never negative, never "-0".
 */
export function formatEsport(esport?: number | string | null): string {
  const value = Math.max(0, Number(esport ?? 0) || 0);
  const text = value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return text === "-0" ? "0" : text;
}

/** Esport as Espees at the given rate, as a number. */
export function esportToEspees(
  esport?: number | string | null,
  esportPerEspee?: number | null,
): number {
  const per = Math.max(1, Number(esportPerEspee || 0) || DEFAULT_ESPORT_PER_ESPEE);
  return (Number(esport ?? 0) || 0) / per;
}

/**
 * Esport as an Espees string the way the API prints them: up to six
 * decimals, trailing zeros dropped, never "-0".
 */
export function formatEspeesFromEsport(
  esport?: number | string | null,
  esportPerEspee?: number | null,
): string {
  const value = esportToEspees(esport, esportPerEspee);
  const fixed = value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
  return fixed === "" || fixed === "-0" ? "0" : fixed;
}

/** Whole minutes a number of Esport buys at the live rate. */
export function esportToMinutes(
  esport?: number | null,
  config?: Pick<WatchEarnConfig, "esport_per_minute"> | null,
): number {
  const perMinute = Number(config?.esport_per_minute || 0) || DEFAULT_ESPORT_PER_MINUTE;
  if (perMinute <= 0) return 0;
  return Math.floor((Number(esport ?? 0) || 0) / perMinute + 1e-9);
}

/** Esport the way the API accepts it: a number with at most three decimals. */
export function roundEsport(esport: number): number {
  return Math.max(0, Math.round((Number(esport) || 0) * 1000) / 1000);
}

/** "12 Oct" / "12 Oct 2027" for a swap's release date; "" when unknown. */
export function formatReleaseDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

const CONFIG_TTL_MS = 60_000;
let configCache: { at: number; value: WatchEarnConfig } | null = null;
let configInflight: Promise<WatchEarnConfig> | null = null;

/** The live rates and limits. Public; cached in-module for a minute. */
export function getWatchEarnConfig(): Promise<WatchEarnConfig> {
  if (configCache && Date.now() - configCache.at < CONFIG_TTL_MS) {
    return Promise.resolve(configCache.value);
  }
  if (configInflight) return configInflight;

  configInflight = ceflix("watch-earn/config", { token: null })
    .then((j) => {
      const value = j?.data as WatchEarnConfig;
      configCache = { at: Date.now(), value };
      return value;
    })
    .finally(() => {
      configInflight = null;
    });
  return configInflight;
}

/** Remembers the config a session/wallet response carried, saving a fetch. */
export function rememberWatchEarnConfig(config?: WatchEarnConfig | null) {
  if (config && typeof config.interval_seconds === "number") {
    configCache = { at: Date.now(), value: config };
  }
}

/** The rules as the server renders them from the live settings. Public. */
export const getWatchEarnTerms = () =>
  ceflix("watch-earn/terms", { token: null }).then(
    (j) => j?.data as WatchEarnTermsDocument,
  );

/** Records that the viewer accepted the current terms version. */
export const acceptWatchEarnTerms = (token: string) =>
  ceflix("watch-earn/terms/accept", {
    method: "POST",
    body: { token },
    token,
  }).then(
    (j) =>
      ({
        version: Number(j?.data?.version ?? 0),
        accepted: j?.data?.accepted ?? true,
        accepted_at: j?.data?.accepted_at ?? null,
      }) as WatchEarnTermsState,
  );

export function startWatchEarnSession(
  token: string,
  video: string | number,
  duration?: number | null,
  platform = "miniapp",
): Promise<WatchEarnSessionStart> {
  const body: Record<string, unknown> = {
    token,
    video: Number(video),
    platform,
  };
  if (duration && Number.isFinite(duration) && duration > 0) {
    body.duration = Math.round(duration);
  }
  return ceflix("watch-earn/session/start", {
    method: "POST",
    body,
    token,
  }).then((j) => {
    const data = j?.data as WatchEarnSessionStart;
    rememberWatchEarnConfig(data?.config);
    return data;
  });
}

/**
 * One heartbeat (or the final report). Posts straight to the local proxy
 * rather than through `ceflix()` so a 409 can be told apart from a network
 * blip, and so the last report can ride `keepalive` through a page unload.
 */
export async function sendWatchEarnBeat(
  token: string,
  report: WatchEarnBeatReport,
  options: { final?: boolean; keepalive?: boolean } = {},
): Promise<WatchEarnBeatResult> {
  const path = options.final
    ? "/api/ceflix/watch-earn/session/end"
    : "/api/ceflix/watch-earn/session/heartbeat";

  const res = await fetch(path, {
    method: "POST",
    keepalive: Boolean(options.keepalive),
    headers: { "content-type": "application/json", "x-token": token },
    body: JSON.stringify({ ...report, token }),
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok || (json && json.status === false)) {
    throw new WatchEarnBeatError(
      json?.message || `Heartbeat failed (${res.status})`,
      res.status,
      json?.data?.session_status ?? null,
    );
  }
  return json?.data as WatchEarnBeatResult;
}

/**
 * Claims a share once the share sheet completes. Likes and comments are
 * never claimed: their own endpoints award them and return `watch_earn`.
 */
export const engageWatchEarn = (
  token: string,
  video: string | number,
  action: "share" = "share",
) =>
  ceflix("watch-earn/engage", {
    method: "POST",
    body: { token, video: Number(video), action },
    token,
  }).then((j) => (j?.data ?? null) as WatchEarnEngageResponse | null);

export const getWatchEarnWallet = (token: string) =>
  ceflix("watch-earn/wallet", { method: "POST", body: { token }, token }).then(
    (j) => {
      const data = j?.data as WatchEarnWallet;
      rememberWatchEarnConfig(data?.config);
      return data;
    },
  );

export const setWatchEarnWalletAddress = (token: string, walletAddress: string) =>
  ceflix("watch-earn/wallet/address", {
    method: "POST",
    body: { token, wallet_address: walletAddress.trim() },
    token,
  }).then((j) => String(j?.data?.wallet_address ?? walletAddress));

export type WatchEarnSwapResult = {
  message?: string;
  swap: WatchEarnSwap;
  balance_esport: number;
};

export const swapWatchEarnEsport = (token: string, esport: number) =>
  ceflix("watch-earn/swap", {
    method: "POST",
    body: { token, esport: roundEsport(esport) },
    token,
  }).then(
    (j) =>
      ({
        message: j?.message,
        swap: j?.data?.swap,
        balance_esport: Number(j?.data?.balance_esport ?? 0),
      }) as WatchEarnSwapResult,
  );

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Query key for the signed-in viewer's wallet; keyed by token, never persisted. */
export const watchEarnWalletKey = (token: string) =>
  ["watch-earn-wallet", token] as const;

/** Query key for the public terms document. */
export const watchEarnTermsKey = ["watch-earn-terms"] as const;
