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
function fixCdn(url: string): string {
  return url.replace(
    "d3c5pcohbexzc4.cloudfront.net",
    "cdnvideos.ceflix.org",
  );
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

export function timeAgo(date?: string | number): string {
  if (!date) return "";
  const d = typeof date === "number" ? new Date(date * 1000) : new Date(date);
  const t = d.getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60000);
  const hr = Math.floor(diff / 3600000);
  const day = Math.floor(diff / 86400000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min${min === 1 ? "" : "s"} ago`;
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function isShort(item: VideoItem): boolean {
  return item?.isShort === "yes";
}
