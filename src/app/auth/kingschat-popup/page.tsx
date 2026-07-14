"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function KingsChatPopupPage() {
  const router = useRouter();

  useEffect(() => {
    const url = new URL(window.location.href);
    const payload = url.searchParams.get("payload") || url.searchParams.get("data");
    const code = url.searchParams.get("authCode") || url.searchParams.get("code");

    if (payload || code) {
      const next = `/auth/callback?${url.searchParams.toString()}`;
      router.replace(next);
      return;
    }

    window.location.href = "https://accounts.kingschat.online/log-in?clientId=f610b805-61ac-4a5f-811c-12e64c637a64";
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6 text-center text-sm text-subtext">
      Opening KingsChat…
    </div>
  );
}
