"use client";

import { useRouter } from "next/navigation";
import { BackIcon } from "./Icons";

export function PageHeader({
  title,
  right,
}: {
  title?: string;
  right?: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/95 px-3 py-3 backdrop-blur">
      <button
        onClick={() => router.back()}
        className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-card"
        aria-label="Back"
      >
        <BackIcon size={22} />
      </button>
      {title && <h1 className="flex-1 truncate text-lg font-bold">{title}</h1>}
      {right}
    </header>
  );
}
