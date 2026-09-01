import { NextRequest } from "next/server";
import { APPLICATION_KEY, CEFLIX_API } from "@/lib/config";

// Server-side proxy to the Ceflix web API. The browser cannot call
// webapi.ceflix.org directly (CORS + the Application-Key must stay off the
// client's visible network tab as much as reasonable), so every request goes
// through here. The client passes its user token via `x-token`.

export const dynamic = "force-dynamic";

async function forward(req: NextRequest, path: string[]) {
  const search = req.nextUrl.search || "";
  const target = `${CEFLIX_API}/${path.join("/")}${search}`;

  const token = req.headers.get("x-token") || "";
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "Application-Key": APPLICATION_KEY,
  };
  if (token) headers["X-TOKEN"] = token;

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
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return forward(req, (await ctx.params).path);
}
export async function PUT(req: NextRequest, ctx: Ctx) {
  return forward(req, (await ctx.params).path);
}
export async function DELETE(req: NextRequest, ctx: Ctx) {
  return forward(req, (await ctx.params).path);
}
