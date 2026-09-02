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
  yuukiWaDokoNi: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/%E5%8B%87%E6%B0%97%E3%81%AF%E3%81%A8%E3%82%99%E3%81%93%E3%81%AB%EF%BC%9F%E5%90%9B%E3%81%AE%E8%83%B8%E3%81%AB%EF%BC%813000x3000bb.jpg",
  overNextRainbow: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/Over%20The%20Next%20Rainbow3000x3000bb.jpg",
  eternalHours: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/%E6%B0%B8%E4%B9%85hours3000x3000bb.jpg",
  aozoraJumpingHeart: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/%E9%9D%92%E7%A9%BAJumping%20Heart3000x3000bb.jpg",
  miraiTicket: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/MIRAI%20TICKET3000x3000bb.jpg",
  yumeKataru: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/%E3%83%A6%E3%83%A1%E8%AA%9E%E3%82%8B%E3%82%88%E3%82%8A%E3%83%A6%E3%83%A1%E6%AD%8C%E3%81%8A%E3%81%863000x3000bb.jpg",
  miracleWave: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/MIRACLE%20WAVE3000x3000bb.jpg",
  soraKokoro: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/%E7%A9%BA%E3%82%82%E5%BF%83%E3%82%82%E6%99%B4%E3%82%8C%E3%82%8B%E3%81%8B%E3%82%89bb.webp",
  waterBlueNewWorld: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/WATER%20BLUE%20NEW%20WORLD3000x3000bb.jpg",
};

function renderedJapanese(html) {
  return [...html.matchAll(/<span class="word-strip" lang="ja">([\s\S]*?)<\/span><span class="translation"/g)]
    .map((lineMatch) => [...lineMatch[1].matchAll(/<span class="word-jp">([\s\S]*?)<\/span><span class="word-romaji"/g)]
      .map((wordMatch) => decodeEntities(wordMatch[1].replace(/<rt>[\s\S]*?<\/rt>/g, "").replace(/<[^>]+>/g, "")))
      .join(""));
}

function renderedJapaneseWords(html) {
  return [...html.matchAll(/<span class="word-strip" lang="ja">([\s\S]*?)<\/span><span class="translation"/g)]
    .map((lineMatch) => [...lineMatch[1].matchAll(/<span class="word-jp">([\s\S]*?)<\/span><span class="word-romaji"/g)]
      .map((wordMatch) => decodeEntities(wordMatch[1].replace(/<rt>[\s\S]*?<\/rt>/g, "").replace(/<[^>]+>/g, "").trim())));
}

function yrcJapanese(source) {
  return source.trim().split(/\r?\n/).map((line) => line.replace(/^\[[^\]]+\]/, "").replace(/\([^)]*\)/g, ""));
}

