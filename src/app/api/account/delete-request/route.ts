import { NextRequest } from "next/server";
import { APPLICATION_KEY, CEFLIX_API } from "@/lib/config";

// In-app account/personal-data deletion requests (KingsChat Services
// onboarding requirement). The user starts deletion inside the app; the
// service owner processes it within the window stated on the deletion page
// (30 days — see /settings/delete-account and the Privacy Policy).
//
// Primary path: POST the user's token to the CeFlix backend
// (`/user/delete-request`), which deactivates the account, hides the user's
// channels, and queues the request for the owner to hard-delete. If that call
// fails, we fall back to an optional ops webhook, then to a pre-filled email
// so the request is never silently dropped.
//
// SECURITY: the user's session token is used only to identify the account
// upstream; it is not logged and not forwarded to any third party other than
// the CeFlix backend / configured owner webhook.

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { token?: string; userID?: string; username?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  if (!body.token && !body.userID && !body.username) {
    return Response.json(
      { status: false, message: "Missing account identification" },
      { status: 400 },
    );
  }

  // 1. Primary: CeFlix backend deletion-request endpoint (token-authenticated).
  if (body.token) {
    try {
      const upstream = await fetch(`${CEFLIX_API}/user/delete-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Application-Key": APPLICATION_KEY,
          "X-Token": body.token,
        },
        body: JSON.stringify({ token: body.token }),
        cache: "no-store",
      });
      const json = await upstream.json().catch(() => null);
      if (upstream.ok && json?.status) {
        return Response.json({ status: true });
      }
    } catch {
      /* fall through to webhook/email */
    }
  }

  // 2. Fallback: optional ops webhook.
  const webhook = process.env.DELETION_REQUEST_WEBHOOK_URL?.trim();
  if (webhook) {
    try {
      const resp = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "account_deletion_request",
          requestedAt: new Date().toISOString(),
          userID: body.userID || null,
          username: body.username || null,
          token: body.token || null,
        }),
        cache: "no-store",
      });
      if (resp.ok) return Response.json({ status: true });
    } catch {
      /* fall through to email */
    }
  }

  // 3. Last resort: client opens a pre-filled email so nothing is dropped.
  return Response.json({ status: false, fallback: "email" }, { status: 200 });
}
