"use client";

import { useState } from "react";

// Thin <img> wrapper that avoids React's "empty string passed to src" warning
// and shows a neutral placeholder when the source is missing or fails to load.
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
  const [failed, setFailed] = useState(false);
  const valid = src && src !== "null" && src !== "undefined";

  if (!valid || failed) {
    return (
      <div
        aria-label={alt}
        className={`flex items-center justify-center bg-card2 ${className || ""}`}
        style={rounded ? { borderRadius: 9999 } : undefined}
      >
        <span className="text-subtext opacity-40">▶</span>
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
      onError={() => setFailed(true)}
    />
  );
}