function alignableJapanese(lines) {
  return lines.join("").match(/[\p{L}\p{N}]/gu)?.join("") ?? "";
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
  assert.match(html, /勇気はどこに？君の胸に！/);
  assert.match(html, /Over The Next Rainbow/);
  assert.match(html, /永久hours/);
  assert.match(html, /青空Jumping Heart/);
  assert.match(html, /MIRAI TICKET/);
  assert.match(html, /ユメ語るよりユメ歌おう/);
  assert.match(html, /MIRACLE WAVE/);
  assert.match(html, /MY舞☆TONIGHT/);
  assert.match(html, /空も心も晴れるから/);
  assert.match(html, /WATER BLUE NEW WORLD/);
  assert.match(html, /href="\/songs\/kimi-no-kokoro"/);
  assert.match(html, /href="\/songs\/yume-mirai"/);
  assert.match(html, /href="\/songs\/happy-party-train"/);
  assert.match(html, /href="\/songs\/yuuki-wa-doko-ni"/);
  assert.match(html, /href="\/songs\/over-next-rainbow"/);
  assert.match(html, /href="\/songs\/eternal-hours"/);
  assert.match(html, /href="\/songs\/aozora-jumping-heart"/);
  assert.match(html, /href="\/songs\/mirai-ticket"/);
  assert.match(html, /href="\/songs\/yume-kataru-yori-yume-utaou"/);
  assert.match(html, /href="\/songs\/miracle-wave"/);
  assert.match(html, /href="\/songs\/my-mai-tonight"/);
  assert.match(html, /href="\/songs\/sora-mo-kokoro-mo-hareru-kara"/);
  assert.match(html, /href="\/songs\/water-blue-new-world"/);
  assert.ok(html.includes(covers.kimi));
  assert.ok(html.includes(covers.yume));
  assert.ok(html.includes(covers.happyPartyTrain));
  assert.ok(html.includes(covers.yuukiWaDokoNi));
  assert.ok(html.includes(covers.overNextRainbow));
  assert.ok(html.includes(covers.eternalHours));
  assert.ok(html.includes(covers.aozoraJumpingHeart));
  assert.ok(html.includes(covers.miraiTicket));
  assert.ok(html.includes(covers.yumeKataru));
  assert.ok(html.includes(covers.miracleWave));
  assert.ok(html.includes(covers.soraKokoro));
  assert.ok(html.includes(covers.waterBlueNewWorld));
  assert.equal(html.match(/class="release-card"/g)?.length, 13);
  assert.equal(html.match(/class="release-year"/g)?.length, 7);
  assert.doesNotMatch(html, /2015\.10\.07|2017\.11\.29|2024\.12\.18/);
  const chronologicalSlugs = [
    "kimi-no-kokoro",
    "aozora-jumping-heart",
    "yume-kataru-yori-yume-utaou",
    "sora-mo-kokoro-mo-hareru-kara",
    "mirai-ticket",
    "happy-party-train",
    "yuuki-wa-doko-ni",
    "my-mai-tonight",
    "miracle-wave",
    "water-blue-new-world",
    "over-next-rainbow",
    "yume-mirai",
    "eternal-hours",
  ];
  assert.deepEqual([...html.matchAll(/class="release-card" href="\/songs\/([^"]+)"/g)].map((match) => match[1]), chronologicalSlugs);
  assert.doesNotMatch(html, /song-card-number|song-card-arrow|你的心灵是否光芒闪耀|梦想 \+ 未来 = 无限大|快乐派对列车/);
  assert.doesNotMatch(html, /src="\/covers\//);
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /https:\/\/jgox-image-1316409677\.cos\.ap-guangzhou\.myqcloud\.com\/eternal-hours-project\/numazu_bg\.png/);
  assert.doesNotMatch(css, /\/numazu-seaside\.png/);
  assert.match(css, /\.library-page::before \{[^}]*position:fixed;[^}]*numazu_bg\.png/);
  assert.match(css, /\.library-page::after \{[^}]*position:fixed;[^}]*linear-gradient/);
  assert.doesNotMatch(css, /\.release-timeline::before/);
  assert.match(css, /\.release-timeline-list::before \{[^}]*linear-gradient/);
  assert.doesNotMatch(css, /album-wall|album-shelf/);
  assert.match(css, /\.library-heading p \{ display:flex; align-items:center;/);
  assert.match(css, /\.library-heading p::before \{ content:"";/);
  assert.match(html, /在旋律里学习日语。/);
  assert.match(html, />开始</);
  assert.doesNotMatch(html, /YOMIKANA|NUMAZU|选一首歌|SONG LIBRARY|12 tracks|发行时间线|2015—2024|逐字同步 · 分词注音 · 中文释义/);
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

test("renders the annotated 勇気はどこに？君の胸に！ reader", async () => {
  const response = await render("/songs/yuuki-wa-doko-ni");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /勇気はどこに？/);
  assert.match(html, /君の胸に！/);
  assert.match(html, /<ruby><span class="timed-character"[^>]*>勇<\/span><span class="timed-character"[^>]*>気<\/span><rt>ゆうき<\/rt><\/ruby>/);
  assert.match(html, /yu-u-ki/);
  assert.match(html, /不论几次都要奋起追赶，别就此认输/);
  assert.match(html, /data-source="\/audio\/yuuki-wa-doko-ni\.mp3"/);
  assert.equal(html.split(covers.yuukiWaDokoNi).length - 1, 2);
  assert.match(html, /小高光太郎 \/ UiNA/);
  const words = renderedJapaneseWords(html);
  assert.deepEqual(words[2], ["僕", "だって", "最初", "から", "できた", "ワケ", "じゃ", "ない", "よ"]);
  assert.deepEqual(words[13], ["だって", "今日", "は", "今日", "で", "だって", "目覚めたら", "違う", "朝", "だ", "よ"]);
  assert.deepEqual(words[28], ["もっと", "勇気", "だして", "もっと", "その", "勇気", "は", "君", "に", "ある", "よ"]);
  const yrc = await readFile(new URL("../public/audio/yuuki-wa-doko-ni.yrc", import.meta.url), "utf8");
  const rendered = renderedJapanese(html);
  assert.equal(rendered.length, 42);
  assert.equal(alignableJapanese(rendered), alignableJapanese(yrcJapanese(yrc)));
  assert.doesNotMatch(html, />歌词应援语|>歌词表达/);
});

test("renders the annotated Over The Next Rainbow reader", async () => {
  const response = await render("/songs/over-next-rainbow");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Over The Next/);
  assert.match(html, /<ruby><span class="timed-character"[^>]*>会<\/span><rt>あ<\/rt><\/ruby>/);
  assert.match(html, /a-i-ta-ka-t-ta/);
  assert.match(html, /向那渐渐消失的彩虹许下约定吧/);
  assert.match(html, /Saint Aqours Snow/);
  assert.match(html, /data-source="\/audio\/over-next-rainbow\.mp3"/);
  assert.equal(html.split(covers.overNextRainbow).length - 1, 2);
  assert.match(html, /Kanata Okajima/);
  assert.match(html, /TAKAROT \/ Shinji Tanaka/);
  assert.doesNotMatch(html, />歌词应援语</);
  assert.doesNotMatch(html, />歌词表达</);
  const words = renderedJapaneseWords(html);
  assert.deepEqual(words[0], ["会いたかった", "遠い", "場所", "に", "いて", "も"]);
  assert.deepEqual(words[2], ["夢", "に", "も", "色々", "ある", "から", "叶えかた", "も", "それぞれ", "だ", "と"]);
  const yrc = await readFile(new URL("../public/audio/over-next-rainbow.yrc", import.meta.url), "utf8");
  assert.equal(yrcJapanese(yrc).length, 57);
  const rendered = renderedJapanese(html);
  assert.equal(rendered.length, 40);
  assert.equal(alignableJapanese(rendered), alignableJapanese(yrcJapanese(yrc)));
});

