import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

const decodeEntities = (text) => text.replaceAll("&quot;", '"').replaceAll("&#x27;", "'").replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">");

const covers = {
  kimi: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/%E5%90%9B%E3%81%AE%E3%81%93%E3%81%93%E3%82%8D%E3%81%AF%20%E8%BC%9D%E3%81%84%E3%81%A6%E3%82%8B%E3%81%8B%E3%81%84%EF%BC%9F3000x3000bb.jpg",
  yume: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/%E3%83%A6%E3%83%A1%2B%E3%83%9F%E3%83%A9%E3%82%A4%3D%20%E7%84%A1%E9%99%90%E5%A4%A73000x3000bb.jpg",
  happyPartyTrain: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/HAPPY%20PARTY%20TRAIN3000x3000bb.jpg",
  overNextRainbow: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/Over%20The%20Next%20Rainbow3000x3000bb.jpg",
  eternalHours: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/%E6%B0%B8%E4%B9%85hours3000x3000bb.jpg",
  aozoraJumpingHeart: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/%E9%9D%92%E7%A9%BAJumping%20Heart3000x3000bb.jpg",
  miraiTicket: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/MIRAI%20TICKET3000x3000bb.jpg",
};

function renderedJapanese(html) {
  return [...html.matchAll(/<span class="word-strip" lang="ja">([\s\S]*?)<\/span><span class="translation"/g)]
    .map((lineMatch) => [...lineMatch[1].matchAll(/<span class="word-jp">([\s\S]*?)<\/span><span class="word-romaji"/g)]
      .map((wordMatch) => decodeEntities(wordMatch[1].replace(/<rt>[\s\S]*?<\/rt>/g, "").replace(/<[^>]+>/g, "")))
      .join(""));
}

function yrcJapanese(source) {
  return source.trim().split(/\r?\n/).map((line) => line.replace(/^\[[^\]]+\]/, "").replace(/\([^)]*\)/g, ""));
}

