import assert from "node:assert/strict";
import { access } from "node:fs/promises";
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
  assert.match(html, /<ruby>君<rt>きみ<\/rt><\/ruby>/);
  assert.match(html, /ka-ga-ya-i-te/);
  assert.match(html, /class="word-block"/);
  assert.match(html, /现在、如今/);
  assert.match(html, /闪耀着/);
  assert.match(html, /你的心是否正在闪耀？/);
  assert.match(html, /47(?:<!-- -->)? 句/);
  assert.doesNotMatch(html, />歌词应援语</);
  assert.doesNotMatch(html, /SkeletonPreview|codex-preview|react-loading-skeleton/);
  await access(new URL("../public/numazu-seaside.png", import.meta.url));
});
