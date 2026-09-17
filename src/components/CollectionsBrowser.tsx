"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getCollections } from "@/lib/api";
import type { Collection } from "@/lib/types";
import { clean } from "@/lib/utils";
import { PlayIcon, SearchIcon } from "@/components/Icons";
import { Img } from "@/components/Img";
import {
  CollectionPlaylistSearch,
  isCollectionSearchActive,
} from "@/components/collections/CollectionPlaylistSearch";

/**
 * Collections, mirroring the app's Collections tab: a grid of square covers,
 * each a door into its playlists, and a search box that looks across every
 * playlist in every collection rather than filtering these cards.
 */
export function CollectionsBrowser() {
  const { data, isLoading, error } = useQuery<Collection[]>({
    queryKey: ["collections"],
    queryFn: getCollections,
    staleTime: 1000 * 60 * 10,
  });

  const [term, setTerm] = useState("");
  const collections = data ?? [];
  const searching = isCollectionSearchActive(term);

  return (
    <div className="pt-4">
      <div className="mx-4 mb-4 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5">
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

      {searching ? (
        <CollectionPlaylistSearch term={term} />
      ) : isLoading ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 px-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton aspect-square w-full rounded-md" />
          ))}
        </div>
      ) : collections.length === 0 ? (
        <p className="py-12 text-center text-subtext">
          {error ? "Unable to load collections." : "No collections found."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 px-4 pb-4">
          {collections.map((c) => (
            <Link key={c.id} href={`/collections/${c.id}`} className="block">
              <div className="relative aspect-square w-full overflow-hidden rounded bg-card">
                <Img
                  src={c.cover || c.thumbnail}
                  alt={clean(c.title)}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-black/10" />
                {/* A call to action, not a statistic: the card is a door into
                    the collection's playlists. */}
                <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11.5px] font-semibold text-white">
                  <PlayIcon size={11} />
                  Watch Videos
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-[15px] font-bold leading-5 tracking-tight">
                {clean(c.title)}
              </p>
              {c.description && (
                <p className="mt-1 line-clamp-2 text-xs leading-4 text-subtext">
                  {clean(c.description)}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
