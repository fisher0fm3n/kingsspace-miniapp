"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  getSubscriptionsFeed,
  getUserSubscriptions,
  searchAll,
  type SearchResult,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  channelAvatar,
  clean,
  fixCdn,
  formatViews,
  isShort,
  timeAgo,
} from "@/lib/utils";
import { Spinner } from "@/components/Skeletons";
import { CollectionsBrowser } from "@/components/CollectionsBrowser";
import { ClipsReel } from "@/components/ClipsReel";
import { SearchIcon } from "@/components/Icons";
import { Img } from "@/components/Img";

const FOLLOWING_FILTERS = ["All", "Today", "Videos", "Clips"] as const;
type FollowingFilter = (typeof FOLLOWING_FILTERS)[number];

function isToday(value?: string | number | null): boolean {
  const raw = Number(value ?? 0);
  if (!raw) return false;
  const unix = raw > 10_000_000_000 ? Math.floor(raw / 1000) : raw;
  const d = new Date(unix * 1000);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

const TABS = ["Following", "Search", "Collections", "Clips"] as const;
type Tab = (typeof TABS)[number];

function ChannelBubble({ channel }: { channel: any }) {
  return (
    <Link
      href={`/channel/${channel.id}`}
      className="flex w-[60px] shrink-0 flex-col items-center"
    >
      <Img
        src={channelAvatar(channel)}
        alt={clean(channel.channel)}
        className="h-14 w-14 rounded-full border border-border bg-card object-cover"
      />
      <span className="mt-1.5 line-clamp-1 w-full text-center text-xs text-subtext">
        {clean(channel.channel)}
      </span>
    </Link>
  );
}

function FeedVideoCard({ item }: { item: any }) {
  const clip = isShort(item);
  const href = clip
    ? `/browse?tab=clips&id=${item.id}`
    : `/watch/${item.id}`;
  const meta = [
    clean(item.channel),
    formatViews(item.numOfViews),
    timeAgo(item.uploadtime),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link href={href} className="block">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-card">
        <Img
          src={fixCdn(item.thumbnail)}
          alt={clean(item.videos_title)}
          className="h-full w-full object-cover"
        />
        {String(item.isLive) === "1" && (
          <span className="absolute bottom-2 left-2 rounded bg-error px-1.5 py-0.5 text-[11px] font-bold text-white">
            LIVE
          </span>
        )}
        {clip && (
          <span className="absolute bottom-2 right-2 rounded-full bg-black/75 px-2 py-0.5 text-[10px] font-bold text-white">
            CLIP
          </span>
        )}
      </div>
      <div className="mt-2.5 flex gap-2.5">
        <Img
          src={fixCdn(item.channel_image)}
          alt={clean(item.channel)}
          className="h-9 w-9 shrink-0 rounded-full bg-card object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-semibold leading-5">
            {clean(item.videos_title)}
          </p>
          <p className="mt-1 truncate text-xs text-subtext">{meta}</p>
        </div>
      </div>
    </Link>
  );
}

function FollowingTab() {
  const { token, isLoggedIn } = useAuth();
  const [filter, setFilter] = useState<FollowingFilter>("All");

  const { data, isLoading } = useQuery({
    queryKey: ["following-page", token],
    queryFn: async () => {
      const [channels, feed] = await Promise.all([
        getUserSubscriptions(token),
        getSubscriptionsFeed(token),
      ]);
      return { channels, feed };
    },
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

  const channels: any[] = Array.isArray(data?.channels) ? data!.channels : [];
  const feed: any[] = Array.isArray(data?.feed) ? data!.feed : [];

  const visibleFeed = feed.filter((item) => {
    if (filter === "Today") return isToday(item.uploadtime);
    if (filter === "Clips") return isShort(item);
    if (filter === "Videos") return !isShort(item);
    return true;
  });

  return (
    <div className="pb-4">
      {channels.length > 0 && (
        <div className="no-scrollbar flex gap-3.5 overflow-x-auto px-4 pt-3">
          {channels.map((c, i) => (
            <ChannelBubble key={`${c.id}-${i}`} channel={c} />
          ))}
        </div>
      )}

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
        {FOLLOWING_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold"
            style={{
              background: filter === f ? "var(--text)" : "var(--card)",
              color: filter === f ? "var(--background)" : "var(--subtext)",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {visibleFeed.length === 0 ? (
        <p className="p-8 text-center text-subtext">
          No videos found for {filter}.
        </p>
      ) : (
        <div className="space-y-6 px-4">
          {visibleFeed.map((item, i) => (
            <FeedVideoCard key={`${item.id}-${i}`} item={item} />
          ))}
        </div>
      )}
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
