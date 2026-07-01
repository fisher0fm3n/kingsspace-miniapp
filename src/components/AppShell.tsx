"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  HomeIcon,
  BrowseIcon,
  PlusIcon,
  PersonIcon,
  BotIcon,
} from "./Icons";
import { Img } from "./Img";

const TABS = [
  { href: "/", label: "Home", icon: HomeIcon, match: (p: string) => p === "/" },
  {
    href: "/browse",
    label: "Browse",
    icon: BrowseIcon,
    match: (p: string) => p.startsWith("/browse") || p.startsWith("/collections"),
  },
] as const;

const TABS_RIGHT = [
  {
    href: "/kingsbot",
    label: "KingsBot",
    icon: BotIcon,
    match: (p: string) => p.startsWith("/kingsbot"),
  },
  {
    href: "/profile",
    label: "You",
    icon: PersonIcon,
    match: (p: string) => p.startsWith("/profile"),
  },
] as const;

// Full-screen immersive routes hide the tab bar (clips + watch behave like the
// RN app's full-screen players).
function isImmersive(path: string) {
  return path.startsWith("/clips");
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { user, isLoggedIn } = useAuth();
  const immersive = isImmersive(pathname);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col bg-background shadow-[0_0_60px_rgba(0,0,0,0.6)] sm:border-x sm:border-border">
      <main className={immersive ? "flex-1" : "flex-1 pb-[64px]"}>{children}</main>

      {!immersive && (
        <nav className="fixed bottom-0 left-1/2 z-40 flex h-[64px] w-full max-w-[480px] -translate-x-1/2 items-center justify-around border-t border-border bg-[rgba(20,20,20,0.92)] px-2 backdrop-blur">
          {TABS.map((t) => {
            const active = t.match(pathname);
            const Icon = t.icon;
            return (
              <Link
                key={t.href}
                href={t.href}
                className="flex flex-1 flex-col items-center justify-center gap-0.5"
                style={{ color: active ? "#fff" : "#8b8b8b" }}
              >
                <Icon size={22} />
                <span className="text-[10px]">{t.label}</span>
              </Link>
            );
          })}

          <button
            onClick={() => router.push(isLoggedIn ? "/upload" : "/login")}
            className="flex flex-1 items-center justify-center"
            aria-label="Create"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white">
              <PlusIcon size={26} />
            </span>
          </button>

          {TABS_RIGHT.map((t) => {
            const active = t.match(pathname);
            const Icon = t.icon;
            const isYou = t.href === "/profile";
            return (
              <Link
                key={t.href}
                href={t.href}
                className="flex flex-1 flex-col items-center justify-center gap-0.5"
                style={{ color: active ? "#fff" : "#8b8b8b" }}
              >
                {isYou && isLoggedIn && user?.profile_pic ? (
                  <Img
                    src={user.profile_pic}
                    alt="You"
                    className={`h-[26px] w-[26px] rounded-full object-cover ${
                      active ? "outline outline-2 outline-primary" : ""
                    }`}
                  />
                ) : (
                  <Icon size={22} />
                )}
                <span className="text-[10px]">{t.label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