test("server-renders the song library", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Yomikana｜Aqours 日语歌词读本<\/title>/);
  assert.match(html, /聴いて、読んで、/);
  assert.match(html, /君のこころは輝いてるかい？/);
  assert.match(html, /ユメ\+ミライ=無限大/);
  assert.match(html, /HAPPY PARTY TRAIN/);
  assert.match(html, /Over The Next Rainbow/);
  assert.match(html, /永久hours/);
  assert.match(html, /青空Jumping Heart/);
  assert.match(html, /MIRAI TICKET/);
  assert.match(html, /href="\/songs\/kimi-no-kokoro"/);
  assert.match(html, /href="\/songs\/yume-mirai"/);
  assert.match(html, /href="\/songs\/happy-party-train"/);
  assert.match(html, /href="\/songs\/over-next-rainbow"/);
  assert.match(html, /href="\/songs\/eternal-hours"/);
  assert.match(html, /href="\/songs\/aozora-jumping-heart"/);
  assert.match(html, /href="\/songs\/mirai-ticket"/);
  assert.ok(html.includes(covers.kimi));
  assert.ok(html.includes(covers.yume));
  assert.ok(html.includes(covers.happyPartyTrain));
  assert.ok(html.includes(covers.overNextRainbow));
  assert.ok(html.includes(covers.eternalHours));
  assert.ok(html.includes(covers.aozoraJumpingHeart));
  assert.ok(html.includes(covers.miraiTicket));
  assert.equal(html.match(/class="song-card-cover"/g)?.length, 7);
  assert.equal(html.match(/class="song-card-artist">Aqours/g)?.length, 6);
  assert.match(html, /class="song-card-artist">Saint Aqours Snow/);
  assert.doesNotMatch(html, /song-card-number|song-card-arrow|你的心灵是否光芒闪耀|梦想 \+ 未来 = 无限大|快乐派对列车/);
  assert.doesNotMatch(html, /src="\/covers\//);
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /https:\/\/jgox-image-1316409677\.cos\.ap-guangzhou\.myqcloud\.com\/eternal-hours-project\/numazu_bg\.png/);
  assert.doesNotMatch(css, /\/numazu-seaside\.png/);
  assert.match(css, /\.song-grid \{ display:grid; grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(css, /\.song-grid \{ grid-template-columns:repeat\(2,minmax\(0,1fr\)\); gap:\.8rem; \}/);
  assert.match(css, /\.library-heading p \{ display:flex; align-items:center;/);
  assert.match(css, /\.library-heading p::before \{ content:"";/);
  assert.match(html, /在旋律里学习日语。/);
  assert.doesNotMatch(html, /YOMIKANA · AQOURS|2 songs|逐字同步 · 分词注音 · 中文释义/);
});

test("renders the annotated HAPPY PARTY TRAIN reader", async () => {
  const response = await render("/songs/happy-party-train");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /HAPPY PARTY/);
  assert.match(html, /<ruby><span class="timed-character"[^>]*>開<\/span><rt>ひら<\/rt><\/ruby>/);
  assert.match(html, /hi-ra-i-ta/);
  assert.match(html, /盛开了的/);
  assert.match(html, /快乐派对列车/);
  assert.match(html, /data-source="\/audio\/happy-party-train\.mp3"/);
  assert.equal(html.split(covers.happyPartyTrain).length - 1, 2);
  assert.doesNotMatch(html, /\/covers\/happy-party-train\.jpg/);
  assert.match(html, /渡辺拓也/);
  assert.match(html, /EFFY/);
  assert.doesNotMatch(html, />歌词应援语</);
  const yrc = await readFile(new URL("../public/audio/happy-party-train.yrc", import.meta.url), "utf8");
  assert.deepEqual(renderedJapanese(html), yrcJapanese(yrc));
});

test("renders the annotated Over The Next Rainbow reader", async () => {
  const response = await render("/songs/over-next-rainbow");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Over The Next/);
  assert.match(html, /<ruby><span class="timed-character"[^>]*>会<\/span><rt>あ<\/rt><\/ruby>/);
  assert.match(html, /a-i-ta-ka-t-ta/);
  assert.match(html, /向逐渐消失的彩虹许下约定/);
  assert.match(html, /Saint Aqours Snow/);
  assert.match(html, /data-source="\/audio\/over-next-rainbow\.mp3"/);
  assert.equal(html.split(covers.overNextRainbow).length - 1, 2);
  assert.match(html, /Kanata Okajima/);
  assert.match(html, /TAKAROT \/ Shinji Tanaka/);
  assert.doesNotMatch(html, />歌词应援语</);
  const yrc = await readFile(new URL("../public/audio/over-next-rainbow.yrc", import.meta.url), "utf8");
  assert.equal(yrcJapanese(yrc).length, 57);
  assert.deepEqual(renderedJapanese(html), yrcJapanese(yrc));
});

test("renders the original synchronized lyric reader", async () => {
  const response = await render("/songs/kimi-no-kokoro");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<ruby><span class="timed-character"[^>]*>君<\/span><rt>きみ<\/rt><\/ruby>/);
  assert.match(html, /data-source="\/audio\/kimi-no-kokoro\.mp3"/);
  assert.match(html, /自动跟随/);
  assert.match(html, /畑亜貴/);
  assert.match(html, /光增ハジメ/);
  assert.match(html, /EFFY/);
  assert.equal(html.split(covers.kimi).length - 1, 2);
  assert.doesNotMatch(html, /\/covers\/kimi-no-kokoro\.jpg/);
  assert.doesNotMatch(html, /class="album-art"/);
  assert.doesNotMatch(html, />歌词应援语</);
  const yrc = await readFile(new URL("../public/audio/kimi-no-kokoro.yrc", import.meta.url), "utf8");
  assert.deepEqual(renderedJapanese(html), yrcJapanese(yrc));
});

