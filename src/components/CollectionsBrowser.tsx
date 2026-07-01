"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getCollections } from "@/lib/api";
import type { Collection } from "@/lib/types";
import { clean } from "@/lib/utils";
import { SearchIcon } from "@/components/Icons";
import { Img } from "@/components/Img";

/**
 * Collections browser mirroring the RN CollectionsScreen: a search field over a
 * 2-column grid of square (1:1) cover tiles with the title/description below.
 */
export function CollectionsBrowser() {
  const { data, isLoading } = useQuery<Collection[]>({
    queryKey: ["collections"],
    queryFn: getCollections,
  });

  const [term, setTerm] = useState("");
  const collections = data ?? [];

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return collections;
    return collections.filter((c) => {
      const title = clean(c.title).toLowerCase();
      const desc = clean(c.description).toLowerCase();
      return title.includes(q) || desc.includes(q);
    });
  }, [term, collections]);

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5">
        <SearchIcon size={18} />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search collections"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-subtext"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton aspect-square w-full rounded-md" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-subtext">No collections found.</p>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-5">
          {filtered.map((c) => (
            <Link key={c.id} href={`/collections/${c.id}`} className="block">
              <div className="relative aspect-square w-full overflow-hidden rounded-md bg-card">
                <Img
                  src={c.cover || c.thumbnail}
                  alt={clean(c.title)}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-black/10" />
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
