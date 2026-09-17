# KingsSpace Web

A self-contained **Next.js mini app** rebuild of the KingsSpace mobile app
(the Expo/React Native project in the parent folder). It reuses the same
public backend (`webapi.ceflix.org` + `nmt.loveworldapis.com`) and reproduces
the core experience as a mobile-first web app.

## Features

| Area | Route | Notes |
|------|-------|-------|
| Home feed | `/` | Live TV logo strip, `smarthome` sections as a two-column grid with "Show more", the server's Clips row, news posts interleaved, recommended at the end, and the admin-controlled home popup (mirrors the RN home). |
| Live TV | `/livestations/[id]` | Station stream (HLS via hls.js where needed), details, and every other station to hop between. |
| Browse | `/browse` | Tabs: **Following · Clips · Search** (`?tab=` deep-links; Collections has its own tab). |
| Collections | `/collections`, `/collections/[id]` | Grid + collection detail that opens straight onto its playlists; search looks across every playlist in every collection. |
| Clips (Shorts) | `/clips` | Full-screen vertical, snap-scroll, autoplay, infinite paging, like. `?id=` opens a specific clip. |
| Watch | `/watch/[id]` | Video player, views/date, like, share, subscribe, description, comments (view + post), up-next. |
| Channel | `/channel/[id]` | Cover, avatar, subscribe, video grid. |
| Playlist | `/playlist/[id]` | Ordered playlist with play-through links. |
| KingsBot AI | `/kingsbot` | Chat UI backed by the `kingsspace/search/ask` endpoint, renders suggested videos. |
| Profile | `/profile`, `/library/[section]` | Identity, creator shortcuts, ad earnings, shelves of your videos / playlists / likes / history with "View all" pages, settings & legal links, sign out. |
| Onboarding | `/welcome`, `/interests` | First-visit welcome for signed-out visitors; interests picker for signed-in users with none saved (skippable per session; `?mode=edit` from the You tab). |
| Ad earnings | `/studio/earnings` | Per-channel ad earnings and withdrawal to the channel's Espees wallet. |
| Auth | `/login`, `/auth/callback` | Username/password login **and** KingsChat auth (launch `authCode` → server-side exchange; legacy web OAuth fallback). |
| Upload | `/upload` | Auth-gated upload (Gallery/Files only inside the KingsChat webview), content-rating + 16+ declaration, text moderation screen. |
| Legal | `/legal/terms`, `/legal/privacy` | Terms of Use (content rules, prohibited content, moderation/takedowns/bans/termination) and Privacy Policy (data, retention, deletion, consent). |
| Support | `/support` | Contact & Support (email, report guidance, data requests). |
| Safety | `/settings/blocked`, `/settings/delete-account` | Block-list management and in-app account/data deletion request flow. |

## Architecture

- **Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS v4.**
- **`@tanstack/react-query`** for data fetching/caching (same defaults as the RN app).
- **Server-side API proxies** — the browser can't call the Ceflix API directly
  (CORS + the `Application-Key`), so all traffic is routed through Next route
  handlers that inject the key and forward the user token:
  - `src/app/api/ceflix/[...path]` → `https://webapi.ceflix.org/api/*`
  - `src/app/api/nmt/[...path]` → `https://nmt.loveworldapis.com/api/*`
  - `src/app/api/kingschat/exchange` → KingsChat token → KingsSpace session.
- **`src/lib/api.ts`** — typed client + endpoint helpers.
- **`src/lib/auth.tsx`** — auth context; the session token lives in
  `localStorage` (web equivalent of the RN app's `expo-secure-store`).
- **`src/components/`** — `AppShell` (bottom tab bar), cards/sliders, `Img`
  (placeholder-safe image), icons, skeletons.
- Design tokens in `src/app/globals.css` mirror `constants/theme.ts`
  (dark theme, primary `#06b6f2`, DM Sans).

## Getting started

```bash
cd kingsspace-web
npm install
npm run dev      # http://localhost:3200
```

Production:

```bash
npm run build
npm start        # http://localhost:3200
```

## KingsChat Services onboarding (auth & safety)

- **authCode flow (authRequired == true):** KingsChat launches the miniapp
  with a temporary `authCode` on the URL. `AppShell` strips it from the
  address bar immediately (success *and* failure paths), hands it to
  `/auth/callback` via sessionStorage (never re-embedded in a URL), and the
  callback exchanges it **server-side only** via `/api/kingschat/token`.
  Auth codes / access tokens / refresh tokens are never logged and never
  returned in error payloads; `src/lib/scrub.ts` provides URL/payload
  scrubbers that any future telemetry/error reporting MUST use (none is
  integrated today — the app sends nothing to third parties).
- **Scopes:** the web OAuth fallback requests **no extra scopes** — the
  `conference_calls` scope inherited from the RN app was removed because
  KingsSpace only needs the user's identity for the `/kingschat/user`
  session exchange.
- **Webview detection:** KingsChat injects
  `window.kcsuperapp = Object.freeze({ appVersion, isWebView: true })`;
  `src/lib/kcwebview.ts` wraps this. Inside the webview, uploads are
  Gallery/Files only — no `capture` attribute, no `getUserMedia` anywhere.
- **Moderation & safety:** see `docs/MODERATION.md` (filtering layers, report
  review process/SLA, block feature, admin takedown/ban tooling, 16+ age
  controls).

## Notes / limitations

- **KingsChat web login fallback** uses `accounts.kingsch.at` with client id
  `com.kingschat`. The web redirect URI is `<origin>/auth/callback`; that
  origin must be registered with KingsChat for the flow to complete in
  production. Username/password login works out of the box.
- Live-TV station auto-pip and push notifications from the RN app are not
  reproduced; station previews play inline on demand instead.
- The `Application-Key` is the same public key shipped in the RN client.
- Account deletion requests are forwarded to `DELETION_REQUEST_WEBHOOK_URL`
  (see `.env.example`); without it the app falls back to a pre-filled email
  to `SUPPORT_EMAIL` (`src/lib/config.ts`).
# kingsspace-miniapp
