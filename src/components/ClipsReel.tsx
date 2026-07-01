"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getClips, likeVideo } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { ClipItem } from "@/lib/types";
import { clean } from "@/lib/utils";
import { Spinner } from "@/components/Skeletons";
import { Img } from "@/components/Img";
import { HeartIcon, CommentIcon, ShareIcon } from "@/components/Icons";

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
    comments: Number(item?.comments ?? item?.comment_count) || 0,
    liked: Boolean(item?.liked ?? item?.isLiked),
    isSubscribed: Boolean(item?.isSubscribed ?? item?.subscribed),
    channel: {
      id: channel?.id ?? item?.channel_id ?? "unknown",
      channel: channel?.channel ?? item?.channel_name ?? "channel",
      url: channel?.url ?? channel?.thumbnail ?? item?.channel_thumbnail ?? "",
    },
  };
}

function ClipSlide({ clip, active }: { clip: ClipItem; active: boolean }) {
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
        <div className="flex flex-col items-center">
          <CommentIcon size={28} />
          <span className="text-xs">{clip.comments || 0}</span>
        </div>
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
export function ClipsReel({ selectedId }: { selectedId?: string | null }) {
  const [clips, setClips] = useState<ClipItem[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (nextOffset: number, first: boolean) => {
      const raw = await getClips(nextOffset, 10, first ? selectedId : null);
      const items = raw.map(normalizeClip).filter(Boolean) as ClipItem[];
      setClips((prev) => {
        const seen = new Set(prev.map((c) => String(c.id)));
        const merged = first
          ? items
          : [...prev, ...items.filter((c) => !seen.has(String(c.id)))];
        return merged;
      });
      setOffset(nextOffset + 10);
      setLoading(false);
    },
    [selectedId],
  );

  useEffect(() => {
    setClips([]);
    setActive(0);
    setLoading(true);
    load(0, true);
  }, [load]);

  const onScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / el.clientHeight);
    setActive(idx);
    if (idx >= clips.length - 2) load(offset, false);
  }, [clips.length, offset, load]);

  if (loading)
    return (
      <div className="flex h-full items-center justify-center bg-black">
        <Spinner size={30} />
      </div>
    );

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      className="no-scrollbar h-full snap-y snap-mandatory overflow-y-scroll bg-black"
    >
      {clips.map((clip, i) => (
        <ClipSlide key={`${clip.id}-${i}`} clip={clip} active={i === active} />
      ))}
    </div>
  );
}
