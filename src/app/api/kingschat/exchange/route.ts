import { NextRequest } from "next/server";
import { APPLICATION_KEY, CEFLIX_API } from "@/lib/config";

// Exchange a KingsChat access token for a KingsSpace session, mirroring the RN
// app's exchangeKingsChatToken(): POST /kingschat/user as urlencoded form.

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { accessToken, refreshToken } = await req.json();
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
