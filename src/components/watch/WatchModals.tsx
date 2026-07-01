"use client";

import { useEffect, useState } from "react";
import {
  createPlaylist,
  getReportFlags,
  getUserPlaylists,
  insertToPlaylist,
  reportVideo,
} from "@/lib/api";
import { clean } from "@/lib/utils";
import { Spinner } from "@/components/Skeletons";
import { CheckIcon } from "@/components/Icons";

/** Bottom-sheet shell shared by the playlist + report modals. */
function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />
      <div className="relative z-10 w-full max-w-[480px] rounded-t-2xl border-t border-border bg-background p-4 pb-8">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="text-sm text-subtext">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PlaylistModal({
  videoId,
  token,
  onClose,
}: {
  videoId: string | number;
  token: string;
  onClose: () => void;
}) {
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [notice, setNotice] = useState("");

  const load = async () => {
    try {
      const list = await getUserPlaylists(videoId, token);
      setPlaylists(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = async (p: any) => {
    setPlaylists((prev) =>
      prev.map((x) => (x.id === p.id ? { ...x, hasVideo: true } : x)),
    );
    setNotice(`Added to "${clean(p.playlist_title || p.title || "playlist")}"`);
    try {
      await insertToPlaylist(p.id, videoId, token);
    } catch {
      /* keep optimistic state */
    }
    setTimeout(() => setNotice(""), 2500);
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await createPlaylist(title.trim(), videoId, visibility, token);
      setTitle("");
      setCreating(false);
      setLoading(true);
      await load();
    } catch {
      /* ignore */
    }
  };

  return (
    <Sheet title="Save to playlist" onClose={onClose}>
      {notice && (
        <p className="mb-3 rounded-lg bg-card px-3 py-2 text-sm text-primary">
          {notice}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <div className="max-h-[40vh] space-y-1 overflow-y-auto">
          {playlists.length === 0 && (
            <p className="py-6 text-center text-sm text-subtext">
              No playlists yet. Create one below.
            </p>
          )}
          {playlists.map((p) => (
            <button
              key={p.id}
              onClick={() => toggle(p)}
              className="flex w-full items-center justify-between rounded-lg px-2 py-3 text-left hover:bg-card"
            >
              <span className="truncate text-sm">
                {clean(p.playlist_title || p.title || "Untitled")}
              </span>
              <span
                className="flex h-6 w-6 items-center justify-center rounded-md border"
                style={{
                  borderColor: p.hasVideo ? "var(--primary)" : "var(--border)",
                  background: p.hasVideo ? "var(--primary)" : "transparent",
                }}
              >
                {p.hasVideo && <CheckIcon size={14} />}
              </span>
            </button>
          ))}
        </div>
      )}

      {creating ? (
        <form onSubmit={create} className="mt-4 space-y-3 border-t border-border pt-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Playlist title"
            className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none placeholder:text-subtext"
          />
          <div className="flex gap-2">
            {["public", "private"].map((v) => (
              <button
                type="button"
                key={v}
                onClick={() => setVisibility(v)}
                className="flex-1 rounded-xl border px-4 py-2 text-sm font-semibold capitalize"
                style={{
                  borderColor:
                    visibility === v ? "var(--primary)" : "var(--border)",
                  color: visibility === v ? "var(--primary)" : "var(--subtext)",
                }}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-white"
          >
            Create playlist
          </button>
        </form>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="mt-4 w-full rounded-xl border border-border py-2.5 text-sm font-semibold"
        >
          + Create new playlist
        </button>
      )}
    </Sheet>
  );
}

export function ReportModal({
  videoId,
  token,
  onClose,
}: {
  videoId: string | number;
  token: string;
  onClose: () => void;
}) {
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    getReportFlags()
      .then(setFlags)
      .finally(() => setLoading(false));
  }, []);

  const submit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await reportVideo(videoId, selected, message, token);
      setDone(true);
      setTimeout(onClose, 1500);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet title="Report video" onClose={onClose}>
      {done ? (
        <p className="py-8 text-center text-sm text-subtext">
          Report submitted. Thank you — we will review this video.
        </p>
      ) : loading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="max-h-[38vh] space-y-1 overflow-y-auto">
            {flags.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelected(f.id)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-card"
              >
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border"
                  style={{
                    borderColor:
                      selected === f.id ? "var(--primary)" : "var(--border)",
                  }}
                >
                  {selected === f.id && (
                    <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                  )}
                </span>
                <span className="text-sm">{clean(f.title)}</span>
              </button>
            ))}
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add details (optional)"
            rows={3}
            className="mt-3 w-full resize-none rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none placeholder:text-subtext"
          />
          <button
            onClick={submit}
            disabled={!selected || submitting}
            className="mt-3 w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit report"}
          </button>
        </>
      )}
    </Sheet>
  );
}
