"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ClipsReel } from "@/components/ClipsReel";
import { Spinner } from "@/components/Skeletons";
import { BackIcon } from "@/components/Icons";

function ClipsInner() {
  const params = useSearchParams();
  const router = useRouter();
  const selectedId = params.get("id");

  return (
    <div className="relative h-screen bg-black">
      <button
        onClick={() => router.back()}
        className="fixed left-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white"
      >
        <BackIcon size={22} />
      </button>
      <ClipsReel selectedId={selectedId} />
    </div>
  );
}

export default function ClipsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-black">
          <Spinner size={30} />
        </div>
      }
    >
      <ClipsInner />
    </Suspense>
  );
}
