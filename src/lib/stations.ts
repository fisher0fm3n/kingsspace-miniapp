/** Live TV station helpers, shared with the app's services/stations.ts. */

/**
 * Backing for a station logo chip.
 *
 * These logos were drawn for broadcast, not for this app, and several are
 * pale or pure white on transparency - GYTV's is 100% white pixels, which
 * disappears completely on a white circle. A dark backing gives every live
 * logo usable contrast, where a white one left half of them under 3:1.
 */
export const STATION_LOGO_BACKING = "#0F0F0F";

/**
 * Station names carry taglines ("LoveworldSAT – Connecting the world to the
 * Word"). Under a small logo only the first part fits.
 */
export function shortStationName(name: string) {
  const short = String(name ?? "")
    .split(/\s+[–—-]\s+|\s+\|\s+/)[0]
    .trim();
  return short || String(name ?? "");
}

/** The part of the name after the dash, e.g. "Connecting the world to the Word". */
export function stationTagline(name: string) {
  const full = String(name ?? "");
  const short = shortStationName(full);
  if (short === full) return "";
  return full.slice(short.length).replace(/^\s*(?:[–—|-]\s*)?/, "").trim();
}
