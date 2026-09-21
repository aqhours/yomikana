import assert from "node:assert/strict";
import test from "node:test";
import { lyricIndexAt } from "../app/lyric-position.ts";

const ranges = [{ start: 1000, end: 2000 }, null, { start: 2400, end: 3600 }];

test("retains the sung line through a gap and switches at the next line start", () => {
  assert.equal(lyricIndexAt(ranges, 1999), 0);
  assert.equal(lyricIndexAt(ranges, 2000), 0);
  assert.equal(lyricIndexAt(ranges, 2399), 0);
  assert.equal(lyricIndexAt(ranges, 2400), 2);
  assert.equal(lyricIndexAt(ranges, 3600), 2);
});

test("seeking backward or looping selects from the new audio position", () => {
  assert.equal(lyricIndexAt(ranges, 3000), 2);
  assert.equal(lyricIndexAt(ranges, 1500), 0);
  assert.equal(lyricIndexAt(ranges, 0), -1);
  assert.equal(lyricIndexAt(ranges, 1000), 0);
});

test("untimed songs have no active line and overlapping lines select the latest start", () => {
  assert.equal(lyricIndexAt([], 4000), -1);
  assert.equal(lyricIndexAt([null, null], 4000), -1);
  assert.equal(lyricIndexAt([{ start: 1000, end: 3000 }, { start: 2500, end: 4000 }], 2600), 1);
});
