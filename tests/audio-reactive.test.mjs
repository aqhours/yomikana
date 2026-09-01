import assert from "node:assert/strict";
import test from "node:test";

import { createReactiveBandTracker, mapReactiveLevels, updateReactiveBand } from "../app/audio-reactive.ts";

test("zero energy is visually identical to the original static background", () => {
  assert.deepEqual(mapReactiveLevels(0, 0, 0), {
    coverScale: 1,
    coverOpacity: 0,
    glowScale: .88,
    glowOpacity: 0,
  });
});

test("full energy has a deliberately wide but bounded visual range", () => {
  assert.deepEqual(mapReactiveLevels(1, 1, 1), {
    coverScale: 1.08,
    coverOpacity: .22,
    glowScale: 1.12,
    glowOpacity: .35,
  });
});

test("sustained mastered audio settles instead of pinning the background bright", () => {
  const tracker = createReactiveBandTracker();
  const responses = Array.from({ length: 240 }, () => updateReactiveBand(tracker, .72));

  assert.ok(responses.at(-1) < .1);
  assert.ok(Math.max(...responses.slice(120)) < .12);
});

test("relative musical peaks create a visible pulse and then release", () => {
  const tracker = createReactiveBandTracker();
  const energies = [
    ...Array(120).fill(.28),
    .34, .48, .7, .58, .4,
    ...Array(90).fill(.28),
  ];
  const responses = energies.map((energy) => updateReactiveBand(tracker, energy));
  const peak = Math.max(...responses.slice(120, 145));

  assert.ok(peak > .3);
  assert.ok(responses.at(-1) < .14);
});

test("small dynamics in mastered audio remain visibly responsive", () => {
  const tracker = createReactiveBandTracker();
  Array.from({ length: 120 }, () => updateReactiveBand(tracker, .5));
  const responses = [.51, .53, .55, .56, .55, .54, .52, .5, .48, .47, .48, .5]
    .map((energy) => updateReactiveBand(tracker, energy));

  assert.ok(Math.max(...responses) - Math.min(...responses) > .08);
});

test("a one-frame spike cannot create a brightness flash", () => {
  const tracker = createReactiveBandTracker();
  Array.from({ length: 120 }, () => updateReactiveBand(tracker, .3));
  const before = tracker.response;
  const after = updateReactiveBand(tracker, 1);

  assert.ok(after - before < .11);
});
