"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markWelcomeSeen } from "@/lib/onboarding";
import { Spinner } from "@/components/Skeletons";
import { GridIcon, PlayIcon, UploadIcon, UsersIcon } from "@/components/Icons";

const FEATURES = [
  {
    icon: <PlayIcon size={22} />,
    title: "Watch anything, free",
    body: "Live TV, music, movies, teaching and more from channels around the world.",
  },
  {
    icon: <GridIcon size={22} />,
    title: "Explore collections",
    body: "Rhapsody of Realities, LoveWorld events and more, gathered into playlists.",
  },
  {
    icon: <UsersIcon size={22} />,
    title: "Follow creators",
    body: "Follow the channels you love and their newest videos land in your feed.",
  },
  {
    icon: <UploadIcon size={22} />,
    title: "Create and earn",
    body: "Upload your videos, grow a channel of your own, and earn from the ads on them.",
  },
];

/**
 * First-visit screen for signed-out visitors, as in the app. Explains what
 * KingsSpace is before they reach the feed. Either button marks it seen for
 * this browser, so it is shown once, not on every visit.
 */
export default function WelcomePage() {
  const router = useRouter();
  const [leaving, setLeaving] = useState<"login" | "explore" | null>(null);

  const finish = (destination: "login" | "explore") => {
    if (leaving) return;
    setLeaving(destination);
    markWelcomeSeen();
    router.replace(destination === "login" ? "/login" : "/");
  };

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1 px-5 pb-8 pt-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-icon.png" alt="KingsSpace" className="h-14 w-14" />

        <p className="mt-6 text-xs font-bold tracking-[0.12em] text-primary">
          WELCOME TO KINGSSPACE
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
          Watch. Share. Shine.
        </h1>
        <p className="mt-2 text-[15px] leading-6 text-subtext">
          A video home for faith, music and community. Here is what you can do.
        </p>

        <div className="mt-7 space-y-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="flex gap-3.5 rounded-2xl border border-border bg-card p-4"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                {feature.icon}
              </span>
              <div className="min-w-0">
                <p className="font-bold">{feature.title}</p>
                <p className="mt-0.5 text-sm leading-5 text-subtext">{feature.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="sticky bottom-0 space-y-3 border-t border-border bg-background px-5 pb-6 pt-4">
        <button
          type="button"
          onClick={() => finish("login")}
          disabled={Boolean(leaving)}
          className="flex h-12 w-full items-center justify-center rounded-full bg-primary font-bold text-white"
        >
          {leaving === "login" ? <Spinner size={18} /> : "Sign in to get started"}
        </button>
        <button
          type="button"
          onClick={() => finish("explore")}
          disabled={Boolean(leaving)}
          className="flex h-12 w-full items-center justify-center rounded-full border border-border font-bold"
        >
          {leaving === "explore" ? <Spinner size={18} /> : "Explore without an account"}
        </button>
        <p className="text-center text-xs leading-5 text-subtext">
          Signing in unlocks following, comments, uploads and earnings. You can
          do it any time from the You tab.
        </p>
      </div>
    </div>
  );
}
