import { formatVideoCount } from "@/lib/utils";

/**
 * A small "24 videos" tag. It sits over artwork, so it carries its own dark
 * backing. Renders nothing without a usable count.
 */
export function VideoCountTag({
  count,
  className = "",
}: {
  count: unknown;
  className?: string;
}) {
  const label = formatVideoCount(count);
  if (!label) return null;

  return (
    <span
      aria-label={label}
      className={`inline-flex items-center gap-1 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold text-white ${className}`}
    >
      <span aria-hidden className="text-[9px]">
        ▶
      </span>
      {label}
    </span>
  );
}
