import assert from "node:assert/strict";
import test from "node:test";
import { startQueue, nextTrack, previousTrack } from "../desktop/shuffle-queue.ts";

const tracks = ["a", "b", "c", "d"];
const random = () => .31;

test("each shuffle round visits the full library without repeating a track", () => {
  let queue = startQueue(tracks, "b", random);
  const played = ["b"];
  for (let index = 0; index < 11; index++) {
    queue = nextTrack(queue, tracks, random);
    played.push(queue.history[queue.cursor]);
  }
  for (let offset = 0; offset < played.length; offset += tracks.length) {
    assert.deepEqual([...played.slice(offset, offset + tracks.length)].sort(), tracks);
  }
  for (let index = 1; index < played.length; index++) assert.notEqual(played[index], played[index - 1]);
});

test("previous follows actual history, and next replays forward history before drawing another track", () => {
  const start = startQueue(tracks, "a", random);
  const second = nextTrack(start, tracks, random);
  const third = nextTrack(second, tracks, random);
  const back = previousTrack(third);
  assert.equal(back.history[back.cursor], second.history[second.cursor]);
  assert.deepEqual(nextTrack(back, tracks, random), third);
  assert.deepEqual(previousTrack(start), start);
  assert.equal(start.history.length, 1);
});

test("newly selected song starts a fresh queue and single-song libraries stay playable", () => {
  const selected = startQueue(tracks, "d", random);
  assert.equal(selected.cursor, 0);
  assert.deepEqual(selected.history, ["d"]);
  assert.deepEqual([...selected.remaining].sort(), ["a", "b", "c"]);
  const single = nextTrack(startQueue(["a"], "a", random), ["a"], random);
  assert.equal(single.history[single.cursor], "a");
});
