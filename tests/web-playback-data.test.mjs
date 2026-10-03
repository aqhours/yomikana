import assert from "node:assert/strict";
import test from "node:test";
import { catalog } from "../app/song-catalog.ts";
import { songs } from "../app/song-data.ts";

const { default: worker } = await import("../dist/server/index.js");
const request = (slug) => worker.fetch(new Request(`http://localhost/api/songs/${slug}`), {
  ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
}, { waitUntil() {}, passThroughOnException() {} });

test("the shared release queue contains every song once in homepage order", () => {
  assert.deepEqual(catalog.map((song) => song.slug).sort(), Object.keys(songs).sort());
  for (let i = 1; i < catalog.length; i++) {
    const previous = catalog[i - 1];
    const current = catalog[i];
    assert.ok(previous.releaseDate <= current.releaseDate);
    if (previous.releaseDate === current.releaseDate) assert.ok(previous.trackNumber <= current.trackNumber);
  }
});

test("each track API response contains the selected song's complete lyrics and artwork", async () => {
  for (const { slug } of catalog) {
    const response = await request(slug);
    assert.equal(response.status, 200, slug);
    const track = await response.json();
    assert.equal(track.song.slug, slug);
    assert.deepEqual(track.song.lyrics, JSON.parse(JSON.stringify(songs[slug].lyrics)));
    assert.equal(track.song.audio, songs[slug].audio);
    assert.equal(track.originalCover, songs[slug].cover);
    assert.ok(track.song.cover.startsWith("/covers/"));
    assert.ok(track.coverColors.length > 0);
  }
});

test("unknown and inherited property names are not songs", async () => {
  for (const slug of ["missing", "toString", "__proto__"]) {
    assert.equal((await request(slug)).status, 404);
  }
});
