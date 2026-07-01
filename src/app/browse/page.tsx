"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  getUserSubscriptions,
  searchAll,
  type SearchResult,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { VideoItem } from "@/lib/types";
import { clean } from "@/lib/utils";
import { Spinner } from "@/components/Skeletons";
import { VideoCard } from "@/components/cards";
import { CollectionsBrowser } from "@/components/CollectionsBrowser";
import { ClipsReel } from "@/components/ClipsReel";
import { SearchIcon } from "@/components/Icons";
import { Img } from "@/components/Img";

const TABS = ["Following", "Search", "Collections", "Clips"] as const;
type Tab = (typeof TABS)[number];

function FollowingTab() {
  const { token, isLoggedIn } = useAuth();
  const { data, isLoading } = useQuery<VideoItem[]>({
    queryKey: ["subscriptions", token],
    queryFn: () => getUserSubscriptions(token),
    enabled: isLoggedIn,
  });
  if (!isLoggedIn)
    return (
      <div className="p-8 text-center text-subtext">
        <p className="mb-4">Sign in to see channels you follow.</p>
        <Link
          href="/login"
          className="rounded-lg bg-primary px-5 py-2.5 font-bold text-white"
        >
          Log in
        </Link>
      </div>
    );
  if (isLoading)
    return (
      <div className="flex justify-center p-10">
        <Spinner />
      </div>
    );
  const items = Array.isArray(data) ? data : [];
  if (!items.length)
    return <p className="p-8 text-center text-subtext">No subscriptions yet.</p>;
  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 p-4">
      {items.map((item, i) => (
        <VideoCard key={i} item={item} width="100%" />
      ))}
    </div>
  );
}

function SearchResultRow({ result }: { result: SearchResult }) {
  const { type, data } = result;

  if (type === "channel") {
    return (
      <Link
        href={`/channel/${data.channelID}`}
        className="flex items-center gap-3"
      >
        <Img
          src={data.profilepic}
          alt=""
          className="h-12 w-12 shrink-0 rounded-full bg-card object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {clean(data.channelName)}
          </p>
          <p className="line-clamp-2 text-xs text-subtext">
            {clean(data.description)}
          </p>
        </div>
      </Link>
    );
  }

  if (type === "playlist") {
    const title = data.playlist_title || data.title || "Playlist";
    const thumb = data.playlist_thumbnail || data.thumbnail || data.contain;
    return (
      <Link
        href={`/playlist/${data.id || data.playlistID}`}
        className="flex gap-3"
      >
        <div className="aspect-video w-40 shrink-0 overflow-hidden rounded-lg bg-card">
          <Img src={thumb} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium">{clean(title)}</p>
          <p className="mt-1 text-xs text-subtext">Playlist</p>
        </div>
      </Link>
    );
  }

  const channelName = data.channel?.name || data.channelName || "CeFlix";
  return (
    <Link href={`/watch/${data.videoId}`} className="flex gap-3">
      <div className="aspect-video w-40 shrink-0 overflow-hidden rounded-lg bg-card">
        <Img
          src={data.thumbnail}
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-medium">{clean(data.title)}</p>
        <p className="mt-1 truncate text-xs text-subtext">
          {clean(channelName)}
        </p>
      </div>
    </Link>
  );
}

function SearchTab() {
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const { data, isFetching } = useQuery<SearchResult[]>({
    queryKey: ["search", submitted, token],
    queryFn: () => searchAll(submitted, token || null),
    enabled: submitted.length > 1,
  });

  return (
    <div className="p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(query.trim());
        }}
        className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5"
      >
        <SearchIcon size={18} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search videos, channels…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-subtext"
        />
      </form>

      {isFetching && (
        <div className="flex justify-center p-10">
          <Spinner />
        </div>
      )}

      {!isFetching && submitted.length > 1 && (data?.length ?? 0) === 0 && (
        <p className="p-10 text-center text-subtext">No results found.</p>
      )}

      <div className="mt-4 space-y-3">
        {(data || []).map((result, i) => (
          <SearchResultRow key={i} result={result} />
        ))}
      </div>
    </div>
  );
}

function TabBar({
  tab,
  setTab,
  transparent = false,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  transparent?: boolean;
}) {
  return (
    <div className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-2">
      {TABS.map((t) => {
        const active = tab === t;
        return (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold"
            style={{
              background: active
                ? "var(--primary)"
                : transparent
                  ? "rgba(255,255,255,0.15)"
                  : "var(--card)",
              color: active ? "#fff" : transparent ? "#fff" : "var(--subtext)",
            }}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}

function BrowseInner() {
  const params = useSearchParams();
  const { isLoggedIn } = useAuth();
  const clipId = params.get("id");
  const initial = (params.get("tab") || "").toLowerCase();
  const initialTab: Tab = clipId
    ? "Clips"
    : initial === "search"
      ? "Search"
      : initial === "clips"
        ? "Clips"
        : initial === "collections"
          ? "Collections"
          : initial === "following"
            ? "Following"
            : isLoggedIn
              ? "Following"
              : "Search";
  const [tab, setTab] = useState<Tab>(initialTab);

  // Clips is a full-screen reel with the tabs overlaid transparently on top,
  // matching the RN browse screen. It opens a random reel unless routed (?id=).
  if (tab === "Clips") {
    return (
      <div className="fixed inset-y-0 left-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 bg-black">
        <ClipsReel selectedId={clipId} />
        <div className="absolute inset-x-0 top-0 z-10 pt-3">
          <TabBar tab={tab} setTab={setTab} transparent />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center gap-2 px-4 py-3">
          <h1 className="text-xl font-extrabold">Browse</h1>
        </div>
        <TabBar tab={tab} setTab={setTab} />
      </div>

      {tab === "Following" && <FollowingTab />}
      {tab === "Search" && <SearchTab />}
      {tab === "Collections" && <CollectionsBrowser />}
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={<div className="p-10 text-center"><Spinner /></div>}>
      <BrowseInner />
    </Suspense>
  );
}
