// Typed client for the KingsSpace backend, routed through the Next.js proxies.
import { STORAGE_KEYS } from "./config";

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

export const getHome = () =>
  ceflix("smarthome", { method: "POST", body: {} }).then((j) => j);

export const getNewsPosts = async () => {
  const json = await nmt("kingsspace/rss");
  const feeds = Array.isArray(json?.feeds) ? json.feeds : [];
  return feeds.flatMap((f: any) => (Array.isArray(f?.items) ? f.items : []));
};

export const getCollections = () =>
  ceflix("collections").then((j) => (Array.isArray(j?.data) ? j.data : []));

export const getCollection = (id: string) =>
  ceflix(`collections/${id}`).then((j) => j?.data);

export const getCollectionItems = (id: string) =>
  ceflix(`collections/${id}/items`).then((j) => ({
    collection: j?.data?.collection,
    items: Array.isArray(j?.data?.items) ? j.data.items : [],
  }));

export const getVideo = (id: string | number, token?: string | null) => {
  const body: Record<string, unknown> = { video: id };
  if (token) body.token = token;
  return ceflix("video", { method: "POST", body, token }).then((j) => j?.data);
};

export const getComments = (id: string | number, page = 0, perPage = 20) =>
  ceflix(`video/comments?page=${page}&per_page=${perPage}`, {
    method: "POST",
    body: { video: Number(id) },
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

export const getClips = (offset = 0, limit = 10, videoID?: string | null) => {
  const body: Record<string, unknown> = { offset, limit, token: getToken() };
  if (videoID) body.videoID = videoID;
  return ceflix("video/shorts/items", { method: "POST", body }).then((j) =>
    Array.isArray(j?.data) ? j.data : [],
  );
};

export type SearchResult =
  | { type: "video"; data: any }
  | { type: "channel"; data: any }
  | { type: "playlist"; data: any };

// Mirrors the RN SearchScreen: external video results (NMT) combined with the
// internal ceflix search (channels + playlists). The internal `data` is an
// object, not an array — treating it as an array is what broke the old search.
export const searchAll = async (
  query: string,
  token?: string | null,
): Promise<SearchResult[]> => {
  const q = query.trim();
  if (!q) return [];

  const [videoRes, internalRes] = await Promise.all([
    nmt(
      `kingsspace/search/external/videos?q=${encodeURIComponent(
        q,
      )}&limit=50&sort=relevance`,
    ).catch(() => null),
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

export const likeVideo = (videoId: string | number, token: string) =>
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

export const addComment = (
  videoId: string | number,
  comment: string,
  token: string,
) =>
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

export const getUserProfile = (token: string) =>
  ceflix("user/profile", { method: "POST", body: { token }, token }).then(
    (j) => j?.data ?? j,
  );

export const getUserSubscriptions = (token: string) =>
  ceflix("user/subscriptions", { method: "POST", body: { token }, token }).then(
    (j) => j?.data ?? [],
  );

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

export const login = (username: string, password: string) =>
  ceflix("login", { method: "POST", body: { username, password }, token: null });
