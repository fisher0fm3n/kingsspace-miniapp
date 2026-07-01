"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getPlaylist } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { clean, formatViews, videoThumb, videoTitle } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { Spinner } from "@/components/Skeletons";
import { PlayIcon } from "@/components/Icons";
import { Img } from "@/components/Img";

export default function PlaylistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { token } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["playlist", id, token],
    queryFn: () => getPlaylist(id, token || null),
  });

  if (isLoading)
    return (
      <div>
        <PageHeader />
        <div className="flex justify-center p-10">
          <Spinner />
        </div>
      </div>
    );

  if (error || !data)
    return (
      <div>
        <PageHeader title="Playlist" />
        <p className="p-8 text-center text-subtext">
          {(error as Error)?.message || "Playlist not found."}
        </p>
      </div>
    );

  const videos = Array.isArray(data.videos) ? data.videos : [];

  return (
    <div className="pb-8">
      <PageHeader title={clean(data.title) || "Playlist"} />
      <div className="p-4">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-card">
          <Img
            src={data.thumbnail || videoThumb(videos[0] || {})}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/80 to-transparent p-3">
            <div>
              <p className="text-lg font-bold text-white">{clean(data.title)}</p>
              <p className="text-xs text-white/80">{videos.length} videos</p>
            </div>
          </div>
        </div>
        {data.description && (
          <p className="mt-3 text-sm text-subtext">{clean(data.description)}</p>
        )}
      </div>

      <div className="space-y-2 px-4">
        {videos.map((v: any, i: number) => (
          <Link
            key={`${v.id}-${i}`}
            href={`/watch/${v.id}`}
            className="flex items-center gap-3 rounded-lg p-1 hover:bg-card"
          >
            <span className="w-5 text-center text-xs text-subtext">{i + 1}</span>
            <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-lg bg-card">
              <Img
                src={videoThumb(v)}
                alt=""
                className="h-full w-full object-cover"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
                <PlayIcon size={20} />
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-medium">{videoTitle(v)}</p>
              <p className="mt-0.5 truncate text-xs text-subtext">
                {[clean(v.channel), formatViews(v.numOfViews || v.views)]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
