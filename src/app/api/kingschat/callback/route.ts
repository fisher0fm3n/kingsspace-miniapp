import { NextRequest, NextResponse } from "next/server";

// Manual "Continue with KingsChat" login target (mirrors the EspeesMax
// miniapp). accounts.kingsch.at is opened with `post_redirect=true`, so it
// POSTs the accessToken/refreshToken here (form-encoded) instead of
// redirecting with a code. The tokens are parked in short-lived httpOnly
// cookies and the browser is bounced to /auth/callback, which completes the
// exchange via /api/kingschat/exchange.
//
// SECURITY (KingsChat Services onboarding): tokens must never be logged,
// echoed, or re-embedded in a URL — hence cookies, not query params.

export const dynamic = "force-dynamic";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  // Only needs to survive the immediate redirect to /auth/callback.
  maxAge: 600,
};

function appBase(req: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  return req.nextUrl.origin;
}

export async function POST(req: NextRequest) {
  let accessToken = "";
  let refreshToken = "";

  try {
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await req.json();
      accessToken = String(body?.accessToken ?? body?.access_token ?? "");
      refreshToken = String(body?.refreshToken ?? body?.refresh_token ?? "");
    } else {
      const form = await req.formData();
      accessToken = String(
        form.get("accessToken") ?? form.get("access_token") ?? "",
      );
      refreshToken = String(
        form.get("refreshToken") ?? form.get("refresh_token") ?? "",
      );
    }
  } catch {
    /* unreadable body — fall through with no tokens */
  }

  // Always land on /auth/callback; with no cookies set it shows the login
  // error UI. `kcpost=1` tells the page to use the cookie-based exchange.
  const res = NextResponse.redirect(`${appBase(req)}/auth/callback?kcpost=1`, {
    status: 303,
  });

  if (accessToken) {
    res.cookies.set("kc_access_token", accessToken, COOKIE_OPTS);
    if (refreshToken) {
      res.cookies.set("kc_refresh_token", refreshToken, COOKIE_OPTS);
    }
  }

  return res;
}

// Older KingsChat flows redirect (GET) with the code/token on the URL instead
// of POSTing. Forward the query to /auth/callback, which already handles
// authCode / token params and scrubs them from the address bar.
export async function GET(req: NextRequest) {
  return NextResponse.redirect(
    `${appBase(req)}/auth/callback${req.nextUrl.search}`,
    { status: 303 },
  );
}
