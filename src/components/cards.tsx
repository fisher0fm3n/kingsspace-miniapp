"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { VideoItem } from "@/lib/types";
import {
  channelThumb,
  clean,
  isShort,
  timeAgo,
  videoThumb,
  videoTitle,
} from "@/lib/utils";
import { Img as Thumb } from "./Img";

export function videoHref(item: VideoItem): string {
  const id = item.videoId || item.id;
  if (isShort(item)) return `/clips?id=${id}`;
  return `/watch/${id}`;
}

/** Wide 16:9 card used in the home sliders. */
export function VideoCard({
  item,
  width = 260,
}: {
  item: VideoItem;
  width?: number | string;
}) {
  const router = useRouter();
  const channelId = item.channelId || item.channel_id;
  return (
    <Link href={videoHref(item)} className="block shrink-0" style={{ width }}>
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-card">
        <Thumb
          src={videoThumb(item)}
          alt={videoTitle(item)}
          className="h-full w-full object-cover"
        />
        {Number(item.isLive) === 1 && (
          <span className="absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-bold text-primary">
            LIVE
          </span>
        )}
      </div>
      <div className="mt-2.5 flex gap-2.5">
        <button
          onClick={(e) => {
            e.preventDefault();
            if (channelId) router.push(`/channel/${channelId}`);
          }}
          className="shrink-0"
        >
          <Thumb
            src={channelThumb(item)}
            alt={clean(item.channel)}
            className="h-9 w-9 rounded-full bg-card object-cover"
          />
        </button>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium leading-5">
            {videoTitle(item)}
          </p>
          <p className="mt-1 truncate text-xs text-subtext">
            {clean(item.channel)}
          </p>
        </div>
      </div>
    </Link>
  );
}

/** Vertical 2:3 clip / short card. */
export function ClipCard({ item, width = 150 }: { item: VideoItem; width?: number }) {
  const id = item.videoId || item.id;
  return (
    <Link href={`/clips?id=${id}`} className="block shrink-0" style={{ width }}>
      <div
        className="relative overflow-hidden rounded-xl bg-card"
        style={{ height: width * 1.55 }}
      >
        <Thumb
          src={videoThumb(item)}
          alt={videoTitle(item)}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        <p className="absolute inset-x-2.5 bottom-3 line-clamp-2 text-xs font-bold text-white">
          {videoTitle(item)}
        </p>
      </div>
    </Link>
  );
}

/** News / community post card (full-bleed). */
export function CommunityPostCard({ item }: { item: VideoItem }) {
  const body = (
    <>
      <div className="flex items-center gap-2.5 px-4">
        <Thumb
          src={item.imgChannel}
          alt={item.channel || "News"}
          className="h-10 w-10 rounded-full bg-card2 object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{item.channel || "News"}</p>
          <p className="truncate text-xs text-subtext">{timeAgo(item.date)}</p>
        </div>
      </div>
      <p className="mt-2.5 line-clamp-3 px-4 text-[15px] leading-6">
        {clean(item.body || item.description)}
      </p>
      {item.imgUrl && (
        <Thumb
          src={item.imgUrl}
          alt={clean(item.title)}
          className="mt-2.5 aspect-[16/10] w-full bg-card2 object-cover"
        />
      )}
    </>
  );
  if (item.link) {
    return (
      <a href={item.link} target="_blank" rel="noreferrer" className="block">
        {body}
      </a>
    );
  }
  return <div>{body}</div>;
}

/** Horizontal scroller with a section title. */
export function SectionSlider({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 px-4 text-xl font-bold tracking-tight">
        {clean(title)}
      </h2>
      <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-1">
        {children}
      </div>
    </section>
  );
}
