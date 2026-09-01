"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { createChannel, getChannelCategories } from "@/lib/api";
import { moderateFields } from "@/lib/moderation";
import { useAuth } from "@/lib/auth";
import { clean } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { Spinner } from "@/components/Skeletons";
import { ImageIcon } from "@/components/Icons";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ImagePicker({
  label,
  value,
  onPick,
  aspect,
}: {
  label: string;
  value: string;
  onPick: (dataUrl: string) => void;
  aspect: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <button
      type="button"
      onClick={() => ref.current?.click()}
      className={`relative flex ${aspect} w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-card`}
    >
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="flex flex-col items-center gap-1.5 text-subtext">
          <ImageIcon size={24} />
          <span className="text-xs font-semibold">{label}</span>
        </span>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) onPick(await fileToDataUrl(file));
        }}
      />
    </button>
  );
}

export default function CreateChannel() {
  const router = useRouter();
  const { token, isLoggedIn, loading } = useAuth();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [cover, setCover] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !isLoggedIn) router.replace("/login");
  }, [loading, isLoggedIn, router]);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["channel-categories", token],
    queryFn: () => getChannelCategories(token),
    enabled: isLoggedIn,
  });

  useEffect(() => {
    if (!category && categories.length) setCategory(String(categories[0].id));
  }, [categories, category]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !description.trim())
      return setError("Please enter a channel name and description.");
    if (!category) return setError("Please select a category.");
    if (!thumbnail) return setError("Please choose a channel thumbnail.");
    if (!cover) return setError("Please choose a cover image.");

    const screened = moderateFields({
      "channel name": name,
      description,
      tags,
    });
    if (!screened.ok) return setError(screened.message);

    setSubmitting(true);
    try {
      const res = await createChannel(
        {
          category,
          channel_title: name.trim(),
          description: description.trim(),
          tags: tags.trim(),
          thumbnail,
          cover,
        },
        token,
      );
      const channelId = (res as any)?.data?.id;
      router.replace(channelId ? `/channel/${channelId}` : "/studio/channels");
    } catch (err) {
      setError((err as Error).message || "Unable to create channel.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-10">
      <PageHeader title="Create Channel" />
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
              placeholder="Enter channel name"
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
              placeholder="What is your channel about?"
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
              placeholder="news, music, teaching"
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none placeholder:text-subtext"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-semibold">
                Thumbnail
              </label>
              <ImagePicker
                label="Add thumbnail"
                value={thumbnail}
                onPick={setThumbnail}
                aspect="aspect-square"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold">
                Cover
              </label>
              <ImagePicker
                label="Add cover"
                value={cover}
                onPick={setCover}
                aspect="aspect-square"
              />
            </div>
          </div>

          {error && <p className="text-sm text-error">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-white disabled:opacity-60"
          >
            {submitting ? <Spinner size={18} /> : "Create channel"}
          </button>
        </form>
      )}
    </div>
  );
}
