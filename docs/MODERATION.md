# KingsSpace — UGC Moderation & Trust/Safety Operations

This document describes how user-generated content (UGC) is moderated on
KingsSpace, as required for KingsChat Services onboarding. It covers the
filtering layers, the report pipeline, blocking, admin tooling, and age/content
controls.

> **Owner action required:** items marked ☐ must be confirmed/filled in by the
> service owner (CeFlix / LoveWorld ops) before onboarding review.

## 1. Content surfaces and filtering layers

UGC on KingsSpace: **videos, thumbnails, titles, descriptions, tags, channel
names/descriptions, comments.**

| Layer | Where | What it does |
|---|---|---|
| Client-side text screen | `src/lib/moderation.ts` | Blocks publishing of titles, descriptions, tags, channel names and comments containing profanity, sexual content, slurs, or violent/hateful language (normalized matching incl. leetspeak). Applied on upload, video edit, channel create/edit, and comment submit. |
| Upload-side declaration | `/upload` | Uploader must select an audience rating (General / 16+) and confirm the video, thumbnail and metadata follow the Content Rules and are suitable for 16+. The rating is sent with the upload (`content_rating`, `age_declaration`). |
| Backend moderation | Ceflix backend (`webapi.ceflix.org`) | Authoritative store; server-side review pipeline for uploaded media (video + thumbnail). ☐ Confirm the backend media-review pipeline (automated scan and/or human pre-publication review) with CeFlix ops. |
| Report queue | In-app **Report** on every video | See §2. |
| User-side controls | **Block** (users & channels) | See §3. |

Client-side screening is a first line of defense only; the backend and the
report/review process are authoritative.

## 2. Report flow (operational process)

- **Entry point:** every watch page has a **Report** action (flag icon). The
  user picks a reason (flags served by `GET /video/report/flags`) and can add
  details; the report is submitted to `POST /video/report` on the Ceflix
  backend with the video ID, flag, message, and reporter token.
- **Storage:** reports are stored in the Ceflix backend moderation queue,
  keyed to the video and reporter.
  ☐ Confirm the queue/dashboard URL used by reviewers.
- **Who reviews:** the CeFlix / KingsSpace content operations team.
  ☐ Name the responsible team/on-call rota and escalation contact.
- **Response time (SLA):**
  - Severe reports (child safety, terrorism, credible threats): actioned
    **within 24 hours**, content taken down pending review.
  - All other reports: reviewed **within 48 hours** of submission.
- **Outcomes:** no action / content takedown / channel strike / account ban
  (§4). Illegal content is preserved as evidence and reported to the relevant
  authorities where required.

## 3. User-facing blocking

- **Block user** — available on every comment (watch page). Hides all of that
  user's comments from the blocking user.
- **Block channel** — available on every channel page. Hides the channel's
  videos from the blocker's feeds (up-next, channel page).
- Managed under **Profile → Blocked users & channels**
  (`/settings/blocked`); blocking is local to the user's device/profile and
  does not notify the blocked party.
- Blocking complements (does not replace) reporting: report content that
  breaks the rules so moderators can act for everyone.

## 4. Admin takedown & user-ban tooling

- **Takedown:** admins remove videos via the Ceflix backend
  (`POST /video/delete` and the backend CMS); creators can delete their own
  videos/channels from Creator Studio in-app.
- **Bans / termination:** account suspension and permanent bans are executed
  in the Ceflix backend user administration.
  ☐ Confirm with CeFlix ops: admin CMS access for the KingsSpace moderation
  team, ban tooling (temporary + permanent), and an IP/device re-registration
  block for ban evasion.
- Policy basis: Terms of Use §6–7 (in-app at `/legal/terms`) — moderation
  rights, takedowns, bans, account termination.

## 5. Age & content controls

- KingsChat's App Store rating is **16+**; KingsSpace enforces the same
  minimum in its Terms (§2) and Privacy Policy (§7).
- Upload-side controls: mandatory audience rating (General / 16+) plus a
  mandatory declaration that content is suitable for 16+. Content above 16+
  (adult/graphic/explicit) is prohibited outright (Terms §5) and removed on
  detection or report.
- ☐ Confirm backend rejects/queues uploads flagged `content_rating=16+` for
  priority review if such review is desired.

## 6. Related in-app pages

- Terms of Use (content rules, prohibited content, moderation rights,
  takedowns, bans, termination): `/legal/terms`
- Privacy Policy (data collected, uses, sharing, retention/deletion, consent
  revocation): `/legal/privacy`
- Contact & Support: `/support` (email: see `SUPPORT_EMAIL` in
  `src/lib/config.ts`)
- Account & data deletion: `/settings/delete-account` (requests forwarded via
  `DELETION_REQUEST_WEBHOOK_URL`, else pre-filled email to support; processed
  within 30 days)
