"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getClips, likeVideo } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { ClipItem } from "@/lib/types";
import { clean } from "@/lib/utils";
import { loadViewedClipIds, rememberViewedClip } from "@/lib/clipHistory";
import { Spinner } from "@/components/Skeletons";
import { Img } from "@/components/Img";
import { HeartIcon, CommentIcon, ShareIcon } from "@/components/Icons";
import { ClipComments } from "@/components/ClipComments";

function normalizeClip(item: any): ClipItem | null {
  const id = item?.id;
  const url = item?.url || item?.ios_url;
  if (!id || !url) return null;
  const channel = item?.channel ?? {};
  return {
    ...item,
    id,
    url,
    videos_title: item?.videos_title ?? "",
    title: item?.videos_title ?? "",
    likes: Number(item?.likes) || 0,
    // The shorts payload spells this `numOfComments`; the other two are only
    // fallbacks in case the field is ever renamed.
    comments:
      Number(item?.numOfComments ?? item?.comments ?? item?.comment_count) || 0,
    liked: Boolean(item?.liked ?? item?.isLiked),
    isSubscribed: Boolean(item?.isSubscribed ?? item?.subscribed),
    channel: {
      id: channel?.id ?? item?.channel_id ?? "unknown",
      channel: channel?.channel ?? item?.channel_name ?? "channel",
      url: channel?.url ?? channel?.thumbnail ?? item?.channel_thumbnail ?? "",
    },
  };
}

function ClipSlide({
  clip,
  active,
  onOpenComments,
}: {
  clip: ClipItem;
  active: boolean;
  onOpenComments: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const { token, isLoggedIn } = useAuth();
  const [liked, setLiked] = useState(clip.liked);
  const [likes, setLikes] = useState(clip.likes);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (active) {
      v.play().catch(() => {});
    } else {
      v.pause();
      v.currentTime = 0;
    }
  }, [active]);

  const toggleLike = useCallback(async () => {
    if (!isLoggedIn) return;
    const next = !liked;
    setLiked(next);
    setLikes((n) => n + (next ? 1 : -1));
    try {
      await likeVideo(clip.id, token);
    } catch {
      setLiked(!next);
      setLikes((n) => n + (next ? -1 : 1));
    }
  }, [liked, isLoggedIn, token, clip.id]);

  return (
    <div className="relative h-full w-full snap-start snap-always bg-black">
      <video
        ref={ref}
        src={clip.url}
        className="h-full w-full object-cover"
        loop
        playsInline
        onClick={(e) => {
          const v = e.currentTarget;
          if (v.paused) v.play();
          else v.pause();
        }}
      />
      {/* Right action rail */}
      <div className="absolute bottom-24 right-3 flex flex-col items-center gap-5 text-white">
        <button onClick={toggleLike} className="flex flex-col items-center">
          <HeartIcon
            size={30}
            style={{
              fill: liked ? "var(--primary)" : "none",
              color: liked ? "var(--primary)" : "#fff",
            }}
          />
          <span className="text-xs">{likes}</span>
        </button>
        <button
          onClick={onOpenComments}
          className="flex flex-col items-center"
          aria-label="Comments"
        >
          <CommentIcon size={28} />
          <span className="text-xs">{clip.comments || 0}</span>
        </button>
        <button
          onClick={() => {
            if (navigator.share)
              navigator
                .share({ title: clip.title, url: location.href })
                .catch(() => {});
          }}
          className="flex flex-col items-center"
        >
          <ShareIcon size={26} />
          <span className="text-xs">Share</span>
        </button>
      </div>
      {/* Bottom meta */}
      <div className="absolute inset-x-0 bottom-6 px-4 pr-20 text-white">
        <Link
          href={`/channel/${clip.channel.id}`}
          className="flex items-center gap-2"
        >
          {clip.channel.url && (
            <Img
              src={clip.channel.url}
              alt=""
              className="h-9 w-9 rounded-full border border-white/40 object-cover"
            />
          )}
          <span className="font-bold">@{clean(clip.channel.channel)}</span>
        </Link>
        <p className="mt-2 line-clamp-2 text-sm">{clean(clip.title)}</p>
      </div>
    </div>
  );
}

