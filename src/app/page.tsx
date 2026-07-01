"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getHome, getNewsPosts } from "@/lib/api";
import type { HomePayload, HomeSection, Station, VideoItem } from "@/lib/types";
import { clean, shuffle } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { HomeSkeleton } from "@/components/Skeletons";
import {
  ClipCard,
  CommunityPostCard,
  SectionSlider,
  VideoCard,
} from "@/components/cards";
import { SearchIcon, VolumeOnIcon, VolumeOffIcon } from "@/components/Icons";
import { Img } from "@/components/Img";

function StationHero({
  station,
  autoPlay = false,
}: {
  station: Station;
  autoPlay?: boolean;
}) {
  // The first station autoplays muted like the RN app; the rest preview on tap.
  const [playing, setPlaying] = useState(autoPlay);
  const [muted, setMuted] = useState(true);
  return (
    <div className="shrink-0" style={{ width: 300 }}>
      <div className="relative h-[168px] w-full overflow-hidden rounded-lg bg-card">
        {playing && station.src ? (
          <video
            src={station.src}
            className="h-full w-full object-contain"
            autoPlay
            muted={muted}
            loop
            playsInline
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <Img
            src={station.imgChannel}
            alt={station.name}
            className="h-full w-full object-contain"
          />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        {playing && station.src ? (
          <button
            onClick={() => setMuted((m) => !m)}
            className="absolute bottom-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeOffIcon size={16} /> : <VolumeOnIcon size={16} />}
          </button>
        ) : station.src ? (
          <button
            onClick={() => setPlaying(true)}
            className="absolute bottom-2.5 right-2.5 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white"
          >
            Preview
          </button>
        ) : null}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-white">
          <Img
            src={station.imgChannel}
            alt={station.name}
            className="h-[88%] w-[88%] object-contain"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold">{clean(station.name)}</p>
          <p className="truncate text-sm text-subtext">
            {clean(station.desc) || "Live TV Station"}
          </p>
        </div>
      </div>
    </div>
  );
}

type MixedSection = {
  type: "section" | "clips" | "news";
  key: string;
  title: string;
  data: VideoItem[];
};

export default function HomePage() {
  const { isLoggedIn } = useAuth();
  const router = useRouter();

  // KingsChat launches the miniapp with an `authCode` on the URL. Hand it off
  // to the callback page, which exchanges it for a KingsSpace session.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authCode = params.get("authCode") || params.get("code");
    if (authCode) {
      router.replace(
        `/auth/callback?authCode=${encodeURIComponent(authCode)}`,
      );
    }
  }, [router]);

  const { data: payload, isLoading, error, refetch, isFetching } =
    useQuery<HomePayload>({ queryKey: ["home"], queryFn: getHome });

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

  const stations = useMemo<Station[]>(
    () => (Array.isArray(payload?.stations) ? payload!.stations : []),
    [payload],
  );

  const mixed = useMemo<MixedSection[]>(() => {
    const sections: HomeSection[] = Array.isArray(payload?.sections)
      ? payload!.sections.filter((s) => Array.isArray(s.data) && s.data.length)
      : [];
    if (!sections.length) return [];

    const ceclips = Array.isArray(payload?.ceclips) ? payload!.ceclips : [];
    const recommended = payload?.recommended?.data || [];
    const posts = shuffle(newsPosts);
    let pi = 0;
    const out: MixedSection[] = [];

    sections.forEach((section) => {
      out.push({
        type: "section",
        key: `s-${section.slug || section.id}`,
        title: section.title,
        data: section.data,
      });
      const t = clean(section.title).toLowerCase();
      const slug = String(section.slug ?? "").toLowerCase();
      if (t.includes("editor") || slug.includes("editor")) {
        if (ceclips.length)
          out.push({ type: "clips", key: "clips", title: "Clips", data: ceclips });
        if (recommended.length)
          out.push({
            type: "section",
            key: "recommended",
            title: payload?.recommended?.title || "Recommended For You",
            data: recommended,
          });
      }
      if (posts.length) {
        const n = Math.floor(Math.random() * 3) + 1;
        const chunk = posts.slice(pi, pi + n);
        if (chunk.length) {
          out.push({
            type: "news",
            key: `news-${section.slug || section.id}`,
            title: "Latest News",
            data: chunk,
          });
          pi += n;
        }
      }
    });
    return out;
  }, [payload, newsPosts]);

  if (isLoading) return <HomeSkeleton />;

  return (
    <div className="pb-4 pt-3">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-icon.png" alt="KingsSpace" className="h-9 w-9" />
        {isLoggedIn ? (
          <Link
            href="/browse?tab=search"
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
        <div className="mx-4 rounded-2xl border border-border bg-card p-4">
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

      {/* Hero stations — hidden for now */}
      {false && stations.length > 0 && (
        <div className="no-scrollbar mt-1 flex gap-3.5 overflow-x-auto px-4">
          {stations.map((s, i) => (
            <StationHero key={s.id} station={s} autoPlay={i === 0} />
          ))}
        </div>
      )}

      {/* Mixed sections */}
      {mixed.map((section) => {
        if (section.type === "news") {
          return (
            <section key={section.key} className="mt-7 space-y-6">
              {section.data.map((item, i) => (
                <CommunityPostCard key={`${item.id}-${i}`} item={item} />
              ))}
            </section>
          );
        }
        return (
          <SectionSlider key={section.key} title={section.title}>
            {section.data.map((item, i) =>
              section.type === "clips" ? (
                <ClipCard key={`${item.id}-${i}`} item={item} />
              ) : (
                <VideoCard key={`${item.id}-${i}`} item={item} />
              ),
            )}
          </SectionSlider>
        );
      })}
    </div>
  );
}
