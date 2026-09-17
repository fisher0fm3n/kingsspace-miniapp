/**
 * View-count display rules, shared with the KingsSpace app (utils/views.ts)
 * and website (app/lib/views.ts).
 *
 * A low view count reads as "nobody watched this" and discourages the click,
 * so public surfaces only show the number once a video has real traction.
 * Below the threshold the count is withheld rather than shown as a small
 * number - the watch page offers it behind a tap instead.
 *
 * These helpers are for *video view counts* only. Follower counts, channel
 * totals and a creator's own studio stats are unaffected.
 */

/** Views below this are not shown unprompted. */
export const VIEW_COUNT_MIN_DISPLAY = 1000;

/** Tolerant parse - the API sends these as number or string depending on age. */
export function parseViewCount(value: unknown): number {
  const n =
    typeof value === "number" ? value : parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Whether this count is high enough to show without being asked. */
export function hasPublicViewCount(value: unknown): boolean {
  return parseViewCount(value) >= VIEW_COUNT_MIN_DISPLAY;
}

/** "1.2K" - always formats, regardless of threshold. */
export function formatViewCount(value: unknown): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(parseViewCount(value));
}

/** "1.2K views" - always formats, regardless of threshold. */
export function viewCountText(value: unknown): string {
  const n = parseViewCount(value);
  return `${formatViewCount(n)} ${n === 1 ? "view" : "views"}`;
}

/**
 * "1.2K views", or null when the video has too few to show publicly.
 *
 * Returning null rather than an empty string lets callers drop the segment
 * from a dot-separated meta line without leaving a stray separator.
 */
export function publicViewCountLabel(value: unknown): string | null {
  return hasPublicViewCount(value) ? viewCountText(value) : null;
}
