"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  countVideoView,
  type HomePopup,
  type HomePopupLanguage,
} from "@/lib/api";
import { clean } from "@/lib/utils";
import { HlsVideo } from "@/components/HlsVideo";
import { CloseIcon } from "@/components/Icons";

/**
 * The popup that opens over Home when the admin has one switched on. Same
 * content as the app and website: a LIVE badge and title, the player, then a
 * scrolling row of language buttons that swap the stream, with an arrow at
 * whichever edge still hides languages. Closing it only closes it for this
 * visit; it opens again the next time Home loads.
 */
export function HomePopupModal({
  popup,
  onClose,
}: {
  popup: HomePopup;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<HomePopupLanguage | null>(null);
  const streamUrl = selected?.url || popup.url;
  const isLive = popup.isLive || /\.m3u8(\?|$)/i.test(streamUrl);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Keep the page behind from scrolling while the popup is up.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const rowRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollHints = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollWidth - el.clientWidth - el.scrollLeft > 4);
  }, []);

  useEffect(() => {
    // Measured on the next frame, once the row has laid out.
    const frame = requestAnimationFrame(updateScrollHints);
    window.addEventListener("resize", updateScrollHints);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateScrollHints);
    };
  }, [popup, updateScrollHints]);

  const scrollLanguages = (direction: -1 | 1) => {
    const el = rowRef.current;
    if (!el) return;
    el.scrollBy({
      left: direction * Math.round(el.clientWidth * 0.6),
      behavior: "smooth",
    });
  };

  const pick = (language: HomePopupLanguage | null) => {
    setSelected(language);
    if (popup.videoId) {
      countVideoView(
        language?.video_id ?? popup.videoId,
        language?.translation ?? null,
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={clean(popup.title)}
    >
      <div
        className="w-full max-w-[456px] overflow-hidden rounded-2xl border border-border bg-background"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-border px-3.5 py-3">
          {isLive && (
            <span className="inline-flex items-center gap-1 rounded-md bg-[#dc2626] px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden />
              LIVE
            </span>
          )}
          <p className="min-w-0 flex-1 truncate text-[15px] font-semibold">
            {clean(popup.title)}
            {selected && (
              <span className="text-subtext"> • {selected.translation}</span>
            )}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="aspect-video w-full bg-black">
          <HlsVideo
            key={streamUrl}
            src={streamUrl}
            poster={popup.thumbnail || undefined}
            controls
            playsInline
            className="h-full w-full bg-black object-contain"
          />
        </div>

        {popup.languages.length > 0 && (
          <div className="pb-3.5 pt-3">
            <p className="mb-2 px-3.5 text-xs font-semibold text-subtext">
              Available languages
            </p>
            <div className="relative">
              <div
                ref={rowRef}
                onScroll={updateScrollHints}
                className="popup-languages flex gap-2 overflow-x-auto px-3.5 pb-2"
              >
                <LanguageChip
                  label="Default"
                  active={selected === null}
                  onClick={() => pick(null)}
                />
                {popup.languages.map((language) => (
                  <LanguageChip
                    key={String(language.id)}
                    label={language.translation}
                    active={selected?.id === language.id}
                    onClick={() => pick(language)}
                  />
                ))}
              </div>

              {canScrollLeft && (
                <button
                  type="button"
                  onClick={() => scrollLanguages(-1)}
                  aria-label="Scroll languages left"
                  className="absolute left-0 top-0 flex h-[calc(100%-0.5rem)] w-8 items-center justify-start bg-gradient-to-r from-background to-transparent pl-1 text-subtext"
                >
                  ‹
                </button>
              )}
              {canScrollRight && (
                <button
                  type="button"
                  onClick={() => scrollLanguages(1)}
                  aria-label="Scroll languages right"
                  className="absolute right-0 top-0 flex h-[calc(100%-0.5rem)] w-8 items-center justify-end bg-gradient-to-l from-background to-transparent pr-1 text-subtext"
                >
                  ›
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LanguageChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold"
      style={{
        background: active ? "var(--primary)" : "var(--card)",
        color: active ? "#fff" : "var(--text)",
      }}
    >
      {label}
    </button>
  );
}
