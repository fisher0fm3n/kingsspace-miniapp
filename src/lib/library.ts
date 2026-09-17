import {
  getMyPlaylists,
  getUserHistory,
  getUserLiked,
  getUserVideos,
} from "./api";

/**
 * The four lists a user can browse in full from the "You" tab, in one place
 * so the profile shelves and their "View all" pages cannot drift apart.
 * Mirrors the app's services/profile.ts.
 */
export type LibrarySection = "videos" | "playlists" | "liked" | "history";

export const LIBRARY_TITLES: Record<LibrarySection, string> = {
  videos: "Your videos",
  playlists: "Playlists",
  liked: "Liked videos",
  history: "Watch history",
};

export function isLibrarySection(value: unknown): value is LibrarySection {
  return (
    value === "videos" ||
    value === "playlists" ||
    value === "liked" ||
    value === "history"
  );
}

const asList = (value: unknown): any[] => (Array.isArray(value) ? value : []);

export async function fetchLibrary(section: LibrarySection, token: string) {
  switch (section) {
    case "videos":
      return asList(await getUserVideos(token));
    case "playlists":
      return asList(await getMyPlaylists(token));
    case "liked":
      // The API returns oldest first; the most recent like belongs on top.
      return asList(await getUserLiked(token)).reverse();
    case "history":
      return asList(await getUserHistory(token));
  }
}

export function getVideoId(item: any) {
  return item?.videoId || item?.video_id || item?.id;
}

export function getPlaylistId(item: any) {
  return item?.playlist_id || item?.playlistId || item?.id;
}

export function playlistVideoCount(item: any): number {
  const explicit = item?.videos_count ?? item?.video_count ?? item?.total_videos;
  if (explicit !== undefined && Number.isFinite(Number(explicit))) return Number(explicit);
  if (Array.isArray(item?.videos)) return item.videos.length;
  return String(item?.videos_payload || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean).length;
}

/** Clips open in the reel, everything else on the watch page. */
export function libraryVideoHref(item: any) {
  const id = getVideoId(item);
  const short =
    String(item?.isShort ?? item?.is_short ?? "").toLowerCase() === "yes";
  return short ? `/clips?id=${id}` : `/watch/${id}`;
}
