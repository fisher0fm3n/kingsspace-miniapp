"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { getUserHistory, getUserLiked, getUserSubscriptions } from "@/lib/api";
import { clean, videoThumb, videoTitle } from "@/lib/utils";
import { Spinner } from "@/components/Skeletons";
import { Img } from "@/components/Img";

const TABS = ["History", "Liked", "Subscriptions"] as const;
type Tab = (typeof TABS)[number];

export default function ProfilePage() {
  const router = useRouter();
  const { user, token, isLoggedIn, signOut, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("History");

  const { data, isFetching } = useQuery<any[]>({
    queryKey: ["profile", tab, token],
    queryFn: () =>
      tab === "History"
        ? getUserHistory(token)
        : tab === "Liked"
          ? getUserLiked(token)
          : getUserSubscriptions(token),
    enabled: isLoggedIn,
  });

  if (loading)
    return (
      <div className="flex justify-center p-10">
        <Spinner />
      </div>
    );

  if (!isLoggedIn)
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 p-8 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-card text-3xl">
          👤
        </span>
        <h1 className="text-xl font-bold">You&apos;re not signed in</h1>
        <p className="text-sm text-subtext">
          Log in to see your history, likes and subscriptions.
        </p>
        <Link
          href="/login"
          className="rounded-xl bg-primary px-6 py-3 font-bold text-white"
        >
          Log in
        </Link>
      </div>
    );

  const items = Array.isArray(data) ? data : [];

  return (
    <div className="pb-8">
      <div className="flex items-center gap-4 p-5">
        {user?.profile_pic ? (
          // eslint-disable-next-line @next/next/no-img-element
          <Img
            src={user.profile_pic}
            alt=""
            className="h-20 w-20 rounded-full bg-card object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-card text-3xl">
            {(user?.fname || user?.username || "U")[0]}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-extrabold">
            {clean(
              [user?.fname, user?.lname].filter(Boolean).join(" ") ||
                user?.username ||
                "KingsSpace user",
            )}
          </h1>
          {user?.username && (
            <p className="truncate text-sm text-subtext">@{user.username}</p>
          )}
        </div>
      </div>

      <div className="flex gap-2 px-5">
        <Link
          href="/studio"
          className="flex-1 rounded-xl bg-primary py-2.5 text-center text-sm font-bold text-white"
        >
          Creator Studio
        </Link>
        <button
          onClick={() => {
            signOut();
            router.replace("/");
          }}
          className="flex-1 rounded-xl bg-card py-2.5 text-center text-sm font-bold text-error"
        >
          Sign out
        </button>
      </div>

      <div className="no-scrollbar mt-5 flex gap-1 overflow-x-auto border-b border-border px-4 pb-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold"
            style={{
              background: tab === t ? "var(--primary)" : "var(--card)",
              color: tab === t ? "#fff" : "var(--subtext)",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Settings & legal — reachable in-service links required for
          KingsChat Services onboarding. */}
      <div className="mx-5 mt-4 divide-y divide-border rounded-xl border border-border bg-card text-sm">
        {[
          { href: "/settings/blocked", label: "Blocked users & channels" },
          { href: "/legal/privacy", label: "Privacy Policy" },
          { href: "/legal/terms", label: "Terms of Use" },
          { href: "/support", label: "Contact & Support" },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex items-center justify-between px-4 py-3"
          >
            <span>{l.label}</span>
            <span className="text-subtext">›</span>
          </Link>
        ))}
        <Link
          href="/settings/delete-account"
          className="flex items-center justify-between px-4 py-3 text-error"
        >
          <span>Delete account &amp; data</span>
          <span className="text-subtext">›</span>
        </Link>
      </div>

      {isFetching ? (
        <div className="flex justify-center p-10">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <p className="p-8 text-center text-sm text-subtext">Nothing here yet.</p>
      ) : (
        <div className="space-y-3 p-4">
          {items.map((v: any, i: number) => {
            const isChannel = tab === "Subscriptions" && !v.videoId && !v.id;
            const href =
              tab === "Subscriptions"
                ? `/channel/${v.channel_id || v.id || v.channelID}`
                : `/watch/${v.videoId || v.id}`;
            return (
              <Link key={i} href={href} className="flex gap-3">
                <div className="aspect-video w-40 shrink-0 overflow-hidden rounded-lg bg-card">
                  <Img
                    src={videoThumb(v)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium">
                    {isChannel ? clean(v.channel) : videoTitle(v)}
                  </p>
                  <p className="mt-1 truncate text-xs text-subtext">
                    {clean(v.channel)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
