"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addComment, getComments } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { block, commentAuthorId, commentAuthorName, isBlocked } from "@/lib/blocklist";
import { moderateText } from "@/lib/moderation";
import { clean, fixCdn, timeAgo } from "@/lib/utils";
import { Img } from "@/components/Img";
import { Spinner } from "@/components/Skeletons";
import { CloseIcon, CommentIcon, SendIcon } from "@/components/Icons";

const PAGE_SIZE = 20;
const MAX_COMMENT_LENGTH = 500;
const DEFAULT_AVATAR = "https://ceflix.org/images/avatar.png";

type Comment = Record<string, any>;

/**
 * Comments for a clip, in a sheet over the reel — the clip keeps playing
 * behind it.
 *
 * Read and write both go through the same moderation path as the watch page:
 * blocked authors are filtered out, and new comments are screened before they
 * are sent (docs/MODERATION.md).
 */
export function ClipComments({
  clipId,
  onClose,
  onCountChange,
}: {
  clipId: string | number;
  onClose: () => void;
  onCountChange?: (total: number) => void;
}) {
  const router = useRouter();
  const { token, user, isLoggedIn } = useAuth();

  const [comments, setComments] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [posting, setPosting] = useState(false);
  const [draft, setDraft] = useState("");
  const [blockVersion, setBlockVersion] = useState(0);

  const listRef = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (nextPage: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else {
        setLoading(true);
        setError(false);
      }

      try {
        const res = await getComments(clipId, nextPage, PAGE_SIZE, token || null);
        const list = Array.isArray(res.comments) ? res.comments : [];

        setComments((prev) => (append ? [...prev, ...list] : list));

        const current = Number(res.pagination?.current_page ?? nextPage);
        const last = Number(res.pagination?.last_page ?? current);
        setPage(current);
        setHasMore(current < last);
        setTotal(Number(res.pagination?.total ?? list.length));
      } catch {
        if (!append) setError(true);
        setHasMore(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [clipId, token],
  );

  useEffect(() => {
    setComments([]);
    setDraft("");
    load(1, false);
  }, [load]);

  // Escape closes, matching the other overlays.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const visible = useMemo(() => {
    void blockVersion;
    return comments.filter((c) => !isBlocked("user", commentAuthorId(c)));
  }, [comments, blockVersion]);

  const onScroll = useCallback(() => {
    const el = listRef.current;
    if (!el || loadingMore || loading || !hasMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
      load(page + 1, true);
    }
  }, [hasMore, load, loading, loadingMore, page]);

  const onBlockAuthor = useCallback(
    (c: Comment) => {
      const authorId = commentAuthorId(c);
      if (!authorId) return;
      const name = commentAuthorName(c);
      if (
        window.confirm(
          `Block ${name}? You will no longer see their comments. You can unblock them from Profile → Blocked users.`,
        )
      ) {
        block("user", authorId, name, token || undefined);
        setBlockVersion((v) => v + 1);
      }
    },
    [token],
  );

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isLoggedIn) {
        router.push("/login");
        return;
      }

      const text = draft.trim();
      if (!text || posting) return;

      // First-line objectionable-content screen; backend moderation and the
      // report queue remain authoritative (docs/MODERATION.md).
      const screened = moderateText(text, "comment");
      if (!screened.ok) {
        window.alert(screened.message);
        return;
      }

      setPosting(true);

      const optimistic: Comment = {
        id: `pending-${Date.now()}`,
        name: [user?.fname, user?.lname].filter(Boolean).join(" ") || "You",
        profile_pic: user?.profile_pic || "",
        comment: text,
        datetime: new Date().toISOString(),
        __pending: true,
      };

      // Show it straight away, the way a sent message behaves.
      setComments((prev) => [optimistic, ...prev]);
      setTotal((n) => {
        const next = n + 1;
        onCountChange?.(next);
        return next;
      });
      setDraft("");

      try {
        await addComment(clipId, text, token);
        // Re-read page one so the comment carries its real id and timestamp.
        await load(1, false);
      } catch {
        setComments((prev) => prev.filter((c) => c.id !== optimistic.id));
        setTotal((n) => {
          const next = Math.max(0, n - 1);
          onCountChange?.(next);
          return next;
        });
        setDraft(text);
      } finally {
        setPosting(false);
      }
    },
    [clipId, draft, isLoggedIn, load, onCountChange, posting, router, token, user],
  );

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      <button
        aria-label="Close comments"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      {/* Sized in dvh so the mobile keyboard shrinking the viewport keeps the
          composer on screen instead of pushing it underneath. */}
      <div className="relative flex h-[70dvh] max-h-[70dvh] flex-col rounded-t-2xl bg-background text-[color:var(--text)]">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-bold">
            Comments{total > 0 ? ` · ${total}` : ""}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close comments"
            className="text-subtext"
          >
            <CloseIcon size={20} />
          </button>
        </div>

        <div
          ref={listRef}
          onScroll={onScroll}
          className="flex-1 overflow-y-auto px-4 py-4"
        >
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Spinner />
            </div>
          ) : error ? (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <p className="text-sm text-subtext">Couldn&apos;t load comments.</p>
              <button
                onClick={() => load(1, false)}
                className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-white"
              >
                Try again
              </button>
            </div>
          ) : visible.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
              <span className="mb-2 text-subtext">
                <CommentIcon size={32} />
              </span>
              <p className="font-bold">No comments yet</p>
              <p className="text-sm text-subtext">
                Be the first to say something.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {visible.map((c, i) => (
                <div
                  key={c.id ?? i}
                  className={`flex gap-3 ${c.__pending ? "opacity-60" : ""}`}
                >
                  <Img
                    src={fixCdn(c.profile_pic || c.image) || DEFAULT_AVATAR}
                    alt=""
                    className="h-8 w-8 shrink-0 rounded-full bg-card object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-subtext">
                      {clean(c.name || c.username || c.fname || "User")}{" "}
                      <span className="font-normal">
                        {c.__pending
                          ? "Posting…"
                          : timeAgo(c.datetime || c.created_at || c.com_time)}
                      </span>
                    </p>
                    <p className="text-sm">{clean(c.comment || c.body)}</p>
                  </div>
                  {!c.__pending && (
                    <button
                      onClick={() => onBlockAuthor(c)}
                      className="shrink-0 self-start text-xs font-semibold text-subtext"
                      aria-label={`Block ${commentAuthorName(c)}`}
                    >
                      Block
                    </button>
                  )}
                </div>
              ))}

              {loadingMore && (
                <div className="flex justify-center py-3">
                  <Spinner size={18} />
                </div>
              )}
            </div>
          )}
        </div>

        <form
          onSubmit={onSubmit}
          className="flex items-center gap-2 border-t border-border px-4 py-3"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={MAX_COMMENT_LENGTH}
            placeholder={isLoggedIn ? "Add a comment…" : "Log in to comment"}
            className="flex-1 rounded-full border border-border bg-card px-4 py-2.5 text-sm outline-none placeholder:text-subtext"
          />
          <button
            type="submit"
            disabled={posting || !draft.trim()}
            aria-label="Post comment"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-45"
          >
            {posting ? <Spinner size={16} /> : <SendIcon size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
}
