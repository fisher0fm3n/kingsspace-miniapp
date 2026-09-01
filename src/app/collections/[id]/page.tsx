"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getCollection } from "@/lib/api";
import { clean, fixCdn } from "@/lib/utils";
import { Spinner } from "@/components/Skeletons";
import { Img } from "@/components/Img";
import { BackIcon, SearchIcon } from "@/components/Icons";

export default function CollectionDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [term, setTerm] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["collection", id],
    queryFn: () => getCollection(id),
  });

  const collection = data?.collection;
  const sections = useMemo(
    () => (Array.isArray(data?.sections) ? data!.sections : []),
    [data],
  );

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return sections;
    return sections.filter((s: any) => {
      const title = clean(s.title).toLowerCase();
      const desc = clean(s.description).toLowerCase();
      return title.includes(q) || desc.includes(q);
    });
  }, [term, sections]);

  if (isLoading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Spinner size={30} />
      </div>
    );

  return (
    <div className="pb-8">
      {/* Hero */}
      <div className="relative h-64 w-full bg-[#111]">
        <Img
          src={fixCdn(collection?.cover || collection?.thumbnail)}
          alt={clean(collection?.title)}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/5" />
        <button
          onClick={() => router.back()}
          aria-label="Back"
          className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-lg bg-black/50 text-white"
        >
          <BackIcon size={22} />
        </button>
        <div className="absolute inset-x-4 bottom-4">
          {collection?.thumbnail && (
            <div className="mb-3 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white/90 p-1.5">
              <Img
                src={fixCdn(collection.thumbnail)}
                alt=""
                className="h-full w-full object-contain"
              />
            </div>
          )}
          <h1 className="text-2xl font-black leading-tight tracking-tight text-white">
            {clean(collection?.title)}
          </h1>
        </div>
      </div>

      {collection?.description && (
        <p className="px-4 pt-3.5 text-sm leading-5 text-subtext">
          {clean(collection.description)}
        </p>
      )}

      {/* Search */}
      <div className="px-4 pt-3">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5">
          <SearchIcon size={18} />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search in this collection"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-subtext"
          />
        </div>
      </div>

      {/* Section grid */}
      {error ? (
        <p className="p-8 text-center text-subtext">
          Unable to load this collection.
        </p>
      ) : filtered.length === 0 ? (
        <p className="p-8 text-center text-subtext">No items found.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3.5 p-4">
          {filtered.map((s: any) => (
            <Link
              key={s.id}
              href={`/collection-sections/${s.id}`}
              className="relative block aspect-square overflow-hidden rounded-lg bg-card"
            >
              <Img
                src={fixCdn(s.thumbnail)}
                alt={clean(s.title)}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
              <p className="absolute inset-x-2.5 bottom-2.5 line-clamp-2 text-sm font-bold text-white">
                {clean(s.title)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
