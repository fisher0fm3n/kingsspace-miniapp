import { NextRequest } from "next/server";
import { APPLICATION_KEY, CEFLIX_API } from "@/lib/config";

// Multipart video upload proxy. The generic ceflix proxy forwards bodies as
// text/JSON, which corrupts binary uploads — so video uploads go through here,
// preserving the multipart form (video file + thumbnail) and attaching the
// Application-Key / X-TOKEN headers. Mirrors the RN app's POST /video/upload.

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
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
    const upstream = await fetch(`${CEFLIX_API}/video/upload`, {
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
