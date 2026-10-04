"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDiscovery, subscribeChannel, type SuggestedChannel } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { VideoItem } from "@/lib/types";
import { clean, fixCdn } from "@/lib/utils";
import { publicViewCountLabel } from "@/lib/views";
import { Img } from "@/components/Img";
import { Spinner } from "@/components/Skeletons";
import { CompassIcon } from "@/components/Icons";

/**
 * The replacement for a bare "nothing here" message: it explains the state,
 * offers creators to follow, and drops the viewer into real trending content,
 * so an empty feed is still a place to start watching.
 */
export function DiscoverEmpty({
  title,
  body,
  icon,
  followedIds = [],
  action,
  onFollowed,
  columns = 2,
}: {
  title: string;
  body: string;
  icon?: React.ReactNode;
  /** Channels the viewer already follows, so they are not suggested again. */
  followedIds?: string[];
  /** Extra action under the message, e.g. clearing a filter. */
  action?: { label: string; onClick: () => void };
  /** Called after a follow succeeds so the owning feed can refetch. */
  onFollowed?: () => void;
  /** Single column when this owns the whole screen; two when it sits under a feed. */
  columns?: 1 | 2;
}) {
  const { token, isLoggedIn } = useAuth();
  const queryClient = useQueryClient();

  const [followed, setFollowed] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["discover-empty", followedIds.join(","), token],
    queryFn: () => getDiscovery(followedIds),
  });

  const onFollow = useCallback(
    async (channel: SuggestedChannel) => {
      if (!isLoggedIn) {
        window.location.href = "/login";
        return;
      }
      if (pending[channel.id]) return;

      setPending((p) => ({ ...p, [channel.id]: true }));
      // Optimistic: following should feel instant.
      setFollowed((f) => ({ ...f, [channel.id]: true }));

      try {
        await subscribeChannel(channel.id, token);
        queryClient.invalidateQueries({ queryKey: ["following-page"] });
        onFollowed?.();
      } catch {
        setFollowed((f) => ({ ...f, [channel.id]: false }));
      } finally {
        setPending((p) => ({ ...p, [channel.id]: false }));
      }
    },
    [isLoggedIn, onFollowed, pending, queryClient, token],
  );

  const channels = data?.channels ?? [];
  const trending: VideoItem[] = data?.trending ?? [];

  return (
    <div className="pb-6 pt-3">
      <div className="flex flex-col items-center gap-2 px-8 text-center">
        <span className="mb-1 flex h-14 w-14 items-center justify-center rounded-full bg-card text-primary">
          {icon ?? <CompassIcon size={24} />}
        </span>

        <h2 className="text-lg font-bold">{title}</h2>

        <p className="text-sm leading-5 text-subtext">{body}</p>

        {action && (
          <button
            onClick={action.onClick}
            className="mt-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium"
          >
            {action.label}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 py-10">
          <p className="text-sm text-subtext">
            Couldn&apos;t load recommendations.
          </p>
          <button
            onClick={() => refetch()}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          {channels.length > 0 && (
            <section className="mt-7">
              <h3 className="px-4 pb-3 font-bold">Creators to follow</h3>

              <div className="no-scrollbar flex gap-3 overflow-x-auto px-4">
                {channels.map((channel) => {
                  const isFollowing = followed[channel.id];
                  const isPending = pending[channel.id];

                  return (
                    <div
                      key={channel.id}
                      className="flex w-[132px] shrink-0 flex-col items-center rounded-2xl border border-border bg-card p-3"
                    >
                      <Link
                        href={`/channel/${channel.id}`}
                        className="flex flex-col items-center"
                      >
                        <Img
                          src={fixCdn(channel.image)}
                          alt={channel.name}
                          className="h-14 w-14 rounded-full bg-background object-cover"
                        />
                        <span className="mt-2 line-clamp-2 h-9 text-center text-xs font-semibold leading-[18px]">
                          {clean(channel.name)}
                        </span>
                      </Link>

                      <button
                        onClick={() => onFollow(channel)}
                        disabled={isPending || isFollowing}
                        className="mt-2 h-8 w-full rounded-full border text-xs font-bold disabled:opacity-70"
                        style={{
                          background: isFollowing
                            ? "transparent"
                            : "var(--primary)",
                          borderColor: isFollowing
                            ? "var(--border)"
                            : "var(--primary)",
                          color: isFollowing ? "var(--subtext)" : "#fff",
                        }}
                      >
                        {isPending ? (
                          <Spinner size={14} />
                        ) : isFollowing ? (
                          "Following"
                        ) : (
                          "Follow"
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {trending.length > 0 && (
            <section className="mt-7">
              <div className="flex items-center justify-between px-4 pb-3">
                <h3 className="font-bold">Trending now</h3>
                <Link
                  href="/browse?tab=search"
                  className="text-sm font-medium text-primary"
                >
                  Explore
                </Link>
              </div>

              <div
                className={
                  columns === 1
                    ? "space-y-5 px-4"
                    : "grid grid-cols-2 gap-3 px-4"
                }
              >
                {trending.map((item, i) => (
                  <TrendingTile
                    key={`${item.videoId ?? item.id}-${i}`}
                    item={item}
                    full={columns === 1}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function TrendingTile({ item, full }: { item: VideoItem; full: boolean }) {
  const id = item.videoId ?? item.id;
  const meta = [
    clean(item.channel),
    // Withheld below 1K - see lib/views.
    publicViewCountLabel(item.views ?? item.numOfViews),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link href={`/watch/${id}`} className="block">
      <div
        className={`aspect-video w-full overflow-hidden bg-card ${
          full ? "rounded-xl" : "rounded-lg"
        }`}
      >
        <Img
          backdrop
          src={fixCdn(item.imgUrl || item.thumbnail)}
          alt={clean(item.title)}
          className="h-full w-full"
        />
      </div>

      {full ? (
        <div className="mt-2.5 flex gap-2.5">
          <Img
            src={fixCdn(item.imgChannel)}
            alt=""
            className="h-9 w-9 shrink-0 rounded-full bg-card object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-semibold leading-5">
              {clean(item.title)}
            </p>
            <p className="mt-1 truncate text-xs text-subtext">{meta}</p>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-2 line-clamp-2 text-[13px] font-semibold leading-[17px]">
            {clean(item.title)}
          </p>
          <p className="mt-1 truncate text-[11px] text-subtext">{meta}</p>
        </>
      )}
    </Link>
  );
}
