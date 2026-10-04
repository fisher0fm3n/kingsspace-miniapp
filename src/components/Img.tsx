"use client";

import { useState } from "react";

/**
 * An image that is never blank. Mirrors the app's components/ui/Thumbnail.
 *
 * A thumbnail whose URL is missing, empty, a bare filename, or fails to load
 * used to leave an empty box, which reads as a hole in the grid. This always
 * paints a filled tile: the artwork when it loads, and a faint KingsSpace
 * mark when it does not.
 */
function isUsableSrc(src?: string | null) {
  const value = String(src ?? "").trim();
  return (
    value.length > 0 &&
    value !== "null" &&
    value !== "undefined" &&
    // Some rows carry a bare filename rather than a URL.
    (value.startsWith("http") ||
      value.startsWith("data:") ||
      value.startsWith("blob:") ||
      value.startsWith("/"))
  );
}

export function Img({
  src,
  alt = "",
  className,
  rounded,
  backdrop = false,
}: {
  src?: string | null;
  alt?: string;
  className?: string;
  rounded?: boolean;
  /**
   * Video thumbnails: show the whole frame (object-contain) and fill the
   * leftover band with a blurred, darkened copy of the same image. Matches
   * the app's Thumbnail. The backdrop reuses the same URL, so the browser
   * serves it from cache, and is drawn at a quarter size then scaled 4x to
   * keep the blur cheap. Off by default: avatars, logos, banners and cover
   * art should keep filling their frame.
   */
  backdrop?: boolean;
}) {
  // Keyed to the src that failed, so a reused element with a new src
  // starts clean.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const valid = isUsableSrc(src) && failedSrc !== src;

  if (!valid) {
    return (
      <div
        aria-label={alt || undefined}
        role={alt ? "img" : undefined}
        className={`flex items-center justify-center overflow-hidden bg-card2 ${className || ""}`}
        style={rounded ? { borderRadius: 9999 } : undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-icon.png"
          alt=""
          aria-hidden
          className="h-[34%] max-h-10 w-[34%] max-w-10 object-contain opacity-30"
        />
      </div>
    );
  }

  if (backdrop) {
    return (
      <span className="relative block h-full w-full overflow-hidden">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src as string}
            alt=""
            loading="lazy"
            className="absolute left-[37.5%] top-[37.5%] h-1/4 w-1/4 scale-[4] object-cover blur-[3px]"
          />
          <span className="absolute inset-0 bg-black/25" />
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src as string}
          alt={alt}
          loading="lazy"
          className={`relative h-full w-full object-contain ${className || ""}`}
          onError={() => setFailedSrc(src as string)}
        />
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src as string}
      alt={alt}
      loading="lazy"
      className={className}
      onError={() => setFailedSrc(src as string)}
    />
  );
}
