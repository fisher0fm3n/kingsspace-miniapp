"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getVideo, updateVideo } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { clean } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { Spinner } from "@/components/Skeletons";

export default function EditVideo({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { token, isLoggedIn, loading } = useAuth();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !isLoggedIn) router.replace("/login");
  }, [loading, isLoggedIn, router]);

  const { data, isLoading } = useQuery({
    queryKey: ["edit-video", id, token],
    queryFn: () => getVideo(id, token || null),
    enabled: isLoggedIn,
  });

  useEffect(() => {
    const v = data?.video;
    if (!v) return;
    setName(clean(v.videos_title));
    setDescription(clean(v.description));
    setTags(clean(v.tags));
  }, [data]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Please enter a video title.");

    setSaving(true);
    try {
      await updateVideo(
        {
          video: id,
          video_title: name.trim(),
          description: description.trim(),
          tags: tags.trim(),
        },
        token,
      );
      router.replace("/studio/videos");
    } catch (err) {
      setError((err as Error).message || "Unable to update video.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-10">
      <PageHeader title="Edit Video" />
      {isLoading ? (
        <div className="flex justify-center p-10">
          <Spinner />
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4 p-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold">Title</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              rows={4}
              className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none placeholder:text-subtext"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold">
              Tags (comma separated)
            </label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Enter tags separated by commas"
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none placeholder:text-subtext"
            />
          </div>

          {error && <p className="text-sm text-error">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-white disabled:opacity-60"
          >
            {saving ? <Spinner size={18} /> : "Save changes"}
          </button>
        </form>
      )}
    </div>
  );
}
