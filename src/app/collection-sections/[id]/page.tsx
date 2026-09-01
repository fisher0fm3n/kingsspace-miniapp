"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getCollectionSection } from "@/lib/api";
import { clean, fixCdn, timeAgo } from "@/lib/utils";
import { Spinner } from "@/components/Skeletons";
import { Img } from "@/components/Img";
import { BackIcon, SearchIcon } from "@/components/Icons";

function PlaylistSlider({ item }: { item: any }) {
  const playlist = item?.playlist;
  const videos: any[] = Array.isArray(playlist?.videos) ? playlist.videos : [];
  if (!playlist || videos.length === 0) return null;

  const playlistId = playlist.id || item.playlist_id;

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between gap-3 px-4">
        <Link href={`/playlist/${playlistId}`} className="min-w-0">
          <h2 className="line-clamp-2 text-lg font-bold tracking-tight">
            {clean(item.title || playlist.title)}
          </h2>
        </Link>
        <Link
          href={`/playlist/${playlistId}`}
          className="shrink-0 text-sm font-semibold text-primary"
        >
          View
        </Link>
      </div>

      <div className="no-scrollbar flex gap-3.5 overflow-x-auto px-4">
        {videos.map((v: any, i: number) => (
          <Link
            key={`${v.id}-${i}`}
            href={`/watch/${v.id}`}
            className="block shrink-0"
            style={{ width: 270 }}
          >
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-card">
              <Img
                src={fixCdn(v.thumbnail)}
                alt={clean(v.videos_title || v.title)}
                className="h-full w-full object-cover"
              />
              {String(v.isLive) === "1" && (
                <span className="absolute bottom-2 left-2 rounded bg-error px-1.5 py-0.5 text-[11px] font-bold text-white">
                  LIVE
                </span>
              )}
            </div>
            <div className="mt-2 flex gap-2.5">
              <Img
                src={fixCdn(v.channel_image)}
                alt={clean(v.channel)}
                className="h-8 w-8 shrink-0 rounded-full bg-card object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-semibold leading-5">
                  {clean(v.videos_title || v.title || "Untitled")}
                </p>
                <p className="mt-0.5 truncate text-xs text-subtext">
                  {[clean(v.channel), timeAgo(v.uploadtime)]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function CollectionSection({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [term, setTerm] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["collection-section", id],
    queryFn: () => getCollectionSection(id),
  });

  const collection = data?.collection;
  const section = data?.section;
  const items: any[] = useMemo(
    () => (Array.isArray(data?.items) ? data!.items : []),
    [data],
  );

  const validItems = useMemo(
    () =>
      items.filter(
        (it) =>
          it?.playlist &&
          Array.isArray(it.playlist.videos) &&
          it.playlist.videos.length > 0,
      ),
    [items],
  );

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return validItems;
    return validItems.filter((it) => {
      const title = clean(it.title || it.playlist?.title).toLowerCase();
      const desc = clean(it.description || it.playlist?.description).toLowerCase();
      return title.includes(q) || desc.includes(q);
    });
  }, [term, validItems]);

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
          src={fixCdn(section?.thumbnail || collection?.cover)}
          alt={clean(section?.title)}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-black/5" />
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
          {collection?.title && (
            <p className="mb-1 text-xs font-bold text-white/80">
              {clean(collection.title)}
            </p>
          )}
          <h1 className="text-2xl font-black leading-tight tracking-tight text-white">
            {clean(section?.title || "Playlists")}
          </h1>
        </div>
      </div>

      {section?.description && (
        <p className="px-4 pt-3.5 text-sm leading-5 text-subtext">
          {clean(section.description)}
        </p>
      )}

      {/* Search */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5">
          <SearchIcon size={18} />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search playlists"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-subtext"
          />
        </div>
      </div>

      {error ? (
        <p className="p-8 text-center text-subtext">Unable to load playlists.</p>
      ) : filtered.length === 0 ? (
        <p className="p-8 text-center text-subtext">
          {term ? "No matching playlists found." : "No playlists found."}
        </p>
      ) : (
        <div className="pt-2">
          {filtered.map((it, i) => (
            <PlaylistSlider key={`${it.id}-${i}`} item={it} />
          ))}
        </div>
      )}
    </div>
  );
}
