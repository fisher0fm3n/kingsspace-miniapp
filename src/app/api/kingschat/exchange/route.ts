import { NextRequest, NextResponse } from "next/server";
import { APPLICATION_KEY, CEFLIX_API } from "@/lib/config";

// Exchange a KingsChat access token for a KingsSpace session, mirroring the RN
// app's exchangeKingsChatToken(): POST /kingschat/user as urlencoded form.
//
// The token comes from the request body (legacy token-fragment flow) or, for
// manual logins, from the httpOnly cookies set by /api/kingschat/callback.
// Cookie-sourced tokens are single-use: the cookies are cleared once consumed.

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { accessToken?: string; refreshToken?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const accessToken =
    body.accessToken || req.cookies.get("kc_access_token")?.value || "";
  const refreshToken =
    body.refreshToken || req.cookies.get("kc_refresh_token")?.value || "";

  if (!accessToken) {
    return Response.json(
      { status: false, message: "Missing accessToken" },
      { status: 400 },
    );
  }

  const form = new URLSearchParams();
  form.append("accessToken", accessToken);
  if (refreshToken) form.append("refreshToken", refreshToken);

  try {
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
      const res = NextResponse.json(
        { status: false, message: json?.message || "Failed to authenticate" },
        { status: 401 },
      );
      res.cookies.delete("kc_access_token");
      res.cookies.delete("kc_refresh_token");
      return res;
    }

    const token = json.data.token;
    const user = { ...json.data.user, token };
    const res = NextResponse.json({ status: true, token, user });
    res.cookies.delete("kc_access_token");
    res.cookies.delete("kc_refresh_token");
    return res;
  } catch (err) {
    return Response.json(
      { status: false, message: (err as Error)?.message || "Exchange error" },
      { status: 502 },
    );
  }
}
