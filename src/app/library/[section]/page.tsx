"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  LIBRARY_TITLES,
  fetchLibrary,
  getPlaylistId,
  getVideoId,
  isLibrarySection,
  type LibrarySection,
} from "@/lib/library";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Spinner } from "@/components/Skeletons";
import { PlaylistListRow, VideoListRow } from "@/components/library";
import {
  ClockIcon,
  HeartIcon,
  PlaylistIcon,
  UploadIcon,
} from "@/components/Icons";

const EMPTY: Record<
  LibrarySection,
  { icon: React.ReactNode; title: string; body: string; action: { label: string; href: string } }
> = {
  videos: {
    icon: <UploadIcon size={22} />,
    title: "Upload your first video",
    body: "Everything you publish lives here.",
    action: { label: "Upload a video", href: "/upload" },
  },
  playlists: {
    icon: <PlaylistIcon size={22} />,
    title: "No playlists yet",
    body: "Save videos into playlists to pick up where you left off.",
    action: { label: "Browse collections", href: "/collections" },
  },
  liked: {
    icon: <HeartIcon size={22} />,
    title: "No liked videos yet",
    body: "Tap like on a video and it will be waiting here.",
    action: { label: "Find something to watch", href: "/browse?tab=search" },
  },
  history: {
    icon: <ClockIcon size={22} />,
    title: "No watch history yet",
    body: "Start watching and your history builds itself.",
    action: { label: "See what's trending", href: "/" },
  },
};

/**
 * The full list behind a "View all" on the "You" tab: the user's videos,
 * playlists, liked videos or watch history.
 */
export default function LibraryPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section: raw } = use(params);
  const section: LibrarySection = isLibrarySection(raw) ? raw : "videos";
  const router = useRouter();
  const { token, isLoggedIn, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isLoggedIn) router.replace("/login");
  }, [loading, isLoggedIn, router]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["library", section, token],
    queryFn: () => fetchLibrary(section, token),
    enabled: isLoggedIn,
    staleTime: 1000 * 60,
  });

  const items = data ?? [];
  const isPlaylists = section === "playlists";
  const empty = EMPTY[section];

  return (
    <div className="pb-10">
      <PageHeader title={LIBRARY_TITLES[section]} />

      {loading || isLoading ? (
        <div className="flex justify-center p-10">
          <Spinner />
        </div>
      ) : isError ? (
        <div className="py-6">
          <EmptyState
            title="Couldn't load this"
            body="Check your connection and try again."
            action={{ label: "Try again", onClick: () => refetch() }}
          />
        </div>
      ) : items.length === 0 ? (
        <div className="py-6">
          <EmptyState
            icon={empty.icon}
            title={empty.title}
            body={empty.body}
            action={empty.action}
          />
        </div>
      ) : (
        <div className="pt-1">
          {items.map((item: any, index: number) =>
            isPlaylists ? (
              <PlaylistListRow key={`p-${getPlaylistId(item)}-${index}`} item={item} />
            ) : (
              <VideoListRow key={`v-${getVideoId(item)}-${index}`} item={item} />
            ),
          )}
        </div>
      )}
    </div>
  );
}
