"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getChannel, subscribeChannel } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { clean, formatViews, timeAgo, videoThumb, videoTitle } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { Spinner } from "@/components/Skeletons";
import { VerifiedIcon } from "@/components/Icons";
import { Img } from "@/components/Img";

export default function ChannelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { token, isLoggedIn } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["channel", id, token],
    queryFn: () => getChannel(id, token || null),
  });

  const [subscribed, setSubscribed] = useState(false);
  useEffect(() => setSubscribed(Boolean(data?.isSubscribed)), [data]);

  const onSubscribe = async () => {
    if (!isLoggedIn) return router.push("/login");
    setSubscribed((v) => !v);
    try {
      await subscribeChannel(id, token);
    } catch {
      setSubscribed((v) => !v);
    }
  };

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
        <PageHeader title="Channel" />
        <p className="p-8 text-center text-subtext">
          {(error as Error)?.message || "Channel not found."}
        </p>
      </div>
    );

  const videos = Array.isArray(data.videos) ? data.videos : [];
  const cover = data.cover || data.cover_image || data.banner;
  const avatar =
    data.channel_thumbnail || data.channel_image || data.thumbnail || data.image;

  return (
    <div className="pb-8">
      <PageHeader />
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <Img src={cover} alt="" className="aspect-[3/1] w-full bg-card object-cover" />
      )}
      <div className="flex items-center gap-3 px-4 pt-3">
        <Img
          src={avatar}
          alt=""
          className="h-16 w-16 rounded-full bg-card object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <h1 className="truncate text-lg font-bold">
              {clean(data.channel || data.name)}
            </h1>
            {Number(data.isVerified) === 1 && (
              <VerifiedIcon size={16} className="text-primary" />
            )}
          </div>
          <p className="text-xs text-subtext">
            {[
              data.subscribers != null
                ? `${formatViews(data.subscribers).replace(" views", "")} subscribers`
                : null,
              videos.length ? `${videos.length} videos` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <button
          onClick={onSubscribe}
          className="rounded-full px-4 py-2 text-sm font-bold"
          style={{
            background: subscribed ? "var(--card)" : "var(--primary)",
            color: subscribed ? "var(--subtext)" : "#fff",
          }}
        >
          {subscribed ? "Subscribed" : "Subscribe"}
        </button>
      </div>

      {data.description && (
        <p className="whitespace-pre-line px-4 py-3 text-sm text-subtext">
          {clean(data.description)}
        </p>
      )}

      <div className="mt-2 grid grid-cols-1 gap-4 p-4">
        {videos.map((v: any, i: number) => (
          <Link key={`${v.id}-${i}`} href={`/watch/${v.id}`} className="block">
            <div className="aspect-video w-full overflow-hidden rounded-lg bg-card">
              <Img
                src={videoThumb(v)}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <p className="mt-2 line-clamp-2 text-sm font-medium">
              {videoTitle(v)}
            </p>
            <p className="mt-0.5 text-xs text-subtext">
              {[formatViews(v.numOfViews || v.views), timeAgo(v.uploadtime)]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </Link>
        ))}
        {videos.length === 0 && (
          <p className="text-center text-sm text-subtext">No videos yet.</p>
        )}
      </div>
    </div>
  );
}
