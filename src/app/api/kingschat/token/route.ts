import { NextRequest } from "next/server";
import { APPLICATION_KEY, CEFLIX_API } from "@/lib/config";
import { KINGSCHAT_CLIENT_ID } from "@/lib/kingschat";

// KingsChat launches the miniapp with an `authCode` on the URL. This route
// exchanges that authorization code for KingsChat access/refresh tokens, then
// hands the access token off to /kingschat/user (the usual KingsSpace login).

export const dynamic = "force-dynamic";

// KingsChat OAuth2 token endpoint. No auth headers required — the client_id
// identifies the application.
const KC_TOKEN_URL = "https://connect.kingsch.at/developer/api/oauth2/token";
const CLIENT_ID = KINGSCHAT_CLIENT_ID;

export async function POST(req: NextRequest) {
  let body: { code?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const code = body.code?.trim();
  if (!code) {
    return Response.json(
      { status: false, message: "Missing authCode" },
      { status: 400 },
    );
  }

  try {
    // 1. Exchange the authorization code for KingsChat tokens.
    const tokenResp = await fetch(KC_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "code",
        client_id: CLIENT_ID,
        code,
      }),
      cache: "no-store",
    });

    // SECURITY: never log or echo the token response — it contains the
    // access/refresh tokens (and the request contains the auth code).
    const tokenRaw = await tokenResp.text();
    let tokenJson: any = null;
    try {
      tokenJson = JSON.parse(tokenRaw);
    } catch {
      tokenJson = null;
    }

    const accessToken = tokenJson?.access_token ?? null;
    const refreshToken = tokenJson?.refresh_token ?? null;

    if (!tokenResp.ok || !accessToken) {
      return Response.json(
        {
          status: false,
          message:
            tokenJson?.user_message ||
            tokenJson?.error ||
            tokenJson?.message ||
            "Failed to exchange KingsChat authCode for tokens.",
        },
        { status: tokenResp.status || 502 },
      );
    }

    // 2. Pass the token off as usual to /kingschat/user (urlencoded form).
    const form = new URLSearchParams();
    form.append("accessToken", accessToken);
    if (refreshToken) form.append("refreshToken", refreshToken);

    const upstream = await fetch(`${CEFLIX_API}/kingschat/user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Application-Key": APPLICATION_KEY,
      },
      body: form.toString(),
      cache: "no-store",
    });

    const json = await upstream.json();
    if (!json?.status || !json?.data) {
      return Response.json(
        { status: false, message: json?.message || "Failed to authenticate" },
        { status: 401 },
      );
    }

    const token = json.data.token;
    const user = { ...json.data.user, token };
    return Response.json({ status: true, token, user });
  } catch (err) {
    return Response.json(
      { status: false, message: (err as Error)?.message || "Exchange error" },
      { status: 502 },
    );
  }
}
