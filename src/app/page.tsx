"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  countVideoView,
  getHome,
  getHomePopup,
  getNewsPosts,
  type HomePopup,
} from "@/lib/api";
import type { HomePayload, HomeSection, Station, VideoItem } from "@/lib/types";
import { clean, shuffle } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { isBlocked } from "@/lib/blocklist";
import { HomeSkeleton } from "@/components/Skeletons";
import {
  ClipCard,
  CommunityPostCard,
  VideoGridCard,
} from "@/components/cards";
import { StationLogoRow } from "@/components/home/StationLogoRow";
import { HomePopupModal } from "@/components/home/HomePopupModal";
import { SearchIcon } from "@/components/Icons";

/** Rows a section shows before offering "Show more"; the grid is two across. */
const GRID_COLUMNS = 2;
const GRID_INITIAL_ROWS = 3;

type MixedSection = {
  type: "section" | "news";
  key: string;
  title: string;
  data: VideoItem[];
  /** Renders as tall short-form cards rather than landscape ones. */
  clips?: boolean;
};

/**
 * One home row. Videos are a wrapping two-column grid in the YouTube style
 * (as in the app) that shows three rows and then offers the rest; clips stay
 * a horizontal shelf; news posts are full-bleed.
 */
function SectionBlock({
  section,
  showAll = false,
}: {
  section: MixedSection;
  /** Skip the "Show more" cap - used for the endless block at the bottom. */
  showAll?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const { data, title } = section;
  if (!data.length) return null;

  if (section.type === "news") {
    return (
      <section className="mt-7 space-y-6">
        {data.map((item, i) => (
          <CommunityPostCard key={`${item.id}-${i}`} item={item} />
        ))}
      </section>
    );
  }

  if (section.clips) {
    return (
      <section className="mt-7">
        <h2 className="mb-2.5 flex items-center gap-1.5 px-3 text-lg font-bold tracking-tight">
          <span className="text-primary" aria-hidden>
            ⚡
          </span>
          {clean(title)}
        </h2>
        <div className="no-scrollbar flex gap-3 overflow-x-auto px-3 pb-1">
          {data.map((item, i) => (
            <ClipCard key={`${item.id}-${i}`} item={item} width={132} />
          ))}
        </div>
      </section>
    );
  }

  // Whole rows only, so the grid never ends on a half-filled line.
  const initialCount = GRID_COLUMNS * GRID_INITIAL_ROWS;
  const capped = !showAll && !expanded && data.length > initialCount;
  const visible = capped ? data.slice(0, initialCount) : data;
  const hiddenCount = data.length - visible.length;

  return (
    <section className="mt-7">
      <h2 className="mb-2.5 px-3 text-lg font-bold tracking-tight">
        {clean(title)}
      </h2>

      <div className="grid grid-cols-2 gap-x-2.5 gap-y-[18px] px-3">
        {visible.map((item, i) => (
          <VideoGridCard key={`${item.id}-${i}`} item={item} />
        ))}
      </div>

      {hiddenCount > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mx-3 mt-4 flex w-[calc(100%-1.5rem)] items-center justify-center gap-1 rounded-full border border-border py-2 text-sm font-semibold"
        >
          Show {hiddenCount} more <span aria-hidden>⌄</span>
        </button>
      ) : expanded && !showAll ? (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mx-3 mt-4 flex w-[calc(100%-1.5rem)] items-center justify-center gap-1 rounded-full border border-border py-2 text-sm font-semibold"
        >
          Show less <span aria-hidden>⌃</span>
        </button>
      ) : null}
    </section>
  );
}

