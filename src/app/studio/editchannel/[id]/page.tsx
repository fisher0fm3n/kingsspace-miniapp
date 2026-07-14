"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getChannelCategories,
  getUserChannel,
  updateChannel,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { moderateFields } from "@/lib/moderation";
import { clean } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { Spinner } from "@/components/Skeletons";

export default function EditChannel({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const { token, isLoggedIn, loading } = useAuth();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !isLoggedIn) router.replace("/login");
  }, [loading, isLoggedIn, router]);

  const { data, isLoading } = useQuery({
    queryKey: ["edit-channel", id, token],
    queryFn: async () => {
      const [channel, categories] = await Promise.all([
        getUserChannel(id, token),
        getChannelCategories(token),
      ]);
      return { channel, categories };
    },
    enabled: isLoggedIn,
  });

  useEffect(() => {
    if (!data?.channel) return;
    const ch = data.channel;
    setName(clean(ch.channel));
    setDescription(clean(ch.description));
    setTags(clean(ch.tags));
    setCategory(String(ch.cat_id ?? data.categories?.[0]?.id ?? ""));
  }, [data]);

  const categories: any[] = data?.categories ?? [];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !description.trim())
      return setError("Please enter a channel name and description.");
    if (!category) return setError("Please select a category.");

    const screened = moderateFields({
      "channel name": name,
      description,
      tags,
    });
    if (!screened.ok) return setError(screened.message);

    setSaving(true);
    try {
      await updateChannel(
        {
          channel: id,
          channel_title: name.trim(),
          description: description.trim(),
          tags: tags.trim(),
          category,
        },
        token,
      );
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["user-channels"] }),
        qc.invalidateQueries({ queryKey: ["channel", id] }),
      ]);
      router.replace("/studio/channels");
    } catch (err) {
      setError((err as Error).message || "Unable to update channel.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-10">
      <PageHeader title="Edit Channel" />
      {isLoading ? (
        <div className="flex justify-center p-10">
          <Spinner />
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4 p-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold">
              Channel name
            </label>
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
              rows={3}
              className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none placeholder:text-subtext"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none"
            >
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {clean(c.title)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold">
              Tags (comma separated)
            </label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
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
