import { NextRequest } from "next/server";
import { NMT_API } from "@/lib/config";

// Server-side proxy to the LoveWorld / NMT API (news RSS, KingsBot ask,
// external video search, notification prefs).

export const dynamic = "force-dynamic";

async function forward(req: NextRequest, path: string[]) {
  const search = req.nextUrl.search || "";
  const target = `${NMT_API}/${path.join("/")}${search}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  let body: string | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await req.text();
  }

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
      cache: "no-store",
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return Response.json(
      { status: false, message: (err as Error)?.message || "Upstream error" },
      { status: 502 },
    );
  }
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  return forward(req, (await ctx.params).path);
}
export async function POST(req: NextRequest, ctx: Ctx) {
  return forward(req, (await ctx.params).path);
}
