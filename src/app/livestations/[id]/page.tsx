"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getLiveStations } from "@/lib/api";
import type { Station } from "@/lib/types";
import { clean } from "@/lib/utils";
import {
  STATION_LOGO_BACKING,
  shortStationName,
  stationTagline,
} from "@/lib/stations";
import { HlsVideo } from "@/components/HlsVideo";
import { Img } from "@/components/Img";
import { Spinner } from "@/components/Skeletons";
import { BackIcon, PlayIcon } from "@/components/Icons";

/**
 * Live TV station page, as in the app: the stream up top, the station's
 * details under it, and every other station below so the viewer can hop
 * channels in place.
 */
export default function LiveStationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const {
    data: stations = [],
    isLoading,
    error,
    refetch,
  } = useQuery<Station[]>({
    queryKey: ["live-stations"],
    queryFn: getLiveStations,
    staleTime: 1000 * 60 * 5,
  });

  const [currentId, setCurrentId] = useState(String(id));
  const [descExpanded, setDescExpanded] = useState(false);

  // Keep the address bar on the station being watched, without a navigation.
  useEffect(() => {
    if (currentId !== String(id)) {
      window.history.replaceState(null, "", `/livestations/${currentId}`);
    }
  }, [currentId, id]);

  const current = useMemo(
    () => stations.find((s) => String(s.id) === currentId) ?? stations[0] ?? null,
    [stations, currentId],
  );

  // Live TV is watched hands-off; ask the browser not to dim mid-programme.
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> };
    };
    nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    return () => {
      lock?.release().catch(() => {});
    };
  }, []);

  const others = stations.filter((s) => String(s.id) !== String(current?.id));
  const description = clean(current?.desc).trim();

  return (
    <div className="pb-10">
      <header className="flex items-center justify-between px-3 pb-2.5 pt-3">
        <button
          onClick={() => router.back()}
          aria-label="Back"
          className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-card"
        >
          <BackIcon size={22} />
        </button>
        <h1 className="text-lg font-bold">Live TV</h1>
        <span className="h-[38px] w-[38px]" aria-hidden />
      </header>

      <div className="sticky top-0 z-20 aspect-video w-full bg-black">
        {current ? (
          <HlsVideo
            key={current.src}
            src={current.src}
            controls
            playsInline
            className="h-full w-full bg-black object-contain"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-white/70">
            {isLoading ? (
              <Spinner size={26} />
            ) : error ? (
              "Couldn't load this station."
            ) : (
              "Station not found."
            )}
          </div>
        )}
      </div>

      {current && (
        <div className="px-4 pt-4">
          <div className="flex items-center gap-3">
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border"
              style={{ background: STATION_LOGO_BACKING }}
            >
              <Img
                src={current.imgChannel}
                alt=""
                className="h-[80%] w-[80%] object-contain"
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-bold">
                {shortStationName(clean(current.name))}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded bg-[#dc2626] px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden />
                  LIVE
                </span>
                <span className="truncate text-[13px] text-subtext">
                  {stationTagline(clean(current.name)) || "Live TV station"}
                </span>
              </div>
            </div>
          </div>

          {description && (
            <button
              type="button"
              onClick={() => setDescExpanded((v) => !v)}
              className={`mt-3 block w-full whitespace-pre-line text-left text-sm leading-5 text-subtext ${
                descExpanded ? "" : "line-clamp-3"
              }`}
            >
              {description}
            </button>
          )}
        </div>
      )}

      {error && stations.length === 0 && (
        <div className="flex flex-col items-center gap-3 p-8 text-center">
          <p className="text-sm text-subtext">Couldn&apos;t load the station list.</p>
          <button
            onClick={() => refetch()}
            className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-white"
          >
            Try again
          </button>
        </div>
      )}

      {others.length > 0 && (
        <section className="mt-6">
          <h2 className="px-4 pb-2 text-base font-bold">More stations</h2>
          {others.map((station) => (
            <button
              key={station.id}
              type="button"
              onClick={() => {
                setDescExpanded(false);
                setCurrentId(String(station.id));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left active:bg-card"
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border"
                style={{ background: STATION_LOGO_BACKING }}
              >
                <Img
                  src={station.imgChannel}
                  alt=""
                  className="h-[80%] w-[80%] object-contain"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">
                  {shortStationName(clean(station.name))}
                </span>
                {station.desc && (
                  <span className="block truncate text-xs text-subtext">
                    {clean(station.desc)}
                  </span>
                )}
              </span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white">
                <PlayIcon size={14} />
              </span>
            </button>
          ))}
        </section>
      )}
    </div>
  );
}
