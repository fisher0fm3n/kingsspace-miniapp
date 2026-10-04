import { NextRequest } from "next/server";
import { APPLICATION_KEY, CEFLIX_API } from "@/lib/config";

// Multipart video upload proxy. The generic ceflix proxy forwards bodies as
// text/JSON, which corrupts binary uploads — so video uploads go through here,
// preserving the multipart form and attaching the Application-Key / X-TOKEN
// headers.
//
// Uploads happen in two phases (see CeFlix-API docs/uploads.md): the file is
// sent the moment it is chosen (`?action=start`), the details follow when the
// form is complete (`?action=publish`), and a replaced or abandoned file is
// dropped (`?action=cancel`). With no action the legacy one-shot
// POST /video/upload is forwarded as before.

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const UPSTREAM_PATHS: Record<string, string> = {
  start: "/video/upload/start",
  publish: "/video/upload/publish",
  cancel: "/video/upload/cancel",
};

export async function POST(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("action") || "";
  const upstreamPath = action ? UPSTREAM_PATHS[action] : "/video/upload";

  if (!upstreamPath) {
    return Response.json(
      { status: false, message: "Unknown upload action" },
      { status: 400 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json(
      { status: false, message: "Invalid upload payload" },
      { status: 400 },
    );
  }

  const token = String(form.get("token") || "");
  if (!token) {
    return Response.json(
      { status: false, message: "Missing token" },
      { status: 401 },
    );
  }

  try {
    // Re-send the multipart form untouched (fetch sets the boundary itself).
    const upstream = await fetch(`${CEFLIX_API}${upstreamPath}`, {
      method: "POST",
      headers: {
        "Application-Key": APPLICATION_KEY,
        "X-TOKEN": token,
      },
      body: form,
      cache: "no-store",
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return Response.json(
      { status: false, message: (err as Error)?.message || "Upload failed" },
      { status: 502 },
    );
  }
}
