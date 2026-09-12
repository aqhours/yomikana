import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import test from "node:test";
import sharp from "sharp";
import { songs } from "../app/song-data.ts";

const { default: worker } = await import("../dist/server/index.js");
async function render(path) {
  const response = await worker.fetch(new Request(`http://localhost${path}`), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
  assert.equal(response.status, 200);
  return response.text();
}

test("the library eagerly loads only its first cover", async () => {
  const html = await render("/");
  const images = [...html.matchAll(/<img\b[^>]*>/g)].map(([tag]) => tag);
  assert.equal(images.length, 15);
  assert.match(images[0], /loading="eager"/);
  for (const tag of images.slice(1)) assert.match(tag, /loading="lazy"/);
});

test("the reader ships only the selected song and does not preload audio", async () => {
  const html = await render("/songs/kimi-no-kokoro");
  assert.match(html, /data-source="\/audio\/kimi-no-kokoro\.mp3"/);
  assert.doesNotMatch(html, /\/audio\/(?:yume-mirai|eternal-hours|thank-you-friends)\.mp3/);
  const audio = html.match(/<audio\b[^>]*>/)?.[0];
  assert.ok(audio);
  assert.doesNotMatch(audio, /\ssrc=/);
  assert.match(html, /class="word-strip" lang="ja"/);
});

test("the client reader bundle stays small without the full lyric catalog", async () => {
  const root = new URL("../dist/client/_next/static/chunks/", import.meta.url);
  const bundles = (await readdir(root)).filter((name) => /^song-reader-.*\.js$/.test(name));
  assert.equal(bundles.length, 1);
  const source = await readFile(new URL(bundles[0], root));
  assert.ok(gzipSync(source).length < 12_000, "Reader JavaScript exceeds its 12 KB gzip budget");
  assert.doesNotMatch(source.toString(), /\/audio\/eternal-hours\.mp3/);
});

test("every song keeps its original background and uses a valid small cover", async () => {
  const thumbnails = JSON.parse(await readFile(new URL("../app/cover-thumbnails.json", import.meta.url), "utf8"));
  for (const song of Object.values(songs)) {
    const html = await render(`/songs/${song.slug}`);
    assert.ok(html.includes(`--song-backdrop:url(${song.backdrop})`), song.slug);
    assert.ok(html.includes(`src="${thumbnails[song.cover][256]}"`), song.slug);
  }
  for (const variants of Object.values(thumbnails)) {
    for (const [width, path] of Object.entries(variants)) {
      const input = await readFile(new URL(`../public${path}`, import.meta.url));
      const metadata = await sharp(input).metadata();
      assert.equal(metadata.width, Number(width));
      assert.equal(metadata.format, "webp");
    }
  }
});
