"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getCollectionPlaylists } from "@/lib/api";
import { clean, fixCdn, timeAgo } from "@/lib/utils";
import { Spinner } from "@/components/Skeletons";
import { Img } from "@/components/Img";
import { BackIcon, SearchIcon } from "@/components/Icons";
import { VideoCountTag } from "@/components/collections/VideoCountTag";
import {
  CollectionPlaylistSearch,
  isCollectionSearchActive,
} from "@/components/collections/CollectionPlaylistSearch";

/*
 * A collection is its playlists.
 *
 * There used to be a middle layer - Collection -> Sections -> Playlists - and
 * this page was a grid of section tiles that each opened another page. Now it
 * opens straight onto every playlist in the collection, each a titled
 * section with every one of its videos laid out as a two-column grid
 * underneath - nothing hidden behind a sideways scroll - so "Rhapsody" is
 * one tap from watching rather than two.
 */

function PlaylistSection({ item }: { item: any }) {
  const playlist = item?.playlist;
  const videos: any[] = Array.isArray(playlist?.videos) ? playlist.videos : [];
  if (!playlist || videos.length === 0) return null;

  const playlistId = playlist.id || item.playlist_id;

  return (
    <section className="mb-9">
      <div className="mb-3 flex items-center gap-3 px-4">
        <div className="min-w-0 flex-1">
          <Link href={`/playlist/${playlistId}`}>
            <h2 className="line-clamp-2 text-lg font-bold tracking-tight">
              {clean(item.title || playlist.title)}
            </h2>
          </Link>
          <VideoCountTag
            // Older API responses have no count; the list itself is exact.
            count={item.video_count ?? videos.length}
            className="mt-1.5"
          />
        </div>
        <Link
          href={`/playlist/${playlistId}`}
          className="flex shrink-0 items-center text-sm font-semibold"
        >
          Play all <span className="ml-0.5 text-base">›</span>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-[18px] px-4">
        {videos.map((v: any, i: number) => (
          <Link
            key={`${playlistId}-${v.id}-${i}`}
            href={`/watch/${v.id}`}
            className="block min-w-0"
          >
            <div className="relative aspect-video w-full overflow-hidden rounded-[10px] bg-card">
              <Img
                backdrop
                src={fixCdn(v.thumbnail)}
                alt={clean(v.videos_title || v.title)}
                className="h-full w-full"
              />
              {String(v.isLive) === "1" && (
                <span className="absolute bottom-2 left-2 rounded bg-[#dc2626] px-1.5 py-0.5 text-[10px] font-bold text-white">
                  LIVE
                </span>
              )}
            </div>
            <div className="mt-2">
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-medium leading-5">
                  {clean(v.videos_title || v.title || "Untitled")}
                </p>
                <p className="mt-0.5 truncate text-xs text-subtext">
                  {[clean(v.channel), timeAgo(v.uploadtime)]
                    .filter(Boolean)
                    .join(" • ")}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function CollectionDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [term, setTerm] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["collection-playlists", id],
    queryFn: () => getCollectionPlaylists(id),
    staleTime: 1000 * 60 * 10,
  });

  const collection = data?.collection;

  // A playlist whose videos no longer resolve has nothing to show.
  const playlists = useMemo(
    () =>
      (data?.items ?? []).filter(
        (it: any) =>
          it?.playlist &&
          Array.isArray(it.playlist.videos) &&
          it.playlist.videos.length > 0,
      ),
    [data],
  );

  // Typing searches every playlist in every collection, not just this one.
  const searching = isCollectionSearchActive(term);

  if (isLoading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Spinner size={30} />
      </div>
    );

  return (
    <div className="pb-10">
      {/* Hero */}
      <div className="relative h-[280px] w-full bg-[#111]">
        <Img
          src={fixCdn(collection?.cover || collection?.thumbnail)}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-black/80" />
        <button
          onClick={() => router.back()}
          aria-label="Back"
          className="absolute left-3.5 top-5 flex h-[42px] w-[42px] items-center justify-center rounded-lg bg-black/50 text-white"
        >
          <BackIcon size={24} />
        </button>
        <div className="absolute inset-x-[18px] bottom-4">
          {collection?.thumbnail && (
            <div className="mb-3 flex h-[62px] w-[62px] items-center justify-center overflow-hidden rounded-[14px] bg-white/90 p-1.5">
              <Img
                src={fixCdn(collection.thumbnail)}
                alt=""
                className="h-full w-full object-contain"
              />
            </div>
          )}
          <h1 className="line-clamp-2 text-[26px] font-bold leading-[30px] tracking-tight text-white">
            {clean(collection?.title)}
          </h1>
          {playlists.length > 0 && (
            <p className="mt-1.5 text-[13px] font-medium text-white/80">
              {playlists.length} playlist{playlists.length === 1 ? "" : "s"}
            </p>
          )}
        </div>
      </div>

      {collection?.description && (
        <p className="px-[18px] pt-4 text-sm leading-5 text-subtext">
          {clean(collection.description)}
        </p>
      )}

      {/* Search */}
      <div className="px-[18px] pb-1.5 pt-3.5">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5">
          <SearchIcon size={18} />
          <input
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search all playlists"
            autoComplete="off"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-subtext"
          />
        </div>
      </div>

      {searching ? (
        <CollectionPlaylistSearch term={term} />
      ) : playlists.length > 0 ? (
        <div className="pt-3">
          {playlists.map((it: any, i: number) => (
            <PlaylistSection key={`${it.id}-${i}`} item={it} />
          ))}
        </div>
      ) : (
        <p className="p-10 text-center text-subtext">
          {error ? "Unable to load this collection." : "No playlists yet."}
        </p>
      )}
    </div>
  );
}