test("renders the original synchronized lyric reader", async () => {
  const response = await render("/songs/kimi-no-kokoro");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<ruby><span class="timed-character"[^>]*>君<\/span><rt>きみ<\/rt><\/ruby>/);
  assert.match(html, /data-source="\/audio\/kimi-no-kokoro\.mp3"/);
  assert.match(html, /歌曲加载中\.\.\./);
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
  assert.match(html, /如果真要数起来的话，根本数也数不完！不完！不完！对吧？/);
  assert.match(html, /data-source="\/audio\/eternal-hours\.mp3"/);
  assert.equal(html.split(covers.eternalHours).length - 1, 2);
  assert.match(html, /Kanata Okajima \/ Hayato Yamamoto/);
  const words = renderedJapaneseWords(html);
  assert.deepEqual(words[0], ["忘れないで", "忘れない", "よ！"]);
  assert.deepEqual(words[1], ["数えたら", "キリ", "が", "ない！", "ない！", "ない！", "よね？"]);
  assert.deepEqual(words[12], ["僕ら", "を", "待ってる", "よ", "いつ", "まで", "も"]);
  assert.deepEqual(words[32], ["願う", "の", "は", "願う", "の", "は", "君", "と", "の", "しあわせ", "な"]);
  assert.match(html, />wa<\/span><span class="word-meaning" lang="zh-CN">主题助词）<\/span>/);
  const yrc = await readFile(new URL("../public/audio/eternal-hours.yrc", import.meta.url), "utf8");
  const rendered = renderedJapanese(html);
  assert.equal(rendered.length, 45);
  assert.equal(alignableJapanese(rendered), alignableJapanese(yrcJapanese(yrc)));
  assert.doesNotMatch(html, />歌词应援语|>歌词表达/);
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
  const yrc = await readFile(new URL("../public/audio/aozora-jumping-heart.yrc", import.meta.url), "utf8");
  const rendered = renderedJapanese(html);
  const words = renderedJapaneseWords(html);
  assert.equal(yrcJapanese(yrc).length, 69);
  assert.equal(rendered.length, 41);
  assert.equal(alignableJapanese(rendered), alignableJapanese(yrcJapanese(yrc)));
  assert.ok(words.some((line) => JSON.stringify(line) === JSON.stringify(["見た", "こと", "ない", "夢", "の", "軌道", "追いかけて"])));
  assert.ok(words.some((line) => JSON.stringify(line) === JSON.stringify(["僕たち", "の", "なか", "の", "勇気", "が", "さわいでる"])));
  assert.ok(words.some((line) => JSON.stringify(line) === JSON.stringify(["（Let's go!）", "ぜんぶ", "開けたい", "よ", "ほら", "いっしょ", "に", "ね！"])));
  assert.match(html, /追逐着那条从未见过的梦想轨迹/);
  assert.match(html, /class="word-meaning" lang="zh-CN">主题助词/);
  assert.match(html, /class="word-meaning" lang="zh-CN">宾语助词/);
  assert.doesNotMatch(html, />歌词应援语|>歌词表达/);
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

const recentSongs = [
  { slug: "yume-kataru-yori-yume-utaou", title: /ユメ語るより/, translation: /与其诉说梦想的话语/, audio: "yume-kataru-yori-yume-utaou", cover: covers.yumeKataru, lines: 71 },
  { slug: "miracle-wave", title: /MIRACLE/, translation: /极限来临前绝不停歇/, audio: "miracle-wave", cover: covers.miracleWave, lines: 56 },
  { slug: "my-mai-tonight", title: /MY舞☆/, translation: /为了让心炽热起来/, audio: "my-mai-tonight", cover: covers.miracleWave, lines: 66, displayLines: 32 },
  { slug: "sora-mo-kokoro-mo-hareru-kara", title: /空も心も/, translation: /明天会放晴吧/, audio: "sora-mo-kokoro-mo-hareru-kara", cover: covers.soraKokoro, lines: 43 },
  { slug: "water-blue-new-world", title: /WATER BLUE/, translation: /现在就是现在 不同于昨天/, audio: "water-blue-new-world", cover: covers.waterBlueNewWorld, lines: 82, displayLines: 46 },
];

for (const song of recentSongs) {
  test(`renders the annotated ${song.slug} reader`, async () => {
    const response = await render(`/songs/${song.slug}`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, song.title);
    assert.match(html, song.translation);
    assert.match(html, new RegExp(`data-source="/audio/${song.audio}\\.mp3"`));
    assert.equal(html.split(song.cover).length - 1, 2);
    assert.doesNotMatch(html, />歌词应援语</);
    assert.doesNotMatch(html, />歌词表达</);
    const yrc = await readFile(new URL(`../public/audio/${song.audio}.yrc`, import.meta.url), "utf8");
    assert.equal(yrcJapanese(yrc).length, song.lines);
    const rendered = renderedJapanese(html);
    const timed = yrcJapanese(yrc);
    if (song.displayLines) {
      assert.equal(rendered.length, song.displayLines);
      assert.equal(alignableJapanese(rendered), alignableJapanese(timed));
    } else {
      assert.deepEqual(rendered, timed);
    }
  });
}

test("keeps WATER BLUE NEW WORLD in semantic lyric phrases", async () => {
  const html = await (await render("/songs/water-blue-new-world")).text();
  const rendered = renderedJapanese(html);
  const words = renderedJapaneseWords(html);
  assert.ok(rendered.includes("広がった世界を泳いできたのさ"));
  assert.ok(words.some((line) => JSON.stringify(line) === JSON.stringify(["今", "は", "今", "で", "昨日", "と", "違う", "よ"])));
  assert.ok(words.some((line) => JSON.stringify(line) === JSON.stringify(["広がった", "世界", "を", "泳いできた", "の", "さ"])));
  assert.match(html, /我们一路游过了展现在眼前的世界/);
  assert.match(html, /class="word-meaning" lang="zh-CN">宾语助词/);
  assert.match(html, /class="word-meaning" lang="zh-CN">说明、强调/);
  assert.match(html, /class="word-meaning" lang="zh-CN">语气词/);
  assert.doesNotMatch(html, /class="word-meaning" lang="zh-CN">世界中/);
});

test("keeps individual compact-word meanings and requested song colors", async () => {
  const html = await (await render("/songs/my-mai-tonight")).text();
  const words = renderedJapaneseWords(html);
  assert.ok(words.some((line) => JSON.stringify(line) === JSON.stringify(["踊れ", "踊れ", "熱く", "なる", "ため"])));
  assert.ok(words.some((line) => JSON.stringify(line) === JSON.stringify(["この", "世界", "は", "いつも", "諦めない", "心", "に"])));
  assert.ok(words.some((line) => JSON.stringify(line) === JSON.stringify(["答え", "じゃなく", "道", "を", "探す", "手掛かり", "を", "くれる", "から"])));
  assert.match(html, /舞动吧　舞动吧　为了让心炽热起来/);
  assert.match(html, /class="word-meaning" lang="zh-CN">主题助词/);
  assert.match(html, /class="word-meaning" lang="zh-CN">宾语助词/);
  assert.match(html, /class="word-meaning" lang="zh-CN">原因助词：因为/);
  assert.doesNotMatch(html, /class="word-meaning" lang="zh-CN">人生在世/);
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.song-my-mai-tonight \{[^}]*--sun:#db0839/);
  assert.match(css, /\.song-miracle-wave \{[^}]*--sun:#ff9547/);
});

test("renders the new annotated ユメ+ミライ=無限大 reader", async () => {
  const response = await render("/songs/yume-mirai");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /ユメ\+ミライ=/);
  assert.match(html, /<ruby><span class="timed-character"[^>]*>海<\/span><rt>うみ<\/rt><\/ruby>/);
  assert.match(html, /mu-ge-n-da-i/);
  assert.match(html, /律动、心跳/);
  assert.match(html, /梦想是无限大的/);
  assert.match(html, /data-source="\/audio\/yume-mirai\.mp3"/);
  assert.equal(html.split(covers.yume).length - 1, 2);
  assert.doesNotMatch(html, /\/covers\/yume-mirai\.jpg/);
  assert.match(html, /前迫潤哉/);
  assert.match(html, /サイトウリョースケ/);
  assert.match(html, /春川仁志/);
  const yrc = await readFile(new URL("../public/audio/yume-mirai.yrc", import.meta.url), "utf8");
  const rendered = renderedJapanese(html);
  const words = renderedJapaneseWords(html);
  assert.equal(yrcJapanese(yrc).length, 48);
  assert.equal(rendered.length, 44);
  assert.equal(alignableJapanese(rendered), alignableJapanese(yrcJapanese(yrc)));
  assert.ok(words.some((line) => JSON.stringify(line) === JSON.stringify(["いろんな", "思い出", "舞って", "は", "飛んでいった"])));
  assert.ok(words.some((line) => JSON.stringify(line) === JSON.stringify(["一緒", "に", "ね", "抱きしめよう", "ずっと！"])));
  assert.match(html, /class="word-meaning" lang="zh-CN">主题助词/);
  assert.match(html, /class="word-meaning" lang="zh-CN">句末语气：哦、呀/);
  assert.doesNotMatch(html, />歌词应援语|>歌词表达/);
});

test("ships all local audio assets", async () => {
  await Promise.all([
    access(new URL("../public/audio/kimi-no-kokoro.mp3", import.meta.url)),
    access(new URL("../public/audio/yume-mirai.mp3", import.meta.url)),
    access(new URL("../public/audio/yume-mirai.yrc", import.meta.url)),
    access(new URL("../public/audio/happy-party-train.mp3", import.meta.url)),
    access(new URL("../public/audio/happy-party-train.yrc", import.meta.url)),
    access(new URL("../public/audio/yuuki-wa-doko-ni.mp3", import.meta.url)),
    access(new URL("../public/audio/yuuki-wa-doko-ni.yrc", import.meta.url)),
    access(new URL("../public/audio/over-next-rainbow.mp3", import.meta.url)),
    access(new URL("../public/audio/over-next-rainbow.yrc", import.meta.url)),
    access(new URL("../public/audio/eternal-hours.mp3", import.meta.url)),
    access(new URL("../public/audio/eternal-hours.yrc", import.meta.url)),
    access(new URL("../public/audio/aozora-jumping-heart.mp3", import.meta.url)),
    access(new URL("../public/audio/aozora-jumping-heart.yrc", import.meta.url)),
    access(new URL("../public/audio/mirai-ticket.mp3", import.meta.url)),
    access(new URL("../public/audio/mirai-ticket.yrc", import.meta.url)),
    access(new URL("../public/audio/yume-kataru-yori-yume-utaou.mp3", import.meta.url)),
    access(new URL("../public/audio/yume-kataru-yori-yume-utaou.yrc", import.meta.url)),
    access(new URL("../public/audio/miracle-wave.mp3", import.meta.url)),
    access(new URL("../public/audio/miracle-wave.yrc", import.meta.url)),
    access(new URL("../public/audio/my-mai-tonight.mp3", import.meta.url)),
    access(new URL("../public/audio/my-mai-tonight.yrc", import.meta.url)),
    access(new URL("../public/audio/sora-mo-kokoro-mo-hareru-kara.mp3", import.meta.url)),
    access(new URL("../public/audio/sora-mo-kokoro-mo-hareru-kara.yrc", import.meta.url)),
    access(new URL("../public/audio/water-blue-new-world.mp3", import.meta.url)),
    access(new URL("../public/audio/water-blue-new-world.yrc", import.meta.url)),
  ]);
});
