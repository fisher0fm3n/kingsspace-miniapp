"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteVideo, getUserVideos } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { clean, fixCdn, formatViews, timeAgo } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { Spinner } from "@/components/Skeletons";
import { Img } from "@/components/Img";
import { PlusIcon, EditIcon, TrashIcon } from "@/components/Icons";

export default function StudioVideos() {
  const router = useRouter();
  const qc = useQueryClient();
  const { token, isLoggedIn, loading } = useAuth();
  const [busyId, setBusyId] = useState<string | number | null>(null);

  useEffect(() => {
    if (!loading && !isLoggedIn) router.replace("/login");
  }, [loading, isLoggedIn, router]);

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ["user-videos", token],
    queryFn: () => getUserVideos(token),
    enabled: isLoggedIn,
  });

  const onDelete = async (id: string | number, channelId: string | number) => {
    if (!confirm("Delete this video? This cannot be undone.")) return;
    setBusyId(id);
    try {
      await deleteVideo(id, channelId, token);
      qc.setQueryData<any[]>(["user-videos", token], (prev) =>
        (prev || []).filter((v) => String(v.id) !== String(id)),
      );
    } catch (e) {
      alert((e as Error).message || "Could not delete video.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="pb-8">
      <PageHeader
        title="Videos"
        right={
          <Link
            href="/upload"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white"
            aria-label="Upload video"
          >
            <PlusIcon size={22} />
          </Link>
        }
      />

      {isLoading ? (
        <div className="flex justify-center p-10">
          <Spinner />
        </div>
      ) : videos.length === 0 ? (
        <p className="p-10 text-center text-subtext">
          You haven&apos;t uploaded any videos yet.
        </p>
      ) : (
        <div className="divide-y divide-border">
          {videos.map((v: any) => (
            <div key={v.id} className="flex gap-3 p-3">
              <Link
                href={`/watch/${v.id}`}
                className="relative aspect-video w-36 shrink-0 overflow-hidden rounded-lg bg-card"
              >
                <Img
                  src={fixCdn(v.thumbnail)}
                  alt={clean(v.videos_title)}
                  className="h-full w-full object-contain"
                />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <Link href={`/watch/${v.id}`} className="min-w-0">
                  <p className="line-clamp-2 text-sm font-semibold leading-5">
                    {clean(v.videos_title) || "Untitled"}
                  </p>
                </Link>
                <p className="mt-1 text-xs text-subtext">
                  {[
                    v.active === 1 || String(v.active) === "1"
                      ? "Public"
                      : "Private",
                    formatViews(v.numOfViews) || "0 views",
                    timeAgo(v.uploadtime),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <div className="mt-auto flex gap-2 pt-2">
                  <Link
                    href={`/studio/editvideo/${v.id}`}
                    className="flex items-center gap-1 rounded-lg bg-card px-3 py-1.5 text-xs font-semibold"
                  >
                    <EditIcon size={14} /> Edit
                  </Link>
                  <button
                    onClick={() => onDelete(v.id, v.channel_id)}
                    disabled={busyId === v.id}
                    className="flex items-center gap-1 rounded-lg bg-card px-3 py-1.5 text-xs font-semibold text-error disabled:opacity-50"
                  >
                    {busyId === v.id ? (
                      <Spinner size={14} />
                    ) : (
                      <>
                        <TrashIcon size={14} /> Delete
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
