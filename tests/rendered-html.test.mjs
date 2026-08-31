import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the complete lyric reader", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>君のこころは輝いてるかい？｜日语歌词读本<\/title>/);
  assert.match(html, /<ruby><span class="timed-character"[^>]*>君<\/span><rt>きみ<\/rt><\/ruby>/);
  assert.match(html, /ka-ga-ya-i-te/);
  assert.match(html, /class="word-block"/);
  assert.match(html, /现在、如今/);
  assert.match(html, /闪耀着/);
  assert.match(html, /你的心是否正在闪耀？/);
  assert.doesNotMatch(html, /歌词本 01/);
  assert.match(html, /data-source="\/audio\/kimi-no-kokoro\.mp3"/);
  assert.match(html, /<audio[^>]* loop=""/);
  assert.match(html, /src="\/kimi-no-kokoro-cover\.jpg"/);
  assert.match(html, /自动跟随/);
  assert.match(html, /class="theme-toggle"/);
  assert.match(html, /yomikana-theme/);
  assert.match(html, /class="timed-character"/);
  assert.match(html, /aria-label="跳转到第 1 句：如今，变得想要试着改变未来"/);
  assert.match(html, /class="line-content line-seek"/);
  assert.match(html, /畑亜貴/);
  assert.match(html, /光增ハジメ/);
  assert.match(html, /EFFY/);
  assert.doesNotMatch(html, /1st Single/);
  assert.doesNotMatch(html, />歌词应援语</);
  assert.doesNotMatch(html, /SkeletonPreview|codex-preview|react-loading-skeleton/);

  const decodeEntities = (text) => text
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
  const renderedLines = [...html.matchAll(/<span class="word-strip" lang="ja">([\s\S]*?)<\/span><span class="translation"/g)]
    .map((lineMatch) => [...lineMatch[1].matchAll(/<span class="word-jp">([\s\S]*?)<\/span><span class="word-romaji"/g)]
      .map((wordMatch) => decodeEntities(wordMatch[1].replace(/<rt>[\s\S]*?<\/rt>/g, "").replace(/<[^>]+>/g, "")))
      .join(""));
  const yrcSource = await readFile(new URL("../public/audio/kimi-no-kokoro.yrc", import.meta.url), "utf8");
  const yrcLines = yrcSource.trim().split(/\r?\n/).map((line) => [...line.matchAll(/\(\d+,\d+,\d+\)([^([]*)/g)].map((match) => match[1]).join(""));
  assert.deepEqual(renderedLines, yrcLines, "rendered Japanese lyrics must exactly match the YRC source");

  await access(new URL("../public/numazu-seaside.png", import.meta.url));
  await access(new URL("../public/kimi-no-kokoro-cover.jpg", import.meta.url));
  await access(new URL("../public/audio/kimi-no-kokoro.mp3", import.meta.url));
  await access(new URL("../public/audio/kimi-no-kokoro.yrc", import.meta.url));
});
