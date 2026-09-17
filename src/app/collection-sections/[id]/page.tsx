"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCollectionSection } from "@/lib/api";
import { Spinner } from "@/components/Skeletons";

/**
 * Collections no longer have sections: a collection opens straight onto its
 * playlists. This route only exists so links saved or shared before that
 * change still land somewhere - it looks up the section's collection and
 * forwards there.
 */
export default function LegacyCollectionSection({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    getCollectionSection(id)
      .then(({ collection }) => {
        if (cancelled) return;
        router.replace(collection?.id ? `/collections/${collection.id}` : "/collections");
      })
      .catch(() => {
        if (!cancelled) router.replace("/collections");
      });

    return () => {
      cancelled = true;
    };
  }, [id, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner size={30} />
    </div>
  );
}
