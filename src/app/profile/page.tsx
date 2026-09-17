"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  formatEspees,
  getAccountStats,
  getEarnings,
  getUserChannels,
} from "@/lib/api";
import {
  LIBRARY_TITLES,
  fetchLibrary,
  getPlaylistId,
  getVideoId,
  type LibrarySection,
} from "@/lib/library";
import { clean } from "@/lib/utils";
import { Spinner } from "@/components/Skeletons";
import { EmptyState } from "@/components/EmptyState";
import { Img } from "@/components/Img";
import { PlaylistShelfCard, VideoShelfCard } from "@/components/library";
import {
  ClockIcon,
  HeartIcon,
  PlaylistIcon,
  TvIcon,
  UploadIcon,
} from "@/components/Icons";

/*
 * The "You" tab, laid out the way the app's (and YouTube's) is: who you are,
 * what you can do, shelves of your own content, then a plain list of
 * everything else. Everything is on one scroll; the full lists are a
 * "View all" away. The safety and legal links KingsChat Services onboarding
 * requires stay reachable from here.
 */

/** Items a shelf shows before handing over to "View all". */
const SHELF_LIMIT = 10;

/** One library list for the shelves; the "View all" pages share its cache key. */
function useLibrary(section: LibrarySection, token: string, enabled: boolean) {
  return useQuery({
    queryKey: ["library", section, token],
    queryFn: () => fetchLibrary(section, token),
    enabled,
    staleTime: 1000 * 60,
  });
}

function Divider() {
  return <div className="my-2 h-px bg-border" />;
}

function Row({
  href,
  icon,
  label,
  value,
  destructive = false,
  onClick,
}: {
  href?: string;
  icon?: React.ReactNode;
  label: string;
  value?: string;
  destructive?: boolean;
  onClick?: () => void;
}) {
  const body = (
    <>
      {icon && (
        <span className={destructive ? "text-error" : "text-text"}>{icon}</span>
      )}
      <span
        className={`min-w-0 flex-1 truncate text-[15px] ${destructive ? "text-error" : ""}`}
      >
        {label}
      </span>
      {value && <span className="shrink-0 text-sm text-subtext">{value}</span>}
      {href && <span className="text-subtext">›</span>}
    </>
  );
  const className = "flex w-full items-center gap-4 px-4 py-3 text-left active:bg-card";

  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {body}
    </button>
  );
}

