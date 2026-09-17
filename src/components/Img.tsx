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
}: {
  src?: string | null;
  alt?: string;
  className?: string;
  rounded?: boolean;
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
