"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";

export default function UploadPage() {
  const { isLoggedIn } = useAuth();
  return (
    <div>
      <PageHeader title="Create" />
      <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-card text-3xl">
          🎬
        </span>
        <h1 className="text-xl font-bold">Upload to KingsSpace</h1>
        {isLoggedIn ? (
          <p className="max-w-xs text-sm text-subtext">
            Video uploads and channel management run in KingsSpace Studio. Pick a
            file, add a title and thumbnail, and publish to your channel.
          </p>
        ) : (
          <>
            <p className="max-w-xs text-sm text-subtext">
              Sign in to upload videos and manage your channels.
            </p>
            <Link
              href="/login"
              className="rounded-xl bg-primary px-6 py-3 font-bold text-white"
            >
              Log in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
