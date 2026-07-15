"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  addComment,
  getComments,
  getVideo,
  likeVideo,
  subscribeChannel,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  block,
  commentAuthorId,
  commentAuthorName,
  isBlocked,
} from "@/lib/blocklist";
import { moderateText } from "@/lib/moderation";
import {
  channelThumb,
  clean,
  formatViews,
  timeAgo,
  videoThumb,
  videoTitle,
  videoUrl,
} from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { Box } from "@/components/Skeletons";
import { Img } from "@/components/Img";
import {
  HeartIcon,
  ShareIcon,
  VerifiedIcon,
  PlaylistIcon,
  FlagIcon,
  AutoplayIcon,
  BackIcon,
} from "@/components/Icons";
import { PlaylistModal, ReportModal } from "@/components/watch/WatchModals";

const AUTOPLAY_KEY = "kingsspace.watch.autoplay";

export default function WatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { token, isLoggedIn, user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["video", id, token],
    queryFn: () => getVideo(id, token || null),
  });

  const { data: commentsData, refetch: refetchComments } = useQuery({
    queryKey: ["comments", id, token],
    queryFn: () => getComments(id, 0, 20, token || null),
  });

  const video = data?.video;
  // Re-evaluated whenever the local blocklist changes (block/unblock actions).
  const [blockVersion, setBlockVersion] = useState(0);
  useEffect(() => {
    const bump = () => setBlockVersion((v) => v + 1);
    window.addEventListener("kingsspace:blocklist", bump);
    return () => window.removeEventListener("kingsspace:blocklist", bump);
  }, []);

  const upNext = useMemo(() => {
    void blockVersion;
    const list = Array.isArray(data?.upnext) ? data.upnext : [];
    return list.filter(
      (item: any) => !isBlocked("channel", item.channel_id || item.channelId),
    );
  }, [data, blockVersion]);

  const comments = useMemo(() => {
    void blockVersion;
    const list = commentsData?.comments || [];
    return list.filter((c: any) => !isBlocked("user", commentAuthorId(c)));
  }, [commentsData, blockVersion]);

  const onBlockCommenter = (c: any) => {
    const authorId = commentAuthorId(c);
    if (!authorId) return;
    const name = commentAuthorName(c);
    if (
      window.confirm(
        `Block ${name}? You will no longer see their comments. You can unblock them from Profile → Blocked users.`,
      )
    ) {
      block("user", authorId, name, token || undefined);
      refetchComments();
    }
  };

  const [liked, setLiked] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [commentReportId, setCommentReportId] = useState<
    string | number | null
  >(null);
  const [autoplay, setAutoplay] = useState(true);

  useEffect(() => {
    setLiked(Boolean(data?.liked));
    setSubscribed(Boolean(data?.isSubscribed));
  }, [data]);

  useEffect(() => {
    const stored = localStorage.getItem(AUTOPLAY_KEY);
    if (stored != null) setAutoplay(stored === "true");
  }, []);

  const toggleAutoplay = () => {
    setAutoplay((v) => {
      const next = !v;
      localStorage.setItem(AUTOPLAY_KEY, String(next));
      return next;
    });
  };

  const src = useMemo(() => (video ? videoUrl(video) : ""), [video]);
  const channelId = video?.channel_id;

  const onEnded = () => {
    if (!autoplay) return;
    const next = upNext[0];
    if (next) router.push(`/watch/${next.videoId || next.id}`);
  };

  const requireLogin = () => {
    if (!isLoggedIn) {
      router.push("/login");
      return false;
    }
    return true;
  };

  const onLike = async () => {
    if (!isLoggedIn) return router.push("/login");
    setLiked((v) => !v);
    try {
      await likeVideo(id, token);
    } catch {
      setLiked((v) => !v);
    }
  };

  const onSubscribe = async () => {
    if (!isLoggedIn) return router.push("/login");
    if (!channelId) return;
    setSubscribed((v) => !v);
    try {
      await subscribeChannel(channelId, token);
    } catch {
      setSubscribed((v) => !v);
    }
  };

  const onComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) return router.push("/login");
    const text = commentText.trim();
    if (!text) return;
    // First-line objectionable-content screen; backend moderation and the
    // report queue remain authoritative (docs/MODERATION.md).
    const screened = moderateText(text, "comment");
    if (!screened.ok) {
      window.alert(screened.message);
      return;
    }
    setPosting(true);
    try {
      await addComment(id, text, token);
      setCommentText("");
      refetchComments();
    } finally {
      setPosting(false);
    }
  };

  if (isLoading)
    return (
      <div>
        <Box w="100%" h={230} radius={0} />
        <div className="space-y-3 p-4">
          <Box w="90%" h={20} radius={999} />
          <Box w="60%" h={16} radius={999} />
        </div>
      </div>
    );

  if (error || !video)
    return (
      <div>
        <PageHeader title="Watch" />
        <p className="p-8 text-center text-subtext">
          {(error as Error)?.message || "Video not found."}
        </p>
      </div>
    );

  return (
    <div className="pb-8">
      {/* Player */}
      <div className="sticky top-0 z-20 aspect-video w-full bg-black">
        {src ? (
          <video
            src={src}
            poster={clean(video.thumbnail)}
            controls
            autoPlay
            playsInline
            onEnded={onEnded}
            className="h-full w-full bg-black"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-subtext">
            Video unavailable
          </div>
        )}

        {/* Back button overlay */}
        <button
          onClick={() => router.back()}
          aria-label="Back"
          className="absolute left-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white"
        >
          <BackIcon size={20} />
        </button>

        {/* Autoplay toggle overlay */}
        <button
          onClick={toggleAutoplay}
          aria-label="Toggle autoplay"
          className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white"
        >
          <AutoplayIcon size={16} />
          <span style={{ color: autoplay ? "var(--primary)" : "#fff" }}>
            {autoplay ? "On" : "Off"}
          </span>
        </button>
      </div>

      {/* Title + meta */}
      <div className="px-4 pt-3">
        <h1 className="text-base font-bold leading-6">{videoTitle(video)}</h1>
        <p className="mt-1 text-xs text-subtext">
          {[formatViews(video.numOfViews), timeAgo(video.uploadtime)]
            .filter(Boolean)
            .join(" · ")}
        </p>

        {/* Action row */}
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          <button
            onClick={onLike}
            className="flex items-center gap-1.5 rounded-full bg-card px-4 py-2 text-sm font-semibold"
            style={{ color: liked ? "var(--primary)" : "#fff" }}
          >
            <HeartIcon
              size={18}
              style={{ fill: liked ? "var(--primary)" : "none" }}
            />
            Like
          </button>
          <button
            onClick={() => requireLogin() && setPlaylistOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-card px-4 py-2 text-sm font-semibold"
          >
            <PlaylistIcon size={18} />
            Playlist
          </button>
          <button
            onClick={() => requireLogin() && setReportOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-card px-4 py-2 text-sm font-semibold"
          >
            <FlagIcon size={18} />
            Report
          </button>
          <button
            onClick={() => {
              if (navigator.share)
                navigator
                  .share({ title: videoTitle(video), url: location.href })
                  .catch(() => {});
            }}
            className="flex items-center gap-1.5 rounded-full bg-card px-4 py-2 text-sm font-semibold"
          >
            <ShareIcon size={18} />
            Share
          </button>
        </div>
      </div>

      {/* Channel row */}
      <div className="mt-4 flex items-center gap-3 border-y border-border px-4 py-3">
        <Link href={channelId ? `/channel/${channelId}` : "#"}>
          <Img
            src={channelThumb(video)}
            className="h-11 w-11 rounded-full bg-card object-cover"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="truncate font-bold">{clean(video.channel)}</span>
            {Number(video.isVerified) === 1 && (
              <VerifiedIcon size={14} className="text-primary" />
            )}
          </div>
        </div>
        <button
          onClick={onSubscribe}
          className="rounded-full px-4 py-2 text-sm font-bold"
          style={{
            background: subscribed ? "var(--card)" : "var(--primary)",
            color: subscribed ? "var(--subtext)" : "#fff",
          }}
        >
          {subscribed ? "Following" : "Follow"}
        </button>
      </div>

      {/* Description */}
      {video.description && (
        <div className="px-4 py-3">
          <p
            className={`whitespace-pre-line text-sm text-subtext ${
              expanded ? "" : "line-clamp-3"
            }`}
          >
            {clean(video.description)}
          </p>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-1 text-xs font-semibold text-primary"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        </div>
      )}

      {/* Comments */}
      <section className="border-t border-border px-4 py-4">
        <h2 className="mb-3 font-bold">
          Comments {comments.length ? `· ${comments.length}` : ""}
        </h2>
        <form onSubmit={onComment} className="mb-4 flex items-center gap-2">
          {isLoggedIn && user?.profile_pic && (
            <Img
              src={user.profile_pic}
              className="h-8 w-8 rounded-full object-cover"
            />
          )}
          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={isLoggedIn ? "Add a comment…" : "Log in to comment"}
            className="flex-1 rounded-full border border-border bg-card px-4 py-2 text-sm outline-none placeholder:text-subtext"
          />
          <button
            type="submit"
            disabled={posting}
            className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {posting ? "…" : "Post"}
          </button>
        </form>
        <div className="space-y-4">
          {comments.map((c: any, i: number) => (
            <div key={i} className="flex gap-3">
              <Img
                src={c.profile_pic || c.image || channelThumb(video)}
                className="h-8 w-8 shrink-0 rounded-full bg-card object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-subtext">
                  {clean(c.name || c.username || c.fname || "User")}{" "}
                  <span className="font-normal">
                    {timeAgo(c.datetime || c.created_at)}
                  </span>
                </p>
                <p className="text-sm">{clean(c.comment || c.body)}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5 self-start">
                <button
                  onClick={() => onBlockCommenter(c)}
                  className="text-xs font-semibold text-subtext"
                  aria-label={`Block ${commentAuthorName(c)}`}
                >
                  Block
                </button>
                {c.id != null && (
                  <button
                    onClick={() =>
                      requireLogin() && setCommentReportId(c.id)
                    }
                    className="text-xs font-semibold text-subtext"
                    aria-label="Report comment"
                  >
                    Report
                  </button>
                )}
              </div>
            </div>
          ))}
          {comments.length === 0 && (
            <p className="text-sm text-subtext">No comments yet.</p>
          )}
        </div>
      </section>

      {/* Up next */}
      {upNext.length > 0 && (
        <section className="border-t border-border px-4 py-4">
          <h2 className="mb-3 font-bold">Up next</h2>
          <div className="space-y-3">
            {upNext.map((item: any, i: number) => (
              <Link
                key={`${item.id}-${i}`}
                href={`/watch/${item.videoId || item.id}`}
                className="flex gap-3"
              >
                <div className="aspect-video w-40 shrink-0 overflow-hidden rounded-lg bg-card">
                  <Img src={videoThumb(item)} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium">
                    {videoTitle(item)}
                  </p>
                  <p className="mt-1 truncate text-xs text-subtext">
                    {clean(item.channel)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {playlistOpen && (
        <PlaylistModal
          videoId={id}
          token={token}
          onClose={() => setPlaylistOpen(false)}
        />
      )}
      {reportOpen && (
        <ReportModal
          kind="video"
          targetId={id}
          token={token}
          onClose={() => setReportOpen(false)}
        />
      )}
      {commentReportId != null && (
        <ReportModal
          kind="comment"
          targetId={commentReportId}
          token={token}
          onClose={() => setCommentReportId(null)}
        />
      )}
    </div>
  );
}
