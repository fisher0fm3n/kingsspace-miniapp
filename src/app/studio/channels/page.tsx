"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteChannel, getUserChannels } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { channelAvatar, clean, fixCdn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { Spinner } from "@/components/Skeletons";
import { Img } from "@/components/Img";
import {
  PlusIcon,
  EditIcon,
  TrashIcon,
  VerifiedIcon,
} from "@/components/Icons";

export default function StudioChannels() {
  const router = useRouter();
  const qc = useQueryClient();
  const { token, isLoggedIn, loading } = useAuth();
  const [busyId, setBusyId] = useState<string | number | null>(null);

  useEffect(() => {
    if (!loading && !isLoggedIn) router.replace("/login");
  }, [loading, isLoggedIn, router]);

  const { data: channels = [], isLoading } = useQuery({
    queryKey: ["user-channels", token],
    queryFn: () => getUserChannels(token),
    enabled: isLoggedIn,
  });

  const onDelete = async (id: string | number) => {
    if (!confirm("Delete this channel? This cannot be undone.")) return;
    setBusyId(id);
    try {
      await deleteChannel(id, token);
      qc.setQueryData<any[]>(["user-channels", token], (prev) =>
        (prev || []).filter((c) => c.id !== id),
      );
    } catch (e) {
      alert((e as Error).message || "Could not delete channel.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="pb-8">
      <PageHeader
        title="Channels"
        right={
          <Link
            href="/studio/createchannel"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white"
            aria-label="Create channel"
          >
            <PlusIcon size={22} />
          </Link>
        }
      />

      {isLoading ? (
        <div className="flex justify-center p-10">
          <Spinner />
        </div>
      ) : channels.length === 0 ? (
        <div className="p-10 text-center text-subtext">
          <p className="mb-4">You have no channels yet.</p>
          <Link
            href="/studio/createchannel"
            className="inline-block rounded-lg bg-primary px-5 py-2.5 font-bold text-white"
          >
            Create your first channel
          </Link>
        </div>
      ) : (
        <div className="space-y-4 p-4">
          {channels.map((c: any) => (
            <div
              key={c.id}
              className="overflow-hidden rounded-2xl border border-border bg-card"
            >
              <Link href={`/channel/${c.id}`} className="block">
                <div className="relative h-28 w-full bg-card2">
                  <Img
                    src={fixCdn(c.cover)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex items-center gap-3 p-3">
                  <Img
                    src={channelAvatar(c)}
                    alt={clean(c.channel)}
                    className="-mt-8 h-14 w-14 shrink-0 rounded-full border-2 border-card bg-card2 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <p className="truncate font-bold">{clean(c.channel)}</p>
                      {String(c.isVerified) === "1" && (
                        <VerifiedIcon size={14} className="text-primary" />
                      )}
                    </div>
                    <p className="truncate text-sm text-subtext">
                      {clean(c.description) || "Manage your channel"}
                    </p>
                  </div>
                </div>
              </Link>
              <div className="flex gap-2 border-t border-border p-3">
                <Link
                  href={`/studio/editchannel/${c.id}`}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-card2 py-2 text-sm font-semibold"
                >
                  <EditIcon size={16} /> Edit
                </Link>
                <button
                  onClick={() => onDelete(c.id)}
                  disabled={busyId === c.id}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-card2 py-2 text-sm font-semibold text-error disabled:opacity-50"
                >
                  {busyId === c.id ? (
                    <Spinner size={16} />
                  ) : (
                    <>
                      <TrashIcon size={16} /> Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
