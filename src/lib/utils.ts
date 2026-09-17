import type { VideoItem } from "./types";

// Strip HTML entities / tags coming from the WordPress-style API + RSS feeds.
export function clean(value: unknown): string {
  return String(value ?? "")
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8221;/g, '"')
    .replace(/&#8220;/g, '"')
    .replace(/&hellip;/g, "...")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/<[^>]*>/g, "")
    .trim();
}

export function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

export function videoTitle(item: VideoItem): string {
  return clean(item.videos_title || item.title || "Untitled video");
}

export function videoThumb(item: VideoItem): string {
  return (
    item.imgUrl ||
    item.thumbnail ||
    item.imgChannel ||
    item.channel_image ||
    ""
  );
}

// The `d3c5pcohbexzc4.cloudfront.net` CDN is dead; the same assets are served
// from cdnvideos.ceflix.org. Rewrite the host so avatars/thumbnails resolve.
// Also upgrade http:// → https:// — many profile/thumbnail URLs come back as
// http (e.g. S3 avatars), which browsers block as mixed content when the app
// is served over https, so they silently fail to load.
export function fixCdn(url: unknown): string {
  return String(url ?? "")
    .replace("d3c5pcohbexzc4.cloudfront.net", "cdnvideos.ceflix.org")
    .replace(/^http:\/\//i, "https://");
}

// Resolve a subscription channel object's avatar: explicit url, else prefix+file.
export function channelAvatar(ch: any): string {
  if (ch?.url) return fixCdn(ch.url);
  if (ch?.urlprefix && ch?.filename)
    return fixCdn(`${clean(ch.urlprefix)}${clean(ch.filename)}`);
  return "";
}

export function channelThumb(item: any): string {
  // The video API exposes the channel avatar as prefix + filename parts.
  if (item?.channel_prefix && item?.channel_file)
    return fixCdn(`${clean(item.channel_prefix)}${clean(item.channel_file)}`);
  const ch = item?.channel;
  const url =
    item?.channel_thumbnail ||
    item?.channel_image ||
    (ch && typeof ch === "object" ? ch.url || ch.thumbnail : "") ||
    item?.imgChannel ||
    item?.imgUrl ||
    "";
  return url ? fixCdn(url) : "";
}

export function videoUrl(item: any): string {
  return clean(
    item?.url ||
      item?.ios_url ||
      item?.video_url ||
      item?.videoUrl ||
      item?.file ||
      item?.src,
  );
}

export function formatViews(n: unknown): string {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return "";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}M views`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1).replace(/\.0$/, "")}K views`;
  return `${v} view${v === 1 ? "" : "s"}`;
}

/**
 * Relative age: "Just now", "3 days ago", "2 months ago".
 *
 * Accepts the API's epoch seconds as a number or numeric string (milliseconds
 * are tolerated), or a date string. Empty when unknown or in the future.
 */
export function timeAgo(date?: string | number | null): string {
  if (date === undefined || date === null || date === "") return "";

  let ms: number;
  const numeric = typeof date === "number" ? date : /^\d+$/.test(String(date).trim()) ? Number(date) : NaN;
  if (Number.isFinite(numeric)) {
    if (numeric <= 0) return "";
    ms = numeric > 1e12 ? numeric : numeric * 1000;
  } else {
    ms = new Date(String(date)).getTime();
  }
  if (Number.isNaN(ms)) return "";

  const diff = Date.now() - ms;
  if (diff < 0) return "";

  const min = Math.floor(diff / 60000);
  const hr = Math.floor(diff / 3600000);
  const day = Math.floor(diff / 86400000);
  const week = Math.floor(day / 7);
  const month = Math.floor(day / 30);
  const year = Math.floor(day / 365);

  if (min < 1) return "Just now";
  if (min < 60) return `${min} min${min === 1 ? "" : "s"} ago`;
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
  if (week < 5) return `${week} week${week === 1 ? "" : "s"} ago`;
  if (month < 12) return `${month} month${month === 1 ? "" : "s"} ago`;
  return `${year} year${year === 1 ? "" : "s"} ago`;
}

export function isShort(item: VideoItem): boolean {
  return item?.isShort === "yes";
}

/**
 * "1 video" / "24 videos". Returns null when the API did not send a count, so
 * a tag is simply not shown against an older API rather than reading "0".
 */
export function formatVideoCount(count: unknown): string | null {
  const n = Number(count);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `${n} video${n === 1 ? "" : "s"}`;
}
