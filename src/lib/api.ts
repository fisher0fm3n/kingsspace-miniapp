// Typed client for the KingsSpace backend, routed through the Next.js proxies.
import { STORAGE_KEYS } from "./config";
import type { WatchEarnEngagementResult } from "./watchEarn";

export function getToken(): string {
  if (typeof window === "undefined") return "";
  const raw = window.localStorage.getItem(STORAGE_KEYS.token) || "";
  if (!raw || raw === "null" || raw === "undefined") return "";
  return raw;
}

type ReqOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
};

async function request<T = any>(
  base: "ceflix" | "nmt",
  path: string,
  options: ReqOptions = {},
): Promise<T> {
  const { method = "GET", body, token, signal } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const activeToken = token === undefined ? getToken() : token;
  if (activeToken) headers["x-token"] = activeToken;

  const res = await fetch(`/api/${base}/${path.replace(/^\//, "")}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : null;

  if (!res.ok || (json && json.status === false)) {
    throw new Error(json?.message || `Request failed (${res.status})`);
  }
  return json as T;
}

export const ceflix = <T = any>(path: string, options?: ReqOptions) =>
  request<T>("ceflix", path, options);

export const nmt = <T = any>(path: string, options?: ReqOptions) =>
  request<T>("nmt", path, options);

// ---------------------------------------------------------------------------
// Endpoint helpers
// ---------------------------------------------------------------------------

/**
 * The personalised home feed. The token is what makes it personal; without it
 * the API returns trending and fresh content. `layout_version: 2` tells the
 * API this client renders sections in the order sent, so it delivers the
 * Clips row itself (the app does the same).
 */
export const getHome = (token?: string | null) =>
  ceflix("smarthome", {
    method: "POST",
    body: { token: token ?? getToken(), layout_version: 2 },
  }).then((j) => j);

/** Every live TV station, in the API's order. Stations without a stream are dropped. */
export const getLiveStations = () =>
  ceflix("livestations", { method: "POST", body: {} }).then((j) =>
    (Array.isArray(j?.data) ? j.data : [])
      .map((row: any) => ({
        id: Number(row?.id ?? 0),
        name: String(row?.name ?? ""),
        desc: String(row?.desc ?? ""),
        src: String(row?.src ?? ""),
        imgChannel: String(row?.imgChannel ?? ""),
      }))
      .filter((row: { src: string }) => row.src),
  );

export const getNewsPosts = async () => {
  const json = await nmt("kingsspace/rss");
  const feeds = Array.isArray(json?.feeds) ? json.feeds : [];
  return feeds.flatMap((f: any) => (Array.isArray(f?.items) ? f.items : []));
};

export const getCollections = () =>
  ceflix("collections").then((j) => (Array.isArray(j?.data) ? j.data : []));

/**
 * A collection is its playlists.
 *
 * There used to be a middle layer (Collection -> Sections -> Playlists). Now
 * `collections/{id}/items` returns every playlist in the collection, each
 * with its videos. `items` is the flat list; an older API only sends
 * `sections`, each with its own items, and flattening those gives the same.
 */
export const getCollectionPlaylists = (id: string) =>
  ceflix(`collections/${encodeURIComponent(id)}/items`).then((j) => {
    const data = j?.data ?? {};
    const items: any[] = Array.isArray(data.items)
      ? data.items
      : Array.isArray(data.sections)
        ? data.sections.flatMap((section: any) =>
            Array.isArray(section?.items) ? section.items : [],
          )
        : [];
    return { collection: data.collection ?? null, items };
  });

/** One playlist found by the cross-collection search. */
export type CollectionPlaylistResult = {
  id: string;
  playlist_id: string;
  title: string;
  thumbnail: string;
  video_count: number;
  collection: { id: string; title: string };
  section: { id: string; title: string };
};

/** The API ignores queries shorter than this and returns nothing. */
export const COLLECTION_SEARCH_MIN_LENGTH = 2;

/**
 * Searches the titles of every playlist in every collection, so a search box
 * on any collections screen finds a playlist wherever it is filed.
 */
export const searchCollectionPlaylists = async (
  term: string,
  signal?: AbortSignal,
): Promise<CollectionPlaylistResult[]> => {
  const q = term.trim();
  if (q.length < COLLECTION_SEARCH_MIN_LENGTH) return [];
  const j = await ceflix(`collections/search?q=${encodeURIComponent(q)}`, {
    token: null,
    signal,
  });
  return Array.isArray(j?.data) ? j.data : [];
};

export const getCollectionSection = (id: string) =>
  ceflix(`collections/section/${id}/items`).then((j) => ({
    collection: j?.data?.collection ?? null,
    section: j?.data?.section ?? null,
    items: Array.isArray(j?.data?.items) ? j.data.items : [],
  }));

export const getVideo = (id: string | number, token?: string | null) => {
  const body: Record<string, unknown> = { video: id };
  if (token) body.token = token;
  return ceflix("video", { method: "POST", body, token }).then((j) => j?.data);
};

export const getComments = (
  id: string | number,
  page = 0,
  perPage = 20,
  token?: string | null,
) =>
  ceflix(`video/comments?page=${page}&per_page=${perPage}`, {
    method: "POST",
    // Passing the viewer token lets the backend hide comments from users the
    // viewer has blocked (server-side enforcement of the block list).
    body: token ? { video: Number(id), token } : { video: Number(id) },
    token: token ?? null,
  }).then((j) => ({
    comments: Array.isArray(j?.data) ? j.data : [],
    pagination: j?.pagination || null,
  }));

export const getChannel = (id: string, token?: string | null) => {
  const body: Record<string, unknown> = { channel: id };
  if (token) body.token = token;
  return ceflix("channel", { method: "POST", body, token }).then(
    (j) => j?.data,
  );
};

export const getPlaylist = (id: string, token?: string | null) =>
  ceflix("playlist", {
    method: "POST",
    body: { playlist: id, token: token || "" },
    token,
  }).then((j) => j?.data ?? j);

/**
 * A page of clips. `exclude` holds ids already served or already watched, so
 * the API builds the page from what the viewer has not seen. `offset` is sent
 * alongside on purpose: a server without exclusion support falls back to
 * offset paging rather than returning the same page forever.
 */
export const getClips = (
  offset = 0,
  limit = 10,
  videoID?: string | null,
  exclude: string[] = [],
) => {
  const body: Record<string, unknown> = { offset, limit, token: getToken() };
  if (videoID) body.videoID = videoID;
  if (exclude.length > 0) body.exclude = exclude;
  return ceflix("video/shorts/items", { method: "POST", body }).then((j) =>
    Array.isArray(j?.data) ? j.data : [],
  );
};

export type SearchResult =
  | { type: "video"; data: any }
  | { type: "channel"; data: any }
  | { type: "playlist"; data: any };

/**
 * Video search.
 *
 * Moved off the external loveworldapis service onto the CeFlix API, which
 * ranks with recency and does not OR-match on the weakest term (a typo in one
 * word used to return every "service" on the platform). Same response shape.
 * The old service stays as a fallback only for a missing route (404), for the
 * window where this build is live but the API route is not; a 5xx or 403 on
 * the new endpoint is a real problem and is not papered over.
 */
async function searchVideos(q: string) {
  const query = `q=${encodeURIComponent(q)}&limit=50&sort=relevance`;

  try {
    const res = await fetch(`/api/ceflix/search/videos?${query}`);
    if (res.status !== 404) return res.ok ? await res.json() : null;
    console.warn(
      "[search] /api/search/videos returned 404 - API not deployed or route cache stale. Falling back to legacy search.",
    );
  } catch (e) {
    console.warn("[search] CeFlix search unreachable, falling back to legacy search.", e);
  }

  return nmt(`kingsspace/search/external/videos?${query}`).catch(() => null);
}

// Mirrors the app's SearchScreen: video results combined with the internal
// ceflix search (channels + playlists). The internal `data` is an object, not
// an array — treating it as an array is what broke the old search.
export const searchAll = async (
  query: string,
  token?: string | null,
): Promise<SearchResult[]> => {
  const q = query.trim();
  if (!q) return [];

  const [videoRes, internalRes] = await Promise.all([
    searchVideos(q),
    ceflix("search", {
      method: "POST",
      body: token ? { param: q, token } : { param: q },
      token: token ?? null,
    }).catch(() => null),
  ]);

  const videos = Array.isArray(videoRes?.results)
    ? videoRes.results.filter((it: any) => it?.videoId && it?.thumbnail && it?.title)
    : [];

  const channels = Array.isArray(internalRes?.data?.channels)
    ? internalRes.data.channels.filter((it: any) => it?.channelID)
    : [];

  const playlistsRaw = internalRes?.data?.playlists;
  const playlists = Array.isArray(playlistsRaw)
    ? playlistsRaw
    : Object.values(playlistsRaw || {});

  const items: SearchResult[] = [];
  videos.forEach((d: any) => items.push({ type: "video", data: d }));
  channels.forEach((d: any) => items.push({ type: "channel", data: d }));
  playlists.forEach((d: any) => items.push({ type: "playlist", data: d }));
  return items;
};

export const askKingsBot = (query: string) =>
  nmt("kingsspace/search/ask", { method: "POST", body: { query, q: query } });

// --- Discovery (fills empty feeds) ----------------------------------------

export type SuggestedChannel = {
  id: string;
  name: string;
  image: string;
  verified: boolean;
};

/** Sections mined for suggestions, most representative first. */
const DISCOVERY_SECTIONS = ["trending", "top-picks", "fresh"];

/**
 * Trending videos plus the creators behind them.
 *
 * Suggestions come from what is actually being watched rather than a dedicated
 * endpoint, so an empty feed can always be filled with something real.
 * Channels the viewer already follows are excluded.
 */
export const getDiscovery = async (excludeChannelIds: string[] = []) => {
  const payload = await getHome();
  const sections: any[] = Array.isArray(payload?.sections)
    ? payload.sections
    : [];

  const bySection = (key: string) =>
    sections.find((s) => s?.key === key || s?.slug === key)?.data ?? [];

  const recommended: any[] = Array.isArray(payload?.recommended?.data)
    ? payload.recommended.data
    : [];

  const seenVideos = new Set<string>();
  const trending = [...bySection("trending"), ...recommended, ...bySection("top-picks")]
    .filter((item: any) => String(item?.isShort ?? "").toLowerCase() !== "yes")
    .filter((item: any) => {
      const id = String(item?.videoId ?? item?.id ?? "");
      if (!id || seenVideos.has(id)) return false;
      seenVideos.add(id);
      return true;
    })
    .slice(0, 12);

  const excluded = new Set(excludeChannelIds.map(String));
  const seenChannels = new Set<string>();
  const channels: SuggestedChannel[] = [];

  for (const item of [...DISCOVERY_SECTIONS.flatMap(bySection), ...recommended]) {
    const id = String((item as any)?.channelId ?? "").trim();
    const name = String((item as any)?.channel ?? "").trim();
    if (!id || !name || excluded.has(id) || seenChannels.has(id)) continue;
    seenChannels.add(id);
    channels.push({
      id,
      name,
      image: String((item as any)?.imgChannel ?? ""),
      verified: String((item as any)?.isVerified ?? "") === "1",
    });
    if (channels.length >= 12) break;
  }

  return { trending, channels };
};

/**
 * `{status, liked, watch_earn, token}` - the server awards the Watch & Earn
 * like itself; `watch_earn` carries `{awarded_esport, reason, balance_esport}`,
 * `{reversed}` on an unlike, or null if the hook failed.
 */
export const likeVideo = (
  videoId: string | number,
  token: string,
): Promise<{
  status: boolean;
  liked: boolean;
  watch_earn: WatchEarnEngagementResult | null;
  token?: string;
}> =>
  ceflix("user/video/like", {
    method: "POST",
    body: { video: videoId, token },
    token,
  });

export const subscribeChannel = (channelId: string | number, token: string) =>
  ceflix("channel/subscribe", {
    method: "POST",
    body: { channel: channelId, token },
    token,
  });

/** `{status, message, watch_earn}` - the comment award, as for `likeVideo`. */
export const addComment = (
  videoId: string | number,
  comment: string,
  token: string,
): Promise<{
  status: boolean;
  message?: string;
  watch_earn: WatchEarnEngagementResult | null;
}> =>
  ceflix("video/comment/add", {
    method: "POST",
    body: { video: videoId, comment, token },
    token,
  });

// --- Playlists & reporting (watch page actions) ---------------------------

export const getReportFlags = () =>
  ceflix("video/report/flags", { token: null }).then((j) =>
    Array.isArray(j?.data) ? j.data : [],
  );

export const reportVideo = (
  videoId: string | number,
  flag: string | number,
  message: string,
  token: string,
) =>
  ceflix("video/report", {
    method: "POST",
    body: { video: videoId, flag, message, token },
    token,
  });

export const reportComment = (
  commentId: string | number,
  flag: string | number,
  message: string,
  token: string,
) =>
  ceflix("video/comment/report", {
    method: "POST",
    body: { comment: commentId, flag, message, token },
    token,
  });

export const reportUser = (
  userId: string | number,
  flag: string | number,
  message: string,
  token: string,
) =>
  ceflix("user/report", {
    method: "POST",
    body: { user: userId, flag, message, token },
    token,
  });

export const getUserPlaylists = (videoId: string | number, token: string) =>
  ceflix("user/playlists", { method: "POST", body: { token }, token }).then(
    (j) => {
      const list = Array.isArray(j?.data) ? j.data : [];
      // Mark which playlists already contain this video.
      return list.map((p: any) => ({
        ...p,
        hasVideo: String(p?.videos_payload || "")
          .split(",")
          .map((v: string) => v.trim())
          .includes(String(videoId)),
      }));
    },
  );

export const insertToPlaylist = (
  playlistId: string | number,
  videoId: string | number,
  token: string,
) =>
  ceflix("user/playlist/insert", {
    method: "PATCH",
    body: { token, playlist: playlistId, video: Number(videoId) },
    token,
  });

export const createPlaylist = (
  title: string,
  videoId: string | number,
  visibility: string,
  token: string,
) =>
  ceflix("user/playlist/create", {
    method: "POST",
    body: { token, video: Number(videoId), title, visibility },
    token,
  });

// --- Block list (server-backed, mirrors local cache in lib/blocklist) ------

export const blockContent = (
  kind: "user" | "channel",
  blockedId: string | number,
  token: string,
) =>
  ceflix("user/block", {
    method: "POST",
    body: { token, kind, blocked: String(blockedId) },
    token,
  });

export const unblockContent = (
  kind: "user" | "channel",
  blockedId: string | number,
  token: string,
) =>
  ceflix("user/unblock", {
    method: "POST",
    body: { token, kind, blocked: String(blockedId) },
    token,
  });

export const getBlockedContent = (token: string) =>
  ceflix("user/blocks", { method: "POST", body: { token }, token }).then((j) =>
    Array.isArray(j?.data) ? j.data : [],
  );

// --- Account deletion ------------------------------------------------------

// Starts the in-app deletion request on the backend (deactivates the account,
// hides channels, queues owner processing). The Next.js /api/account/delete-
// request route calls CeFlix /user/delete-request directly, so this helper is
// provided for completeness / non-proxied callers.
export const requestAccountDeletion = (token: string) =>
  ceflix("user/delete-request", { method: "POST", body: { token }, token });

// --- Creator Studio -------------------------------------------------------

export const getAccountStats = (token: string) =>
  ceflix("accountstat", { method: "POST", body: { token }, token }).then(
    (j) => j?.data ?? {},
  );

export const getUserChannels = (token: string) =>
  ceflix("user/channels", { method: "POST", body: { token }, token }).then(
    (j) => (Array.isArray(j?.data) ? j.data : []),
  );

export const getUserVideos = (token: string) =>
  ceflix("user/videos", { method: "POST", body: { token }, token }).then(
    (j) => (Array.isArray(j?.data) ? j.data : []),
  );

// Single channel with editable fields (channel, description, tags, cat_id).
export const getUserChannel = (id: string | number, token: string) =>
  ceflix("userchannel", {
    method: "POST",
    body: { channel: id, token },
    token,
  }).then((j) => j?.data ?? {});

export const getChannelCategories = (token: string) =>
  ceflix("channelcategories", { method: "POST", body: {}, token }).then((j) =>
    Array.isArray(j?.data) ? j.data : [],
  );

export const createChannel = (
  payload: {
    category: string | number;
    channel_title: string;
    description: string;
    tags: string;
    thumbnail?: string; // data URL
    cover?: string; // data URL
  },
  token: string,
) =>
  ceflix("channel/new", {
    method: "POST",
    body: { token, ...payload },
    token,
  });

export const updateChannel = (
  payload: {
    channel: string | number;
    channel_title: string;
    description: string;
    tags: string;
    category: string | number;
  },
  token: string,
) => {
  const { channel, ...rest } = payload;
  return ceflix("channel/update", {
    method: "POST",
    // Backend (ChannelController::updateChannel) validates `channel_id`.
    body: { token, channel_id: channel, channel, ...rest },
    token,
  });
};

export const deleteChannel = (channelId: string | number, token: string) =>
  ceflix("channel/delete", {
    method: "POST",
    // Backend (MediaController::deleteChannel) validates `channel_id`.
    body: { channel_id: channelId, channel: channelId, token },
    token,
  });

export const updateVideo = (
  payload: {
    video: string | number;
    video_title: string;
    description: string;
    tags: string;
  },
  token: string,
) => {
  const { video, ...rest } = payload;
  return ceflix("video/update", {
    method: "POST",
    // Backend (VideoController::updateVideoDetails) validates `video_id`.
    body: { token, video_id: video, video, ...rest },
    token,
  });
};

export const deleteVideo = (
  videoId: string | number,
  channelId: string | number,
  token: string,
) =>
  ceflix("video/delete", {
    method: "POST",
    // Backend (MediaController::deleteVideo) validates `channel_id` + `video`.
    body: { video: videoId, channel_id: channelId, token },
    token,
  });

export const getUserProfile = (token: string) =>
  ceflix("user/profile", { method: "POST", body: { token }, token }).then(
    (j) => j?.data ?? j,
  );

export const getUserSubscriptions = (token: string) =>
  ceflix("user/subscriptions", { method: "POST", body: { token }, token }).then(
    (j) => (Array.isArray(j?.data) ? j.data : []),
  );

// Videos feed from the channels the user follows (the Following tab list).
export const getSubscriptionsFeed = (token: string) =>
  ceflix("user/subscriptions/feed", {
    method: "POST",
    body: { token, page: 1 },
    token,
  }).then((j) => (Array.isArray(j?.data) ? j.data : []));

export const getUserHistory = (token: string) =>
  ceflix("user/videos/history", {
    method: "POST",
    body: { token },
    token,
  }).then((j) => j?.data ?? []);

export const getUserLiked = (token: string) =>
  ceflix("user/videos/liked", { method: "POST", body: { token }, token }).then(
    (j) => j?.data ?? [],
  );

/** The signed-in user's own playlists (the Profile shelf and library page). */
export const getMyPlaylists = (token: string) =>
  ceflix("user/playlists", { method: "POST", body: { token }, token }).then(
    (j) => (Array.isArray(j?.data) ? j.data : []),
  );

// --- Interests (personalisation) ------------------------------------------

export type Interest = {
  id: number;
  title: string;
  description: string;
  thumbnail: string;
  /** Accent used for the tile when no image renders. */
  color?: string;
  featured: boolean;
  channel_count: number;
};

export type InterestStatus = {
  selected: number[];
  selected_count: number;
  completed: boolean;
  should_prompt: boolean;
  recommended_minimum: number;
};

export const getInterestCatalog = () =>
  ceflix("interests", { token: null }).then((j) => ({
    interests: (Array.isArray(j?.data) ? j.data : []) as Interest[],
    recommendedMinimum: Number(j?.meta?.recommended_minimum ?? 3),
    maxSelections: Number(j?.meta?.max_selections ?? 25),
  }));

export const getInterestStatus = (token: string) =>
  ceflix("interests/status", { method: "POST", body: { token }, token }).then(
    (j) => j?.data as InterestStatus,
  );

export const saveInterests = (token: string, categories: number[]) =>
  ceflix("interests", {
    method: "POST",
    body: { token, categories },
    token,
  });

export const skipInterests = (token: string) =>
  ceflix("interests/skip", { method: "POST", body: { token }, token });

// --- Ad earnings (creator side) -------------------------------------------

/** Amounts are integer micro-Espees: a per-view share is a fraction of a cent. */
export const MICROS = 1_000_000;

export function formatEspees(micros?: number | string | null) {
  const value = Number(micros ?? 0) / MICROS;
  // Small balances need the decimals to mean anything; large ones do not.
  const decimals = value !== 0 && Math.abs(value) < 1 ? 4 : 2;
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export type ChannelEarnings = {
  channel_id: number;
  channel_name: string;
  has_wallet: boolean;
  balance_micros: number;
  lifetime_earned_micros: number;
  lifetime_paid_micros: number;
  pending_payout_micros: number;
};

export type EarningsSummary = {
  channels: ChannelEarnings[];
  total_balance_micros: number;
  total_balance_display: string;
  creator_share_percent: number;
  min_payout_micros: number;
  min_payout_display: string;
};

export const getEarnings = (token: string) =>
  ceflix("ads/earnings", { method: "POST", body: { token }, token }).then(
    (j) => j?.data as EarningsSummary,
  );

/** Sends a channel's available balance to its Espees wallet. */
export const requestPayout = (token: string, channelId: number) =>
  ceflix("ads/earnings/payout", {
    method: "POST",
    body: { token, channel: channelId },
    token,
  });

// --- Home popup -------------------------------------------------------------

export type HomePopupLanguage = {
  id: number | string;
  translation: string;
  url: string;
  video_id?: number | null;
};

export type HomePopup = {
  id: number;
  title: string;
  url: string;
  thumbnail: string;
  /** The KingsSpace video behind the popup, if any - views are counted on it. */
  videoId: number | null;
  isLive: boolean;
  languages: HomePopupLanguage[];
};

/**
 * The popup the KingsSpace admin has switched on for the home screen, or null.
 * Same endpoint as the app and website (CeFlix-API docs/home-popup.md).
 */
export const getHomePopup = async (): Promise<HomePopup | null> => {
  const j = await ceflix("home-popup", { token: null });
  const popup = j?.data;
  if (!popup?.url) return null;

  return {
    id: Number(popup.id),
    title: String(popup.title || "Now Playing"),
    url: String(popup.url),
    thumbnail: String(popup.thumbnail || ""),
    videoId: popup.video_id ? Number(popup.video_id) : null,
    isLive: Boolean(popup.is_live),
    languages: (Array.isArray(popup.languages) ? popup.languages : [])
      .filter((lang: any) => lang?.url && lang?.translation)
      .map((lang: any, index: number) => ({
        id: lang.id ?? index,
        translation: String(lang.translation),
        url: String(lang.url),
        video_id: lang.video_id ?? popup.video_id ?? null,
      })),
  };
};

/**
 * Counts a view: signed-in viewers through `countvideoview`, guests through
 * the offline counter. Fire-and-forget; a failed count must never surface.
 */
export const countVideoView = async (
  videoId: number | string,
  language: string | null = null,
) => {
  const token = getToken();
  let email: string | null = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.user);
    email = raw ? (JSON.parse(raw)?.email ?? null) : null;
  } catch {
    email = null;
  }

  try {
    if (token && email) {
      await ceflix("countvideoview", {
        method: "POST",
        body: { email, video: String(videoId), language },
        token,
      });
    } else {
      await ceflix("video/offline-view-count", {
        method: "POST",
        body: {
          video: String(videoId),
          device:
            typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
        },
        token: null,
      });
    }
  } catch {
    /* ignored on purpose */
  }
};

export const login = (username: string, password: string) =>
  ceflix("login", { method: "POST", body: { username, password }, token: null });