/**
 * Vertical snap-scrolling reel viewer. With no `selectedId` it opens the
 * feed (effectively a random reel); with one it starts from that clip.
 * Fills its parent — the parent controls the height (full screen or under tabs).
 */
const CLIPS_LIMIT = 10;

export function ClipsReel({ selectedId }: { selectedId?: string | null }) {
  const [clips, setClips] = useState<ClipItem[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [active, setActive] = useState(0);
  const [commentsClipId, setCommentsClipId] = useState<string | number | null>(
    null,
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // Every id served this visit. Sent back as `exclude` so the API pages by
  // what is already on screen instead of by offset - offset paging cannot work
  // against a ranking that changes as the viewer watches.
  const servedIdsRef = useRef<Set<string>>(new Set());
  const fetchingRef = useRef(false);

  const load = useCallback(
    async (nextOffset: number, first: boolean) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;

      const request = async (withHistory: boolean) => {
        const held = Array.from(servedIdsRef.current);
        const history = withHistory
          ? loadViewedClipIds().filter((id) => !servedIdsRef.current.has(id))
          : [];
        const raw = await getClips(
          nextOffset,
          CLIPS_LIMIT,
          first ? selectedId : null,
          [...held, ...history],
        );
        const items = raw.map(normalizeClip).filter(Boolean) as ClipItem[];
        // Only clips not already on screen count as progress.
        const fresh = items.filter((c) => !servedIdsRef.current.has(String(c.id)));
        return { fresh, usedHistory: history.length > 0 };
      };

      try {
        let { fresh, usedHistory } = await request(true);

        // Everything unseen is used up. Rather than a dead end, let clips
        // watched in earlier visits come round again - still never one that
        // is on screen right now.
        if (fresh.length === 0 && usedHistory) {
          ({ fresh } = await request(false));
        }

        fresh.forEach((c) => servedIdsRef.current.add(String(c.id)));
        setClips((prev) => (first ? fresh : [...prev, ...fresh]));
        setOffset(nextOffset + CLIPS_LIMIT);
        setHasMore(fresh.length > 0);
      } catch {
        if (first) setHasMore(false);
      } finally {
        fetchingRef.current = false;
        setLoading(false);
      }
    },
    [selectedId],
  );

  useEffect(() => {
    // A fresh reel: drop the previous one straight away so its clip does not
    // keep playing under the spinner.
    servedIdsRef.current.clear();
    setClips([]);
    setActive(0);
    setHasMore(true);
    setLoading(true);
    load(0, true);
  }, [load]);

  // Remember what has been watched, so the next visit starts somewhere new.
  useEffect(() => {
    const clip = clips[active];
    if (clip) rememberViewedClip(clip.id);
  }, [active, clips]);

  const onScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / el.clientHeight);
    setActive(idx);
    if (hasMore && idx >= clips.length - 2) load(offset, false);
  }, [clips.length, hasMore, offset, load]);

  if (loading)
    return (
      <div className="flex h-full items-center justify-center bg-black">
        <Spinner size={30} />
      </div>
    );

  return (
    <>
      <div
        ref={containerRef}
        onScroll={onScroll}
        className={`no-scrollbar h-full snap-y snap-mandatory bg-black ${
          // Freeze the reel while the sheet is open, so a swipe over the
          // backdrop cannot snap to another clip behind it.
          commentsClipId === null ? "overflow-y-scroll" : "overflow-hidden"
        }`}
      >
        {clips.map((clip, i) => (
          <ClipSlide
            key={`${clip.id}-${i}`}
            clip={clip}
            active={i === active}
            onOpenComments={() => setCommentsClipId(clip.id)}
          />
        ))}
      </div>

      {commentsClipId !== null && (
        <ClipComments
          clipId={commentsClipId}
          onClose={() => setCommentsClipId(null)}
          onCountChange={(total) =>
            setClips((prev) =>
              prev.map((c) =>
                c.id === commentsClipId ? { ...c, comments: total } : c,
              ),
            )
          }
        />
      )}
    </>
  );
}