test("renders the annotated 永久hours reader", async () => {
  const response = await render("/songs/eternal-hours");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /永久/);
  assert.match(html, /wa-su-re-na-i-de/);
  assert.match(html, /切勿忘记 不会忘记 不会忘记的哟/);
  assert.match(html, /data-source="\/audio\/eternal-hours\.mp3"/);
  assert.equal(html.split(covers.eternalHours).length - 1, 2);
  assert.match(html, /Kanata Okajima \/ Hayato Yamamoto/);
  assert.doesNotMatch(html, />歌词应援语</);
});

test("renders the annotated 青空Jumping Heart reader", async () => {
  const response = await render("/songs/aozora-jumping-heart");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /青空/);
  assert.match(html, /Jumping Heart/);
  assert.match(html, /a-o-i/);
  assert.match(html, /那片蓝天在等着我们/);
  assert.match(html, /data-source="\/audio\/aozora-jumping-heart\.mp3"/);
  assert.equal(html.split(covers.aozoraJumpingHeart).length - 1, 2);
  assert.match(html, /伊藤賢 \/ 光増ハジメ/);
  assert.doesNotMatch(html, />歌词应援语</);
});

test("renders the annotated MIRAI TICKET reader", async () => {
  const response = await render("/songs/mirai-ticket");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /MIRAI/);
  assert.match(html, /TICKET/);
  assert.match(html, /hi-ka-ri-ni/);
  assert.match(html, /期待看见更多前方的景色/);
  assert.match(html, /data-source="\/audio\/mirai-ticket\.mp3"/);
  assert.equal(html.split(covers.miraiTicket).length - 1, 2);
  assert.match(html, /composer/);
  assert.match(html, /EFFY/);
  assert.doesNotMatch(html, />歌词应援语</);
});

test("renders the new annotated ユメ+ミライ=無限大 reader", async () => {
  const response = await render("/songs/yume-mirai");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /ユメ\+ミライ=/);
  assert.match(html, /<ruby><span class="timed-character"[^>]*>海<\/span><rt>うみ<\/rt><\/ruby>/);
  assert.match(html, /mu-ge-n-da-i/);
  assert.match(html, /心跳、律动/);
  assert.match(html, /梦想，是无限大的/);
  assert.match(html, /data-source="\/audio\/yume-mirai\.mp3"/);
  assert.equal(html.split(covers.yume).length - 1, 2);
  assert.doesNotMatch(html, /\/covers\/yume-mirai\.jpg/);
  assert.match(html, /前迫潤哉/);
  assert.match(html, /サイトウリョースケ/);
  assert.match(html, /春川仁志/);
  const yrc = await readFile(new URL("../public/audio/yume-mirai.yrc", import.meta.url), "utf8");
  assert.deepEqual(renderedJapanese(html), yrcJapanese(yrc));
});

test("ships all local audio assets", async () => {
  await Promise.all([
    access(new URL("../public/audio/kimi-no-kokoro.mp3", import.meta.url)),
    access(new URL("../public/audio/yume-mirai.mp3", import.meta.url)),
    access(new URL("../public/audio/yume-mirai.yrc", import.meta.url)),
    access(new URL("../public/audio/happy-party-train.mp3", import.meta.url)),
    access(new URL("../public/audio/happy-party-train.yrc", import.meta.url)),
    access(new URL("../public/audio/over-next-rainbow.mp3", import.meta.url)),
    access(new URL("../public/audio/over-next-rainbow.yrc", import.meta.url)),
    access(new URL("../public/audio/eternal-hours.mp3", import.meta.url)),
    access(new URL("../public/audio/eternal-hours.yrc", import.meta.url)),
    access(new URL("../public/audio/aozora-jumping-heart.mp3", import.meta.url)),
    access(new URL("../public/audio/aozora-jumping-heart.yrc", import.meta.url)),
    access(new URL("../public/audio/mirai-ticket.mp3", import.meta.url)),
    access(new URL("../public/audio/mirai-ticket.yrc", import.meta.url)),
  ]);
});
