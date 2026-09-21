import type { Timing } from "./song-types";

/** Keep a line through its trailing gap; seeking/looping recomputes from the clock. */
export function lyricIndexAt(ranges: readonly (Timing | null)[], milliseconds: number): number {
  let active = -1;
  let latestStart = -Infinity;
  ranges.forEach((range, index) => {
    if (range && milliseconds >= range.start && range.start >= latestStart) {
      active = index;
      latestStart = range.start;
    }
  });
  return active;
}
