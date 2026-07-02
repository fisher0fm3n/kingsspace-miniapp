"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getUserChannels } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { channelAvatar, clean } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { Spinner } from "@/components/Skeletons";
import { Img } from "@/components/Img";
import { UploadIcon, ImageIcon } from "@/components/Icons";

export default function UploadPage() {
  const router = useRouter();
  const { token, isLoggedIn, loading } = useAuth();

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [channelId, setChannelId] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "private">("public");
  const [isShort, setIsShort] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const videoRef = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);

  const {
    data: channels = [],
    isLoading,
    isFetching,
    isSuccess,
  } = useQuery({
    queryKey: ["user-channels", token],
    queryFn: () => getUserChannels(token),
    enabled: isLoggedIn,
  });

  useEffect(() => {
    if (!channelId && channels.length) setChannelId(String(channels[0].id));
  }, [channels, channelId]);

  // You can't upload without a channel — send first-time creators straight to
  // channel creation once we've confirmed (fetch settled) they have none.
  useEffect(() => {
    if (isLoggedIn && isSuccess && !isFetching && channels.length === 0) {
      router.replace("/studio/createchannel");
    }
  }, [isLoggedIn, isSuccess, isFetching, channels.length, router]);

  const videoPreview = useMemo(
    () => (videoFile ? URL.createObjectURL(videoFile) : ""),
    [videoFile],
  );
  useEffect(
    () => () => {
      if (videoPreview) URL.revokeObjectURL(videoPreview);
    },
    [videoPreview],
  );

  const pickThumb = (file: File) => {
    setThumbFile(file);
    setThumbPreview(URL.createObjectURL(file));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!videoFile) return setError("Please choose a video file.");
    if (!name.trim()) return setError("Please enter a title.");
    if (!channelId) return setError("Please select a channel to upload to.");

    const form = new FormData();
    form.append("video_title", name.trim());
    form.append("description", description.trim());
    form.append("tags", tags.trim());
    form.append("startDate", Math.floor(Date.now() / 1000).toString());
    form.append("privacy", privacy);
    form.append("token", token);
    form.append("channel", channelId);
    form.append("type", "video");
    form.append("is_short", isShort ? "yes" : "no");
    if (thumbFile) form.append("thumbnail", thumbFile, thumbFile.name);
    form.append("file", videoFile, videoFile.name);

    setUploading(true);
    setProgress(0);

    // XHR gives real upload progress, which fetch cannot.
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable)
        setProgress(Math.round((ev.loaded * 100) / ev.total));
    };
    xhr.onload = () => {
      setUploading(false);
      let json: any = null;
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        json = null;
      }
      if (xhr.status >= 200 && xhr.status < 300 && json?.status !== false) {
        router.replace(`/channel/${channelId}`);
      } else {
        setError(json?.message || `Upload failed (${xhr.status}).`);
      }
    };
    xhr.onerror = () => {
      setUploading(false);
      setError("Upload failed. Please try again.");
    };
    xhr.send(form);
  };

  if (!loading && !isLoggedIn)
    return (
      <div>
        <PageHeader title="Upload" />
        <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-card text-3xl">
            🎬
          </span>
          <h1 className="text-xl font-bold">Upload to KingsSpace</h1>
          <p className="max-w-xs text-sm text-subtext">
            Sign in to upload videos and manage your channels.
          </p>
          <Link
            href="/login"
            className="rounded-xl bg-primary px-6 py-3 font-bold text-white"
          >
            Log in
          </Link>
        </div>
      </div>
    );

  return (
    <div className="pb-10">
      <PageHeader title="Upload video" />
      <form onSubmit={submit} className="space-y-4 p-4">
        {/* Video picker */}
        <button
          type="button"
          onClick={() => videoRef.current?.click()}
          className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-card"
        >
          {videoPreview ? (
            <video
              src={videoPreview}
              className="h-full w-full object-contain"
              muted
              playsInline
            />
          ) : (
            <span className="flex flex-col items-center gap-2 text-subtext">
              <UploadIcon size={30} />
              <span className="text-sm font-semibold">
                Tap to choose a video
              </span>
            </span>
          )}
          <input
            ref={videoRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setVideoFile(f);
            }}
          />
        </button>
        {videoFile && (
          <p className="-mt-2 truncate text-xs text-subtext">
            {videoFile.name}
          </p>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-semibold">Title</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Add a title"
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none placeholder:text-subtext"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell viewers about your video"
            rows={3}
            className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none placeholder:text-subtext"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold">Channel</label>
          {isLoading ? (
            <div className="rounded-xl border border-border bg-card px-4 py-3">
              <Spinner size={16} />
            </div>
          ) : channels.length === 0 ? (
            <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-subtext">
              You need a channel first.{" "}
              <Link
                href="/studio/createchannel"
                className="font-semibold text-primary"
              >
                Create one
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
              {(() => {
                const c = channels.find(
                  (x: any) => String(x.id) === channelId,
                );
                return c ? (
                  <Img
                    src={channelAvatar(c)}
                    alt=""
                    className="h-8 w-8 shrink-0 rounded-full bg-card2 object-cover"
                  />
                ) : null;
              })()}
              <select
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                className="flex-1 bg-transparent py-1 text-sm outline-none"
              >
                {channels.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {clean(c.channel)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold">
            Tags (comma separated)
          </label>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="news, music, teaching"
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none placeholder:text-subtext"
          />
        </div>

        {/* Thumbnail */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold">
            Thumbnail (optional)
          </label>
          <button
            type="button"
            onClick={() => thumbRef.current?.click()}
            className="relative flex aspect-video w-full max-w-[220px] items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-card"
          >
            {thumbPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbPreview}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex flex-col items-center gap-1.5 text-subtext">
                <ImageIcon size={22} />
                <span className="text-xs font-semibold">Add thumbnail</span>
              </span>
            )}
            <input
              ref={thumbRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) pickThumb(f);
              }}
            />
          </button>
        </div>

        {/* Type + privacy */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold">Type</label>
          <div className="flex gap-2">
            {[
              { label: "Video", v: false },
              { label: "Clip", v: true },
            ].map((o) => (
              <button
                type="button"
                key={o.label}
                onClick={() => setIsShort(o.v)}
                className="flex-1 rounded-xl border px-4 py-2 text-sm font-semibold"
                style={{
                  borderColor:
                    isShort === o.v ? "var(--primary)" : "var(--border)",
                  color: isShort === o.v ? "var(--primary)" : "var(--subtext)",
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold">Privacy</label>
          <div className="flex gap-2">
            {(["public", "private"] as const).map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => setPrivacy(p)}
                className="flex-1 rounded-xl border px-4 py-2 text-sm font-semibold capitalize"
                style={{
                  borderColor:
                    privacy === p ? "var(--primary)" : "var(--border)",
                  color: privacy === p ? "var(--primary)" : "var(--subtext)",
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-error">{error}</p>}

        {uploading ? (
          <div className="space-y-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-card">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-center text-sm text-subtext">
              Uploading… {progress}%
            </p>
          </div>
        ) : (
          <button
            type="submit"
            disabled={channels.length === 0}
            className="w-full rounded-xl bg-primary py-3 font-bold text-white disabled:opacity-60"
          >
            Publish
          </button>
        )}
      </form>
    </div>
  );
}