function Shelf({
  section,
  items,
}: {
  section: LibrarySection;
  items: any[];
}) {
  const isPlaylists = section === "playlists";
  return (
    <section className="mt-5">
      <div className="mb-2.5 flex items-center justify-between px-4">
        <h2 className="text-lg font-bold tracking-tight">{LIBRARY_TITLES[section]}</h2>
        <Link
          href={`/library/${section}`}
          className="rounded-full border border-border px-3 py-1 text-xs font-semibold"
        >
          View all
        </Link>
      </div>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
        {items.slice(0, SHELF_LIMIT).map((item, index) =>
          isPlaylists ? (
            <PlaylistShelfCard key={`p-${getPlaylistId(item)}-${index}`} item={item} />
          ) : (
            <VideoShelfCard key={`v-${getVideoId(item)}-${index}`} item={item} />
          ),
        )}
      </div>
    </section>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, token, isLoggedIn, signOut, loading } = useAuth();

  const enabled = isLoggedIn;
  const videos = useLibrary("videos", token, enabled);
  const playlists = useLibrary("playlists", token, enabled);
  const liked = useLibrary("liked", token, enabled);
  const history = useLibrary("history", token, enabled);

  const { data: stats } = useQuery({
    queryKey: ["account-stats", token],
    queryFn: () => getAccountStats(token),
    enabled,
  });

  const { data: channels = [] } = useQuery<any[]>({
    queryKey: ["user-channels", token],
    queryFn: () => getUserChannels(token),
    enabled,
  });

  // Earnings must never break the profile: the endpoint is newer than the
  // rest and may be missing in some environments.
  const { data: earnings } = useQuery({
    queryKey: ["earnings", token],
    queryFn: () => getEarnings(token),
    enabled,
    retry: false,
  });

  if (loading)
    return (
      <div className="flex justify-center p-10">
        <Spinner />
      </div>
    );

  if (!isLoggedIn)
    return (
      <div className="pb-8">
        <div className="flex min-h-[55vh] flex-col items-center justify-center gap-4 p-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-card text-3xl">
            👤
          </span>
          <h1 className="text-xl font-bold">You&apos;re not signed in</h1>
          <p className="text-sm text-subtext">
            Log in to see your videos, playlists, likes and history.
          </p>
          <Link
            href="/login"
            className="rounded-xl bg-primary px-6 py-3 font-bold text-white"
          >
            Log in
          </Link>
        </div>
        <SafetyLinks />
      </div>
    );

  const displayName = clean(
    [user?.fname, user?.lname].filter(Boolean).join(" ") ||
      user?.username ||
      "Your profile",
  );
  const followers = Number((stats as any)?.subscribers ?? 0);
  const bio = clean((user as any)?.bio);

  const videoItems = videos.data ?? [];
  const playlistItems = playlists.data ?? [];
  const likedItems = liked.data ?? [];
  const historyItems = history.data ?? [];

  const count = (list: any[]) => (list.length ? String(list.length) : undefined);

  return (
    <div className="pb-10">
      {/* ------------------------------------------------------ identity */}
      <div className="flex items-center gap-4 px-4 pb-2 pt-6">
        {user?.profile_pic ? (
          <Img
            src={user.profile_pic}
            alt=""
            className="h-[72px] w-[72px] shrink-0 rounded-full bg-card object-cover"
          />
        ) : (
          <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-card text-3xl">
            {(user?.fname || user?.username || "U")[0]}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-extrabold">{displayName}</h1>
          <p className="truncate text-sm text-subtext">
            {[
              user?.username ? `@${user.username}` : "",
              `${followers} follower${followers === 1 ? "" : "s"}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>

      {bio && <p className="line-clamp-3 px-4 pt-1 text-sm text-subtext">{bio}</p>}

      {/* -------------------------------------------------------- actions */}
      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-4">
        {[
          { href: "/studio", label: "Creator Dashboard" },
          { href: "/upload", label: "Upload" },
          { href: "/studio/channels", label: "My channels" },
        ].map((chip) => (
          <Link
            key={chip.href}
            href={chip.href}
            className="shrink-0 rounded-full border border-border bg-card px-3.5 py-2 text-sm font-semibold"
          >
            {chip.label}
          </Link>
        ))}
      </div>

      {/* -------------------------------------------------------- options */}
      <Divider />
      <Row
        href="/studio/earnings"
        label="Ad earnings"
        value={earnings ? `${formatEspees(earnings.total_balance_micros)} Espees` : undefined}
      />
      <Row
        href="/studio/channels"
        icon={<TvIcon size={20} />}
        label="My channels"
        value={String(channels.length)}
      />
      <Row href="/studio" label="Creator dashboard" />

      <Divider />
      <Row
        href="/library/history"
        icon={<ClockIcon size={20} />}
        label={LIBRARY_TITLES.history}
        value={count(historyItems)}
      />
      <Row
        href="/library/liked"
        icon={<HeartIcon size={20} />}
        label={LIBRARY_TITLES.liked}
        value={count(likedItems)}
      />
      <Row
        href="/library/playlists"
        icon={<PlaylistIcon size={20} />}
        label={LIBRARY_TITLES.playlists}
        value={count(playlistItems)}
      />
      <Row href="/interests?mode=edit" label="Your interests" />

      {/* -------------------------------------------------------- shelves */}
      <Divider />
      {videos.isLoading ? (
        <div className="flex justify-center p-6">
          <Spinner />
        </div>
      ) : videoItems.length > 0 ? (
        <Shelf section="videos" items={videoItems} />
      ) : (
        <section className="mt-5">
          <h2 className="mb-2.5 px-4 text-lg font-bold tracking-tight">
            {LIBRARY_TITLES.videos}
          </h2>
          <EmptyState
            icon={<UploadIcon size={22} />}
            title="Upload your first video"
            body="Everything you publish shows up here."
            action={{ label: "Upload a video", href: "/upload" }}
          />
        </section>
      )}
      {playlistItems.length > 0 && <Shelf section="playlists" items={playlistItems} />}
      {likedItems.length > 0 && <Shelf section="liked" items={likedItems} />}
      {historyItems.length > 0 && <Shelf section="history" items={historyItems} />}

      <div className="mt-5" />
      <Divider />
      <SafetyLinks />

      <Divider />
      <Row
        label="Sign out"
        destructive
        onClick={() => {
          signOut();
          router.replace("/");
        }}
      />
    </div>
  );
}

/** Settings & legal - reachable in-service links required for KingsChat Services onboarding. */
function SafetyLinks() {
  return (
    <div>
      <Row href="/settings/blocked" label="Blocked users & channels" />
      <Row href="/legal/privacy" label="Privacy Policy" />
      <Row href="/legal/terms" label="Terms of Use" />
      <Row href="/support" label="Contact & Support" />
      <Row href="/settings/delete-account" label="Delete account & data" destructive />
    </div>
  );
}
