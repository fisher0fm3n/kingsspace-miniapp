"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { KC_AUTH_CODE_KEY } from "@/lib/kingschat";
import { stripAuthParamsFromLocation } from "@/lib/scrub";
import { syncBlockedFromServer } from "@/lib/blocklist";
import {
  HomeIcon,
  BrowseIcon,
  PlusIcon,
  PersonIcon,
  GridIcon,
} from "./Icons";
import { Img } from "./Img";

const TABS = [
  { href: "/", label: "Home", icon: HomeIcon, match: (p: string) => p === "/" },
  {
    href: "/browse",
    label: "Browse",
    icon: BrowseIcon,
    match: (p: string) => p.startsWith("/browse"),
  },
] as const;

const TABS_RIGHT = [
  {
    href: "/collections",
    label: "Collections",
    icon: GridIcon,
    match: (p: string) => p.startsWith("/collection"),
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
  const { user, isLoggedIn, token } = useAuth();
  const immersive = isImmersive(pathname);

  // Hydrate the local block-list cache from the server once signed in, so
  // blocks sync across devices (the server is authoritative for logged-in
  // users; see lib/blocklist).
  useEffect(() => {
    if (token) syncBlockedFromServer(token);
  }, [token]);

  // KingsChat (authRequired == true) launches the miniapp with a temporary
  // `authCode` on the URL — on whatever path it opens. SECURITY: strip it from
  // the address bar immediately (success and failure paths alike) and hand it
  // to /auth/callback via sessionStorage, never by re-embedding it in a URL.
  // The callback page exchanges it server-side for a KingsSpace session.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authCode = params.get("authCode") || params.get("code");
    if (!authCode) return;
    stripAuthParamsFromLocation();
    if (window.location.pathname.startsWith("/auth/callback")) return;
    try {
      sessionStorage.setItem(KC_AUTH_CODE_KEY, authCode);
    } catch {
      /* sessionStorage unavailable — user can still log in manually */
    }
    router.replace("/auth/callback");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
