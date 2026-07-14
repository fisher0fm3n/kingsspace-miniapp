// Central config mirroring the RN app's hardcoded API constants.

export const CEFLIX_API = "https://webapi.ceflix.org/api";
export const NMT_API = "https://nmt.loveworldapis.com/api";
export const APPLICATION_KEY = "2567a5ec9705eb7ac2c984033e06189d";

// News RSS feed used on the home page.
export const NEWS_FEED_URL = `${NMT_API}/kingsspace/rss`;
// KingsBot AI ask endpoint.
export const ASK_API = `${NMT_API}/kingsspace/search/ask`;
// External + internal search.
export const EXTERNAL_VIDEO_SEARCH_API = `${NMT_API}/kingsspace/search/external/videos`;

// Support / legal contact for the service (Contact page, deletion requests,
// abuse reports). TODO(owner): confirm this is the monitored mailbox before
// KingsChat onboarding review.
export const SUPPORT_EMAIL = "support@ceflix.org";
// Target first-response time communicated to users (see docs/MODERATION.md).
export const SUPPORT_RESPONSE_TIME = "48 hours";

// LocalStorage keys (web equivalent of expo-secure-store keys).
export const STORAGE_KEYS = {
  token: "kingsspace.token",
  user: "kingsspace.user",
  userID: "kingsspace.userID",
  profilePic: "kingsspace.profile_pic",
  fname: "kingsspace.fname",
  lname: "kingsspace.lname",
} as const;
