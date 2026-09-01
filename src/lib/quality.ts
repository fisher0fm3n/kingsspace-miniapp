/**
 * One selectable encoded quality of a video, as returned by the API's
 * `qualities` array.
 *
 * Videos uploaded before the rendition ladder shipped return either a single
 * entry labelled "Auto" with zeroed dimensions pointing at the original upload,
 * or an empty array.
 */
export type VideoQuality = {
  label: string;
  width: number;
  height: number;
  bitrate_kbps: number;
  url: string;
};

export const PREFERRED_QUALITY_KEY = "kingsspace.preferred_quality";

export function getPreferredQuality(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(PREFERRED_QUALITY_KEY);
}

export function setPreferredQuality(label: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFERRED_QUALITY_KEY, label);
  } catch {
    /* storage full / blocked — the choice just won't persist */
  }
}

/**
 * The selectable qualities for a video.
 *
 * Most of the library predates the rendition ladder. Those videos still get a
 * one-entry list built from the playback URL, so the control is present on
 * every video and can say what is actually being played instead of vanishing.
 */
export function buildQualityList(
  video: { qualities?: unknown } | null | undefined,
  fallbackUrl: string,
): VideoQuality[] {
  const listed = Array.isArray(video?.qualities)
    ? (video.qualities as VideoQuality[]).filter((q) => q?.url)
    : [];

  if (listed.length > 0) return listed;

  if (!fallbackUrl) return [];

  return [
    {
      label: "Auto",
      width: 0,
      height: 0,
      bitrate_kbps: 0,
      url: fallbackUrl,
    },
  ];
}

/**
 * Pick the quality to start on: the viewer's remembered choice when that label
 * still exists for this video, otherwise the configured default, otherwise the
 * highest available.
 */
export function resolveInitialQuality(
  qualities: VideoQuality[],
  preferredLabel: string | null,
  fallbackLabel = "720p",
): VideoQuality | null {
  if (!qualities.length) return null;

  if (preferredLabel) {
    const remembered = qualities.find((q) => q.label === preferredLabel);
    if (remembered) return remembered;
  }

  const fallback = qualities.find((q) => q.label === fallbackLabel);
  if (fallback) return fallback;

  return qualities[qualities.length - 1];
}

/** Human-readable bitrate line under each option. */
export function describeQuality(quality: VideoQuality): string {
  if (!quality.bitrate_kbps) return "Original upload";

  if (quality.bitrate_kbps >= 1000) {
    return `${(quality.bitrate_kbps / 1000).toFixed(1)} Mbps`;
  }

  return `${quality.bitrate_kbps} kbps`;
}
