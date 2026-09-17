"use client";

import Link from "next/link";
import { clean, fixCdn, timeAgo } from "@/lib/utils";
import { publicViewCountLabel } from "@/lib/views";
import {
  getPlaylistId,
  libraryVideoHref,
  playlistVideoCount,
} from "@/lib/library";
import { Img } from "@/components/Img";

/*
 * Tiles and rows for the user's own videos, playlists, likes and history.
 * Shelf cards sit in the horizontal rows on the "You" tab; list rows are the
 * full-width version the "View all" pages use. Port of the app's
 * components/profile/library.tsx.
 */

function videoMeta(item: any) {
  return [
    publicViewCountLabel(item?.numOfViews ?? item?.views),
    timeAgo(item?.uploadtime),
  ]
    .filter(Boolean)
    .join(" · ");
}

function playlistMeta(item: any) {
  const visibility = clean(item?.visibility || "public");
  const count = playlistVideoCount(item);
  return [
    visibility.charAt(0).toUpperCase() + visibility.slice(1),
    count ? `${count} video${count === 1 ? "" : "s"}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function videoTitleOf(item: any) {
  return clean(item?.videos_title || item?.title || "Untitled");
}

/** Sits over a playlist thumbnail, the way YouTube marks a playlist. */
function PlaylistCountBadge({ count }: { count: number }) {
  return (
    <span className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold text-white">
      <span aria-hidden>☰</span>
      {count}
    </span>
  );
}

// ------------------------------------------------------------------ shelves

export function VideoShelfCard({ item }: { item: any }) {
  const meta = videoMeta(item);
  return (
    <Link href={libraryVideoHref(item)} className="block w-[42%] max-w-[210px] shrink-0">
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-card">
        <Img src={fixCdn(item?.thumbnail)} alt="" className="h-full w-full object-cover" />
      </div>
      <p className="mt-2 line-clamp-2 text-[13.5px] font-medium leading-[18px]">
        {videoTitleOf(item)}
      </p>
      {meta && <p className="mt-0.5 truncate text-xs text-subtext">{meta}</p>}
    </Link>
  );
}

export function PlaylistShelfCard({ item }: { item: any }) {
  const count = playlistVideoCount(item);
  const id = getPlaylistId(item);
  return (
    <Link
      href={id ? `/playlist/${id}` : "#"}
      className="block w-[42%] max-w-[210px] shrink-0"
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-card">
        <Img
          src={fixCdn(item?.playlist_thumbnail)}
          alt=""
          className="h-full w-full object-cover"
        />
        {count > 0 && <PlaylistCountBadge count={count} />}
      </div>
      <p className="mt-2 line-clamp-2 text-[13.5px] font-medium leading-[18px]">
        {clean(item?.playlist_title || "Untitled playlist")}
      </p>
      <p className="mt-0.5 truncate text-xs text-subtext">{playlistMeta(item)}</p>
    </Link>
  );
}

// --------------------------------------------------------------------- rows

export function VideoListRow({ item }: { item: any }) {
  const meta = videoMeta(item);
  return (
    <Link
      href={libraryVideoHref(item)}
      className="flex items-start gap-3 px-4 py-2 active:bg-card"
    >
      <div className="aspect-video w-[148px] shrink-0 overflow-hidden rounded-[10px] bg-card">
        <Img src={fixCdn(item?.thumbnail)} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="line-clamp-2 text-[14.5px] font-medium leading-5">
          {videoTitleOf(item)}
        </p>
        {meta && <p className="mt-1 truncate text-[12.5px] text-subtext">{meta}</p>}
      </div>
    </Link>
  );
}

export function PlaylistListRow({ item }: { item: any }) {
  const count = playlistVideoCount(item);
  const id = getPlaylistId(item);
  return (
    <Link
      href={id ? `/playlist/${id}` : "#"}
      className="flex items-start gap-3 px-4 py-2 active:bg-card"
    >
      <div className="relative aspect-video w-[148px] shrink-0 overflow-hidden rounded-[10px] bg-card">
        <Img
          src={fixCdn(item?.playlist_thumbnail)}
          alt=""
          className="h-full w-full object-cover"
        />
        {count > 0 && <PlaylistCountBadge count={count} />}
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="line-clamp-2 text-[14.5px] font-medium leading-5">
          {clean(item?.playlist_title || "Untitled playlist")}
        </p>
        <p className="mt-1 truncate text-[12.5px] text-subtext">{playlistMeta(item)}</p>
      </div>
    </Link>
  );
}