export default function HomePage() {
  const { isLoggedIn, token } = useAuth();

  // Keyed on the token because the home payload is personalised when one is
  // present — a shared key would serve the previous account's feed.
  const { data: payload, isLoading, error, refetch, isFetching } =
    useQuery<HomePayload>({
      queryKey: ["home", token],
      queryFn: () => getHome(token || ""),
    });

  const { data: newsPosts = [] } = useQuery<VideoItem[]>({
    queryKey: ["news"],
    queryFn: async () => {
      const posts = await getNewsPosts();
      return posts.map((post: any, i: number) => ({
        id: Number(post?.id) || i,
        title: clean(post?.title),
        body: clean(post?.description || post?.content),
        channel: post?.source?.title || post?.feed?.title || "News",
        imgUrl: post?.image,
        imgChannel:
          post?.feedImage || post?.source?.image || post?.feed?.image,
        isPost: true,
        link: post?.link || "",
        date: post?.publishedAt,
      }));
    },
    staleTime: 1000 * 60 * 10,
  });

  // ---- Admin-controlled home popup ----
  // Opens on every load of Home while the admin has one switched on, fetched
  // fresh each time so a change in the admin applies straight away. Closing it
  // only closes it for this visit, the same rule as the app and website.
  const [popup, setPopup] = useState<HomePopup | null>(null);

  useEffect(() => {
    let cancelled = false;

    getHomePopup()
      .then((next) => {
        if (cancelled || !next) return;
        setPopup(next);
        // A video-backed popup counts a view when it opens.
        if (next.videoId) countVideoView(next.videoId, null);
      })
      .catch(() => {
        /* no popup rather than an error over Home */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const stations = useMemo<Station[]>(
    () => (Array.isArray(payload?.stations) ? payload!.stations : []),
    [payload],
  );

  const mixed = useMemo<MixedSection[]>(() => {
    // Hide videos from channels the user has blocked (Profile → Blocked).
    const notBlocked = (item: VideoItem) =>
      !isBlocked("channel", item.channel_id || item.channelId);

    const sections: HomeSection[] = Array.isArray(payload?.sections)
      ? payload!.sections
          .map((s) => ({
            ...s,
            data: Array.isArray(s.data) ? s.data.filter(notBlocked) : [],
          }))
          .filter((s) => s.data.length)
      : [];
    if (!sections.length) return [];

    const ceclips = (
      Array.isArray(payload?.ceclips) ? payload!.ceclips : []
    ).filter(notBlocked);
    const recommended = (payload?.recommended?.data || []).filter(notBlocked);
    const posts = shuffle(newsPosts);
    let pi = 0;
    const out: MixedSection[] = [];

    // The API decides which rows appear and in what order - it has already
    // applied the user's own show/hide and ordering choices - so they render
    // as given, with news posts threaded through the gaps.
    const isClipsRow = (s: HomeSection) => s.key === "clips" || s.slug === "clips";
    const serverSendsClips = sections.some(isClipsRow);

    sections.forEach((section) => {
      const id = section.key || section.slug || section.id;
      out.push({
        type: "section",
        key: `s-${id}`,
        title: section.title,
        data: section.data,
        clips: isClipsRow(section),
      });

      if (posts.length) {
        const n = Math.floor(Math.random() * 3) + 1;
        const chunk = posts.slice(pi, pi + n);
        if (chunk.length) {
          out.push({ type: "news", key: `news-${id}`, title: "Latest News", data: chunk });
          pi += n;
        }
      }
    });

    // Older API responses have no clips row of their own.
    if (!serverSendsClips && ceclips.length) {
      out.push({ type: "section", key: "ceclips", title: "Clips", data: ceclips, clips: true });
    }

    // The ranked block closes the page, where an endless feed belongs.
    if (recommended.length) {
      out.push({
        type: "section",
        key: "recommended",
        title: payload?.recommended?.title || "Recommended For You",
        data: recommended,
      });
    }

    return out;
  }, [payload, newsPosts]);

  if (isLoading) return <HomeSkeleton />;

  return (
    <div className="pb-4 pt-3">
      {/* Header */}
      <header className="flex items-center justify-between px-3 pb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-icon.png" alt="KingsSpace" className="h-9 w-9" />
        {isLoggedIn ? (
          <Link
            href="/browse?tab=search"
            aria-label="Search"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"
          >
            <SearchIcon size={22} />
          </Link>
        ) : (
          <Link href="/login" className="text-base font-bold">
            Log in
          </Link>
        )}
      </header>

      {error && (
        <div className="mx-3 rounded-2xl border border-border bg-card p-4">
          <p className="font-bold">Something went wrong</p>
          <p className="mt-1 text-sm text-subtext">
            {(error as Error).message}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white"
          >
            {isFetching ? "Retrying…" : "Try again"}
          </button>
        </div>
      )}

      <StationLogoRow stations={stations} />

      {mixed.map((section) => (
        <SectionBlock
          key={section.key}
          section={section}
          showAll={section.key === "recommended"}
        />
      ))}

      {popup && <HomePopupModal popup={popup} onClose={() => setPopup(null)} />}
    </div>
  );
}
