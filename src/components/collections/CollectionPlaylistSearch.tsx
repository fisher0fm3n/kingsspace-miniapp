"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  COLLECTION_SEARCH_MIN_LENGTH,
  searchCollectionPlaylists,
} from "@/lib/api";
import { clean, fixCdn } from "@/lib/utils";
import { Img } from "@/components/Img";
import { Spinner } from "@/components/Skeletons";
import { SearchIcon } from "@/components/Icons";
import { VideoCountTag } from "./VideoCountTag";

/** Wait this long after the last keystroke before searching. */
const DEBOUNCE_MS = 250;

/** True once a search box holds enough text to show results instead of the page. */
export function isCollectionSearchActive(term: string) {
  return term.trim().length >= COLLECTION_SEARCH_MIN_LENGTH;
}

/**
 * Results for a collections search box: every playlist in every collection
 * whose title matches, with its video count and where it is filed.
 */
export function CollectionPlaylistSearch({ term }: { term: string }) {
  const [debounced, setDebounced] = useState(term.trim());

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [term]);

  const enabled = isCollectionSearchActive(debounced);

  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ["collections-search", debounced.toLowerCase()],
    queryFn: ({ signal }) => searchCollectionPlaylists(debounced, signal),
    enabled,
    staleTime: 1000 * 60 * 5,
    // Keep the last results on screen while the next keystroke's search runs,
    // instead of flashing a spinner between every letter.
    placeholderData: keepPreviousData,
  });

  const results = enabled ? (data ?? []) : [];
  const settling = term.trim() !== debounced || (isFetching && !data);

  return (
    <div className="pb-6">
      <div className="flex min-h-9 items-center justify-between gap-3 px-4 pb-2 text-[13px] text-subtext">
        <span className="truncate">
          {settling
            ? "Searching all playlists…"
            : `${results.length} playlist${results.length === 1 ? "" : "s"} matching “${term.trim()}”`}
        </span>
        {isFetching && <Spinner size={16} />}
      </div>

      {isError && !data ? (
        <div className="flex flex-col items-center gap-3 px-6 py-9 text-center text-sm text-subtext">
          <p>Couldn&apos;t search playlists.</p>
          <button
            onClick={() => refetch()}
            className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-white"
          >
            Try again
          </button>
        </div>
      ) : !settling && results.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-9 text-center text-sm text-subtext">
          <SearchIcon size={28} />
          <p>No playlists have a title matching that.</p>
        </div>
      ) : (
        results.map((result) => (
          <Link
            key={result.playlist_id}
            href={`/playlist/${result.playlist_id}`}
            className="flex items-center gap-3 px-4 py-2 active:bg-card"
          >
            <div className="relative aspect-video w-[136px] shrink-0 overflow-hidden rounded-lg bg-card">
              <Img
                src={fixCdn(result.thumbnail)}
                alt=""
                className="h-full w-full object-cover"
              />
              <VideoCountTag
                count={result.video_count}
                className="absolute bottom-1.5 right-1.5"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-[14.5px] font-semibold leading-5">
                {clean(result.title)}
              </p>
              <p className="mt-1 truncate text-[12.5px] text-subtext">
                {clean(result.collection?.title)}
              </p>
            </div>
          </Link>
        ))
      )}
    </div>
  );
}
