"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getCollectionItems } from "@/lib/api";
import { clean, videoThumb, videoTitle } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { Spinner } from "@/components/Skeletons";
import { Img } from "@/components/Img";

export default function CollectionDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading, error } = useQuery({
    queryKey: ["collection-items", id],
    queryFn: () => getCollectionItems(id),
  });

  return (
    <div className="pb-6">
      <PageHeader title={clean(data?.collection?.title) || "Collection"} />
      {isLoading && (
        <div className="flex justify-center p-10">
          <Spinner />
        </div>
      )}
      {error && (
        <p className="p-8 text-center text-subtext">
          {(error as Error).message}
        </p>
      )}
      {(data?.items || []).map((item: any) => {
        const videos = item?.playlist?.videos || [];
        return (
          <section key={item.id} className="mt-5">
            <div className="mb-2 flex items-center justify-between px-4">
              <h2 className="text-lg font-bold">{clean(item.title)}</h2>
              {item.playlist_id && (
                <Link
                  href={`/playlist/${item.playlist_id}`}
                  className="text-sm font-semibold text-primary"
                >
                  View all
                </Link>
              )}
            </div>
            {videos.length === 0 ? (
              <p className="px-4 text-sm text-subtext">No videos.</p>
            ) : (
              <div className="no-scrollbar flex gap-4 overflow-x-auto px-4">
                {videos.map((v: any, i: number) => (
                  <Link
                    key={`${v.id}-${i}`}
                    href={`/watch/${v.id}`}
                    className="block shrink-0"
                    style={{ width: 240 }}
                  >
                    <div className="aspect-video w-full overflow-hidden rounded-lg bg-card">
                      <Img
                        src={videoThumb(v)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm font-medium">
                      {videoTitle(v)}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-subtext">
                      {clean(v.channel)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
