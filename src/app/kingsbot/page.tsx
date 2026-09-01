"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { askKingsBot } from "@/lib/api";
import { clean, videoThumb, videoTitle } from "@/lib/utils";
import { Spinner } from "@/components/Skeletons";
import { BotIcon, SendIcon } from "@/components/Icons";
import { Img } from "@/components/Img";

type Msg = {
  role: "user" | "bot";
  text: string;
  videos?: any[];
};

function extractAnswer(res: any): string {
  return (
    res?.answer ||
    res?.data?.answer ||
    res?.result ||
    res?.response ||
    res?.message ||
    (typeof res?.data === "string" ? res.data : "") ||
    "Sorry, I couldn't find an answer for that."
  );
}

function extractVideos(res: any): any[] {
  const v =
    res?.videos ||
    res?.data?.videos ||
    res?.results ||
    res?.data?.results ||
    [];
  return Array.isArray(v) ? v.slice(0, 6) : [];
}

export default function KingsBotPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "bot",
      text: "Hi! I'm KingsBot. Ask me anything and I'll find inspiring content for you.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setLoading(true);
    try {
      const res = await askKingsBot(q);
      setMessages((m) => [
        ...m,
        { role: "bot", text: extractAnswer(res), videos: extractVideos(res) },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "bot", text: (err as Error).message || "Something went wrong." },
      ]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() =>
        scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }),
      );
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
          <BotIcon size={18} />
        </span>
        <h1 className="text-lg font-extrabold">KingsBot AI</h1>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div key={i}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                m.role === "user"
                  ? "ml-auto bg-primary text-white"
                  : "bg-card text-text"
              }`}
            >
              {m.text}
            </div>
            {m.videos && m.videos.length > 0 && (
              <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto">
                {m.videos.map((v: any, k: number) => (
                  <Link
                    key={k}
                    href={`/watch/${v.videoId || v.id}`}
                    className="block shrink-0"
                    style={{ width: 200 }}
                  >
                    <div className="aspect-video w-full overflow-hidden rounded-lg bg-card">
                      <Img
                        src={videoThumb(v)}
                        alt=""
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs font-medium">
                      {videoTitle(v)}
                    </p>
                    <p className="truncate text-[11px] text-subtext">
                      {clean(v.channel)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-subtext">
            <Spinner size={16} /> Thinking…
          </div>
        )}
      </div>

      <form
        onSubmit={send}
        className="flex items-center gap-2 border-t border-border p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask KingsBot…"
          className="flex-1 rounded-full border border-border bg-card px-4 py-2.5 text-sm outline-none placeholder:text-subtext"
        />
        <button
          type="submit"
          disabled={loading}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white disabled:opacity-50"
        >
          <SendIcon size={18} />
        </button>
      </form>
    </div>
  );
}
