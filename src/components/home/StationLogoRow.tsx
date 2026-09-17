"use client";

import Link from "next/link";
import type { Station } from "@/lib/types";
import { clean } from "@/lib/utils";
import { STATION_LOGO_BACKING, shortStationName } from "@/lib/stations";
import { Img } from "@/components/Img";

/**
 * Swipeable strip of live TV logos under the header, as in the app. It
 * replaces the autoplaying station carousel: live TV is one tap from the top
 * of the page without a video player competing with the feed.
 */
export function StationLogoRow({ stations }: { stations: Station[] }) {
  if (stations.length === 0) return null;

  return (
    <section className="mt-1">
      <div className="mb-2.5 flex items-center gap-2 px-3">
        <span className="h-2 w-2 rounded-full bg-error" aria-hidden />
        <h2 className="text-lg font-bold tracking-tight">Live TV</h2>
      </div>

      <div className="no-scrollbar flex gap-3.5 overflow-x-auto px-3 pb-1">
        {stations.map((station) => (
          <Link
            key={station.id}
            href={`/livestations/${station.id}`}
            className="flex w-[68px] shrink-0 flex-col items-center"
          >
            <span
              className="flex h-[60px] w-[60px] items-center justify-center overflow-hidden rounded-full border border-border"
              style={{ background: STATION_LOGO_BACKING }}
            >
              <Img
                src={station.imgChannel}
                alt={clean(station.name)}
                className="h-[78%] w-[78%] object-contain"
              />
            </span>
            <span className="mt-1.5 w-full truncate text-center text-[11px] font-medium">
              {shortStationName(clean(station.name))}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
