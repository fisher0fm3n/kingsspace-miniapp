"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getChannel, subscribeChannel } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { block, isBlocked, unblock } from "@/lib/blocklist";
import { clean, formatViews, timeAgo, videoThumb, videoTitle } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { Spinner } from "@/components/Skeletons";
import { VerifiedIcon } from "@/components/Icons";
import { Img } from "@/components/Img";
import { ReportModal } from "@/components/watch/WatchModals";

export default function ChannelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { token, isLoggedIn, user } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["channel", id, token],
    queryFn: () => getChannel(id, token || null),
  });

  const [subscribed, setSubscribed] = useState(false);
  useEffect(() => setSubscribed(Boolean(data?.isSubscribed)), [data]);

  const [blocked, setBlocked] = useState(false);
  useEffect(() => setBlocked(isBlocked("channel", id)), [id]);

  const [reportOpen, setReportOpen] = useState(false);

  // The channel detail response nests the channel model under `data.channel`
  // (the display name is data.channel.channel). Reading data.channel directly
  // renders "[object Object]". Extract defensively so it still works if a
  // flatter shape is ever returned.
  const ch = (
    data?.channel && typeof data.channel === "object" ? data.channel : {}
  ) as Record<string, any>;
  const channelName = clean(
    ch.channel ||
      ch.name ||
      (typeof data?.channel === "string" ? data.channel : "") ||
      data?.name ||
      "Channel",
  );

  // You can't subscribe to, block, or report your own channel. The backend
  // flags the owner via `canModifyVideos`; fall back to an id comparison.
  const isOwnChannel =
    isLoggedIn &&
    (data?.canModifyVideos === true ||
      (ch.userID != null &&
        String(user?.userID ?? user?.id ?? "") === String(ch.userID)));

  const onToggleBlock = () => {
    if (blocked) {
      unblock("channel", id, token || undefined);
      setBlocked(false);
      return;
    }
    if (
      window.confirm(
        "Block this channel? Its videos will be hidden from your feeds. You can unblock it from Profile → Blocked users.",
      )
    ) {
      block("channel", id, channelName, token || undefined);
      setBlocked(true);
    }
  };

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
  const cover = ch.cover || data.cover || data.cover_image || data.banner;
  const avatar =
    ch.url ||
    ch.channel_thumbnail ||
    ch.thumbnail ||
    ch.image ||
    data.channel_thumbnail ||
    data.channel_image ||
    data.thumbnail ||
    data.image;
  const description = ch.description || data.description;
  const isVerified = Number(ch.isVerified ?? data.isVerified) === 1;
  const subscribers = data.subscribers ?? ch.subscribers ?? ch.subscriber_count;

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
            <h1 className="truncate text-lg font-bold">{channelName}</h1>
            {isVerified && (
              <VerifiedIcon size={16} className="text-primary" />
            )}
          </div>
          <p className="text-xs text-subtext">
            {[
              `${formatViews(subscribers ?? 0).replace(" views", "")} subscribers`,
              videos.length ? `${videos.length} videos` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {!isOwnChannel && (
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
        )}
      </div>

      {!isOwnChannel && (
        <div className="flex gap-4 px-4 pt-2">
          <button
            onClick={onToggleBlock}
            className="text-xs font-semibold text-subtext underline"
          >
            {blocked ? "Unblock channel" : "Block channel"}
          </button>
          {ch.userID != null && (
            <button
              onClick={() =>
                isLoggedIn ? setReportOpen(true) : router.push("/login")
              }
              className="text-xs font-semibold text-subtext underline"
            >
              Report channel
            </button>
          )}
        </div>
      )}

      {blocked && (
        <p className="px-4 py-6 text-center text-sm text-subtext">
          You blocked this channel. Its videos are hidden from your feeds.
        </p>
      )}

      {description && (
        <p className="whitespace-pre-line px-4 py-3 text-sm text-subtext">
          {clean(description)}
        </p>
      )}

      {!blocked && (
      <div className="mt-2 grid grid-cols-1 gap-4 p-4">
        {videos.map((v: any, i: number) => (
          <Link key={`${v.id}-${i}`} href={`/watch/${v.id}`} className="block">
            <div className="aspect-video w-full overflow-hidden rounded-lg bg-card">
              <Img
                src={videoThumb(v)}
                alt=""
                className="h-full w-full object-contain"
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
      )}

      {reportOpen && (
        <ReportModal
          kind="user"
          targetId={ch.userID}
          token={token}
          onClose={() => setReportOpen(false)}
        />
      )}
    </div>
  );
}
