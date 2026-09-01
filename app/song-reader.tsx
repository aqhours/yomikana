"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ListRestart, Moon, Pause, Play, Sun } from "lucide-react";
import { loadAudio } from "./audio-cache";

type Segment = { text: string; reading?: string };
type Word = { jp: Segment[]; romaji: string; meaning: string };
type LyricLine = { words: Word[]; zh: string; aside?: boolean };
type Timing = { start: number; end: number };
type TimedCharacter = Timing & { text: string };
type DisplayCharacter = { key: string; text: string; lineIndex: number };
type Song = {
  slug: string;
  title: string;
  titleAccent: string;
  titleCn: string;
  artist: string;
  cover: string;
  audio: string;
  timing: string;
  backdrop: string;
  credits: { lyricist: string; composer: string; arranger: string };
  lyrics: LyricLine[];
};

const s = (text: string, reading?: string): Segment => ({ text, reading });

const wordMeanings: Record<string, string> = {
  "i-ma": "现在、如今", "mi-ra-i": "未来", "ka-e-te": "改变", "mi-ta-ku": "想试着……", "na-t-ta": "变得……了",
  "yo": "语气词：哦、呀", "da-t-te": "因为、只因", "bo-ku-ta-chi": "我们", "wa": "主题助词", "ma-da": "还、才",
  "yu-me": "梦、梦想", "ni": "助词", "ki-zu-i-ta": "察觉到、意识到", "ba-ka-ri": "才刚、刚刚", "ki-k-ka-ke": "契机、起因",
  "nan-de-mo": "无论什么", "i-i": "好、可以", "ka-ra": "因为、既然", "i-s-sho": "一起", "to-ki-me-ki": "心动、悸动",
  "o": "宾语助词", "sa-ga-so-u": "去寻找吧", "wa-s-sho-i": "哇咻、欢呼声", "oo-ra-i": "All right", "hon-to-u": "真的、真正",
  "no-zo-mu": "希望、期盼", "ko-to": "事情", "na-ra": "如果……的话", "ka-na-u": "实现、如愿", "n-da": "说明、强调",
  "to": "引用助词", "sho-u-me-i": "证明", "shi-te": "做、进行", "mi-ru": "试着做", "chi-p-po-ke": "渺小、微不足道",
  "na": "连接词", "ji-bu-n": "自己", "ga": "主语助词", "do-ko": "哪里", "e": "向、往", "to-bi-da-se-ru": "能飞出去、能冲出去",
  "ka-na": "会不会呢", "wa-ka-ra-na-i": "不知道、不明白", "ma-ma": "保持……的状态", "de": "以……状态", "nan-to-ka": "总会有办法",
  "na-ru": "变成、成为", "sa": "语气词", "ah": "感叹词：啊", "ha-ji-me-yo-u": "开始吧", "ki-mi": "你", "no": "的",
  "ko-ko-ro": "心、内心", "ka-ga-ya-i-te": "闪耀着", "i-ru": "正在、处于", "ka-i": "……吗？", "mu-ne": "胸、内心",
  "ki-i-ta-ra": "如果询问、如果听", "yes": "是、肯定", "ko-ta-e-ru": "回答", "ko-no": "这个、这份", "de-a-i": "相遇、邂逅",
  "min-na": "大家、所有人", "ka-e-ru": "改变", "kyo-u": "今天", "mo": "也、仍然", "ta-i-yo-u": "太阳",
  "te-ra-shi-te-ru": "正照耀着", "bo-ku-ra": "我们", "oh yes": "哦，是的", "doki-doki sunshine": "心跳阳光", "oh yes doki-doki sunshine": "哦，是的，心跳阳光",
  "ta-i-ku-tsu": "无聊、无趣", "ni-ga-te": "不擅长、不喜欢", "zen-ryo-ku": "全力", "a-so-bo-u": "一起玩吧", "ga-t-ten": "明白、同意",
  "to-ki-do-ki": "有时、时而", "ma-yo-i": "迷茫、犹豫", "na-ga-ra": "一边……、虽然……", "i-s-sho-u-ke-n-me-i": "拼命、竭尽全力",
  "mo-ku-hyo-u": "目标", "da-s-shu": "冲刺", "da": "是、就是", "u-ma-ku": "顺利地", "i-ka-na-i": "不顺利、不行",
  "t-te": "表示引用", "a-ki-ra-me-ta-ra": "如果放弃的话", "ki-t-to": "一定、肯定", "a-to": "之后", "ku-ya-shi-i": "后悔、不甘心",
  "da-ne": "对吧、是吧", "da-ka-ra": "所以", "mu-cha": "胡来、乱来", "ya-t-te": "做", "mi-ta-i": "想试试看",
  "so-no": "那个、那", "sa-ki": "前方、之后", "de-mo": "但是、不过", "ne": "呢、吧", "o-mo-shi-ro-so-u": "看起来很有趣",
  "ka-mo": "也许、可能", "sa-a": "来吧", "o-i-de": "过来、来吧", "nan-do": "几次、多少次", "ta-chi-a-ga-re-ru": "能重新站起来",
  "te": "手", "a-te": "放上、贴上", "wa-ra-u": "笑", "don-na": "什么样的", "i-mi": "意义、意思", "a-ru": "有、存在",
  "ka": "……吗", "shi-ra-na-i": "不知道", "ke-do": "但是、虽然", "ma-bu-shi-i": "耀眼、闪耀", "me-za-me-ta": "醒来、觉醒",
  "ke-re-do": "但是、虽然", "ka-ga-ya-i-te-ru": "闪耀着", "te-ra-sa-re-te-ru": "正被照耀着", "ka-wa-ri": "改变、变化", "ha-ji-me-ta": "开始了", "so-u-da": "没错、是啊",
};

const meaningKey = (romaji: string) => romaji.toLowerCase().replace(/[!?,.…]/g, "").trim();
const w = (romaji: string, ...jp: Segment[]): Word => ({ jp, romaji, meaning: wordMeanings[meaningKey(romaji)] ?? "歌词应援语" });

const annotatedLyrics: LyricLine[] = [
  { words: [w("i-ma…", s("今", "いま"), s("…"))], zh: "如今……" },
  { words: [w("mi-ra-i,", s("みらい、")), w("ka-e-te", s("変", "か"), s("えて")), w("mi-ta-ku", s("みたく")), w("na-t-ta", s("なった")), w("yo!", s("よ！"))], zh: "变得想要试着改变未来！" },
  { words: [w("da-t-te", s("だって")), w("bo-ku-ta-chi", s("僕", "ぼく"), s("たち")), w("wa", s("は")), w("ma-da", s("まだ")), w("yu-me", s("夢", "ゆめ")), w("ni", s("に")), w("ki-zu-i-ta", s("気", "き"), s("づいた")), w("ba-ka-ri", s("ばかり"))], zh: "只因我们才刚察觉到梦想的存在" },
  { words: [w("ki-k-ka-ke", s("きっかけ")), w("wa", s("は")), w("nan-de-mo", s("なんでも")), w("i-i", s("いい")), w("ka-ra", s("から"))], zh: "不论契机为何都无关紧要" },
  { words: [w("i-s-sho", s("一緒", "いっしょ")), w("ni", s("に")), w("to-ki-me-ki", s("ときめき")), w("o", s("を")), w("sa-ga-so-u", s("探", "さが"), s("そう")), w("yo", s("よ"))], zh: "让我们一同前去寻找悸动吧" },
  { words: [w("wa-s-sho-i!", s("（わっしょい！")), w("to-ki-me-ki", s("ときめき")), w("oo-ra-i", s("オーライ）"))], zh: "（哇咻！心跳不已 All right）", aside: true },
  { words: [w("hon-to-u", s("本当", "ほんとう")), w("ni", s("に")), w("no-zo-mu", s("望", "のぞ"), s("む")), w("ko-to", s("こと")), w("na-ra", s("なら"))], zh: "倘若如此真心期盼" },
  { words: [w("ka-na-u", s("かなう")), w("n-da", s("んだ")), w("to", s("と")), w("sho-u-me-i", s("証明", "しょうめい")), w("shi-te", s("して")), w("mi-ru", s("みる")), w("n-da", s("んだ"))], zh: "就让我来证明肯定能够得偿所望" },
  { words: [w("chi-p-po-ke", s("ちっぽけ")), w("na", s("な")), w("ji-bu-n", s("自分", "じぶん")), w("ga", s("が")), w("do-ko", s("どこ")), w("e", s("へ")), w("to-bi-da-se-ru", s("飛", "と"), s("び"), s("出", "だ"), s("せる")), w("ka-na", s("かな"))], zh: "微不足道的自己，究竟能飞得多高多远" },
  { words: [w("wa-ka-ra-na-i", s("わからない")), w("wa-ka-ra-na-i", s("わからない")), w("ma-ma", s("まま")), w("de", s("で"))], zh: "我无从知晓，就这样一无所知地" },
  { words: [w("nan-to-ka", s("（なんとか")), w("na-ru", s("なる")), w("sa", s("さ")), w("to", s("と）"))], zh: "（船到桥头自然直）", aside: true },
  { words: [w("Ah!", s("Ah!")), w("ha-ji-me-yo-u", s("始", "はじ"), s("めよう"))], zh: "Ah！让我们开始吧" },
  { words: [w("ki-mi", s("君", "きみ")), w("no", s("の")), w("ko-ko-ro", s("こころ")), w("wa", s("は")), w("ka-ga-ya-i-te", s("輝", "かがや"), s("いて")), w("i-ru", s("いる")), w("ka-i?", s("かい？"))], zh: "你的心是否正在闪耀？" },
  { words: [w("mu-ne", s("胸", "むね")), w("ni", s("に")), w("ki-i-ta-ra", s("聞", "き"), s("いたら")), w("YES!!", s("\"YES!!\"")), w("to", s("と")), w("ko-ta-e-ru", s("答", "こた"), s("える")), w("sa", s("さ"))], zh: "倘若倾听内心，就回应一声“YES!!”" },
  { words: [w("ko-no", s("この")), w("de-a-i", s("出会", "であ"), s("い")), w("ga", s("が")), w("min-na", s("みんな")), w("o", s("を")), w("ka-e-ru", s("変", "か"), s("える")), w("ka-na", s("かな"))], zh: "这份邂逅是否能改变一切" },
  { words: [w("kyo-u", s("今日", "きょう")), w("mo", s("も")), w("ta-i-yo-u", s("太陽", "たいよう")), w("wa", s("は")), w("te-ra-shi-te-ru", s("照", "て"), s("らしてる")), w("bo-ku-ra", s("僕", "ぼく"), s("ら")), w("no", s("の")), w("yu-me", s("夢", "ゆめ"))], zh: "今天的太阳依旧照耀着我们的梦想" },
  { words: [w("Oh yes,", s("(Oh yes,")), w("Doki-Doki Sunshine", s("Doki-Doki Sunshine")), w("Oh yes,", s("Oh yes,")), w("Doki-Doki Sunshine", s("Doki-Doki Sunshine)"))], zh: "(Oh yes, Doki-Doki Sunshine Oh yes, Doki-Doki Sunshine)", aside: true },
  { words: [w("ta-i-ku-tsu", s("退屈", "たいくつ")), w("ga", s("が")), w("ni-ga-te", s("苦手", "にがて")), w("de", s("で")), w("i-i", s("いい")), w("no", s("の")), w("sa", s("さ"))], zh: "就算不擅长应对无趣也无妨" },
  { words: [w("i-s-sho", s("いっしょ")), w("ni", s("に")), w("zen-ryo-ku", s("全力", "ぜんりょく")), w("de", s("で")), w("a-so-bo-u", s("遊", "あそ"), s("ぼう")), w("yo", s("よ"))], zh: "让我们一起尽情嬉戏吧" },
  { words: [w("ga-t-ten!", s("（がってん！")), w("zen-ryo-ku", s("ぜんりょく")), w("oo-ra-i", s("オーライ）"))], zh: "（同意！倾尽全力 All right）", aside: true },
  { words: [w("to-ki-do-ki", s("ときどき")), w("ma-yo-i", s("迷", "まよ"), s("い")), w("na-ga-ra", s("ながら")), w("mo", s("も"))], zh: "尽管时而感到迷茫" },
  { words: [w("i-s-sho-u-ke-n-me-i", s("いっしょうけんめい")), w("mo-ku-hyo-u", s("目標", "もくひょう")), w("e", s("へ")), w("to", s("と")), w("da-s-shu", s("ダッシュ")), w("da", s("だ"))], zh: "也要竭尽全力朝目标冲刺" },
  { words: [w("u-ma-ku", s("うまく")), w("i-ka-na-i", s("いかない")), w("t-te", s("って")), w("a-ki-ra-me-ta-ra", s("あきらめたら"))], zh: "倘若因为不顺利就此放弃" },
  { words: [w("ki-t-to", s("きっと")), w("a-to", s("後", "あと")), w("ka-ra", s("から")), w("ku-ya-shi-i", s("悔", "くや"), s("しい")), w("yo", s("よ"))], zh: "事后肯定会后悔莫及" },
  { words: [w("da-ne", s("（…だねっ）"))], zh: "（……没错吧）", aside: true },
  { words: [w("da-ka-ra", s("だから")), w("mu-cha", s("無茶", "むちゃ")), w("da-t-te", s("だって")), w("ya-t-te", s("やって")), w("mi-ta-i", s("みたい")), w("yo", s("よ")), w("so-no", s("その")), w("sa-ki", s("先", "さき")), w("wa", s("は"))], zh: "所以就算胡来也想试着放手去做，至于那之后……" },
  { words: [w("wa-ka-ra-na-i", s("わからない")), w("wa-ka-ra-na-i", s("わからない")), w("de-mo", s("でも")), w("ne", s("ね")), w("o-mo-shi-ro-so-u", s("おもしろそう"))], zh: "我无从得知，无从得知，不过似乎很有趣" },
  { words: [w("nan-to-ka", s("（なんとか")), w("na-ru", s("なる")), w("ka-mo", s("かも）"))], zh: "（也许总会有办法）", aside: true },
  { words: [w("sa-a,", s("さぁ、")), w("o-i-de!", s("おいで！"))], zh: "来吧，快随我来！" },
  { words: [w("ki-mi", s("君", "きみ")), w("wa", s("は")), w("nan-do", s("何度", "なんど")), w("mo", s("も")), w("ta-chi-a-ga-re-ru", s("立", "た"), s("ち"), s("上", "あ"), s("がれる")), w("ka-i?", s("かい？"))], zh: "你是否无论几次都还能再次站起来？" },
  { words: [w("mu-ne", s("胸", "むね")), w("ni", s("に")), w("te", s("手", "て")), w("o", s("を")), w("a-te", s("あて")), w("YES!!", s("\"YES!!\"")), w("to", s("と")), w("wa-ra-u", s("笑", "わら"), s("う")), w("n-da", s("んだ")), w("yo", s("よ"))], zh: "把手放在胸口，笑着回答“YES!!”吧" },
  { words: [w("ma-da", s("まだ")), w("de-a-i", s("出会", "であ"), s("い")), w("ni", s("に")), w("don-na", s("どんな")), w("i-mi", s("意味", "いみ")), w("ga", s("が")), w("a-ru", s("ある")), w("ka", s("か"))], zh: "虽然还不知道这场相遇有着怎样的意义" },
  { words: [w("shi-ra-na-i", s("知", "し"), s("らない")), w("ke-do", s("けど")), w("ma-bu-shi-i", s("まぶしい")), w("ne", s("ね")), w("bo-ku-ra", s("僕", "ぼく"), s("ら")), w("no", s("の")), w("yu-me", s("夢", "ゆめ")), w("me-za-me-ta", s("目覚", "めざ"), s("めた")), w("n-da", s("んだ")), w("yo", s("よ"))], zh: "虽然不知道，但依旧如此耀眼，我们的梦想已经觉醒了" },
  { words: [w("Oh yes,", s("(Oh yes,")), w("Doki-Doki Sunshine", s("Doki-Doki Sunshine")), w("Oh yes,", s("Oh yes,")), w("Doki-Doki Sunshine", s("Doki-Doki Sunshine)"))], zh: "(Oh yes, Doki-Doki Sunshine Oh yes, Doki-Doki Sunshine)", aside: true },
  { words: [w("ki-mi", s("君", "きみ")), w("no", s("の")), w("ko-ko-ro…", s("こころ…")), w("ka-ga-ya-i-te", s("輝", "かがや"), s("いて")), w("i-ru", s("いる")), w("ka-i", s("かい"))], zh: "你的心……是否正在闪耀？" },
  { words: [w("mu-ne", s("胸", "むね")), w("ni", s("に")), w("ki-i-ta-ra", s("聞", "き"), s("いたら")), w("YES!!", s("\"YES!!\"")), w("to", s("と")), w("ko-ta-e-ru", s("答", "こた"), s("える")), w("sa", s("さ"))], zh: "向自己的内心询问，就会回答“YES!!”" },
  { words: [w("ko-no", s("この")), w("de-a-i", s("出会", "であ"), s("い")), w("ga", s("が")), w("min-na", s("みんな")), w("o", s("を")), w("ka-e-ru", s("変", "か"), s("える"))], zh: "这份邂逅改变了一切" },
  { words: [w("kyo-u", s("今日", "きょう")), w("mo", s("も")), w("ta-i-yo-u", s("太陽", "たいよう")), w("ni", s("に")), w("te-ra-sa-re-te-ru", s("照", "て"), s("らされてる")), w("yo", s("よ"))], zh: "今天我们依旧沐浴在太阳的照耀下" },
  { words: [w("nan-do", s("なんど")), w("mo", s("も")), w("nan-do", s("なんど")), w("mo", s("も")), w("ta-chi-a-ga-re-ru", s("立", "た"), s("ち"), s("上", "あ"), s("がれる")), w("ka-i?", s("かい？"))], zh: "你是否无论多少次都还能再次站起来？" },
  { words: [w("mu-ne", s("胸", "むね")), w("ni", s("に")), w("te", s("手", "て")), w("o", s("を")), w("a-te", s("あて")), w("YES!!", s("\"YES!!\"")), w("to", s("と")), w("wa-ra-u", s("笑", "わら"), s("う")), w("n-da", s("んだ")), w("yo", s("よ"))], zh: "把手放在胸口，笑着回答“YES!!”吧" },
  { words: [w("ma-da", s("まだ")), w("de-a-i", s("出会", "であ"), s("い")), w("ni", s("に")), w("don-na", s("どんな")), w("i-mi", s("意味", "いみ")), w("ga", s("が")), w("a-ru", s("ある")), w("ka", s("か"))], zh: "虽然还不知道这场相遇有着怎样的意义" },
  { words: [w("shi-ra-na-i", s("知", "し"), s("らない")), w("ke-do", s("けど")), w("ma-bu-shi-i", s("まぶしい")), w("ne", s("ね"))], zh: "虽然不知道，但依旧如此耀眼" },
  { words: [w("bo-ku-ra", s("僕", "ぼく"), s("ら")), w("no", s("の")), w("yu-me", s("夢", "ゆめ")), w("Oh yes, Doki-Doki Sunshine", s("(Oh yes, Doki-Doki Sunshine)"))], zh: "我们的梦想 (Oh yes, Doki-Doki Sunshine)" },
  { words: [w("me-za-me-ta", s("めざめた")), w("n-da", s("んだ")), w("yo", s("よ")), w("Oh yes, Doki-Doki Sunshine", s("(Oh yes, Doki-Doki Sunshine)"))], zh: "就此觉醒 (Oh yes, Doki-Doki Sunshine)" },
  { words: [w("i-ma…", s("今", "いま"), s("…"))], zh: "如今……" },
  { words: [w("mi-ra-i,", s("みらい、")), w("ka-wa-ri", s("変", "か"), s("わり")), w("ha-ji-me-ta", s("始", "はじ"), s("めた")), w("ka-mo!", s("かも！"))], zh: "未来，似乎开始改变了！" },
  { words: [w("so-u-da", s("そうだ")), w("bo-ku-ta-chi", s("僕", "ぼく"), s("たち")), w("wa", s("は")), w("ma-da", s("まだ")), w("yu-me", s("夢", "ゆめ")), w("ni", s("に")), w("ki-zu-i-ta", s("気", "き"), s("づいた")), w("ba-ka-ri", s("ばかり"))], zh: "没错，我们才刚察觉到梦想的存在" },
];

const pickWords = (line: number, start = 0, end?: number) => annotatedLyrics[line].words.slice(start, end);

// The YRC file is the authoritative lyric source. Existing annotations are
// reused where the surface text matches and rebuilt where the YRC differs.
const kimiLyrics: LyricLine[] = [
  { words: [w("i-ma", s("今", "いま")), w("mi-ra-i", s("みらい")), ...pickWords(1, 1, 4), w("yo", s("よ"))], zh: "如今，变得想要试着改变未来" },
  { words: pickWords(2, 0, 3), zh: "只因我们" },
  { words: pickWords(2, 3), zh: "才刚察觉到梦想的存在" },
  { words: pickWords(3), zh: annotatedLyrics[3].zh },
  { words: [w("i-s-sho", s("いっしょ")), ...pickWords(4, 1)], zh: annotatedLyrics[4].zh },
  { words: [w("wa-s-sho-i", s("わっしょい"))], zh: "哇咻！", aside: true },
  { words: [pickWords(5, 1, 2)[0], w("oo-ra-i", s("オーライ"))], zh: "心跳不已 All right", aside: true },
  { words: pickWords(6), zh: annotatedLyrics[6].zh },
  { words: pickWords(7), zh: annotatedLyrics[7].zh },
  { words: pickWords(8, 0, 4), zh: "微不足道的自己" },
  { words: pickWords(8, 4), zh: "究竟能飞得多高多远" },
  { words: pickWords(9), zh: annotatedLyrics[9].zh },
  { words: [w("nan-to-ka", s("なんとか")), ...pickWords(10, 1, 3), w("to", s("と"))], zh: "船到桥头自然直", aside: true },
  { words: [w("Ah", s("Ah")), w("ha-ji-me-yo-u", s("はじめよう"))], zh: annotatedLyrics[11].zh },
  { words: [...pickWords(12, 0, 4), w("ka-ga-ya-i-te-ru", s("輝", "かがや"), s("いてる")), w("ka-i", s("かい"))], zh: annotatedLyrics[12].zh },
  { words: pickWords(13, 0, 3), zh: "倘若倾听内心" },
  { words: [w("Yes", s("Yes")), ...pickWords(13, 4)], zh: "就回应一声 Yes" },
  { words: pickWords(14), zh: annotatedLyrics[14].zh },
  { words: pickWords(15, 0, 5), zh: "今天的太阳依旧照耀着" },
  { words: pickWords(15, 5), zh: "我们的梦想" },
  { words: [w("Oh yes Doki-Doki Sunshine", s("Oh yes doki doki sunshine"))], zh: "Oh yes, Doki-Doki Sunshine", aside: true },
  { words: [w("Oh yes Doki-Doki Sunshine", s("Oh yes doki doki sunshine"))], zh: "Oh yes, Doki-Doki Sunshine", aside: true },
  { words: pickWords(17), zh: annotatedLyrics[17].zh },
  { words: pickWords(18), zh: annotatedLyrics[18].zh },
  { words: [w("ga-t-ten", s("がってん")), w("zen-ryo-ku", s("ぜんりょく")), w("oo-ra-i", s("オーライ"))], zh: "同意！倾尽全力 All right", aside: true },
  { words: pickWords(20), zh: annotatedLyrics[20].zh },
  { words: pickWords(21, 0, 1), zh: "竭尽全力" },
  { words: pickWords(21, 1), zh: "朝目标冲刺" },
  { words: pickWords(22), zh: annotatedLyrics[22].zh },
  { words: [...pickWords(23), w("da-ne", s("だねっ"))], zh: "事后肯定会后悔莫及，对吧" },
  { words: pickWords(25, 0, 3), zh: "所以就算胡来也" },
  { words: pickWords(25, 3), zh: "想试着放手去做，至于那之后" },
  { words: pickWords(26, 0, 2), zh: "我无从得知，无从得知" },
  { words: pickWords(26, 2), zh: "不过似乎很有趣" },
  { words: [w("nan-to-ka", s("なんとか")), ...pickWords(27, 1, 2), w("ka-mo", s("かも")), w("sa-a", s("さあ")), w("o-i-de", s("おいで"))], zh: "也许总会有办法，来吧，快随我来", aside: true },
  { words: [...pickWords(29, 0, 2), w("nan-do", s("なんど")), ...pickWords(29, 3, 5), w("ka-i", s("かい"))], zh: annotatedLyrics[29].zh },
  { words: pickWords(30, 0, 5), zh: "把手放在胸口" },
  { words: [w("Yes", s("Yes")), ...pickWords(30, 6)], zh: "笑着回答 Yes 吧" },
  { words: pickWords(31), zh: annotatedLyrics[31].zh },
  { words: [w("shi-ra-na-i", s("知", "し"), s("らない")), w("ke-re-do", s("けれど")), ...pickWords(32, 2, 4)], zh: "虽然不知道，但依旧如此耀眼" },
  { words: [...pickWords(32, 4, 7), w("me-za-me-ta", s("めざめた")), ...pickWords(32, 8)], zh: "我们的梦想已经觉醒了" },
  { words: [w("Oh yes Doki-Doki Sunshine", s("Oh yes doki doki sunshine"))], zh: "Oh yes, Doki-Doki Sunshine", aside: true },
  { words: [w("Oh yes Doki-Doki Sunshine", s("Oh yes doki doki sunshine"))], zh: "Oh yes, Doki-Doki Sunshine", aside: true },
  { words: [...pickWords(34, 0, 2), w("ko-ko-ro", s("こころ")), w("ka-ga-ya-i-te-ru", s("輝", "かがや"), s("いてる")), w("ka-i", s("かい"))], zh: annotatedLyrics[34].zh },
  { words: [...pickWords(35, 0, 3), w("yes", s("yes")), ...pickWords(35, 4)], zh: annotatedLyrics[35].zh },
  { words: pickWords(36), zh: annotatedLyrics[36].zh },
  { words: pickWords(37), zh: annotatedLyrics[37].zh },
  { words: pickWords(38, 0, 4), zh: "无论多少次" },
  { words: [...pickWords(38, 4, 5), w("ka-i", s("かい"))], zh: "都还能再次站起来吗" },
  { words: pickWords(39, 0, 5), zh: "把手放在胸口" },
  { words: [w("Yes", s("Yes")), ...pickWords(39, 6)], zh: "笑着回答 Yes 吧" },
  { words: pickWords(40), zh: annotatedLyrics[40].zh },
  { words: [w("shi-ra-na-i", s("知", "し"), s("らない")), w("ke-re-do", s("けれど")), ...pickWords(41, 2)], zh: annotatedLyrics[41].zh },
  { words: pickWords(42, 0, 3), zh: "我们的梦想" },
  { words: [w("Oh yes Doki-Doki Sunshine", s("Oh yes doki doki sunshine"))], zh: "Oh yes, Doki-Doki Sunshine", aside: true },
  { words: pickWords(43, 0, 3), zh: "就此觉醒" },
  { words: [w("Oh yes Doki-Doki Sunshine", s("Oh yes doki doki sunshine"))], zh: "Oh yes, Doki-Doki Sunshine", aside: true },
  { words: [w("i-ma", s("今", "いま")), w("mi-ra-i", s("みらい")), w("ka-wa-ri", s("変", "か"), s("わり")), w("ha-ji-me-ta", s("はじめた")), w("ka-mo", s("かも"))], zh: "如今，未来似乎开始改变了" },
  { words: pickWords(46, 0, 3), zh: "没错，我们" },
  { words: pickWords(46, 3), zh: "才刚察觉到梦想的存在" },
];

const yw = (romaji: string, meaning: string, ...jp: Segment[]): Word => ({ jp, romaji, meaning });

const kanaRomaji: Record<string, string> = {
  あ:"a",い:"i",う:"u",え:"e",お:"o",か:"ka",き:"ki",く:"ku",け:"ke",こ:"ko",さ:"sa",し:"shi",す:"su",せ:"se",そ:"so",た:"ta",ち:"chi",つ:"tsu",て:"te",と:"to",
  な:"na",に:"ni",ぬ:"nu",ね:"ne",の:"no",は:"ha",ひ:"hi",ふ:"fu",へ:"he",ほ:"ho",ま:"ma",み:"mi",む:"mu",め:"me",も:"mo",や:"ya",ゆ:"yu",よ:"yo",ら:"ra",り:"ri",る:"ru",れ:"re",ろ:"ro",わ:"wa",を:"o",ん:"n",
  が:"ga",ぎ:"gi",ぐ:"gu",げ:"ge",ご:"go",ざ:"za",じ:"ji",ず:"zu",ぜ:"ze",ぞ:"zo",だ:"da",ぢ:"ji",づ:"zu",で:"de",ど:"do",ば:"ba",び:"bi",ぶ:"bu",べ:"be",ぼ:"bo",ぱ:"pa",ぴ:"pi",ぷ:"pu",ぺ:"pe",ぽ:"po",
  きゃ:"kya",きゅ:"kyu",きょ:"kyo",しゃ:"sha",しゅ:"shu",しょ:"sho",ちゃ:"cha",ちゅ:"chu",ちょ:"cho",にゃ:"nya",にゅ:"nyu",にょ:"nyo",ひゃ:"hya",ひゅ:"hyu",ひょ:"hyo",みゃ:"mya",みゅ:"myu",みょ:"myo",りゃ:"rya",りゅ:"ryu",りょ:"ryo",
  ぎゃ:"gya",ぎゅ:"gyu",ぎょ:"gyo",じゃ:"ja",じゅ:"ju",じょ:"jo",びゃ:"bya",びゅ:"byu",びょ:"byo",ぴゃ:"pya",ぴゅ:"pyu",ぴょ:"pyo",ふぁ:"fa",ふぃ:"fi",ふぇ:"fe",ふぉ:"fo",てぃ:"ti",でぃ:"di",
};

const romanizeKana = (value: string) => {
  const source = value.normalize("NFKC").replace(/[ァ-ヶ]/g, (character) => String.fromCharCode(character.charCodeAt(0) - 0x60));
  const syllables: string[] = [];
  let geminate = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === "っ") { geminate = true; continue; }
    if (character === "ー") continue;
    const pair = source.slice(index, index + 2);
    let syllable = kanaRomaji[pair];
    if (syllable) index += 1;
    else syllable = kanaRomaji[character] ?? (/\p{L}|\p{N}/u.test(character) ? character.toLowerCase() : "");
    if (!syllable) continue;
    if (geminate && /^[a-z]/.test(syllable)) syllable = `${syllable[0]}${syllable}`;
    geminate = false;
    syllables.push(syllable);
  }
  return syllables.join("-").replace(/-([a-z])-([a-z])/g, "-$1$2");
};

const compactWordMeanings: Record<string, string> = {
  "熱く":"炽热地","なるため":"为了变得……","人は":"人们","生まれた":"诞生了","生まれてきたの？":"降生于世吗？","はずさ":"理应如此","いま":"现在","小さく":"微弱地","燃えてる":"燃烧着","まだ":"仍然","小さな":"小小的","焔が":"火焰","一つに":"合而为一","なれば":"如果成为","奇跡が":"奇迹","生まれ":"诞生","この":"这个","セカイは":"世界","いつも":"总是","諦めない":"不放弃","心に":"在心中","答えじゃ":"并非答案","なく":"不是","道を":"道路","探す":"寻找","手掛かりを":"线索","くれるから":"因为给予我们","最後まで":"直到最后","強気で":"坚定地","行こう":"前行吧","踊れ":"舞动吧","きっと":"一定","そうだよ":"就是如此","だから":"所以","夢見て":"怀抱梦想","踊ろう":"舞动吧","時が":"时刻",
  "My":"我的","舞":"舞蹈","tonight":"今夜","Dancing tonight":"今夜起舞","最高の":"最美好的","今日に":"在今天","しよう":"让它成为吧","いつか":"总有一天","広がるだろう":"会延展开吧","ほら":"看、来吧","大きく":"不断扩大","広がれ":"延展开吧","頑張る":"努力","力":"力量","奇跡を":"奇迹","呼んでる":"正在呼唤","世界の":"世界的","中で":"之中","輝きたい":"想要闪耀","心が":"内心","集まる":"汇聚","時":"时刻","新しいこと":"崭新的事物","思いつき":"迸发灵感","走り":"奔跑","出す":"开始","足元が":"脚下","見えないけど":"虽然看不见","羽みたいに":"如羽翼一般","手":"手","伸ばして":"伸出去","憧れたのは":"所憧憬的是","ずっと":"永远","瞬く":"闪耀的","光":"光芒","いつかは":"总有一天","叶う":"实现","はずだと":"相信一定会","明日へと":"向着明天","繋げよう":"连结起来吧","胸の":"心底的","声に":"声音引领","導かれて":"被引导着","道が":"道路","開けだよ":"会开拓出来","いこう":"前行吧",
  "うまく":"顺利地","いかなくて":"无法进行","泣きそうに":"快要哭泣","なる":"变得","時は":"在……之时","くちびる":"嘴唇","噛みつつ":"一边咬紧","願うんだ":"祈愿着","「あしたは":"明天会","晴れ」":"放晴","繋がりそうで":"似乎能够相连","繋がらないの":"却无法相连","心と":"心与","心":"心灵","船が":"船只","夕焼けを":"晚霞","渡るよ":"驶过","悩みを":"烦恼","持ち":"带着","去るように":"仿佛远去","私は":"我","まだまだ":"仍然还能","頑張れる":"继续努力","消える":"褪去的","波に":"向海浪","語ろうか":"诉说吧","もう":"已经","大丈夫":"没关系","家まで":"直到家中","走って":"奔跑着","面白いこと":"有趣的事情","したくなったと":"突然想去做","君に":"向你","伝えなくちゃ":"必须传达","家に":"回到家中","帰ったら":"回去之后","動き":"行动","始めたら":"开始之后","楽しく":"开心地","なるけど":"虽然变得","壁に":"面对阻碍","ぶつかる":"碰壁","いっぱい":"许许多多","どうする?":"该怎么做？","考えても":"即使思考","しかたない":"也无济于事","「あしたよ":"明天啊","それでも":"即便如此","今日が":"今天","終わり":"结束","次の":"下一个","日を":"日子","迎えたら":"迎来之后","また":"再次","なってるの?":"会变成那样吗？","いいよ":"没关系","今度は":"这一次","もっと":"更加","素早く":"迅速地","立ち":"重新站起","直れるよ":"能够振作","月が":"月亮","眠りを":"睡意","つれてくる":"带来","優しく":"温柔地","撫でるように":"仿佛轻抚","ひとり":"独自一人","そっと":"轻轻地","呟いた":"低声呢喃","早めに":"早点","起きようかな":"起床吧","新しい":"崭新的","目覚めたらね":"醒来之后",
  "今は":"如今","今で":"此刻便是此刻","昨日と":"与昨天","違うよ":"不同","明日への":"通往明天的","途中じゃなく":"并非途中","今だね":"就是现在啊","瞬間の":"瞬间的","ことが":"事情","重なっては":"重叠之后","消えてく":"渐渐消失","刻むんだ":"铭刻下来","Water blue":"水蓝色","悔やみたく":"想要后悔","なかった":"并不愿意","気持ちの":"心情的","先に":"前方","広がった":"延展开的","世界を":"世界","泳いできたのさ":"一路畅游至今","言うだけでは":"只是说说的话","叶わない":"无法实现","動け":"行动吧","動けば":"若行动起来","変わるんだ":"就会改变","と":"如此","知ったよ":"已经明白","ここに":"在这里","いたいと":"想留下来","思ってるけど":"虽然这样想","旅立ってくって":"终将踏上旅途","わかってるんだよ":"我明白的","時を":"这一刻","楽しくしたい":"想让它快乐","ときめきを":"悸动","胸に":"在心中","焼き":"烙印","付けたいから":"因为想铭刻下来",
  "My new world":"我的新世界","場所":"地方","きたよ":"已经到来","輝きへと":"向着光辉","海を":"大海","渡ろう":"渡过去吧","夢が":"梦想","見たい":"想要看见","想いは":"心愿","いつでも":"无论何时","僕たちを":"将我们","繋いでくれるから":"因为连结着我们","つないでくれるから":"因为连结着我们","笑っていこう":"欢笑着前行吧","今を":"此刻","重ね":"累积起来","そして":"然后","未来へ":"向未来","向かおう":"前进吧","今日も":"今天也","過ぎてく":"不断流逝","止められないと":"无法停止","気が":"意识到","付いた":"察觉了","僕らは":"我们","どこへ":"去往何方","向かうの？":"要前往呢？","いつだって":"无论何时","思い":"回忆、心意","出せるよ":"能够想起","駆け":"飞奔","抜けてきた":"一路穿越而来","素晴らしい":"美妙的","季節を":"季节","いたいね":"想留下来呢","好きだよ":"最喜欢了","みんな":"大家","でもね":"但是啊","分かってるんだよ":"我明白的","たくさん":"许多","頑張ってきた":"一路努力至今","時間が":"时光","愛しい":"令人眷恋","繋がりを":"羁绊","いつまでも":"永远","大事にしよう":"好好珍惜吧","ココロが":"内心","躍るような":"雀跃般的","日々を":"每一天","追いかけたい":"想要追逐","気持ちで":"怀着心情","夢は":"梦想","夢のように":"如梦一般","過ごすだけじゃなくて":"不只是度过","痛み":"痛楚","抱えながら":"一边怀抱","求めるものさ":"应当追寻之物","ココロに":"在心中","New world":"新世界","来たよ":"已经到来","ことを":"这件事","僕らの":"我们的",
};

// Compact lyric notation: split words with `|` and annotate kanji as `表記{よみ}`.
const cl = (markup: string, zh: string, aside = false, meanings: Record<string, string> = {}): LyricLine => ({
  words: markup.split("|").filter(Boolean).map((token) => {
    const jp: Segment[] = [];
    let pronunciation = "";
    for (const match of token.matchAll(/([^{}]+)\{([^{}]+)\}|([^{}]+)/g)) {
      if (match[1]) { jp.push(s(match[1], match[2])); pronunciation += match[2]; }
      else if (match[3]) { jp.push(s(match[3])); pronunciation += match[3]; }
    }
    const romaji = romanizeKana(pronunciation);
    const surface = jp.map((segment) => segment.text).join("").trim();
    return yw(romaji, meanings[surface] ?? compactWordMeanings[surface] ?? wordMeanings[meaningKey(romaji)] ?? "歌词表达", ...jp);
  }),
  zh,
  aside,
});

const waterBlueNewWorldWordMeanings: Record<string, string> = {
  "今":"现在","は":"主题助词","で":"表示状态、范围的助词","昨日":"昨天","と":"比较、引用助词","違う":"不同","よ":"句末语气：哦、呀",
  "明日":"明天","へ":"方向助词：向、往","の":"所属、修饰助词：的","途中":"途中","じゃなく":"并不是","だ":"判断助动词：是","ね":"句末语气：呢、吧",
  "この":"这个","瞬間":"瞬间","こと":"事情","が":"主语助词","重なって":"重叠、累积","消えてく":"渐渐消失","心":"心、内心","に":"对象、地点助词","刻む":"铭刻","んだ":"说明、强调","Water blue":"水蓝色",
  "悔やみたく":"想要后悔","なかった":"没有、不曾","気持ち":"心情、心意","先":"前方","広がった":"延展开的","世界":"世界","を":"宾语助词","泳いできた":"一路游来","さ":"句末语气：啊、呀",
  "諦めない":"不放弃","言う":"说","だけ":"仅仅、只是","叶わない":"无法实现","動け":"行动吧","動けば":"如果行动","変わる":"改变","知った":"明白了",
  "ずっと":"一直","ここ":"这里","いたい":"想留在","思ってる":"想着","けど":"转折助词：但是","きっと":"一定","旅立ってく":"踏上旅途而去","って":"引用助词","わかってる":"明白","だから":"所以","時":"时刻","楽しくしたい":"想让它快乐",
  "最高":"最棒、最高","ときめき":"悸动","胸":"胸中、心中","焼き付けたい":"想深深烙印","から":"原因助词：因为","My new world":"我的新世界","新しい":"崭新的","場所":"地方","探す":"寻找","きた":"到来了",
  "次":"下一个","輝き":"光芒","海":"大海","渡ろう":"渡过去吧","夢":"梦想","見たい":"想看、想实现","想い":"心愿、情感","いつでも":"无论何时","僕たち":"我们","繋いでくれる":"为我们连结起来","笑って":"笑着","いこう":"前行吧",
  "重ね":"累积","そして":"然后","未来":"未来","向かおう":"前进吧","今日":"今天","も":"也","過ぎてく":"不断流逝","止められない":"无法停止","気":"意识、感觉","付いた":"察觉了","僕ら":"我们","どこ":"哪里","向かう":"前往","の？":"疑问语气：呢？",
  "大丈夫":"没关系","いつだって":"无论何时","思い出せる":"能够想起","駆け抜けてきた":"一路飞奔而来","素晴らしい":"美好的","季節":"季节","好き":"喜欢","みんな":"大家","でも":"但是","分かってる":"明白","たくさん":"许多","頑張ってきた":"一路努力至今","時間":"时光","愛しい":"令人眷恋",
  "繋がり":"羁绊、连结","いつまでも":"永远","大事にしよう":"好好珍惜吧","New world":"新世界","また":"再次","ココロ":"内心","躍るような":"雀跃般的","日々":"每一天","追いかけたい":"想要追逐","ように":"像……一样","過ごす":"度过","じゃなくて":"并不是","痛み":"痛楚","抱えながら":"一边怀抱","求める":"追求","もの":"事物","来た":"到来了","つないでくれる":"为我们连结起来",
};

const wbnw = (markup: string, zh: string, aside = false) => cl(markup, zh, aside, waterBlueNewWorldWordMeanings);

const yumeMiraiWordMeanings: Record<string, string> = {
  "海":"大海","の":"所属、修饰助词：的","鼓動":"律动、心跳","青い":"湛蓝的","風":"风","に":"对象、地点助词","とけてく":"渐渐融入",
  "いろんな":"各种各样的","思い出":"回忆","舞って":"飞舞着","は":"主题助词","飛んでいった":"飘向远方","どれ":"哪一份","も":"也、每一份都","みんな":"全部、所有","大事":"珍贵、重要","だから":"因为、所以",
  "まだまだ":"还要继续","重ねたい":"想要不断累积","願い":"愿望","を":"宾语助词","叶える":"实现","嬉しさ":"喜悦","ココロ":"心、内心","繋がって":"相连","セカイ":"世界","が":"主语助词","広がって":"延展开",
  "見えた":"看见了","遠い":"遥远的","空":"天空","立ちあがる":"重新站起来","勇気":"勇气","あと":"之后","前":"前方","へ":"方向助词：向、往","と":"方向、引用助词","進む":"前进","だ":"判断助动词：是","よ":"句末语气：哦、呀",
  "まず":"首先","笑って":"笑起来","さ":"句末语气：啊、呀","グー":"握紧拳头","して":"做、摆出","エイエイッ":"加油声","やーっ":"冲呀、呐喊声","大丈夫":"没问题","ユメ":"梦想","無限大":"无限大",
  "あきらめない":"不放弃","限り":"只要、在……限度内","続く":"延续","んだ":"说明、强调","やりたい":"想要去做","こと":"事情","今日":"今天","生まれ":"诞生","踊りたく":"想要舞动","なる":"变得、产生感觉",
  "どこまでも":"无论多远","追いかけて":"追逐着","みよう":"试着……吧","この":"这个","先":"前方","ある":"存在、等待着","トキメキ":"悸动、心动","一緒":"一起","ね":"句末语气：呢、吧","抱きしめよう":"紧紧拥入怀中吧","ずっと！":"永远！",
  "波":"海浪","歌う":"歌唱","いつか":"不知何时、曾经","忘れた":"忘记的","メロディー":"旋律","幼い":"年幼的","ころ":"时候","聞いた":"听过","単純な":"简单的","言葉":"话语","不意":"忽然、不经意间","よみがえる":"重新浮现、苏醒",
  "ダイスキ":"最喜欢","最強":"最强的力量","元気な":"充满活力的","声":"声音","で":"表示方式的助词","呼んで":"呼喊","みた":"试着做了","さぁ":"来吧","笑っちゃえ":"尽情笑起来吧","ダッシュ":"起跑、冲刺","から":"起点、从","ワイワイッ":"热闹欢呼声","おーっ":"冲呀、欢呼声",
  "ミライ":"未来","くじけそうな":"快要坚持不下去的","時":"时候","けど":"转折助词：虽然、但是","ひと休み":"稍微休息","作戦":"作战方式、策略","焦らず":"不要着急","やろう":"去做吧、前进吧",
  "いつまでも":"无论何时","語りたい":"想要诉说","未知なる":"未知的","冒険":"冒险","乗りこえよう":"跨越过去吧","に！":"一起、共同！","大きな":"巨大的","希望":"希望","ああ":"啊","描いて":"描绘","進もう":"继续前进吧",
  "行かなくちゃ":"必须出发","どこ":"哪里","へ？":"向哪里？","望む":"向往、期望","場所":"地方","へ！":"向、往！","たくさん":"很多、许多","ぜんぶ":"全部",
};

const ym = (markup: string, zh: string) => cl(markup, zh, false, yumeMiraiWordMeanings);

const yumeLyrics: LyricLine[] = [
  ym("海{うみ}|の|鼓動{こどう}　|青{あお}い|風{かぜ}|に|とけてく", "大海的律动，渐渐融进湛蓝的风里"),
  ym("いろんな|思{おも}い出{で}　|舞{ま}って|は|飛{と}んでいった", "各种各样的回忆，飞舞着，飘向了远方"),
  ym("どれ|も|みんな|大事{だいじ}|だから", "因为每一份回忆，对我们来说都无比珍贵"),
  ym("まだまだ|重{かさ}ねたい　|願{ねが}い|を|叶{かな}える|嬉{うれ}しさ", "所以还想继续不断累积下去，那份实现愿望时的喜悦"),
  ym("ココロ|繋{つな}がって　|セカイ|が|広{ひろ}がって", "心与心彼此相连，世界也随之不断延展"),
  ym("見{み}えた|遠{とお}い|空{そら}", "于是看见了，那片遥远的天空"),
  ym("立{た}ちあがる|勇気{ゆうき}|の|あと|は", "在鼓起勇气重新站起来之后"),
  ym("前{まえ}|へ|と|進{すす}む|勇気{ゆうき}|だ|よ", "接下来需要的，就是继续向前迈进的勇气"),
  ym("まず|笑{わら}って|さ　|グー|して|エイエイッ|やーっ", "先笑起来吧，握紧拳头——加油加油，冲呀！"),
  ym("大丈夫{だいじょうぶ}|だ|よ", "没问题的"),
  ym("ユメ|は|無限大{むげんだい}", "梦想是无限大的"),
  ym("あきらめない|限{かぎ}り|続{つづ}く|んだ", "只要不曾放弃，它就会一直延续下去"),
  ym("やりたい|こと|が|今日{きょう}|も|生{う}まれ", "今天又有好多想要去做的事情不断诞生"),
  ym("踊{おど}りたく|なる|んだ", "让人忍不住想要舞动起来"),
  ym("ユメ|は|無限大{むげんだい}", "梦想是无限大的"),
  ym("どこまでも|追{お}いかけて|みよう|よ", "无论多远，都试着一路追逐下去吧"),
  ym("この|先{さき}|に|ある|トキメキ|を", "前方等待着我们的那份悸动"),
  ym("一緒{いっしょ}|に|ね|抱{だ}きしめよう　|ずっと！", "一起把它紧紧拥入怀中吧，永远！"),
  ym("波{なみ}|は|歌{うた}う　|いつか|忘{わす}れた|メロディー", "海浪轻轻歌唱着，那首不知何时已经忘记的旋律"),
  ym("幼{おさな}い|ころ|聞{き}いた　|単純{たんじゅん}な|言葉{ことば}|が", "小时候曾听过的那些简单的话语"),
  ym("不意{ふい}|に|よみがえる", "忽然之间，又重新浮现在心中"),
  ym("ダイスキ|は|最強{さいきょう}|だ|よ|と", "“最喜欢”就是最强的力量"),
  ym("元気{げんき}な|声{こえ}|で|呼{よ}んで|みた", "于是用充满活力的声音，大声喊了出来"),
  ym("さぁ|笑{わら}っちゃえ　|ダッシュ|から|ワイワイッ|おーっ", "来吧，尽情笑起来，从起跑开始——热热闹闹地冲呀！"),
  ym("大丈夫{だいじょうぶ}|だ|ね", "一定没问题的"),
  ym("ミライ|無限大{むげんだい}", "未来是无限大的"),
  ym("くじけそうな|時{とき}|も|ある|けど", "虽然也会有快要坚持不下去的时候"),
  ym("ひと休{やす}み|も|作戦{さくせん}|だから", "但稍微休息一下，本来也是一种作战方式"),
  ym("焦{あせ}らず|に|やろう|よ", "所以别着急，按照自己的步调前进吧"),
  ym("ミライ|無限大{むげんだい}", "未来是无限大的"),
  ym("いつまでも|ユメ|を|語{かた}りたい|んだ", "无论到了什么时候，都还想继续诉说我们的梦想"),
  ym("この|先{さき}|は|未知{みち}なる|冒険{ぼうけん}", "前方等待着我们的，是未知的冒险"),
  ym("一緒{いっしょ}|に|ね|乗{の}りこえよう　|一緒{いっしょ}|に！", "一起跨越过去吧，一起！"),
  ym("大{おお}きな|希望{きぼう}　|ああ|描{えが}いて|進{すす}もう", "描绘出那份巨大的希望，然后继续向前吧"),
  ym("行{い}かなくちゃ　|行{い}かなくちゃ", "必须出发了，必须出发了"),
  ym("どこ|へ？　|望{のぞ}む|場所{ばしょ}|へ！", "要去哪里？去往我们所向往的地方！"),
  ym("ユメ|は|無限大{むげんだい}", "梦想是无限大的"),
  ym("あきらめない|限{かぎ}り|続{つづ}く|んだ", "只要不曾放弃，它就会一直延续下去"),
  ym("やりたい|こと|が|今日{きょう}|も|たくさん", "今天又有好多好多想要去做的事情"),
  ym("ぜんぶ|やろう|よ", "那就全部去实现吧！"),
  ym("ユメ|は|無限大{むげんだい}", "梦想是无限大的"),
  ym("どこまでも|追{お}いかけて|みよう|よ", "无论多远，都试着一路追逐下去吧"),
  ym("この|先{さき}|に|ある|トキメキ|を", "前方等待着我们的那份悸动"),
  ym("一緒{いっしょ}|に|ね|抱{だ}きしめよう　|ずっと！", "一起把它紧紧拥入怀中吧，永远！"),
];

const happyPartyTrainLyrics: LyricLine[] = [
  { words: [yw("hi-ra-i-ta", "盛开了的", s("開", "ひら"), s("いた")), yw("ha-na", "花朵", s("花", "はな")), yw("no", "的", s("の")), yw("ka-o-ri", "香气", s("香", "かお"), s("り")), yw("ka-ra", "从、源自", s("から"))], zh: "源自盛放的花朵的芬芳" },
  { words: [yw("u-ke-to-t-ta", "接收、接受了", s("受", "う"), s("けとった")), yw("yo", "语气词", s("よ")), yw("tsu-gi", "下一个", s("次", "つぎ")), yw("no", "的", s("の")), yw("yu-me", "梦想", s("夢", "ゆめ")), yw("o", "宾语助词", s("を"))], zh: "就此接受了下一个梦想" },
  { words: [yw("sa-a", "那么、来吧", s("さあ")), yw("do-ko-e", "去往哪里", s("どこへ")), yw("i-ko-u", "走吧、前往吧", s("行", "い"), s("こう")), yw("ka-na", "是否、会不会呢", s("かな"))], zh: "那么现在该是去往何方" },
  { words: [yw("ha-ne-ru", "跳跃、雀跃", s("跳", "は"), s("ねる")), yw("yo-u-ni", "如同……一般", s("ように")), yw("i-ko-u", "走吧、前往吧", s("行", "い"), s("こう")), yw("ka-na", "是否、会不会呢", s("かな"))], zh: "是否用充满活力的步伐" },
  { words: [yw("ha-ji-ma-ri", "开始、启程", s("はじまり")), yw("to", "和、与", s("と"))], zh: "踏上舞台" },
  { words: [yw("sa-yo-na-ra", "离别、再见", s("さよなら")), yw("o", "宾语助词", s("を"))], zh: "鞠躬谢幕" },
  { words: [yw("ku-ri-ka-e-shi-te", "反复、循环", s("くりかえして"))], zh: "循环往复" },
  { words: [yw("a-i-ta-i", "想要遇见", s("会", "あ"), s("いたい")), yw("no", "形式名词", s("の")), yw("wa", "主题助词", s("は")), yw("a-ta-ra-shi-i", "崭新的", s("新", "あたら"), s("しい")), yw("to-ki-me-ki", "心动、悸动", s("ときめき"))], zh: "如心所愿，辗转遇见新的悸动" },
  { words: [yw("u-ma-re-ta-te", "刚刚诞生", s("生", "う"), s("まれたて")), yw("ne-ga-i", "愿望", s("願", "ねが"), s("い")), yw("no", "的", s("の")), yw("a-tsu-sa", "热度、热忱", s("熱", "あつ"), s("さ"))], zh: "由此诞生，祈愿之中涌现热忱" },
  { words: [yw("da-ki-shi-me-te", "紧紧怀抱", s("抱", "だ"), s("きしめて")), yw("i-ki-ta-i", "想要前行", s("行", "い"), s("きたい")), yw("ne", "呢、吧", s("ね"))], zh: "想要满怀那份心意前行" },
  { words: [yw("ka-ru-ya-ka-ni", "轻快地", s("軽", "かる"), s("やかに")), yw("i-ki-ta-i", "想要前行", s("行", "い"), s("きたい")), yw("ne", "呢、吧", s("ね"))], zh: "想要以轻松的心情前行" },
  { words: [yw("o-mo-i-de", "回忆", s("思", "おも"), s("い"), s("出", "で")), yw("wa", "主题助词", s("は")), yw("po-ke-t-to", "口袋", s("ポケット")), yw("no", "的", s("の")), yw("na-ka", "里面", s("なか"))], zh: "将美好的回忆藏于口袋" },
  { words: [yw("su-te-ki-na", "美妙的", s("ステキな")), yw("ta-bi", "旅程", s("旅", "たび")), yw("ni", "向、去", s("に")), yw("de-yo-u", "出发吧", s("出", "で"), s("よう"))], zh: "去踏上美妙的旅程吧" },
  { words: [yw("ji-n-se-i", "人生", s("人生", "じんせい")), yw("t-te", "所谓、说到", s("って")), yw("sa", "语气词", s("さ"))], zh: "所谓人生" },
  { words: [yw("ta-ku-sa-n", "许多", s("たくさん")), yw("no", "的", s("の")), yw("ba-sho", "地方、站点", s("場所", "ばしょ")), yw("e", "向、往", s("へ")), yw("tsu-zu-i-te-ru", "延续、通往", s("続", "つづ"), s("いてる")), yw("ka", "……吗？", s("?"))], zh: "即是向着众多的站点不断换乘" },
  { words: [yw("wa-ku-wa-ku", "兴奋、期待", s("ワクワク")), yw("da-ra-ke", "尽是、满是", s("だらけ")), yw("sa", "语气词", s("さ"))], zh: "心中满溢着兴奋" },
  { words: [yw("o-mo-i", "心意、思念", s("想", "おも"), s("い")), yw("o", "宾语助词", s("を")), yw("no-se-te", "承载、乘上", s("乗", "の"), s("せて"))], zh: "乘坐着希望" },
  { words: [yw("Happy happy train to go", "快乐列车，出发吧", s("Happy happy train to go"))], zh: "Happy happy train to go", aside: true },
  { words: [yw("a-shi-ta", "明天、未来", s("あした")), yw("ga", "主语助词", s("が")), yw("yon-de-ru", "正在呼唤", s("呼", "よ"), s("んでる")), yw("bo-ku-ta-chi", "我们", s("僕", "ぼく"), s("たち")), yw("o", "宾语助词", s("を"))], zh: "未来在呼唤着我们" },
  { words: [yw("ki-ta-i", "期待", s("期待", "きたい")), yw("de", "因、以", s("で")), yw("ka-ga-ya-ku", "闪耀", s("かがやく")), yw("hi-to-mi", "眼眸", s("瞳", "ひとみ")), yw("na-ra", "如果……的话", s("なら")), yw("mi-e-ru", "能够看见", s("見", "み"), s("える")), yw("yo", "语气词", s("よ"))], zh: "倘若眼中闪耀着期待的光辉便能看到" },
  { words: [yw("to-o-i", "遥远的", s("とおい")), yw("e-ki", "车站", s("駅", "えき")), yw("de", "在、于", s("で"))], zh: "远方的站台" },
  { words: [yw("ki-t-to", "一定", s("きっと")), yw("na-ni-ka", "某种事物", s("なにか")), yw("ga", "主语助词", s("が")), yw("ma-t-te-ru", "正在等待", s("待", "ま"), s("ってる")), yw("ne", "呢、吧", s("ね"))], zh: "一定有某种际遇在等待着" },
  { words: [yw("shi-ri-ta-i", "想要知道", s("知", "し"), s("りたい")), yw("no", "形式名词", s("の")), yw("wa", "主题助词", s("は")), yw("su-ba-ra-shi-i", "美好的、绝妙的", s("素晴", "すば"), s("らしい")), yw("yo-a-ke", "黎明", s("夜明", "よあ"), s("け")), yw("to", "和、与", s("と"))], zh: "想要知晓美不胜收的黎明" },
  { words: [yw("se-tsu-na-sa", "悲伤、苦闷", s("切", "せつ"), s("なさ")), yw("o", "宾语助词", s("を")), yw("ya-do-su", "寄宿、蕴藏", s("宿", "やど"), s("す")), yw("yu-u-ya-ke", "晚霞", s("夕焼", "ゆうや"), s("け"))], zh: "与藏匿悲伤的晚霞" },
  { words: [yw("da-ka-ra", "所以", s("だから")), yw("mo-u", "已经、该", s("もう")), yw("i-ka-na-ku-cha", "必须前进", s("行", "い"), s("かなくちゃ"))], zh: "所以不能在此停滞不前" },
  { words: [yw("hi-to-ri", "独自一人", s("ひとり")), yw("de-mo", "即使、也", s("でも")), yw("i-ka-na-ku-cha", "必须前进", s("行", "い"), s("かなくちゃ"))], zh: "纵使孤身一人也要进发" },
  { words: [yw("o-mo-i-de", "回忆", s("思", "おも"), s("い"), s("出", "で")), yw("o", "宾语助词", s("を")), yw("ku-chi-zu-sa-n-de", "轻声哼唱", s("くちずさんで"))], zh: "随口哼唱着记忆中的歌谣" },
  { words: [yw("ki-ni", "在意、介意", s("気", "き"), s("に")), yw("shi-na-i", "不做、不去", s("しない"))], zh: "毫不在意" },
  { words: [yw("chi-i-sa-na", "微小的", s("ちいさな")), yw("ko-to", "事情", s("こと")), yw("wa", "主题助词", s("は"))], zh: "锱铢之事" },
  { words: [yw("i-tsu-de-mo", "无论何时", s("いつでも")), yw("e-ga-o", "笑容", s("笑顔", "えがお")), yw("de", "以、保持", s("で")), yw("i-ta-i", "想要保持", s("いたい")), yw("ka-ra", "因为", s("から"))], zh: "无论何时都想以笑容面对" },
  { words: [yw("o-wa-ra-na-i", "不会结束的", s("終", "お"), s("わらない")), yw("ta-bi", "旅程", s("旅", "たび")), yw("o", "宾语助词", s("を")), yw("shi-yo-u", "来进行吧", s("しよう"))], zh: "来一场没有终点站的旅行吧" },
  { words: [yw("ji-n-se-i", "人生", s("人生", "じんせい")), yw("t-te-ba", "说到……啊", s("ってば"))], zh: "所谓人生" },
  { words: [yw("ta-me-i-ki", "叹息", s("ためいき")), yw("mo", "也", s("も")), yw("ta-ma-ni", "偶尔", s("たまに")), yw("de-cha-u", "不由得出现", s("出", "で"), s("ちゃう")), yw("yo", "语气词", s("よ"))], zh: "偶尔也需要些唉声叹气" },
  { words: [yw("ha-ra-ha-ra", "忐忑不安", s("ハラハラ")), yw("shi-ho-u-da-i", "尽情、毫无节制", s("し"), s("放題", "ほうだい"))], zh: "心中放纵着烦闷" },
  { words: [yw("ma-yo-wa-zu", "毫不迷惘", s("迷", "まよ"), s("わず")), yw("no-t-ta-ra", "如果乘上", s("乗", "の"), s("ったら"))], zh: "倘若内心摒弃迷惘乘坐上" },
  { words: [yw("Party party train to go", "派对列车，出发吧", s("Party party train to go"))], zh: "Party party train to go", aside: true },
  { words: [yw("i-ga-i-na", "意想不到的", s("意外", "いがい"), s("な")), yw("hi-to", "人", s("ひと")), yw("ga", "主语助词", s("が")), yw("so-ba", "身旁", s("側", "そば")), yw("ni", "在、于", s("に")), yw("i-ta", "曾在、存在", s("いた")), yw("ka", "……吗？", s("?"))], zh: "意想不到的人就会在身旁？" },
  { words: [yw("re-e-ru", "铁轨", s("レール")), yw("wa", "主题助词", s("は")), yw("do-ko-ma-de", "通往何处", s("どこまで")), yw("tsu-na-ga-ru", "连接、延伸", s("つながる")), yw("ka", "是否", s("か"))], zh: "轨道前方通向何处" },
  { words: [yw("ma-da-ma-da", "仍然、还远远", s("まだまだ")), yw("wa-ka-ra-na-i", "不知道、不了解", s("わからない")), yw("ne", "呢、吧", s("ね"))], zh: "还远远没有了解" },
  { words: [yw("zu-t-to", "一直、永远", s("ずっと")), yw("ha-shi-t-te", "行驶、奔跑", s("走", "はし"), s("って")), yw("i-ta-i", "想要继续", s("いたい"))], zh: "想让它一直行驶下去" },
  { words: [yw("Party train", "派对列车", s("Party train"))], zh: "Party train", aside: true },
  { words: [yw("o-mo-i", "心意、思念", s("想", "おも"), s("い")), yw("o", "宾语助词", s("を")), yw("no-se-te", "承载、乘上", s("乗", "の"), s("せて"))], zh: "乘坐着希望" },
  { words: [yw("Happy happy train to go", "快乐列车，出发吧", s("Happy happy train to go"))], zh: "Happy happy train to go", aside: true },
  { words: [yw("a-shi-ta", "明天、未来", s("あした")), yw("ga", "主语助词", s("が")), yw("yon-de-ru", "正在呼唤", s("呼", "よ"), s("んでる")), yw("bo-ku-ta-chi", "我们", s("僕", "ぼく"), s("たち")), yw("o", "宾语助词", s("を"))], zh: "未来在呼唤着我们" },
  { words: [yw("ma-yo-wa-zu", "毫不迷惘", s("迷", "まよ"), s("わず")), yw("no-t-ta-ra", "如果乘上", s("乗", "の"), s("ったら"))], zh: "倘若内心摒弃迷惘乘坐上" },
  { words: [yw("Party party train to go", "派对列车，出发吧", s("Party party train to go"))], zh: "Party party train to go", aside: true },
  { words: [yw("i-ga-i-na", "意想不到的", s("意外", "いがい"), s("な")), yw("hi-to", "人", s("ひと")), yw("ga", "主语助词", s("が")), yw("so-ba", "身旁", s("側", "そば")), yw("ni", "在、于", s("に")), yw("i-ta", "曾在、存在", s("いた")), yw("ka", "……吗？", s("?"))], zh: "意想不到的人就会在身旁？" },
  { words: [yw("ki-ta-i", "期待", s("期待", "きたい")), yw("ni", "因、由", s("に")), yw("ka-ga-ya-ku", "闪耀", s("かがやく")), yw("hi-to-mi", "眼眸", s("瞳", "ひとみ")), yw("na-ra", "如果……的话", s("なら")), yw("mi-e-ru", "能够看见", s("見", "み"), s("える")), yw("yo", "语气词", s("よ"))], zh: "倘若眼中闪耀着期待的光辉便能看到" },
  { words: [yw("to-o-i", "遥远的", s("とおい")), yw("e-ki", "车站", s("駅", "えき")), yw("de", "在、于", s("で"))], zh: "远方的站台" },
  { words: [yw("ki-t-to", "一定", s("きっと")), yw("na-ni-ka", "某种事物", s("なにか")), yw("ga", "主语助词", s("が")), yw("ma-t-te-ru", "正在等待", s("待", "ま"), s("ってる")), yw("no", "说明、强调", s("の"))], zh: "一定有某种际遇在等待着" },
  { words: [yw("Ah", "啊", s("Ah")), yw("do-ko-ma-de-mo", "无论到哪里", s("どこまでも")), yw("ne", "呢、吧", s("ね"))], zh: "Ah，无论去往何方" },
  { words: [yw("Happy train", "快乐列车", s("Happy train"))], zh: "Happy train", aside: true },
];

const rainbowMeetingLine: LyricLine = {
  words: [yw("a-i-ta-ka-t-ta", "一直想见你", s("会", "あ"), s("いたかった")), yw("to-o-i", "遥远的", s(" "), s("遠", "とお"), s("い")), yw("ba-sho", "地方", s("場所", "ばしょ")), yw("ni", "在、于", s("に")), yw("i-te-mo", "即使身处", s("いても"))],
  zh: "我想见你 就算身处遥远的地方",
};
const rainbowMeetAgainLine: LyricLine = {
  words: [yw("i-tsu-ka", "总有一天", s("いつか")), yw("ma-ta-ne", "再次、再会", s("またね")), yw("a-e-ru", "能够相见", s("会", "あ"), s("える")), yw("yo-ne", "会的吧", s("よね"))],
  zh: "我们也终将相会的吧",
};
const rainbowMeetSurelyLine: LyricLine = {
  words: [yw("i-tsu-ka", "总有一天", s("いつか")), yw("ki-t-to", "一定", s("きっと")), yw("a-e-ru", "能够相见", s("会", "あ"), s("える")), yw("yo-ne", "会的吧", s("よね"))],
  zh: "终有一天定能再会",
};
const overRainbowLine: LyricLine = { words: [yw("Over the rainbow", "越过彩虹", s("Over the rainbow"))], zh: "Over the rainbow", aside: true };
const rainbowLightLine: LyricLine = {
  words: [yw("hi-ka-ri", "光芒", s("ヒカリ")), yw("o", "宾语助词", s("を")), yw("a-bi-na-ga-ra", "一边沐浴着", s("浴", "あ"), s("びながら")), yw("u-ta-o-u", "歌唱吧", s("歌", "うた"), s("おう")), yw("yo", "语气词", s("よ"))],
  zh: "沐浴着阳光一同歌唱吧",
};
const rainbowHeartLine: LyricLine = {
  words: [yw("tsu-na-ga-ru", "相连", s("つながる")), yw("yo", "语气词", s("よ")), yw("ko-ko-ro", "心、心意", s("ココロ")), yw("ga", "主语助词", s("が"))],
  zh: "我们的心会紧紧相连",
};
const rainbowPromiseLine: LyricLine = {
  words: [yw("ki-e-te-yu-ku", "渐渐消失", s("消", "き"), s("えてゆく")), yw("ni-ji", "彩虹", s("虹", "にじ")), yw("ni", "向、对", s("に")), yw("ya-ku-so-ku", "约定", s("約束", "やくそく")), yw("shi-yo-u", "许下吧", s("しよう"))],
  zh: "向逐渐消失的彩虹许下约定",
};
const rainbowRememberLine: LyricLine = {
  words: [yw("wa-su-re-na-i", "不会忘记", s("忘", "わす"), s("れない")), yw("yo", "语气词", s("よ")), yw("i-tsu-ma-de-mo", "直到永远", s("いつまでも"))],
  zh: "直到永远 也不会遗忘",
};
const flyRainbowLine: LyricLine = { words: [yw("Fly to the rainbow", "飞向彩虹", s("Fly to the rainbow"))], zh: "Fly to the rainbow", aside: true };
const rainbowDanceLine: LyricLine = {
  words: [yw("ne-ga-i", "心愿", s("ネガイ")), yw("de", "怀着、凭借", s("で")), yw("to-bu", "飞翔", s("飛", "と"), s("ぶ")), yw("yo-u-ni", "如同……一般", s("ように")), yw("o-do-ro-u", "起舞吧", s("踊", "おど"), s("ろう")), yw("yo", "语气词", s("よ"))],
  zh: "怀着美好心愿飞翔般起舞吧",
};
const rainbowHeartTogetherLine: LyricLine = {
  words: [yw("tsu-na-ga-ru", "相连", s("つながる")), yw("ne", "呢、吧", s("ね")), yw("ko-ko-ro", "心、心意", s("ココロ")), yw("ga", "主语助词", s("が"))],
  zh: "我们的心紧紧相连",
};

const overNextRainbowLyrics: LyricLine[] = [
  rainbowMeetingLine,
  rainbowMeetAgainLine,
  { words: [yw("yu-me", "梦想", s("夢", "ゆめ")), yw("ni-mo", "也、即使是", s("にも")), yw("i-ro-i-ro", "各种各样", s("色々", "いろいろ")), yw("a-ru", "存在、拥有", s("ある")), yw("ka-ra", "因为", s("から"))], zh: "梦想多姿多彩" },
  { words: [yw("ka-na-e-ka-ta", "实现方式", s("叶", "かな"), s("えかた")), yw("mo", "也", s("も")), yw("so-re-zo-re", "各自、各不相同", s("それぞれ")), yw("da-to", "是、认为是", s("だと"))], zh: "实现方式也多种多样" },
  { words: [yw("Ah", "啊", s("Ah ")), yw("i-ma", "如今", s("今", "いま")), yw("wa-ka-t-te", "明白、理解", s("わかって")), yw("ki-ta", "逐渐变得", s("きた")), yw("n-da", "说明、强调", s("んだ"))], zh: "Ah 如今我终于明白" },
  { words: [yw("de-mo", "但是", s("でも")), yw("ki-t-to", "一定", s("きっと")), yw("mi-to-me-a-e-ta-ra", "如果能彼此认可", s("認", "みと"), s("めあえたら"))], zh: "但是 能相互获得认可" },
  { words: [yw("su-te-ki-na", "美妙的", s("素敵", "すてき"), s("な")), yw("ki-zu-na", "羁绊", s("キズナ")), yw("ga", "主语助词", s("が")), yw("u-ma-re-ru", "诞生", s("生", "う"), s("まれる")), yw("yo", "语气词", s("よ"))], zh: "一定才会诞生美妙的羁绊" },
  { words: [yw("ka-ke-ga-e-no-na-i", "无可替代的", s("かけがえのない")), yw("ki-zu-na", "羁绊", s("キズナ"))], zh: "独一无二的羁绊" },
  { words: [yw("o-i-ka-ke-te", "追逐着", s("追", "お"), s("いかけて")), yw("su-re-chi-ga-u", "擦肩而过", s(" "), s("すれ"), s("違", "ちが"), s("う")), yw("zu-t-to", "一直", s("ずっと"))], zh: "我们总是追逐着 又擦肩而过" },
  { words: [yw("su-re-chi-ga-i", "错过、擦肩", s("すれ"), s("違", "ちが"), s("い")), yw("o-i-ka-ke-te", "追逐着", s(" "), s("追", "お"), s("いかけて")), yw("zu-t-to", "一直", s("ずっと"))], zh: "错过后 又不断追逐着" },
  { words: [yw("o-ta-ga-i", "彼此、双方", s("お"), s("互", "たが"), s("い")), yw("no", "的", s("の")), yw("mi-chi", "道路、人生道路", s("道", "みち")), yw("ga", "主语助词", s("が")), yw("ma-ji-wa-t-ta", "交汇了", s("交", "まじ"), s("わった"))], zh: "我们的人生有了交集" },
  { words: [yw("yo-ro-ko-bi", "喜悦", s("喜", "よろこ"), s("び")), yw("o", "宾语助词", s("を")), yw("da-i-ji", "珍惜、重视", s("ダイジ")), yw("ni", "使之成为", s("に")), yw("shi-te-yu-ku", "继续去做", s("してゆく")), yw("yo", "语气词", s("よ"))], zh: "让我们珍惜这份喜悦吧" },
  { words: [yw("ko-re-k-ki-ri", "仅此一次、到此为止", s("これっきり")), yw("ja-na-i", "不是", s("じゃない")), yw("yo-ne", "对吧", s("よね?"))], zh: "还没有到此为止吧" },
  { words: [yw("mo-t-to", "更多", s("もっと")), yw("mo-t-to", "更多", s("もっと")), yw("ka-ta-ri-ta-i", "想要畅谈", s("語", "かた"), s("りたい"))], zh: "还想与你说更多更多的话" },
  overRainbowLine,
  rainbowLightLine,
  rainbowHeartLine,
  rainbowPromiseLine,
  rainbowRememberLine,
  { words: [yw("wa-su-re-na-i-de", "请不要忘记", s("忘", "わす"), s("れないで")), yw("i-tsu-ma-de-mo", "直到永远", s("いつまでも"))], zh: "直到永远 也不要遗忘" },
  { words: [yw("yu-me-mi-te-ru", "怀抱梦想、做梦", s("夢", "ゆめ"), s("見", "み"), s("てる")), yw("da-ke-de-wa", "仅仅只是", s("だけでは")), yw("ha-ji-ma-ra-na-i", "无法开始", s("始", "はじ"), s("まらない"))], zh: "只顾做梦就无法启程" },
  { words: [yw("do-ryo-ku", "努力", s("努力", "どりょく")), yw("shi-te", "去做", s("して")), yw("ma-da-ma-da", "还远远不够", s("まだまだ")), yw("ta-ri-na-ku-te", "不足、不够", s("足", "た"), s("りなくて"))], zh: "只有努力还远远不够" },
  { words: [yw("mi-a-ge-ru", "抬头仰望", s("見上", "みあ"), s("げる")), yw("so-ra", "天空", s("空", "そら")), yw("ni-ji", "彩虹", s(" "), s("虹", "にじ")), yw("no", "的", s("の")), yw("ha-te", "尽头", s("果", "は"), s("て"))], zh: "抬头望着天空 彩虹的尽头" },
  { words: [yw("mi-ra-i", "未来", s("未来", "みらい")), yw("no", "的", s("の")), yw("ji-bu-n", "自己", s("自分", "じぶん")), yw("ga", "主语助词", s("が")), yw("i-ru", "存在", s("いる")), yw("ga-n-ba-re-ru", "能够努力、坚持", s("頑張", "がんば"), s("れる"))], zh: "那里有未来的自己 我会加油" },
  { words: [yw("ki-me-ta", "决定了", s("決", "き"), s("めた")), yw("ko-to", "事情", s("こと")), yw("sa", "语气词", s("さ"))], zh: "这是决定好的" },
  { words: [yw("ki-me-ta", "决定了", s("決", "き"), s("めた")), yw("ko-to", "事情", s("こと")), yw("wa", "主题助词", s("は")), yw("tsu-ra-nu-i-te", "贯彻、坚持", s("貫", "つらぬ"), s("いて")), yw("mi-se-ru", "一定做到给你看", s("みせる")), yw("yo", "语气词", s("よ")), yw("sa-i-go", "最后", s("最後", "さいご")), yw("ma-de", "直到", s("まで"))], zh: "决定好的事就要贯彻到底" },
  { words: [yw("na-t-to-ku", "认同、满意", s("納得", "なっとく")), yw("de-ki-ru", "能够做到", s("できる")), yw("ma-de", "直到", s("まで")), yw("ya-ra-na-ku-cha", "必须去做", s("やらなくちゃ"))], zh: "如果不能竭尽全力" },
  { words: [yw("ji-bu-n", "自己", s("自分", "じぶん")), yw("ga", "主语助词", s("が")), yw("ji-bu-n", "自己", s("自分", "じぶん")), yw("o", "宾语助词", s("を")), yw("yu-ru-se-na-i", "无法原谅", s("許", "ゆる"), s("せない")), yw("ka-ra", "因为", s("から"))], zh: "自己也无法原谅自己" },
  { words: [yw("ha-na-re-ta-ra", "如果远离", s("離", "はな"), s("れたら")), yw("chi-ka-zu-i-te", "靠近", s(" "), s("近", "ちか"), s("づいて")), yw("so-shi-te", "然后", s("そして"))], zh: "如果太过远离 就靠近一些" },
  { words: [yw("chi-ka-zu-i-te", "靠近", s("近", "ちか"), s("づいて")), yw("ha-na-re-te-ku", "渐渐远离", s(" "), s("離", "はな"), s("れてく")), yw("so-shi-te", "然后", s("そして"))], zh: "靠近一些然后 再远离一点" },
  { words: [yw("da-n-da-n", "渐渐地", s("だんだん")), yw("ki-mo-chi", "心情、心意", s("気持", "きも"), s("ち")), yw("ga", "主语助词", s("が")), yw("tsu-u-ji-ru", "相通、理解", s("通", "つう"), s("じる")), yw("to", "如果、当……时", s("と"))], zh: "逐渐地就能心意相通了" },
  { words: [yw("chi-ka-ra", "力量", s("チカラ")), yw("ni", "成为", s("に")), yw("na-ri-ta-i", "想要成为", s("なりたい")), yw("to", "引用助词", s("と")), yw("ka-n-ga-e-te", "想着、考虑", s("考", "かんが"), s("えて"))], zh: "我想成为你的力量" },
  { words: [yw("ko-no", "这个", s("この")), yw("to-ki", "时刻", s("とき")), yw("ma-t-te-ta", "一直等待着", s("待", "ま"), s("ってた")), yw("n-da", "说明、强调", s("んだ")), yw("yo", "语气词", s("よ"))], zh: "一直在等待这这个时刻呢" },
  { words: [yw("a-e-te", "能够相见", s("会", "あ"), s("えて")), yw("a-e-te", "能够相见", s("会", "あ"), s("えて")), yw("u-re-shi-i", "开心、高兴", s("嬉", "うれ"), s("しい")), yw("yo", "语气词", s("よ"))], zh: "能够与你相见真开心" },
  flyRainbowLine,
  rainbowDanceLine,
  rainbowHeartTogetherLine,
  rainbowMeetingLine,
  rainbowMeetAgainLine,
  rainbowMeetSurelyLine,
  { words: [yw("na-n-te", "为什么、竟然", s("なんて")), yw("a-t-to", "一眨眼、转瞬", s("あっと"))], zh: "为什么时光总是" },
  { words: [yw("i-u", "所说的", s("いう")), yw("a-i-da", "一瞬间", s("間", "あいだ")), yw("ni", "在……之中", s("に")), yw("su-gi-te-yu-ku", "渐渐流逝", s("過", "す"), s("ぎてゆく")), yw("no", "形式名词", s("の")), yw("da-ro-u", "大概、会吧", s("だろう"))], zh: "一眨眼就溜走了呢" },
  { words: [yw("ta-chi-do-ma-ru", "停下脚步", s("立", "た"), s("ち"), s("止", "ど"), s("まる")), yw("ko-to", "事情", s("こと")), yw("mo", "也", s("も")), yw("de-ki-na-i", "无法做到", s("できない")), yw("ki-se-tsu", "季节", s("季節", "きせつ")), yw("wa", "主题助词", s("は"))], zh: "连一步也未曾停下" },
  { words: [yw("kyo-u", "今天", s("今日", "きょう")), yw("mo", "也", s("も")), yw("sa-t-te", "离去、流逝", s("去", "さ"), s("って")), yw("kyo-u", "今天", s("今日", "きょう")), yw("ga", "主语助词", s("が")), yw("sa-t-te", "离去、流逝", s("去", "さ"), s("って"))], zh: "一个个今天匆匆流逝" },
  { words: [yw("ma-e", "前方", s("前", "まえ")), yw("o", "宾语助词", s("を")), yw("mu-ku", "面向", s("向", "む"), s("く")), yw("shi-ka-na-i", "别无选择、只能", s("しかない"))], zh: "我们只能不断前行" },
  { words: [yw("ke-s-shi-te", "绝对、决不", s("決", "けっ"), s("して")), yw("mo-do-re-na-i", "无法回去", s("戻", "もど"), s("れない")), yw("ne", "呢、吧", s("ね"))], zh: "绝不能回头" },
  overRainbowLine,
  rainbowLightLine,
  rainbowHeartLine,
  rainbowPromiseLine,
  rainbowRememberLine,
  flyRainbowLine,
  rainbowDanceLine,
  rainbowHeartTogetherLine,
  rainbowMeetingLine,
  rainbowMeetAgainLine,
  rainbowMeetSurelyLine,
];

const aozoraStartStoryLine: LyricLine = { words: [yw("ha-ji-me-ta-i", "想要开始", s("はじめたい")), yw("my story", "我的故事", s("my story"))], zh: "想翻开故事的新章" };
const aozoraBlueSkyLine: LyricLine = { words: [yw("a-o-i", "湛蓝的", s("青", "あお"), s("い")), yw("so-ra-ga", "天空", s("空", "そら"), s("が")), yw("ma-t-te-ru", "正在等待", s("待", "ま"), s("ってる"))], zh: "那片蓝天在等着我们" };
const aozoraJumpingHeartLine: LyricLine = { words: [yw("yu-me-o", "梦想", s("夢", "ゆめ"), s("を")), yw("da-ki-shi-me-te", "拥抱", s("抱", "だ"), s("きしめて")), yw("jumping heart", "跳跃的心", s("jumping heart"))], zh: "拥抱梦想 跳跃的心" };
const aozoraTomorrowLine: LyricLine = { words: [yw("so-re-da-ke-de", "只要如此", s("それだけで")), yw("a-shi-ta-e-to", "向着明天", s("明日", "あした"), s("へと")), yw("su-su-me-ru", "能够前进", s("進", "すす"), s("める"))], zh: "只要有这两样 我们就能迈向明天" };
const aozoraYouthLine: LyricLine = { words: [yw("se-i-shu-n", "青春", s("青春", "せいしゅん")), yw("ma-s-shi-gu-ra", "勇往直前", s("まっしぐら"))], zh: "青春勇往直前" };
const aozoraTokimekiLine: LyricLine = { words: [yw("to-ki-me-ki", "初心的悸动", s("ときめき")), yw("zu-t-to", "永远", s("ずっと")), yw("da-i-ji-ni-ne", "要珍藏哦", s("だいじにね"))], zh: "那初心的悸动永远都要珍藏" };
const aozoraCatchDreamLine: LyricLine = { words: [yw("yu-me-o", "梦想", s("夢", "ゆめ"), s("を")), yw("tsu-ka-ma-e-ni", "为了抓住", s("つかまえに")), yw("i-ku-yo", "一起去吧", s("行", "い"), s("くよ"))], zh: "一起去抓住梦想吧" };
const aozoraTogetherLine: LyricLine = { words: [yw("mi-n-na-to", "和大家", s("みんなと")), yw("na-ra", "只要……的话", s("なら"))], zh: "只要这一路有你们同行" };
const aozoraExplainLine: LyricLine = { words: [yw("se-tsu-me-i-wa", "解释", s("説明", "せつめい"), s("は")), yw("de-ki-na-i-ke-do", "虽然做不到", s("できないけど"))], zh: "虽然不知该怎么解释" };

const aozoraJumpingHeartWordMeanings: Record<string, string> = {
  "見た":"见过的","こと":"事情、经历","ない":"没有、未曾","夢":"梦想","の":"所属、修饰助词：的","軌道":"轨迹","追いかけて":"追逐着","Shining Road":"闪耀之路",
  "走りだす":"开始奔跑","この":"这份、这个","気持ち":"心情","まっすぐ":"笔直地","に":"对象、状态助词","勢い":"冲劲、气势","よく":"充分地、强劲地","君":"你","を":"宾语助词","探してた":"一直寻找着","よ":"句末语气：哦、呀",
  "ちょっと":"稍微、一下","待って":"等待","なんて":"……什么的","ムリ":"做不到、不可能","飛びだそう":"冲出去吧","僕たち":"我们","なか":"心中、里面","勇気":"勇气","が":"主语助词","さわいでる":"躁动着",
  "いつも":"平时、熟悉的","セカイ":"世界","あたらしい":"崭新的","扉":"门扉","（もっと）":"（更多地）","隠してる":"隐藏着","（Let's go!）":"（出发吧！）","ぜんぶ":"全部","開けたい":"想要打开","ほら":"来吧、你看","いっしょ":"一起","ね！":"句末语气：一起吧！",
  "はじめたい！":"想要开始！","My Story":"我的故事","（さあっいまだ）":"（来吧，就是现在）","青い":"蔚蓝的","空":"天空","待ってる":"正在等待","抱きしめて":"紧紧抱住","Jumping Heart":"跃动之心",
  "それ":"那样、那件事","だけ":"仅仅、只要","で":"表示条件、方式的助词","明日":"明天","へ":"方向助词：向、往","と":"方向、引用助词","進める":"能够前进","青春":"青春","まっしぐら！？":"一路向前冲！？",
  "はじまった":"开始了","時":"时刻","（Sunshine Story）":"（阳光故事）","ときめき":"心动、悸动","ずっと":"永远、一直","だいじ":"重要、珍贵","ね":"句末语气：呢、吧","つかまえ":"抓住","行く":"去、前往",
  "どんな":"怎样的","おこる":"发生","か":"疑问助词","わからない":"不知道","も":"也","楽しみ":"期待、乐趣","さ":"句末语气：啊、呀","Open Mind":"敞开心扉","伝えなきゃ":"若不传达","伝わらない":"便无法传达到",
  "最初":"最初、一开始","から":"从、因为","カンペキ":"完美","できる":"能够做到","筈":"理应、可能","は":"主题助词","とりあえず":"总之、姑且","元気":"精神、活力","スタートライン":"起跑线","ゴール":"终点","遠い":"遥远的","かな":"疑问语气：会不会呢",
  "まぶしい":"耀眼的","呼ぶ":"呼唤","声":"声音","聞こえた":"听见了","聞いてみたくて":"想再听一听","光":"光芒","向こう":"彼方","変えたい":"想要改变","な":"愿望语气：想要……啊","My Future":"我的未来","（さあっどこへ）":"（来吧，要去哪里）","太陽":"太阳","昇る":"升起","ように":"如同……一样",
  "輝いて":"闪耀吧","Charging Heart":"蓄势之心","ちからいっぱい":"拼尽全力","叶えよう":"去实现吧","願い":"愿望","ぴっかり":"闪闪发亮","だ！？":"判断语气：是！？","思う":"认为、感觉","（Sunshine mission）":"（阳光使命）","きっと":"一定","だ":"判断助动词：是","な！":"愿望语气：想要……啊！",
  "みんな":"大家","なら":"如果、只要","説明":"说明、解释","できない":"无法做到","けど":"转折助词：虽然、但是","だいじょうぶ":"没问题","だって":"因为","はじめたい":"想要开始","いま":"现在","見つかった":"被发现、找到了","ばっかり":"才刚刚",
  "どこ？":"在哪里？","どこ":"哪里","だろう？":"推测、疑问语气：会在哪里呢？","わからない！":"不知道！","でも":"但是","楽しそう":"看起来很有趣","未来":"未来","さ…":"句末语气：啊……","まっしぐら！":"一路向前冲！",
};

const ajh = (markup: string, zh: string, aside = false) => cl(markup, zh, aside, aozoraJumpingHeartWordMeanings);


const aozoraJumpingHeartLyrics: LyricLine[] = [
  ajh("見{み}た|こと|ない|夢{ゆめ}|の|軌道{きどう}　|追{お}いかけて", "追逐着那条从未见过的梦想轨迹"),
  ajh("Shining Road", "Shining Road", true),
  ajh("走{はし}りだす|この|気持{きも}ち", "这份心情已经开始奔跑"),
  ajh("まっすぐ|に|勢{いきお}い|よく|君{きみ}|を|探{さが}してた|よ", "笔直地、带着满满的冲劲，一直在寻找着你"),
  ajh("ちょっと|待{ま}って|なんて|ムリ　|飛{と}びだそう", "“等一下啦”什么的才做不到，直接冲出去吧！"),
  ajh("僕{ぼく}たち|の|なか|の|勇気{ゆうき}|が|さわいでる", "我们心中的勇气，已经开始躁动起来"),
  ajh("いつも|の|セカイ|が　|あたらしい|扉{とびら}|を", "熟悉的这个世界，还藏着一扇扇崭新的门"),
  ajh("（もっと）|隠{かく}してる|の", "（更多地）它们还藏在那里"),
  ajh("（Let's go!）|ぜんぶ|開{あ}けたい|よ　|ほら|いっしょ|に|ね！", "（Let's go!）我想把它们全部打开，来吧，一起去吧！"),
  ajh("はじめたい！|My Story|（さあっいまだ）|青{あお}い|空{そら}|が|待{ま}ってる", "想要开始！My Story（来吧，就是现在）蔚蓝的天空正在等着我们"),
  ajh("夢{ゆめ}|を|抱{だ}きしめて　|Jumping Heart", "紧紧抱住梦想，Jumping Heart"),
  ajh("それ|だけ|で|明日{あした}|へ|と|進{すす}める　|青春{せいしゅん}|まっしぐら！？", "只要这样，就能继续向着明天前进，青春一路向前冲！？"),
  ajh("はじまった|時{とき}|の|（Sunshine Story）|ときめき|ずっと|だいじ|に|ね", "最初开始时的那份（Sunshine Story）心动的感觉，一定要永远珍惜啊"),
  ajh("夢{ゆめ}|を|つかまえ|に|行{い}く|よ", "去把梦想抓到手吧！"),
  ajh("どんな|こと|が|おこる|の|か　|わからない|の|も|楽{たの}しみ|さ", "究竟会发生怎样的事情，就连不知道这一点，都让人觉得无比期待"),
  ajh("Open Mind", "Open Mind", true),
  ajh("伝{つた}えなきゃ|伝{つた}わらない", "如果不说出口，心意就无法传达到"),
  ajh("最初{さいしょ}|から|カンペキ|に|できる|筈{はず}|は|ない|から", "毕竟从一开始，就不可能什么都做到完美"),
  ajh("とりあえず|元気{げんき}|に　|飛{と}びだそう", "所以总之先打起精神，向前冲出去吧！"),
  ajh("僕{ぼく}たち|の|スタートライン　|ゴール|は|遠{とお}い|かな", "这里就是我们的起跑线，终点会不会还很遥远呢？"),
  ajh("まぶしい|セカイ|で　|呼{よ}ぶ|声{こえ}|が|聞{き}こえた", "在这耀眼的世界里，我听见了呼唤我们的声音"),
  ajh("（もっと）|聞{き}いてみたくて", "（还想）再多听一些"),
  ajh("（Let's go!）|光{ひかり}|の|向{む}こう|へ　|ほら|いっしょ|に|ね", "（Let's go!）向着光芒的彼方，来吧，一起去吧！"),
  ajh("変{か}えたい|な！|My Future|（さあっどこへ）|太陽{たいよう}|が|昇{のぼ}る|ように", "想要改变！My Future（来吧，要去哪里）就像太阳升起一样"),
  ajh("夢{ゆめ}|よ|輝{かがや}いて　|Charging Heart", "梦想啊，尽情闪耀吧，Charging Heart"),
  ajh("ちからいっぱい|叶{かな}えよう|願{ねが}い|を　|青春{せいしゅん}|ぴっかり|だ！？", "拼尽全力，去实现心中的愿望吧，青春闪闪发亮！？"),
  ajh("変{か}えたい|と|思{おも}う|（Sunshine mission）|気持{きも}ち|が|きっと|だいじ|だ|よ", "那份“想要改变”的心情（Sunshine mission），一定才是最重要的"),
  ajh("夢{ゆめ}|を|つかまえ|に|行{い}く|よ", "去把梦想抓到手吧！"),
  ajh("みんな|と|なら　|説明{せつめい}|は|できない|けど|だいじょうぶ|さ", "只要大家都在一起，虽然说不出为什么，但一定没问题的"),
  ajh("Jumping Heart　|だって|はじめたい|こと|が", "Jumping Heart，因为那些想要开始的事情"),
  ajh("Charging Heart　|いま|見{み}つかった|ばっかり", "Charging Heart，才刚刚被我们发现"),
  ajh("ゴール|は|どこ？　|どこ|だろう？　|わからない！", "终点在哪里？到底在哪里呢？不知道！"),
  ajh("わからない　|でも|ね|楽{たの}しそう|だ|よ", "虽然不知道，可是啊——感觉一定会非常有趣！"),
  ajh("はじめたい！|My Story　|青{あお}い|空{そら}|が|待{ま}ってる", "想要开始！My Story，蔚蓝的天空正在等着我们"),
  ajh("夢{ゆめ}|を|抱{だ}きしめて　|Jumping Heart", "紧紧抱住梦想，Jumping Heart"),
  ajh("それ|だけ|で|明日{あした}|へ|と|進{すす}める　|青春{せいしゅん}|まっしぐら！？", "只要这样，就能继续向着明天前进，青春一路向前冲！？"),
  ajh("はじまった|時{とき}|の|（Sunshine Story）|ときめき|ずっと|だいじ|に|ね", "最初开始时的那份（Sunshine Story）心动的感觉，一定要永远珍惜啊"),
  ajh("夢{ゆめ}|を|つかまえ|に|行{い}く|よ", "去把梦想抓到手吧！"),
  ajh("どんな|こと|が|おこる|の|か|わからない|未来{みらい}", "未来究竟会发生怎样的事情，谁也不知道"),
  ajh("夢{ゆめ}|を|つかまえ|に|行{い}く|よ", "那就去把梦想抓到手吧！"),
  ajh("みんな|と|なら　|説明{せつめい}|は|できない|けど|だいじょうぶ|さ…|まっしぐら！", "只要大家都在一起，虽然说不出为什么，但一定没问题的……一路向前冲吧！"),
];

const miraiLightLine: LyricLine = { words: [yw("hi-ka-ri-ni", "成为光芒", s("ヒカリに")), yw("na-ro-u", "成为吧", s("なろう"))], zh: "成为光芒吧" };
const miraiIlluminateLine: LyricLine = { words: [yw("mi-ra-i-o", "未来", s("ミライを")), yw("te-ra-shi-ta-i", "好想照耀", s("照", "て"), s("らしたい"))], zh: "好想照耀未来" };
const miraiNoLongerLostLine: LyricLine = { words: [yw("i-ma-wa", "如今", s("いまは")), yw("mo-u", "已经", s("もう")), yw("ma-yo-wa-na-i", "不再迷惘", s("迷", "まよ"), s("わない"))], zh: "我们已经不再迷惘" };
const miraiShipLine: LyricLine = { words: [yw("fu-ne-ga", "船", s("船", "ふね"), s("が")), yw("yu-ku-yo", "要启航了", s("往", "ゆ"), s("くよ")), yw("mi-ra-i-e", "迈向未来", s("ミライへ")), yw("ta-bi-da-to-u", "踏上旅途吧", s("旅立", "たびだ"), s("とう"))], zh: "船要启航了 旅途迈向未来" };
const miraiSkyLine: LyricLine = { words: [yw("a-o-i", "湛蓝的", s("青", "あお"), s("い")), yw("so-ra", "天空", s("空", "そら")), yw("wa-ra-t-te-ru", "正笑着", s("笑", "わら"), s("ってる")), yw("na-ni-ga-shi-ta-i", "想做什么呢", s("（なにがしたい）"))], zh: "青空正笑着（想要做什么呢）" };
const miraiOverflowLine: LyricLine = { words: [yw("ka-ga-ya-ki-wa", "闪耀", s("輝", "かがや"), s("きは")), yw("ko-ko-ro-ka-ra", "从心中", s("心", "こころ"), s("から")), yw("a-fu-re-da-shi-te", "满溢而出", s("あふれ"), s("出", "だ"), s("して"))], zh: "心中的闪耀满溢而出" };
const miraiBeyondLine: LyricLine = { words: [yw("mo-t-to", "更多", s("もっと")), yw("sa-ki-no", "前方的", s("先", "さき"), s("の")), yw("ke-shi-ki", "景色", s("景色", "けしき")), yw("no-zo-mu-n-da", "期待看见", s("望", "のぞ"), s("むんだ"))], zh: "期待看见更多前方的景色" };

const miraiTicketLyrics: LyricLine[] = [
  miraiLightLine,
  miraiIlluminateLine,
  { words: [yw("ka-ga-ya-ki-wa", "闪耀", s("輝", "かがや"), s("きは")), yw("ko-ko-ro-ka-ra", "从心中", s("心", "こころ"), s("から")), yw("a-fu-re-da-su-yo", "满溢而出", s("あふれ"), s("出", "だ"), s("すよ"))], zh: "心中的闪耀满溢而出" },
  { words: [yw("yu-me-ga", "梦想", s("夢", "ゆめ"), s("が")), yw("u-ma-re", "诞生", s("生", "う"), s("まれ"))], zh: "梦想诞生" },
  { words: [yw("yu-me-no-ta-me-ni", "为了梦想", s("夢", "ゆめ"), s("のために")), yw("na-i-ta", "哭泣", s("泣", "な"), s("いた")), yw("to-ki-de-mo", "即使在那时", s("ときでも"))], zh: "即使为了梦想而哭泣" },
  { words: [yw("a-ki-ra-me-na-i", "不放弃", s("あきらめない")), yw("ko-to-de", "因为这件事", s("ことで")), yw("tsu-na-ga-t-ta", "心系着心", s("繋", "つな"), s("がった"))], zh: "我们也因为不放弃而心系着心" },
  { words: [yw("mi-n-na-mi-n-na", "大家都是", s("みんなみんな"))], zh: "大家都是" },
  { words: [yw("na-ya-mi-na-ga-ra", "一边烦恼", s("悩", "なや"), s("みながら")), yw("ko-ko-e", "抵达这里", s("ここへ")), yw("ta-do-ri-tsu-i-ta-ne", "终于走到了呢", s("辿", "たど"), s("りついたね"))], zh: "一边烦恼一边抵达这里" },
  { words: [yw("ko-re-ka-ra-da-yo", "现在才要开始", s("これからだよ"))], zh: "现在才要开始" },
  miraiNoLongerLostLine,
  { words: [yw("a-ko-ga-re", "憧憬", s("あこがれ")), yw("da-ki-shi-me-te", "拥抱", s("抱", "だ"), s("きしめて"))], zh: "拥抱憧憬" },
  { words: [yw("tsu-gi-e", "向下一步", s("次", "つぎ"), s("へ")), yw("su-su-mu-n-da", "往前迈进", s("進", "すす"), s("むんだ"))], zh: "往前迈进" },
  { words: [yw("bo-ku-ta-chi-da-ke-no", "只属于我们的", s("僕", "ぼく"), s("たちだけの")), yw("shi-n-se-ka-i-ga", "新世界", s("新世界", "しんせかい"), s("が"))], zh: "只属于我们的新世界" },
  { words: [yw("ki-t-to", "一定", s("きっと")), yw("a-ru", "就在某处", s("ある"))], zh: "一定就在某处" },
  { words: [yw("We say", "我们高呼", s("We say")), yw("yo-o-so-ro-o", "YO~SORO、航向正确", s("ヨーソロー"))], zh: "We say YO~SORO（※曜的口头禅;源自航海用语：表示一切安好如此前进没有问题）", aside: true },
  miraiShipLine,
  miraiSkyLine,
  miraiLightLine,
  miraiIlluminateLine,
  miraiOverflowLine,
  miraiBeyondLine,
  miraiLightLine,
  miraiIlluminateLine,
  miraiNoLongerLostLine,
  miraiShipLine,
  miraiSkyLine,
  miraiLightLine,
  miraiIlluminateLine,
  miraiOverflowLine,
  miraiBeyondLine,
  { words: [yw("Ah", "啊", s("Ah")), yw("ya-t-to", "终于", s("やっと")), yw("te-ni-shi-ta", "拿到手的", s("手", "て"), s("にした"))], zh: "挥舞终于拿到手的" },
  { words: [yw("mi-ra-i-chi-ke-t-to", "未来门票", s("ミライチケット")), yw("ka-za-shi-te", "挥舞吧", s("かざして"))], zh: "未来门票吧" },
  { words: [yw("La la la la la la la", "啦啦啦", s("La la la la la la la"))], zh: "La la la la la la la", aside: true },
];

const yumeKataruWordsLine: LyricLine = { words: [yw("yu-me-o", "梦想", s("ユメを")), yw("ka-ta-ru", "诉说", s("語", "かた"), s("る")), yw("ko-to-ba-yo-ri", "与其使用话语", s("言葉", "ことば"), s("より"))], zh: "与其诉说梦想的话语" };
const yumeKataruSongLine: LyricLine = { words: [yw("yu-me-o", "梦想", s("ユメを")), yw("ka-ta-ru", "诉说", s("語", "かた"), s("る")), yw("u-ta-ni-shi-yo-u", "化作歌曲吧", s("歌", "うた"), s("にしよう"))], zh: "不如为梦想放声歌唱吧" };
const yumeKataruNowLine: LyricLine = { words: [yw("so-re-na-ra-ba", "这样的话", s("それならば")), yw("i-ma-o", "现在", s("今", "いま"), s("を"))], zh: "这样的话" };
const yumeKataruConveyLine: LyricLine = { words: [yw("tsu-ta-e-ra-re-ru", "能够传达", s("伝", "つた"), s("えられる")), yw("ki-ga-su-ru-ka-ra", "因为感觉可以", s("気", "き"), s("がするから"))], zh: "应该就能传达现在的心情" };
const yumeKataruWordsFromLine: LyricLine = { words: [yw("yu-me-o", "梦想", s("ユメを")), yw("ka-ta-ru", "诉说", s("語", "かた"), s("る")), yw("ko-to-ba-ka-ra", "从话语中", s("言葉", "ことば"), s("から"))], zh: "诉说着梦想的话语" };
const yumeKataruSongBornLine: LyricLine = { words: [yw("yu-me-o", "梦想", s("ユメを")), yw("ka-ta-ru", "诉说", s("語", "かた"), s("る")), yw("u-ta-ga", "歌曲", s("歌", "うた"), s("が"))], zh: "然后诞生出" };
const yumeKataruBornLine: LyricLine = { words: [yw("u-ma-re-ru-n-da-ne", "诞生出来呢", s("生", "う"), s("まれるんだね"))], zh: "梦想的歌曲" };
const yumeKataruFeelingLine: LyricLine = { words: [yw("hi-ro-ga-ru", "延展开来", s("ひろがる")), yw("ko-no", "这份", s("この")), yw("o-mo-i-wa", "心情", s("思", "おも"), s("いは"))], zh: "这份延展开来的心情" };
const yumeKataruMelodyLine: LyricLine = { words: [yw("da-i-su-ki-na", "最喜欢的", s("大好", "だいす"), s("きな")), yw("melody-no", "旋律的", s("メロディーの"))], zh: "同最喜欢的旋律" };
const yumeKataruConnectedLine: LyricLine = { words: [yw("tsu-na-ga-ri-da-yo-ne", "紧紧相连", s("つながりだよね"))], zh: "紧紧相连" };
const yumeKataruEscapeLine: LyricLine = { words: [yw("mo-u", "已经、再也", s("もう")), yw("ni-ge-na-i-de", "别逃避", s("逃", "に"), s("げないで"))], zh: "别再逃避了" };
const yumeKataruNewPlaceLine: LyricLine = { words: [yw("a-ta-ra-shi-i", "崭新的", s("あたらしい")), yw("ba-sho-e", "前往场所", s("場所", "ばしょ"), s("へ"))], zh: "前往崭新的场所" };
const yumeKataruSingingLine: LyricLine = { words: [yw("Singing my song", "唱着我的歌", s("Singing my song")), yw("for my dream", "为了我的梦想", s(" for my dream"))], zh: "为自己的梦想而歌唱", aside: true };

const yumeKataruYoriLyrics: LyricLine[] = [
  { words: [yw("mo-t-to", "更多", s("もっと")), yw("na-ni-ka", "某些事物", s("なにか")), yw("sa-ga-shi-te", "探寻", s("探", "さが"), s("して"))], zh: "为了探寻更多事物" },
  { words: [yw("do-n-do-n", "不断地", s("どんどん")), yw("so-to-e", "向外面", s("外", "そと"), s("へ")), yw("i-ku-n-da", "去寻找吧", s("行", "い"), s("くんだ"))], zh: "不断外出寻找吧" },
  { words: [yw("ya-t-te-mi-ta-ra", "尝试过后", s("やってみたら"))], zh: "这样尝试过后" },
  { words: [yw("i-ga-i-to", "出乎意料地", s("意外", "いがい"), s("と")), yw("happy", "开心", s("ハッピー")), yw("mi-tsu-ka-ru-mon-sa", "会发现的", s("みつかるもんさ"))], zh: "竟感觉出乎意料的开心" },
  { words: [yw("na-ya-mi-na-ga-ra", "一边烦恼", s("悩", "なや"), s("みながら"))], zh: "一边烦恼着" },
  { words: [yw("wa-ra-wa-re-na-ga-ra", "一边被嘲笑", s("笑", "わら"), s("われながら"))], zh: "一边备受嘲笑" },
  { words: [yw("me-ge-na-i", "别气馁", s("めげない")), yw("ma-ke-na-i", "别认输", s("負", "ま"), s("けない"))], zh: "别气馁 别认输" },
  { words: [yw("na-i-cha-u-ka-mo-ne", "或许会流泪吧", s("ないちゃうかもね？"))], zh: "虽说或许会流泪吧？" },
  { words: [yw("de-mo", "但是", s("でも")), yw("i-i-no-sa", "没有关系", s("いいのさ"))], zh: "但也没有关系" },
  { words: [yw("a-shi-ta-ga", "明天", s("明日", "あした"), s("が")), yw("mi-e-te-ki-ta", "渐渐看见", s("見", "み"), s("えてきた"))], zh: "明天啊就近在眼前" },
  yumeKataruWordsLine,
  yumeKataruSongLine,
  yumeKataruNowLine,
  yumeKataruConveyLine,
  yumeKataruWordsFromLine,
  yumeKataruSongBornLine,
  yumeKataruBornLine,
  yumeKataruFeelingLine,
  yumeKataruMelodyLine,
  yumeKataruConnectedLine,
  yumeKataruEscapeLine,
  { words: [yw("su-su-mu", "前进", s("進", "すす"), s("む")), yw("to-ki-da-yo", "正是时刻", s("ときだよ"))], zh: "现在正是前进的时刻" },
  yumeKataruNewPlaceLine,
  yumeKataruSingingLine,
  yumeKataruSingingLine,
  { words: [yw("ki-t-to", "一定", s("きっと")), yw("na-ni-ka", "有什么", s("なにか")), yw("ha-ji-ma-ru", "将要开始", s("始", "はじ"), s("まる"))], zh: "一定有什么将要开始" },
  { words: [yw("wa-i-wa-i", "热闹沸腾", s("わいわい")), yw("mi-n-na-no", "大家的", s("みんなの")), yw("energy", "能量", s("エネルギー"))], zh: "大家的能量正沸腾不已" },
  { words: [yw("ya-t-te-mi-ru-yo", "试着动手去做吧", s("やってみるよ")), yw("ki-mo-chi-ga", "心情", s("気持", "きも"), s("ちが"))], zh: "试着动手去做吧 大家的心情" },
  { words: [yw("gyu-t-to", "紧紧地", s("ぎゅっと")), yw("hi-to-tsu-ni", "合而为一", s("ひとつに")), yw("na-t-te", "变得", s("なって"))], zh: "已然紧紧相连" },
  { words: [yw("ka-n-ji-ta-i-na", "好想感受", s("感", "かん"), s("じたいな")), yw("to-ki-me-ki-ta-i-na", "好想心跳不已", s("ときめきたいな"))], zh: "好想去感受心跳不已的悸动" },
  { words: [yw("ki-mi-ga", "与你、你所", s("君", "きみ"), s("が"))], zh: "与你" },
  { words: [yw("ne-ga-u", "许下愿望", s("願", "ねが"), s("う")), yw("ko-to-o", "事情", s("ことを")), yw("bo-ku-mo", "我也", s("僕", "ぼく"), s("も"))], zh: "许下了" },
  { words: [yw("ne-ga-t-te-ta", "期盼着", s("願", "ねが"), s("ってた"))], zh: "相同的愿望" },
  { words: [yw("ko-ko-ro-wa", "彼此的心灵", s("心", "こころ"), s("は"))], zh: "彼此的心灵" },
  { words: [yw("chi-ka-zu-i-te-ru", "更加接近", s("近", "ちか"), s("づいてる"))], zh: "更加地接近" },
  { words: [yw("so-re-ga", "那件事", s("それが")), yw("u-re-shi-i-ne", "令人喜悦", s("嬉", "うれ"), s("しいね"))], zh: "充满了无限的喜悦" },
  { words: [yw("mi-ra-i", "未来", s("ミライ")), yw("no-zo-mu", "期盼", s("望", "のぞ"), s("む")), yw("ko-to-ba-ka-ra", "从话语中", s("言葉", "ことば"), s("から"))], zh: "从期盼未来的话语中" },
  { words: [yw("mi-ra-i", "未来", s("ミライ")), yw("no-zo-mu", "期盼", s("望", "のぞ"), s("む")), yw("u-ta-ni-na-ru-yo", "化作歌曲", s("歌", "うた"), s("になるよ"))], zh: "诞生出期盼未来的歌曲" },
  { words: [yw("so-re-ko-so-ga", "这正是", s("それこそが"))], zh: "这正是" },
  { words: [yw("i-ma-no", "如今的", s("今", "いま"), s("の")), yw("to-bi-da-shi-ta-i", "想要展翅高飞", s("飛", "と"), s("びだしたい")), yw("mu-ne-no", "心中的", s("胸", "むね"), s("の")), yw("a-tsu-sa", "热情", s("熱", "あつ"), s("さ"))], zh: "如今心中想要展翅高飞的热情" },
  { words: [yw("mi-ra-i", "未来", s("ミライ")), yw("no-zo-mu", "期盼", s("望", "のぞ"), s("む")), yw("ko-to-ba-ka-ra", "从话语中", s("言葉", "ことば"), s("から"))], zh: "从期盼未来的话语中" },
  { words: [yw("mi-ra-i", "未来", s("ミライ")), yw("no-zo-mu", "期盼", s("望", "のぞ"), s("む")), yw("u-ta-ga", "歌曲", s("歌", "うた"), s("が")), yw("a-fu-re-da-shi-ta-ra", "如果满溢而出", s("あふれだしたら"))], zh: "期盼未来的歌曲满溢而出的话" },
  { words: [yw("to-me-na-i-de-yo", "别让它停下", s("とめないでよ")), yw("to-o-ku-e", "传向远方", s("遠", "とお"), s("くへ"))], zh: "就让它传向远方吧" },
  { words: [yw("da-i-su-ki-na", "最喜欢的", s("大好", "だいす"), s("きな")), yw("melody-to", "带着旋律", s("メロディーと"))], zh: "带着最喜欢的旋律" },
  { words: [yw("ta-bi-ni", "踏上旅程", s("旅", "たび"), s("に")), yw("de-ru-n-da", "出发", s("でるんだ"))], zh: "踏上旅程" },
  { words: [yw("ho-ra", "来吧", s("ほら")), yw("ta-no-shi-ku-te", "欢快地", s("楽", "たの"), s("しくて"))], zh: "让我们欢快地" },
  { words: [yw("do-ko-ma-de-mo", "无论到哪里", s("どこまでも")), yw("i-ko-u", "前行吧", s("行", "い"), s("こう"))], zh: "走向大千世界吧" },
  { words: [yw("a-ta-ra-shi-i", "崭新的", s("新", "あたら"), s("しい")), yw("ki-se-tsu", "季节", s("季節", "きせつ"))], zh: "在这崭新的季节" },
  { words: [yw("so-u-da-yo-ne", "就是如此", s("そうだよね"))], zh: "就是如此" },
  { words: [yw("su-gu-ni-wa", "立即", s("すぐには")), yw("ki-me-ra-re-na-i", "无法下定决心", s("決", "き"), s("められない"))], zh: "虽然无法立即下定决心" },
  { words: [yw("da-ke-do-sa", "但是呢", s("だけどさ")), yw("ka-ra-da-wa", "身体却", s("体", "からだ"), s("は"))], zh: "但身体却" },
  { words: [yw("na-ze-ka", "不由自主地", s("なぜか")), yw("o-do-ri-da-shi-te", "翩翩起舞", s("踊", "おど"), s("りだして"))], zh: "不由自主地翩翩起舞" },
  { words: [yw("da-i-su-ki-na", "最喜欢的", s("大好", "だいす"), s("きな")), yw("melody-ni", "同旋律", s("メロディーに"))], zh: "同最喜欢的旋律" },
  { words: [yw("a-wa-se-te-ta", "合而为一", s("合", "あ"), s("わせてた"))], zh: "合而为一" },
  { words: [yw("o-i-de-yo", "快跟上吧", s("おいでよ"))], zh: "快跟上吧" },
  { words: [yw("o-i-de-yo", "快跟上吧", s("おいでよ"))], zh: "快跟上吧" },
  yumeKataruWordsLine,
  yumeKataruSongLine,
  yumeKataruNowLine,
  yumeKataruConveyLine,
  yumeKataruWordsFromLine,
  yumeKataruSongBornLine,
  yumeKataruBornLine,
  yumeKataruFeelingLine,
  yumeKataruMelodyLine,
  yumeKataruConnectedLine,
  yumeKataruEscapeLine,
  { words: [yw("ki-mi-to", "与你", s("君", "きみ"), s("と")), yw("bo-ku-to-de", "和我一起", s("僕", "ぼく"), s("とで")), yw("su-su-mu", "前进", s("進", "すす"), s("む")), yw("to-ki-da-yo", "正是时刻", s("ときだよ"))], zh: "现在正是我们共同前进的时刻" },
  { ...yumeKataruNewPlaceLine, zh: "一起前往崭新的场所" },
  yumeKataruSingingLine,
  yumeKataruSingingLine,
];

const miracleCanDoLine: LyricLine = { words: [yw("de-ki-ru-ka-na", "能否做到呢", s("できるかな? ")), yw("hi", "嘿", s("hi ")), yw("de-ki-ru", "做得到", s("できる ")), yw("hi", "嘿", s("hi"))], zh: "能否做到呢？hi 做得到 hi" };
const miracleCanDoTightLine: LyricLine = { words: [yw("de-ki-ru-ka-na", "能否做到呢", s("できるかな? ")), yw("hi", "嘿", s("hi")), yw("de-ki-ru", "做得到", s("できる ")), yw("hi", "嘿", s("hi"))], zh: "能否做到呢？hi 做得到 hi" };
const miracleShoutLine: LyricLine = { words: [yw("sa-ke-bu", "呐喊的", s("叫", "さけ"), s("ぶ")), yw("ko-ko-ro-ga", "内心", s("こころが ")), yw("ho-shi-ga-ru", "渴望", s("欲", "ほ"), s("しがる")), yw("ka-ga-ya-ki", "光辉", s("輝", "かがや"), s("き"))], zh: "呐喊的内心在渴望光辉" };
const miracleShowLine: LyricLine = { words: [yw("me-no-ma-e-de", "在眼前", s("目", "め"), s("の"), s("前", "まえ"), s("で ")), yw("ki-mi-ni", "向你", s("君", "きみ"), s("に")), yw("mi-se-ru-n-da", "展现", s("見", "み"), s("せるんだ"))], zh: "将一切展现在你的眼前" };
const miracleNewLightLine: LyricLine = { words: [yw("a-ta-ra-shi-i", "全新的", s("あたらしい")), yw("hi-ka-ri", "光芒", s("光", "ひかり"))], zh: "能否抓住那" };
const miracleGraspLine: LyricLine = { words: [yw("tsu-ka-me-ru-n-da-ro-u-ka", "能否抓住呢", s("つかめるんだろうか?"))], zh: "全新的光芒呢？" };
const miracleBelieveLine: LyricLine = { words: [yw("shi-n-ji-yo-u-yo", "去相信吧", s("信", "しん"), s("じようよ ")), yw("yeah", "耶", s("yeah"))], zh: "去相信吧 yeah" };

const miracleWaveLyrics: LyricLine[] = [
  { words: [yw("ge-n-ka-i-ma-de", "直到极限", s("限界", "げんかい"), s("まで")), yw("ya-c-cha-e", "放手去做", s("やっちゃえ")), yw("sa-i-go-ma-de", "直到最后", s("最後", "さいご"), s("まで"))], zh: "极限来临前绝不停歇 直到最后一刻" },
  { words: [yw("do-u-na-ru", "结果会如何", s("どうなる ")), yw("doki doki wave", "心跳剧烈如涛", s("doki doki wave"))], zh: "结果会如何 心跳剧烈如涛" },
  { words: [yw("ji-re-t-ta-i", "焦躁的", s("じれったい")), yw("ji-bu-n", "自己", s("自分", "じぶん"))], zh: "现在正是超越那" },
  { words: [yw("ko-e-ru", "超越", s("越", "こ"), s("える")), yw("to-ki-da-yo", "正是时候", s("ときだよ"))], zh: "焦躁自我的时候" },
  { words: [yw("so-u-da", "没错", s("そうだ ")), yw("wave", "浪潮", s("wave ")), yw("ko-e-cha-u-n-da", "超越吧", s("越", "こ"), s("えちゃうんだ"))], zh: "没错 wave 超越吧" },
  { words: [yw("ho-ka-no-ko-to", "其他事情", s("ほかのこと ")), yw("ka-n-ga-e-ra-re-na-i", "无暇考虑", s("考", "かんが"), s("えられない"))], zh: "已无暇考虑其它" },
  { words: [yw("do-u-na-ru", "结果会如何", s("どうなる ")), yw("do-ki-do-ki-wave", "心跳剧烈如涛", s("ドキドキ wave"))], zh: "结果会如何 心跳剧烈如涛" },
  { words: [yw("hi-to-tsu-ni-na-t-ta", "合而为一的", s("ひとつになった ")), yw("yu-me-yo", "梦想啊", s("夢", "ゆめ"), s("よ ")), yw("ha-shi-re", "奔走吧", s("走", "はし"), s("れ"))], zh: "合而为一的梦想哟 奔走吧" },
  { words: [yw("so-u-da", "没错", s("そうだ ")), yw("wave", "浪潮", s("wave ")), yw("to-ma-re-na-i-n-da", "绝不会停下", s("止", "と"), s("まれないんだ"))], zh: "没错 wave 绝不会停下脚步" },
  { words: [yw("ku-ya-shi-ku-te", "心有不甘", s("悔", "くや"), s("しくて ")), yw("ji-t-to-shi-te-ra-re-na-i", "无法忍耐", s("じっとしてられない"))], zh: "心有不甘 无法忍耐" },
  { words: [yw("son-na", "那样的", s("そんな")), yw("ki-mo-chi-da-t-ta", "心情", s("気持", "きも"), s("ちだった"))], zh: "那样的心情" },
  { words: [yw("mi-n-na", "大家", s("みんな")), yw("ki-t-to", "一定", s("きっと"))], zh: "大家一定" },
  { words: [yw("wa-ka-ru-n-da-ne", "都明白吧", s("わかるんだね"))], zh: "都明白的吧" },
  miracleCanDoLine,
  miracleShoutLine,
  miracleShowLine,
  miracleCanDoLine,
  { words: [yw("so-re-shi-ka", "只有如此", s("それしか")), yw("na-i-n-da-to", "别无选择", s("ないんだと"))], zh: "只能如此了" },
  { words: [yw("ki-me-te", "下定决心", s("決", "き"), s("めて"))], zh: "下定决心" },
  { words: [yw("a-tsu-i-a-tsu-i", "充满激情的", s("熱", "あつ"), s("い"), s("熱", "あつ"), s("い ")), yw("jump-de", "一跃", s("ジャンプで"))], zh: "充满激情的一跃" },
  miracleNewLightLine,
  miracleGraspLine,
  miracleBelieveLine,
  { words: [yw("Miracle wave-ga", "奇迹浪潮在", s("Miracle waveが"))], zh: "Miracle wave在呼唤" },
  { words: [yw("Miracle", "奇迹", s("Miracle")), yw("yo-bu-yo", "呼唤", s("呼", "よ"), s("ぶよ"))], zh: "Miracle啊" },
  { words: [yw("a-n-ji-ru-yo-ri", "与其杞人忧天", s("案", "あん"), s("じるより")), yw("ya-c-cha-e", "何不干脆去做", s("やっちゃえ"))], zh: "与其杞人忧天何不干脆" },
  { words: [yw("do-o-n-to", "大胆地", s("どーんと")), yw("i-ke", "放手一搏", s("行", "い"), s("け"))], zh: "放手一搏" },
  { words: [yw("guts-da", "拿出干劲", s("ガッツだ ")), yw("baku baku wave", "辽阔的波浪", s("baku baku wave"))], zh: "拿出干劲 辽阔的波浪" },
  { words: [yw("ka-wa-t-ta-n-na-ra", "若有所改变", s("変", "か"), s("わったんなら")), yw("ke-k-ka", "成果", s("結果", "けっか")), yw("da-shi-te-mi-te", "试着拿出来", s("だしてみて"))], zh: "若是有所改变 就试着拿出成果来吧" },
  { words: [yw("so-u-da", "是啊", s("そうだ ")), yw("wave", "浪潮", s("wave ")), yw("ka-wa-t-ta-n-da", "改变了", s("変", "か"), s("わったんだ"))], zh: "是啊 wave 改变了" },
  { words: [yw("a-no-ko-ro-wa", "那时", s("あのころは")), yw("ma-da", "还", s("まだ")), yw("a-ma-ka-t-ta", "太过天真", s("甘", "あま"), s("かった?"))], zh: "那时的我们是否太过天真？" },
  { words: [yw("guts-da", "拿出干劲", s("ガッツだ ")), yw("baku baku wave", "辽阔的波浪", s("baku baku wave"))], zh: "拿出干劲 辽阔的波浪" },
  { words: [yw("hi-to-tsu-ni-na-t-ta", "合而为一的", s("ひとつになった")), yw("yu-me-to", "同梦想", s("夢", "ゆめ"), s("と")), yw("ha-shi-re", "奔走吧", s("走", "はし"), s("れ"))], zh: "同合而为一的梦想一起 奔走吧" },
  { words: [yw("so-u-da", "是啊", s("そうだ ")), yw("wave", "浪潮", s("wave ")), yw("chi-ka-ra-i-p-pa-i", "力量满满", s("チカラいっぱい"))], zh: "是啊 wave 力量满满" },
  { words: [yw("i-ki-o-i-de", "气势磅礴地", s("勢", "いきお"), s("いで")), yw("mo-t-to", "更加", s("もっと")), yw("to-o-ku-e-to", "走向更远处", s("遠", "とお"), s("くへと"))], zh: "气势磅礴地走向更远的地方吧" },
  { words: [yw("te-o", "手", s("手", "て"), s("を")), yw("no-ba-shi-ta-i-yo", "想伸出去", s("伸", "の"), s("ばしたいよ"))], zh: "想要伸出手啊" },
  { words: [yw("mi-n-na", "大家", s("みんな")), yw("i-s-sho", "一起", s("一緒", "いっしょ")), yw("do-ko-ma-de-mo", "直到天涯海角", s("どこまでも"))], zh: "让我们一起 直到天涯海角" },
  { words: [yw("ka-na-u-ka-na", "能否实现呢", s("かなうかな ")), yw("hi", "嘿", s("hi")), yw("ka-na-u", "可以实现", s("かなう ")), yw("hi", "嘿", s("hi"))], zh: "能否实现呢 hi可以的 hi" },
  { words: [yw("ne-ga-i-wa", "愿望", s("願", "ねが"), s("いは")), yw("o-na-ji", "相同的", s("おなじ")), yw("ji-bu-n-no", "自己的", s("自分", "じぶん"), s("の")), yw("ka-ga-ya-ki", "光辉", s("輝", "かがや"), s("き"))], zh: "心怀同样的愿望 绽放自我的光辉" },
  { words: [yw("ma-ne-ja-na-i", "并非效仿", s("真似", "まね"), s("じゃない")), yw("original-no", "独一无二的", s("オリジナルの ")), yw("heart wave", "心之浪潮", s("heart wave"))], zh: "并非效仿 而是真正独一无二的 heart wave" },
  { words: [yw("ka-na-u-ka-na", "能否实现呢", s("かなうかな ")), yw("hi", "嘿", s("hi")), yw("ka-na-u", "可以实现", s("かなう ")), yw("hi", "嘿", s("hi"))], zh: "能否实现呢 hi可以的 hi" },
  { words: [yw("so-re-ga", "那件事", s("それが")), yw("hi-tsu-yo-u-sa", "很有必要", s("必要", "ひつよう"), s("さ")), yw("da-ka-ra", "所以", s("だから"))], zh: "所以说充满激情的跳跃" },
  { words: [yw("a-tsu-i-a-tsu-i", "充满激情的", s("熱", "あつ"), s("い"), s("熱", "あつ"), s("い")), yw("jump-ga", "跳跃", s("ジャンプが"))], zh: "是很有必要的" },
  { words: [yw("a-ta-ra-shi-i", "全新的", s("あたらしい")), yw("hi-ka-ri", "光芒", s("光", "ひかり")), yw("tsu-ka-mi-to-ru-ta-me-ni", "为了抓住", s("つかみとるために"))], zh: "为了抓住全新的光芒" },
  { words: [yw("i-ma", "现在", s("いま")), yw("sa-i-da-i-no", "最大的", s("最大", "さいだい"), s("の ")), yw("yeah heart wave miracle", "奇迹心之浪潮", s("yeah heart wave miracle"))], zh: "现在就使出最大的 yeah heart wave miracle" },
  miracleCanDoTightLine,
  { ...miracleShoutLine, words: [yw("sa-ke-bu", "呐喊的", s("叫", "さけ"), s("ぶ")), yw("ko-ko-ro-ga", "内心", s("こころが")), yw("ho-shi-ga-ru", "渴望", s("欲", "ほ"), s("しがる")), yw("ka-ga-ya-ki", "光辉", s("輝", "かがや"), s("き"))] },
  { ...miracleShowLine, words: [yw("me-no-ma-e-de", "在眼前", s("目", "め"), s("の"), s("前", "まえ"), s("で")), yw("ki-mi-ni", "向你", s("君", "きみ"), s("に")), yw("mi-se-ru-n-da", "展现", s("見", "み"), s("せるんだ"))] },
  miracleCanDoTightLine,
  { words: [yw("so-re-shi-ka", "只有如此", s("それしか")), yw("na-i-n-da-to", "别无选择", s("ないんだと"))], zh: "只能如此了" },
  { words: [yw("ki-me-te", "下定决心", s("決", "き"), s("めて")), yw("a-tsu-i-a-tsu-i", "充满激情的", s("熱", "あつ"), s("い"), s("熱", "あつ"), s("い")), yw("jump-de", "一跃", s("ジャンプで"))], zh: "下定决心 充满激情的一跃" },
  miracleNewLightLine,
  miracleGraspLine,
  miracleBelieveLine,
  { words: [yw("sa-i-da-i-no", "使出最大的", s("最大", "さいだい"), s("の ")), yw("heart wave miracle", "奇迹心之浪潮", s("heart wave miracle"))], zh: "使出最大的 heart wave miracle" },
  { words: [yw("Miracle wave-ga", "奇迹浪潮在", s("Miracle waveが ")), yw("miracle", "奇迹", s("miracle")), yw("yo-bu-yo", "呼唤", s("呼", "よ"), s("ぶよ"))], zh: "Miracle wave在呼唤 miracle啊" },
];

const myMaiTonightWordMeanings: Record<string, string> = {
  "踊れ":"舞动吧","熱く":"炽热地","なる":"变得","ため":"为了","人":"人们","は":"主题助词","生まれた":"诞生了","はず":"理应、应该","さ":"句末语气：啊、呀",
  "いま":"此刻","小さく":"微弱地","燃えてる":"燃烧着","まだ":"还、仍然","小さな":"小小的","焔":"火焰","が":"主语助词","一つ":"一个、整体","に":"对象、状态助词","なれば":"如果成为","奇跡":"奇迹","生まれ":"诞生",
  "この":"这个","セカイ":"世界","いつも":"总是","諦めない":"不放弃","心":"心、内心","答え":"答案","じゃなく":"并不是","道":"道路、前路","を":"宾语助词","探す":"寻找","手掛かり":"线索","くれる":"给予我们","から":"原因助词：因为",
  "最後":"最后","まで":"直到","強気":"勇敢、坚定","で":"表示状态、方式的助词","行こう":"前行吧","生まれてきた":"来到世上","の？":"疑问语气：吗？","きっと":"一定","そう":"那样、如此","だ":"判断助动词：是","よ":"句末语气：哦、呀","だから":"所以","夢見て":"怀抱梦想","踊ろう":"一起舞动吧",
  "My":"我的","舞☆":"舞蹈☆","tonight":"今夜","（Dancing tonight）":"（今夜起舞）","最高":"最棒、最高","の":"所属、修饰助词：的","今日":"今天","しよう":"让它成为吧","いつか":"总有一天","広がる":"延展开","だろう":"推测语气：会……吧","ほら":"来吧、你看","大きく":"更广阔地","広がれ":"延展开吧",
  "頑張る":"拼尽全力","力":"力量","呼んでる":"正在呼唤","世界":"世界","中":"之中","輝きたい":"想要闪耀","集まる":"汇聚","時":"时刻","新しい":"崭新的","こと":"事情、想法","思いつき":"想到、迸发灵感","走り出す":"开始奔跑","足元":"脚下","見えない":"看不清","けど":"转折助词：虽然、但是",
  "羽":"翅膀","みたい":"像……一样","手":"手","伸ばして":"伸出去","憧れた":"憧憬过","ずっと":"一直、永远","瞬く":"闪烁","光":"光芒","叶う":"实现","と":"引用助词","明日":"明天","へ":"方向助词：向、往","繋げよう":"连接起来吧","胸":"胸口、内心","声":"声音","導かれて":"被引导着","また":"再次","開けた":"打开了","いこう":"前行吧",
};

const mmt = (markup: string, zh: string, aside = false) => cl(markup, zh, aside, myMaiTonightWordMeanings);

const myMaiTonightLyrics: LyricLine[] = [
  mmt("踊{おど}れ|踊{おど}れ|熱{あつ}く|なる|ため", "舞动吧　舞动吧　为了让心炽热起来"),
  mmt("人{ひと}|は|生{う}まれた|はず|さ", "我们一定正是为此而生"),
  mmt("いま|小{ちい}さく|燃{も}えてる　|まだ|小{ちい}さな|焔{ほむら}|が", "此刻还只是微微燃烧着，那一簇小小的火焰"),
  mmt("一{ひと}つ|に|なれば|奇跡{きせき}|が|生{う}まれ", "若能汇聚为一体，奇迹便会由此诞生"),
  mmt("この|セカイ|は|いつも　|諦{あきら}めない|心{こころ}|に", "因为这个世界，总会向那颗永不放弃的心"),
  mmt("答{こた}え|じゃなく　|道{みち}|を|探{さが}す|手掛{てが}かり|を|くれる|から", "给予的并不是答案，而是寻找前路的线索"),
  mmt("最後{さいご}|まで|強気{つよき}|で|行{い}こう", "所以直到最后，都要满怀勇气地向前走！"),
  mmt("踊{おど}れ|踊{おど}れ　|熱{あつ}く|なる|ため|人{ひと}|は|生{う}まれてきた|の？", "舞动吧　舞动吧，人们是否正是为了燃烧热情，才来到这个世界？"),
  mmt("踊{おど}れ|踊{おど}れ　|きっと|そう|だ|よ", "舞动吧　舞动吧，一定就是这样吧"),
  mmt("だから|夢見{ゆめみ}て|踊{おど}ろう", "所以怀抱梦想，一起舞动吧！"),
  mmt("My|舞{まい}☆|tonight|（Dancing tonight）|最高{さいこう}|の", "MY舞☆TONIGHT（DANCING TONIGHT）　让今天成为最棒的一天！"),
  mmt("My|舞{まい}☆|tonight|（Dancing tonight）|今日{きょう}|に|しよう", "MY舞☆TONIGHT（DANCING TONIGHT）　就让今天闪耀起来吧！"),
  mmt("いつか|広{ひろ}がる|だろう　|ほら|大{おお}きく|広{ひろ}がれ", "总有一天会不断延展开吧，来吧，再向更远的地方延伸"),
  mmt("頑張{がんば}る|力{ちから}|奇跡{きせき}|を|呼{よ}んでる", "拼尽全力的这份力量，正在呼唤着奇迹"),
  mmt("この|世界{せかい}|の|中{なか}|で　|輝{かがや}きたい|心{こころ}|が", "在这个世界之中，那一颗颗渴望闪耀的心"),
  mmt("集{あつ}まる|時{とき}　|新{あたら}しい|こと|思{おも}いつき", "当它们汇聚在一起，便会迸发出崭新的想法"),
  mmt("走{はし}り出{だ}す　|足元{あしもと}|が|見{み}えない|けど", "然后立刻向前奔跑，即使还看不清脚下的道路"),
  mmt("羽{はね}|みたい|に|手{て}|伸{の}ばして", "也要像展开翅膀一样，把双手伸向远方"),
  mmt("踊{おど}れ|踊{おど}れ　|憧{あこが}れた|の|は|ずっと|瞬{またた}く|光{ひかり}", "舞动吧　舞动吧，我们一直憧憬着的，是那永远闪烁的光芒"),
  mmt("踊{おど}れ|踊{おど}れ　|きっと|いつか|は", "舞动吧　舞动吧，相信总有一天"),
  mmt("叶{かな}う|はず|だ|と|踊{おど}ろう", "梦想一定能够实现，所以现在就尽情舞动吧！"),
  mmt("My|舞{まい}☆|tonight|（Dancing tonight）|明日{あした}|へ|と", "MY舞☆TONIGHT（DANCING TONIGHT）　向着明天前进"),
  mmt("My|舞{まい}☆|tonight|（Dancing tonight）|繋{つな}げよう", "MY舞☆TONIGHT（DANCING TONIGHT）　把这一刻与未来连接起来吧！"),
  mmt("胸{むね}|の|声{こえ}|に|導{みちび}かれて　|道{みち}|が|また|開{ひら}けた|よ", "跟随着胸口传来的声音，眼前又有一条道路打开了"),
  mmt("最後{さいご}|まで|強気{つよき}|で|いこう", "所以直到最后，都要满怀勇气地向前走！"),
  mmt("踊{おど}れ|踊{おど}れ　|熱{あつ}く|なる|ため|人{ひと}|は|生{う}まれてきた|の？", "舞动吧　舞动吧，人们是否正是为了燃烧热情，才来到这个世界？"),
  mmt("踊{おど}れ|踊{おど}れ　|きっと|そう|だ|よ", "舞动吧　舞动吧，一定就是这样吧"),
  mmt("だから|夢見{ゆめみ}て|踊{おど}ろう", "所以怀抱梦想，一起舞动吧！"),
  mmt("My|舞{まい}☆|tonight|（Dancing tonight）|最高{さいこう}|の", "MY舞☆TONIGHT（DANCING TONIGHT）　让今天成为最棒的一天！"),
  mmt("My|舞{まい}☆|tonight|（Dancing tonight）|今日{きょう}|に|しよう", "MY舞☆TONIGHT（DANCING TONIGHT）　就让今天闪耀起来吧！"),
  mmt("My|舞{まい}☆|tonight|（Dancing tonight）", "MY舞☆TONIGHT（DANCING TONIGHT）", true),
  mmt("My|舞{まい}☆|tonight|（Dancing tonight）", "MY舞☆TONIGHT（DANCING TONIGHT）", true),
];

const soraKokoroLyrics: LyricLine[] = [
  cl("うまく|いかなくて", "事事不尽人意"),
  cl("泣{な}きそうに|なる|時{とき}は", "在泪水即将夺眶而出之时"),
  cl("くちびる|噛{か}みつつ|願{ねが}うんだ", "咬紧嘴唇默默祈祷"),
  cl("「あしたは|晴{は}れ」", "明天会放晴吧"),
  cl("繋{つな}がりそうで", "我们似乎心心相印"),
  cl("繋{つな}がらないの|心{こころ}と|心{こころ}", "却又无法紧密相连"),
  cl("船{ふね}が|夕焼{ゆうや}けを|渡{わた}るよ", "千帆驶过黄昏景"),
  cl("悩{なや}みを|持{も}ち|去{さ}るように", "好像能把烦恼带离远去"),
  cl("私{わたし}は|まだまだ|頑張{がんば}れる", "我还能继续努力下去"),
  cl("消{き}える|波{なみ}に|語{かた}ろうか", "向褪去的海浪如此诉说吧"),
  cl("ほら|もう|大丈夫{だいじょうぶ}", "你看已经没事了"),
  cl("家{いえ}まで|走{はし}って|行{い}こう", "就这样一直奔跑回家吧"),
  cl("面白{おもしろ}いこと|したくなったと", "突然想做些有趣的事情"),
  cl("君{きみ}に|伝{つた}えなくちゃ", "一定要传达给你才行"),
  cl("家{いえ}に|帰{かえ}ったら", "等我回到家后"),
  cl("動{うご}き|始{はじ}めたら", "开始行动之后"),
  cl("楽{たの}しく|なるけど", "虽然变得很开心"),
  cl("壁{かべ}に|ぶつかる|いっぱい", "但前方总是荆棘丛生"),
  cl("どうする?", "该怎么做"),
  cl("いま|考{かんが}えても|しかたない", "即使现在思考也于事无补"),
  cl("「あしたよ|晴{は}れ」", "明天快放晴吧"),
  cl("それでも|今日{きょう}が|終{お}わり", "即便如此今天结束"),
  cl("次{つぎ}の|日{ひ}を|迎{むか}えたら", "迎接来明天之后"),
  cl("また|泣{な}きそうに|なってるの?", "还会变得想要哭泣吗"),
  cl("いいよ|今度{こんど}は|もっと|素早{すばや}く", "没关系 这次一定会更快地"),
  cl("立{た}ち|直{なお}れるよ", "重振勇气"),
  cl("月{つき}が|眠{ねむ}りを|つれてくる", "明月捎来浅睡之意"),
  cl("優{やさ}しく|撫{な}でるように", "好似在温柔抚摸着我"),
  cl("私{わたし}は|まだまだ|頑張{がんば}れる", "我还能继续努力下去"),
  cl("ひとり|そっと|呟{つぶや}いた", "独自一人轻吟低诉"),
  cl("ほら|もう|大丈夫{だいじょうぶ}", "你看已经没事了"),
  cl("早{はや}めに|起{お}きようかな", "趁早起身吧"),
  cl("新{あたら}しいこと|したくなったと", "突然想要尝试全新的事物"),
  cl("君{きみ}に|伝{つた}えなくちゃ", "一定要传达给你才行"),
  cl("月{つき}が|眠{ねむ}りを|つれてくる", "明月捎来浅睡之意"),
  cl("優{やさ}しく|撫{な}でるように", "好似在温柔抚摸着我"),
  cl("私{わたし}は|まだまだ|頑張{がんば}れる", "我还能继续努力下去"),
  cl("ひとり|そっと|呟{つぶや}いた", "独自一人轻吟低诉"),
  cl("ほら|もう|大丈夫{だいじょうぶ}", "你看已经没事了"),
  cl("早{はや}めに|起{お}きようかな", "趁早起身吧"),
  cl("新{あたら}しいこと|したくなったと", "突然想要尝试全新的事物"),
  cl("君{きみ}に|伝{つた}えなくちゃ", "一定要传达给你才行"),
  cl("目覚{めざ}めたらね", "等我醒来之后"),
];

const waterBlueNewWorldLyrics: LyricLine[] = [
  wbnw("今{いま}|は|今{いま}|で|昨日{きのう}|と|違{ちが}う|よ", "此刻就是此刻，已经不同于昨日"),
  wbnw("明日{あした}|へ|の|途中{とちゅう}|じゃなく|今{いま}|は|今{いま}|だ|ね", "并非通往明日的途中，此刻就是此刻啊"),
  wbnw("この|瞬間{しゅんかん}|の|こと|が|重{かさ}なって|は|消{き}えてく", "这一瞬间不断交叠，又渐渐消逝"),
  wbnw("心{こころ}|に|刻{きざ}む|んだ |Water blue", "将这片水蓝铭刻在心中"),
  wbnw("悔{く}やみたく|なかった|気持{きも}ち|の|先{さき}|に", "在那份不愿留下遗憾的心意前方"),
  wbnw("広{ひろ}がった|世界{せかい}|を|泳{およ}いできた|の|さ", "我们一路游过了展现在眼前的世界"),
  wbnw("諦{あきら}めない", "绝不放弃！"),
  wbnw("言{い}う|だけ|で|は|叶{かな}わない", "梦想只靠说出口是无法实现的"),
  wbnw("動{うご}け", "行动起来！"),
  wbnw("動{うご}けば|変{か}わる|んだ|と|知{し}った|よ", "我终于明白，只要行动就能带来改变"),
  wbnw("ずっと|ここ|に|いたい|と|思{おも}ってる|けど", "虽然一直希望能够留在这里"),
  wbnw("きっと|旅立{たびだ}ってく|って|わかってる|んだ|よ", "但我也明白，终有一天必须启程"),
  wbnw("だから|この|時{とき}|を|楽{たの}しくしたい", "所以想让此刻充满快乐"),
  wbnw("最高{さいこう}|の|ときめき|を |胸{むね}|に|焼{や}き付{つ}けたい|から", "因为想把最美好的悸动深深烙印在心中"),
  wbnw("My new world", "我的崭新世界", true),
  wbnw("新{あたら}しい|場所{ばしょ} |探{さが}す|時{とき}|が|きた|よ", "寻找崭新天地的时刻已经到来"),
  wbnw("次{つぎ}|の|輝{かがや}き|へ|と|海{うみ}|を|渡{わた}ろう", "渡过大海，奔向下一道光芒吧"),
  wbnw("夢{ゆめ}|が|見{み}たい|想{おも}い|は |いつでも|僕{ぼく}たち|を", "渴望追寻梦想的心意，无论何时都将我们"),
  wbnw("繋{つな}いでくれる|から|笑{わら}って|いこう", "紧紧连结在一起，所以让我们笑着前行吧"),
  wbnw("今{いま}|を|重{かさ}ね |そして|未来{みらい}|へ|向{む}かおう", "将一个个此刻累积起来，然后迈向未来吧！"),
  wbnw("時{とき}|は|今日{きょう}|も|過{す}ぎてく", "时光今天也在不断流逝"),
  wbnw("止{と}められない|と|気{き}|が|付{つ}いた|僕{ぼく}ら|は", "察觉到它无法停下脚步的我们"),
  wbnw("どこ|へ|向{む}かう|の？", "接下来将去往何方？"),
  wbnw("大丈夫{だいじょうぶ} |いつだって|思{おも}い出{だ}せる|よ", "没关系，无论何时都能回想起来"),
  wbnw("駆{か}け抜{ぬ}けてきた |素晴{すば}らしい|季節{きせつ}|を", "那段一同飞奔走过的美好季节"),
  wbnw("ずっと|ここ|に|いたい|ね |好{す}き|だ|よ|みんな", "真想永远留在这里，我最喜欢大家了"),
  wbnw("でも|ね|旅立{たびだ}ってく|って|分{わ}かってる|んだ|よ", "但我明白，我们终究还是要启程"),
  wbnw("たくさん|頑張{がんば}ってきた|時間{じかん}|が|愛{いと}しい", "那些一路努力走来的时光令人眷恋"),
  wbnw("最高{さいこう}|の|繋{つな}がり|を |いつまでも|大事{だいじ}にしよう", "让我们永远珍惜这份最美好的羁绊"),
  wbnw("My new world", "我的崭新世界", true),
  wbnw("また|ココロ|が|躍{おど}るような|日々{ひび}|を", "还想再次追寻那些令心灵雀跃的日子"),
  wbnw("追{お}いかけたい|気持{きも}ち|で|海{うみ}|を|渡{わた}ろう", "怀着这份心情渡过大海吧"),
  wbnw("夢{ゆめ}|は|夢{ゆめ}|の|ように|過{す}ごす|だけ|じゃなくて", "梦想并不是只要如梦一般度过时光"),
  wbnw("痛{いた}み|抱{かか}えながら|求{もと}める|もの|さ", "而是即使怀抱痛楚，也仍要不断追寻"),
  wbnw("今{いま}|は|今{いま}|で|昨日{きのう}|と|違{ちが}う|よ", "此刻就是此刻，已经不同于昨日"),
  wbnw("明日{あした}|へ|の|途中{とちゅう}|じゃなく |今{いま}|は|今{いま}|だ|ね", "并非通往明日的途中，此刻就是此刻啊"),
  wbnw("この|瞬間{しゅんかん}|の|こと|が|重{かさ}なって|は|消{き}えてく", "这一瞬间不断交叠，又渐渐消逝"),
  wbnw("ココロ|に|刻{きざ}む|んだ |Water blue", "将这片水蓝铭刻在心中"),
  wbnw("New world", "崭新世界", true),
  wbnw("新{あたら}しい|場所{ばしょ} |探{さが}す|時{とき}|が|来{き}た|よ", "寻找崭新天地的时刻已经到来"),
  wbnw("次{つぎ}|の|輝{かがや}き|へ|と|海{うみ}|を|渡{わた}ろう", "渡过大海，奔向下一道光芒吧"),
  wbnw("夢{ゆめ}|が|見{み}たい|想{おも}い|は |いつでも|僕{ぼく}たち|を", "渴望追寻梦想的心意，无论何时都将我们"),
  wbnw("つないでくれる|から|笑{わら}って|いこう", "紧紧连结在一起，所以让我们笑着前行吧"),
  wbnw("ココロ|に|刻{きざ}む|んだ |この|瞬間{しゅんかん}|の|こと|を", "将这一瞬间铭刻在心中"),
  wbnw("ココロ|に|刻{きざ}む|んだ |この|瞬間{しゅんかん}|の|こと|を |僕{ぼく}ら|の|こと|を", "将这一瞬间、将属于我们的故事铭刻在心中"),
  wbnw("今{いま}|を|重{かさ}ね |そして|未来{みらい}|へ|向{む}かおう", "将一个个此刻累积起来，然后迈向未来吧！"),
];

const eternalDreamLine: LyricLine = {
  words: [
    yw("yu-me-wa", "梦想", s("ユメは")), yw("o-wa-n-na-i-yo", "不会结束", s("終", "お"), s("わんないよ")),
    yw("ki-mi-mo-bo-ku-mo", "你我皆是", s("（"), s("君", "きみ"), s("も"), s("僕", "ぼく"), s("も） ")),
    yw("yu-me-mi-ta-ma-ma-de", "保持心存梦想", s("ユメ"), s("見", "み"), s("たままで")),
    yw("ka-ga-ya-ko-u", "闪耀吧", s("（"), s("輝", "かがや"), s("こう）")),
  ],
  zh: "梦想是不会结束的（你我皆是）保持心存梦想（闪耀吧）",
};
const eternalHappyLine: LyricLine = {
  words: [yw("ta-no-shi-i", "开心快乐的", s("楽", "たの"), s("しい")), yw("ki-mo-chi-o", "心情", s("キモチを ")), yw("zu-t-to-zu-t-to", "永远永远", s("ずっとずっと")), yw("da-i-ji-ni", "珍惜", s("大事", "だいじ"), s("に"))],
  zh: "开心快乐的心情要永远永远珍惜",
};
const eternalTogetherLine: LyricLine = {
  words: [yw("ko-re-ka-ra-mo", "从今以后也", s("これからも")), yw("i-s-sho-ni", "一起", s("一緒", "いっしょ"), s("に")), yw("i-ta-i", "想要相伴", s("いたい"))],
  zh: "从今以后也想和你在一起",
};
const eternalDreamTogetherLine: LyricLine = {
  words: [
    yw("yu-me-wa", "梦想", s("ユメは")), yw("o-wa-n-na-i-yo", "不会结束", s("終", "お"), s("わんないよ")),
    yw("ki-mi-to-bo-ku-wa", "你我皆是", s("（"), s("君", "きみ"), s("と"), s("僕", "ぼく"), s("は） ")),
    yw("yu-me-mi-ta-ma-ma-sa", "保持心存梦想", s("ユメ"), s("見", "み"), s("たままさ")),
    yw("ka-ga-ya-ko-u", "闪耀吧", s("（"), s("輝", "かがや"), s("こう）")),
  ],
  zh: "梦想是不会结束的（你我皆是）保持心存梦想（闪耀吧）",
};
const eternalConnectedLine: LyricLine = {
  words: [yw("ta-no-shi-i", "开心快乐的", s("楽", "たの"), s("しい")), yw("ki-mo-chi-de", "心情", s("キモチで ")), yw("zu-t-to-zu-t-to", "永远永远", s("ずっとずっと")), yw("tsu-na-ga-ru-no-sa", "连结在一起", s("つながるのさ"))],
  zh: "用开心快乐的心情永远永远连结在一起",
};
const eternalRememberLine: LyricLine = {
  words: [yw("wa-su-re-na-i-de", "可别忘记", s("忘", "わす"), s("れないで ")), yw("wa-su-re-na-i", "不会忘记", s("忘", "わす"), s("れない"))],
  zh: "可别忘记 不会忘记的！",
};

const eternalHoursLyrics: LyricLine[] = [
  { words: [yw("wa-su-re-na-i-de", "不要忘记", s("忘", "わす"), s("れないで ")), yw("wa-su-re-na-i-yo", "不会忘记哟", s("忘", "わす"), s("れないよ"))], zh: "不要忘记 不会忘记哟！" },
  { words: [yw("ka-zo-e-ta-ra", "数起来的话", s("数", "かぞ"), s("えたら")), yw("ki-ri-ga-na-i", "没完没了", s("キリがない ")), yw("na-i-na-i-yo-ne", "数不清，对吧", s("ない ない よね?"))], zh: "数起来就会没完没了吧！数不清！数不清！对吧？" },
  { words: [yw("i-ron-na", "各种各样的", s("いろんな")), yw("ko-to-ga", "事情", s("ことが")), yw("a-ri-su-gi-te", "发生得太多", s("ありすぎて"))], zh: "发生了太多太多事情" },
  { words: [yw("ha-ji-ma-ri-da-t-te-sa", "要说开始的话", s("はじまりだってさ ")), yw("i-tsu-ka-ra", "从什么时候", s("いつから")), yw("nan-da-ro-u-t-te", "究竟是何时呢", s("なんだろうって"))], zh: "要说开始的话 是从什么时候开始的呢" },
  { words: [yw("nan-ka-i-mo", "一遍又一遍", s("何回", "なんかい"), s("も")), yw("o-mo-i-de-o", "回忆", s("思", "おも"), s("い"), s("出", "で"), s("を")), yw("na-zo-t-ta", "反复追忆", s("なぞった"))], zh: "一遍又一遍回忆了无数次" },
  { words: [yw("de-ki-na-i", "做不到", s("できない")), yw("ri-yu-u", "理由", s("理由", "りゆう")), yw("ba-i-ba-i-da", "说再见吧", s("?バイバイだ ")), yw("gan-ba-c-cha-u-t-te-sa", "我会加油的", s("がんばっちゃうってさ"))], zh: "和做不到的理由说再见吧 我会加油的" },
  { words: [yw("ka-na-e-ta-i", "想要实现", s("叶", "かな"), s("えたい")), yw("o-mo-i", "心意", s("想", "おも"), s("い")), yw("ha-na-shi-ta-yo-ne", "说出来了呢", s("話", "はな"), s("したよね"))], zh: "说出了想要实现的心意呢" },
  { words: [yw("ha-ji-ma-t-te-ta-n-da-yo", "已经开始了", s("はじまってたんだよ ")), yw("ki-ga-tsu-i-ta", "注意到", s("気", "き"), s("がついた")), yw("to-ki-ni-wa", "当……的时候", s("ときには"))], zh: "当我注意到的时候 一切就已经开始了" },
  { words: [yw("a-shi-ta-e-to", "向着明日", s("明日", "あした"), s("へと")), yw("ka-ke-da-shi-te-ta", "飞驰而出", s("駆", "か"), s("けだしてた"))], zh: "向着明日飞驰而出吧" },
  { words: [yw("so-ra-wa", "天空", s("空", "そら"), s("は")), yw("hi-ro-i-t-te", "宽广无比", s("広", "ひろ"), s("いって")), yw("shi-t-te-ta-ke-do", "虽说早已知道", s("知", "し"), s("ってたけど"))], zh: "虽说早就知道天空宽广无比" },
  { words: [yw("kon-na-ni-mo", "原来如此", s("こんなにも")), yw("a-o-ka-t-ta-n-da-ne", "湛蓝啊", s("青", "あお"), s("かったんだね"))], zh: "但原来它还如此湛蓝啊" },
  { words: [yw("i-tsu-mo-no", "一如既往的", s("いつもの")), yw("u-mi", "大海", s("海", "うみ"), s(" ")), yw("i-tsu-mo-no", "熟悉的", s("いつもの")), yw("ba-sho-ga", "地方", s("場所", "ばしょ"), s("が"))], zh: "一如既往的大海 那熟悉的地方" },
  { words: [yw("bo-ku-ra-o", "你我、我们", s("僕", "ぼく"), s("らを")), yw("ma-t-te-ru-yo", "等待着", s("待", "ま"), s("ってるよ ")), yw("i-tsu-ma-de-mo", "永远", s("いつまでも"))], zh: "它们永远都在等待着你我" },
  eternalDreamLine,
  eternalHappyLine,
  eternalTogetherLine,
  eternalDreamTogetherLine,
  eternalConnectedLine,
  eternalRememberLine,
  { words: [yw("ko-e-wa-o-o-ki-ku", "声音洪亮", s("声", "こえ"), s("は"), s("大", "おお"), s("きく ")), yw("ge-n-ki-ni", "元气地", s("元気", "げんき"), s("に")), yw("ha-i-ha-i-ha-i-da-yo", "喊出是是是", s("ハイハイハイだよ"))], zh: "声音洪亮！元气地喊出是是是！是啊！" },
  { words: [yw("to-do-ke-ta-i", "想传达的", s("届", "とど"), s("けたい")), yw("u-ta", "歌", s("歌", "うた"), s(" ")), yw("to-do-i-ta-ka-na", "传达到了吗", s("届", "とど"), s("いたかな"))], zh: "想传达的歌 传达到了吗" },
  { words: [yw("ha-ji-ma-t-te-ta-n-da-ne", "原来已经开始了", s("はじまってたんだね ")), yw("de-a-e-ta", "相遇", s("出会", "であ"), s("えた")), yw("to-ki-ka-ra", "从那一刻起", s("ときから"))], zh: "原来从相遇的那一刻起 就已经开始了呢" },
  { words: [yw("ya-t-to-i-ma", "现在终于", s("やっといま")), yw("ji-k-kan-shi-cha-t-ta-yo", "有所实感了", s("実感", "じっかん"), s("しちゃったよ"))], zh: "我现在终于有所实感了" },
  { words: [yw("ko-ko-ro-no", "心中的", s("こころの")), yw("yu-u-ki", "勇气", s("勇気", "ゆうき"), s(" ")), yw("ki-e-na-i-yo-u-ni", "不会消失", s("消", "き"), s("えないように"))], zh: "心中的勇气是不会消失的" },
  { words: [yw("ju-n-su-i-de", "纯洁地", s("純粋", "じゅんすい"), s("で")), yw("i-yo-u-yo", "保持吧", s("いようよ")), yw("bo-ku-ra", "我们", s("僕", "ぼく"), s("ら"))], zh: "我们要保持纯洁哟" },
  { words: [yw("i-tsu-mo-no", "一如既往的", s("いつもの")), yw("u-mi", "大海", s("海", "うみ"), s(" ")), yw("i-tsu-mo-no", "熟悉的", s("いつもの")), yw("ba-sho-e", "去往地方", s("場所", "ばしょ"), s("へ"))], zh: "去往一如既往的大海 那熟悉的地方" },
  { words: [yw("ha-zu-ka-shi-ku-na-i", "不会羞耻的", s("恥", "は"), s("ずかしくない")), yw("ji-bu-n-de", "自己", s("自分", "じぶん"), s("で")), yw("i-ta-i-ka-ra", "因为想成为", s("いたいから"))], zh: "因为我想做一个不会羞耻的自己" },
  { words: [yw("yu-me-o-o-i-ka-ke-te", "追逐梦想吧", s("ユメを"), s("追", "お"), s("いかけて")), yw("ki-mi-mo-bo-ku-mo", "你我皆是", s("（"), s("君", "きみ"), s("も"), s("僕", "ぼく"), s("も） ")), yw("yu-me-no-chi-ka-ra-de", "用梦想的力量", s("ユメのチカラで")), yw("ka-ga-ya-ko-u", "闪耀吧", s("（"), s("輝", "かがや"), s("こう）"))], zh: "追逐梦想吧（你我皆是）用梦想的力量（闪耀吧）" },
  { words: [yw("da-i-su-ki", "自己的热爱", s("ダイスキ")), yw("shi-n-ji-ru", "相信", s("信", "しん"), s("じる ")), yw("zu-t-to-zu-t-to", "一直一直", s("ずっとずっと")), yw("shi-n-ji-te", "相信下去", s("信", "しん"), s("じて"))], zh: "将自己的热爱一直一直相信下去" },
  { words: [yw("ko-re-ka-ra-mo", "从今往后也", s("これからも")), yw("i-s-sho-ni", "一起", s("一緒", "いっしょ"), s("に")), yw("i-yo-u", "相伴吧", s("いよう"))], zh: "从今往后也要在一起哟" },
  { words: [yw("yu-me-o-o-i-ka-ke-te", "追逐梦想吧", s("ユメを"), s("追", "お"), s("いかけて")), yw("ki-mi-to-bo-ku-no", "你我皆是", s("（"), s("君", "きみ"), s("と"), s("僕", "ぼく"), s("の） ")), yw("yu-me-wa-chi-ka-ra-sa", "梦想就是力量", s("ユメはチカラさ")), yw("ka-ga-ya-ko-u", "闪耀吧", s("（"), s("輝", "かがや"), s("こう）"))], zh: "追逐梦想吧（你我皆是）梦想就是力量（闪耀吧）" },
  { words: [yw("da-i-su-ki", "自己的热爱", s("ダイスキ")), yw("shi-n-ji-ru", "相信", s("信", "しん"), s("じる ")), yw("zu-t-to-zu-t-to", "一直一直", s("ずっとずっと")), yw("shi-n-ji-na-ga-ra", "持续相信", s("信", "しん"), s("じながら"))], zh: "将自己的热爱一直一直相信下去" },
  { words: [yw("ne-ga-u-no-wa", "我希望", s("願", "ねが"), s("うのは ")), yw("ne-ga-u-no-wa", "我所希望的是", s("願", "ねが"), s("うのは")), yw("ki-mi-to-no", "和你一起的", s("君", "きみ"), s("との")), yw("shi-a-wa-se-na", "幸福", s("しあわせな"))], zh: "我希望 我所希望的是和你在一起的幸福" },
  { words: [yw("ji-ka-n", "时光", s("（"), s("時間", "じかん")), yw("tsu-zu-i-te", "延续", s("続", "つづ"), s("いて")), yw("mo-t-to-mo-t-to", "更加长久、更多", s("もっと もっと")), yw("wa-ra-t-te-ta-i-ne", "还想要欢笑", s("笑", "わら"), s("ってたいね）"))], zh: "（时光能更加长久 还想要更多欢笑）" },
  { words: [yw("wa-ra-t-te-i-ta-i-ka-ra", "因为想要露出笑容", s("笑", "わら"), s("っていたいから"))], zh: "因为想要露出笑容…" },
  { words: [yw("yu-me-o-o-i-ka-ke-ta", "追逐梦想吧", s("ユメを"), s("追", "お"), s("いかけた"))], zh: "追逐梦想吧" },
  { words: [yw("yu-me-o-o-i-ka-ke-ta", "追逐梦想吧", s("ユメを"), s("追", "お"), s("いかけた"))], zh: "追逐梦想吧" },
  { words: [yw("ki-mi-to-no", "与你度过的", s("君", "きみ"), s("との")), yw("ji-ka-n-ga", "时光", s("時間", "じかん"), s("が")), yw("i-to-shi-i", "令人眷恋", s("愛", "いと"), s("しい ")), yw("i-to-shi-i", "难以忘怀", s("愛", "いと"), s("しいっ ")), yw("da-ki-shi-me-te", "紧紧拥抱", s("抱", "だ"), s("きしめて")), yw("ha-na-sa-na-i-yo", "不要放开哟", s("はなさないよ"))], zh: "与你度过的时光令人眷恋 难以忘怀 紧紧拥抱不要放开哟" },
  eternalDreamLine,
  eternalHappyLine,
  eternalTogetherLine,
  eternalDreamTogetherLine,
  eternalConnectedLine,
  eternalRememberLine,
  { words: [yw("wa-su-re-na-i-de", "切勿忘记", s("忘", "わす"), s("れないで ")), yw("wa-su-re-na-i-yo", "不会忘记", s("忘", "わす"), s("れないよ ")), yw("wa-su-re-na-i-yo", "不会忘记的哟", s("忘", "わす"), s("れないよ"))], zh: "切勿忘记 不会忘记 不会忘记的哟！！" },
];

export const songs: Record<string, Song> = {
  "kimi-no-kokoro": {
    slug: "kimi-no-kokoro",
    title: "君のこころは",
    titleAccent: "輝いてるかい？",
    titleCn: "你的心灵是否光芒闪耀？",
    artist: "Aqours",
    cover: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/%E5%90%9B%E3%81%AE%E3%81%93%E3%81%93%E3%82%8D%E3%81%AF%20%E8%BC%9D%E3%81%84%E3%81%A6%E3%82%8B%E3%81%8B%E3%81%84%EF%BC%9F3000x3000bb.jpg",
    audio: "/audio/kimi-no-kokoro.mp3",
    timing: "/audio/kimi-no-kokoro.yrc",
    backdrop: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/%E5%90%9B%E3%81%AE%E3%81%93%E3%81%93%E3%82%8D%E3%81%AF%20%E8%BC%9D%E3%81%84%E3%81%A6%E3%82%8B%E3%81%8B%E3%81%84%EF%BC%9F3000x3000bb.jpg",
    credits: { lyricist: "畑亜貴", composer: "光增ハジメ", arranger: "EFFY" },
    lyrics: kimiLyrics,
  },
  "yume-mirai": {
    slug: "yume-mirai",
    title: "ユメ+ミライ=",
    titleAccent: "無限大",
    titleCn: "梦想 + 未来 = 无限大",
    artist: "Aqours",
    cover: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/%E3%83%A6%E3%83%A1%2B%E3%83%9F%E3%83%A9%E3%82%A4%3D%20%E7%84%A1%E9%99%90%E5%A4%A73000x3000bb.jpg",
    audio: "/audio/yume-mirai.mp3",
    timing: "/audio/yume-mirai.yrc",
    backdrop: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/%E3%83%A6%E3%83%A1%2B%E3%83%9F%E3%83%A9%E3%82%A4%3D%20%E7%84%A1%E9%99%90%E5%A4%A73000x3000bb.jpg",
    credits: { lyricist: "畑亜貴", composer: "前迫潤哉 / サイトウリョースケ / 春川仁志", arranger: "サイトウリョースケ / 春川仁志" },
    lyrics: yumeLyrics,
  },
  "happy-party-train": {
    slug: "happy-party-train",
    title: "HAPPY PARTY",
    titleAccent: "TRAIN",
    titleCn: "快乐派对列车",
    artist: "Aqours",
    cover: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/HAPPY%20PARTY%20TRAIN3000x3000bb.jpg",
    audio: "/audio/happy-party-train.mp3",
    timing: "/audio/happy-party-train.yrc",
    backdrop: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/HAPPY%20PARTY%20TRAIN3000x3000bb.jpg",
    credits: { lyricist: "畑亜貴", composer: "渡辺拓也", arranger: "EFFY" },
    lyrics: happyPartyTrainLyrics,
  },
  "over-next-rainbow": {
    slug: "over-next-rainbow",
    title: "Over The Next",
    titleAccent: "Rainbow",
    titleCn: "跨越下一道彩虹",
    artist: "Saint Aqours Snow",
    cover: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/Over%20The%20Next%20Rainbow3000x3000bb.jpg",
    audio: "/audio/over-next-rainbow.mp3",
    timing: "/audio/over-next-rainbow.yrc",
    backdrop: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/Over%20The%20Next%20Rainbow3000x3000bb.jpg",
    credits: { lyricist: "畑亜貴", composer: "Kanata Okajima / TAKAROT", arranger: "TAKAROT / Shinji Tanaka" },
    lyrics: overNextRainbowLyrics,
  },
  "eternal-hours": {
    slug: "eternal-hours",
    title: "永久",
    titleAccent: "hours",
    titleCn: "永久时光",
    artist: "Aqours",
    cover: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/%E6%B0%B8%E4%B9%85hours3000x3000bb.jpg",
    audio: "/audio/eternal-hours.mp3",
    timing: "/audio/eternal-hours.yrc",
    backdrop: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/%E6%B0%B8%E4%B9%85hours3000x3000bb.jpg",
    credits: { lyricist: "畑亜貴", composer: "Kanata Okajima / Hayato Yamamoto", arranger: "Hayato Yamamoto" },
    lyrics: eternalHoursLyrics,
  },
  "aozora-jumping-heart": {
    slug: "aozora-jumping-heart",
    title: "青空",
    titleAccent: "Jumping Heart",
    titleCn: "青空跃动之心",
    artist: "Aqours",
    cover: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/%E9%9D%92%E7%A9%BAJumping%20Heart3000x3000bb.jpg",
    audio: "/audio/aozora-jumping-heart.mp3",
    timing: "/audio/aozora-jumping-heart.yrc",
    backdrop: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/%E9%9D%92%E7%A9%BAJumping%20Heart3000x3000bb.jpg",
    credits: { lyricist: "畑亜貴", composer: "伊藤賢 / 光増ハジメ", arranger: "EFFY" },
    lyrics: aozoraJumpingHeartLyrics,
  },
  "mirai-ticket": {
    slug: "mirai-ticket",
    title: "MIRAI",
    titleAccent: "TICKET",
    titleCn: "未来门票",
    artist: "Aqours",
    cover: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/MIRAI%20TICKET3000x3000bb.jpg",
    audio: "/audio/mirai-ticket.mp3",
    timing: "/audio/mirai-ticket.yrc",
    backdrop: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/MIRAI%20TICKET3000x3000bb.jpg",
    credits: { lyricist: "畑亜貴", composer: "EFFY", arranger: "EFFY" },
    lyrics: miraiTicketLyrics,
  },
  "yume-kataru-yori-yume-utaou": {
    slug: "yume-kataru-yori-yume-utaou",
    title: "ユメ語るより",
    titleAccent: "ユメ歌おう",
    titleCn: "与其诉说梦想 不如放声歌唱",
    artist: "Aqours",
    cover: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/%E3%83%A6%E3%83%A1%E8%AA%9E%E3%82%8B%E3%82%88%E3%82%8A%E3%83%A6%E3%83%A1%E6%AD%8C%E3%81%8A%E3%81%863000x3000bb.jpg",
    audio: "/audio/yume-kataru-yori-yume-utaou.mp3",
    timing: "/audio/yume-kataru-yori-yume-utaou.yrc",
    backdrop: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/%E3%83%A6%E3%83%A1%E8%AA%9E%E3%82%8B%E3%82%88%E3%82%8A%E3%83%A6%E3%83%A1%E6%AD%8C%E3%81%8A%E3%81%863000x3000bb.jpg",
    credits: { lyricist: "畑亜貴", composer: "山口朗彦", arranger: "山口朗彦" },
    lyrics: yumeKataruYoriLyrics,
  },
  "miracle-wave": {
    slug: "miracle-wave",
    title: "MIRACLE",
    titleAccent: "WAVE",
    titleCn: "奇迹浪潮",
    artist: "Aqours",
    cover: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/MIRACLE%20WAVE3000x3000bb.jpg",
    audio: "/audio/miracle-wave.mp3",
    timing: "/audio/miracle-wave.yrc",
    backdrop: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/MIRACLE%20WAVE3000x3000bb.jpg",
    credits: { lyricist: "畑亜貴", composer: "酒井拓也", arranger: "脇眞富" },
    lyrics: miracleWaveLyrics,
  },
  "my-mai-tonight": {
    slug: "my-mai-tonight",
    title: "MY舞☆",
    titleAccent: "TONIGHT",
    titleCn: "今夜献上属于我的舞蹈",
    artist: "Aqours",
    cover: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/MIRACLE%20WAVE3000x3000bb.jpg",
    audio: "/audio/my-mai-tonight.mp3",
    timing: "/audio/my-mai-tonight.yrc",
    backdrop: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/MIRACLE%20WAVE3000x3000bb.jpg",
    credits: { lyricist: "畑亜貴", composer: "EFFY", arranger: "EFFY" },
    lyrics: myMaiTonightLyrics,
  },
  "sora-mo-kokoro-mo-hareru-kara": {
    slug: "sora-mo-kokoro-mo-hareru-kara",
    title: "空も心も",
    titleAccent: "晴れるから",
    titleCn: "天空与心灵终会放晴",
    artist: "Aqours",
    cover: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/%E7%A9%BA%E3%82%82%E5%BF%83%E3%82%82%E6%99%B4%E3%82%8C%E3%82%8B%E3%81%8B%E3%82%893000x3000bb.jpg",
    audio: "/audio/sora-mo-kokoro-mo-hareru-kara.mp3",
    timing: "/audio/sora-mo-kokoro-mo-hareru-kara.yrc",
    backdrop: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/%E7%A9%BA%E3%82%82%E5%BF%83%E3%82%82%E6%99%B4%E3%82%8C%E3%82%8B%E3%81%8B%E3%82%893000x3000bb.jpg",
    credits: { lyricist: "畑亜貴", composer: "加藤達也", arranger: "加藤達也" },
    lyrics: soraKokoroLyrics,
  },
  "water-blue-new-world": {
    slug: "water-blue-new-world",
    title: "WATER BLUE",
    titleAccent: "NEW WORLD",
    titleCn: "水蓝色的新世界",
    artist: "Aqours",
    cover: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/WATER%20BLUE%20NEW%20WORLD3000x3000bb.jpg",
    audio: "/audio/water-blue-new-world.mp3",
    timing: "/audio/water-blue-new-world.yrc",
    backdrop: "https://jgox-image-1316409677.cos.ap-guangzhou.myqcloud.com/eternal-hours-project/WATER%20BLUE%20NEW%20WORLD3000x3000bb.jpg",
    credits: { lyricist: "畑亜貴", composer: "佐伯高志", arranger: "倉内達矢" },
    lyrics: waterBlueNewWorldLyrics,
  },
};

const alignable = (character: string) => /[\p{L}\p{N}]/u.test(character);
const normalized = (character: string) => character.normalize("NFKC").toLocaleLowerCase();
const formatTime = (milliseconds: number) => {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

function parseYrc(source: string): TimedCharacter[] {
  const characters: TimedCharacter[] = [];
  const tokenPattern = /\((\d+),(\d+),\d+\)([^([]*)/g;

  for (const line of source.split(/\r?\n/)) {
    tokenPattern.lastIndex = 0;
    for (const match of line.matchAll(tokenPattern)) {
      const start = Number(match[1]);
      const duration = Number(match[2]);
      const visible = Array.from(match[3]).filter(alignable);
      visible.forEach((text, index) => {
        const slice = duration / Math.max(visible.length, 1);
        characters.push({ text, start: start + slice * index, end: start + slice * (index + 1) });
      });
    }
  }

  return characters;
}

function collectDisplayCharacters(lyrics: LyricLine[]): DisplayCharacter[] {
  const characters: DisplayCharacter[] = [];
  lyrics.forEach((line, lineIndex) => line.words.forEach((word, wordIndex) => word.jp.forEach((part, partIndex) => {
    Array.from(part.text).forEach((text, characterIndex) => {
      if (alignable(text)) characters.push({ key: `${lineIndex}-${wordIndex}-${partIndex}-${characterIndex}`, text, lineIndex });
    });
  })));
  return characters;
}

function alignTimings(display: DisplayCharacter[], timed: TimedCharacter[], lyrics: LyricLine[]) {
  const width = timed.length + 1;
  const costs = new Uint16Array((display.length + 1) * width);
  const directions = new Uint8Array((display.length + 1) * width);
  for (let row = 1; row <= display.length; row++) { costs[row * width] = row; directions[row * width] = 1; }
  for (let column = 1; column <= timed.length; column++) { costs[column] = column; directions[column] = 2; }

  for (let row = 1; row <= display.length; row++) {
    for (let column = 1; column <= timed.length; column++) {
      const same = normalized(display[row - 1].text) === normalized(timed[column - 1].text);
      const diagonal = costs[(row - 1) * width + column - 1] + (same ? 0 : 2);
      const up = costs[(row - 1) * width + column] + 1;
      const left = costs[row * width + column - 1] + 1;
      const index = row * width + column;
      if (diagonal <= up && diagonal <= left) { costs[index] = diagonal; directions[index] = 0; }
      else if (up <= left) { costs[index] = up; directions[index] = 1; }
      else { costs[index] = left; directions[index] = 2; }
    }
  }

  const timingByKey = new Map<string, Timing>();
  let row = display.length;
  let column = timed.length;
  while (row > 0 || column > 0) {
    const direction = directions[row * width + column];
    if (row > 0 && column > 0 && direction === 0) {
      if (normalized(display[row - 1].text) === normalized(timed[column - 1].text)) {
        timingByKey.set(display[row - 1].key, timed[column - 1]);
      }
      row--; column--;
    } else if (row > 0 && (column === 0 || direction === 1)) row--;
    else column--;
  }

  const lineRanges = lyrics.map((_, lineIndex) => {
    const values = display.filter((character) => character.lineIndex === lineIndex).map((character) => timingByKey.get(character.key)).filter((value): value is Timing => Boolean(value));
    return values.length ? { start: Math.min(...values.map((value) => value.start)), end: Math.max(...values.map((value) => value.end)) } : null;
  });
  return { timingByKey, lineRanges };
}

function TimedText({ text, timingPrefix, currentMs, timingByKey }: { text: string; timingPrefix: string; currentMs: number; timingByKey: Map<string, Timing> }) {
  return Array.from(text).map((character, characterIndex) => {
    const timing = timingByKey.get(`${timingPrefix}-${characterIndex}`);
    const progress = timing ? Math.max(0, Math.min(100, ((currentMs - timing.start) / Math.max(timing.end - timing.start, 1)) * 100)) : 0;
    const state = timing && currentMs >= timing.end ? " is-sung" : timing && currentMs >= timing.start ? " is-current" : "";
    return <span className={`timed-character${state}`} data-character={character} style={{ "--character-progress": `${progress}%` } as React.CSSProperties} key={characterIndex}>{character}</span>;
  });
}

function JapaneseWord({ word, lineIndex, wordIndex, currentMs, timingByKey }: { word: Word; lineIndex: number; wordIndex: number; currentMs: number; timingByKey: Map<string, Timing> }) {
  return <span className="word-jp">{word.jp.map((part, partIndex) => {
    const text = <TimedText text={part.text} timingPrefix={`${lineIndex}-${wordIndex}-${partIndex}`} currentMs={currentMs} timingByKey={timingByKey} />;
    return part.reading ? <ruby key={partIndex}>{text}<rt>{part.reading}</rt></ruby> : <span key={partIndex}>{text}</span>;
  })}</span>;
}

const WordBlock = memo(function WordBlock({ word, lineIndex, wordIndex, currentMs, timingByKey }: { word: Word; lineIndex: number; wordIndex: number; currentMs: number; timingByKey: Map<string, Timing> }) {
  return (
    <span className="word-block">
      <JapaneseWord word={word} lineIndex={lineIndex} wordIndex={wordIndex} currentMs={currentMs} timingByKey={timingByKey} />
      <span className="word-romaji" lang="ja-Latn">{word.romaji}</span>
      <span className="word-meaning" lang="zh-CN">{word.meaning}</span>
    </span>
  );
});

export default function SongReader({ songSlug }: { songSlug: string }) {
  const song = songs[songSlug] ?? songs["kimi-no-kokoro"];
  const lyrics = song.lyrics;
  const audioRef = useRef<HTMLAudioElement>(null);
  const readerRef = useRef<HTMLElement>(null);
  const lineRefs = useRef<(HTMLLIElement | null)[]>([]);
  const animationRef = useRef<number | null>(null);
  const lastClockUpdateRef = useRef(0);
  const [timedCharacters, setTimedCharacters] = useState<TimedCharacter[]>([]);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const displayCharacters = useMemo(() => collectDisplayCharacters(lyrics), [lyrics]);
  const { timingByKey, lineRanges } = useMemo(() => alignTimings(displayCharacters, timedCharacters, lyrics), [displayCharacters, timedCharacters, lyrics]);
  const activeLine = lineRanges.findIndex((range, index) => {
    if (!range || currentMs < range.start) return false;
    const next = lineRanges.slice(index + 1).find(Boolean);
    return !next || currentMs < next.start;
  });

  useEffect(() => { fetch(song.timing).then((response) => response.text()).then((text) => setTimedCharacters(parseYrc(text))).catch(() => setTimedCharacters([])); }, [song.timing]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncTheme = () => {
      const saved = localStorage.getItem("yomikana-theme");
      const nextTheme = saved === "light" || saved === "dark" ? saved : media.matches ? "dark" : "light";
      document.documentElement.dataset.theme = nextTheme;
      document.documentElement.style.colorScheme = nextTheme;
      setTheme(nextTheme);
    };
    syncTheme();
    media.addEventListener("change", syncTheme);
    return () => media.removeEventListener("change", syncTheme);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;

    loadAudio(song.audio, controller.signal)
      .then(({ blob }) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setAudioSrc(objectUrl);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setAudioSrc(song.audio);
      });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [song.audio]);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const syncDuration = () => setDurationMs(Number.isFinite(audio.duration) ? audio.duration * 1000 : 0);
    syncDuration();
    audio.addEventListener("loadedmetadata", syncDuration);
    audio.addEventListener("durationchange", syncDuration);
    return () => {
      audio.removeEventListener("loadedmetadata", syncDuration);
      audio.removeEventListener("durationchange", syncDuration);
    };
  }, []);
  useEffect(() => {
    if (!autoScroll || activeLine < 0) return;
    const reader = readerRef.current;
    const line = lineRefs.current[activeLine];
    if (!reader || !line) return;
    reader.scrollTo({ top: line.offsetTop - reader.clientHeight / 2 + line.clientHeight / 2, behavior: "smooth" });
  }, [activeLine, autoScroll]);
  useEffect(() => () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  }, []);

  const updateClock = () => {
    if (!audioRef.current) return;
    const audioMs = audioRef.current.currentTime * 1000;
    if (audioRef.current.paused || Math.abs(audioMs - lastClockUpdateRef.current) >= 30) {
      lastClockUpdateRef.current = audioMs;
      setCurrentMs(audioMs);
    }
    if (!audioRef.current.paused) animationRef.current = requestAnimationFrame(updateClock);
  };
  const beginClock = () => { setIsPlaying(true); if (animationRef.current) cancelAnimationFrame(animationRef.current); animationRef.current = requestAnimationFrame(updateClock); };
  const stopClock = () => { setIsPlaying(false); if (animationRef.current) cancelAnimationFrame(animationRef.current); updateClock(); };
  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) await audio.play();
    else audio.pause();
  };
  const seekToTime = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = seconds;
    lastClockUpdateRef.current = seconds * 1000;
    setCurrentMs(seconds * 1000);
  };
  const seekFromPointer = (event: React.PointerEvent<HTMLInputElement>) => {
    if (!durationMs) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    seekToTime(progress * durationMs / 1000);
  };
  const seekToLine = (lineIndex: number) => {
    const audio = audioRef.current;
    const range = lineRanges[lineIndex];
    if (!audio || !range) return;
    audio.currentTime = range.start / 1000;
    lastClockUpdateRef.current = range.start;
    setCurrentMs(range.start);
  };
  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    localStorage.setItem("yomikana-theme", nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
    setTheme(nextTheme);
  };

  return (
    <main className={`song-page song-${song.slug}`} style={{ "--song-backdrop": `url(${song.backdrop})` } as React.CSSProperties}>
      <header className="hero">
        {/* vinext currently duplicates React when hydrating next/link in this client reader. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="library-link" href="/" aria-label="返回歌词本"><ArrowLeft aria-hidden="true" /> <span>歌词本</span></a>
        <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={theme === "dark" ? "切换到浅色模式" : "切换到暗色模式"} title={theme === "dark" ? "浅色模式" : "暗色模式"} aria-pressed={theme === "dark"}>
          <Moon className="theme-icon theme-icon-moon" aria-hidden="true" />
          <Sun className="theme-icon theme-icon-sun" aria-hidden="true" />
        </button>
        <div className="hero-inner">
          <h1>{song.title}<br /><em>{song.titleAccent}</em></h1>
          <p className="title-cn">{song.titleCn}</p>
          <dl className="credits" aria-label="歌曲制作信息">
            <div><dt>作詞</dt><dd>{song.credits.lyricist}</dd></div>
            <div><dt>作曲</dt><dd>{song.credits.composer}</dd></div>
            <div><dt>編曲</dt><dd>{song.credits.arranger}</dd></div>
            <div><dt>演唱</dt><dd>{song.artist}</dd></div>
          </dl>
          <a className="start-link" href="#lyrics">开始阅读 <span aria-hidden="true">↓</span></a>
        </div>
      </header>
      <section className="reader" id="lyrics" aria-label="歌词正文">
        <div className="player-bar">
          {/* The synchronized, translated lyric transcript is rendered directly below the audio control. */}
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio ref={audioRef} className="audio-player" preload="metadata" loop src={audioSrc ?? undefined} data-source={song.audio} onPlay={beginClock} onPause={stopClock} onEnded={stopClock} onSeeked={updateClock}>你的浏览器不支持音频播放。</audio>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="mini-cover" src={song.cover} width="1400" height="1400" alt="" aria-hidden="true" />
          <button className="play-toggle" type="button" disabled={!audioSrc} onClick={togglePlayback} aria-label={isPlaying ? "暂停" : "播放"}>
            {isPlaying ? <Pause aria-hidden="true" /> : <Play className="play-icon" aria-hidden="true" />}
          </button>
          <div className="timeline">
            <span className="song-meta"><strong>{song.title}{song.titleAccent}</strong><span>{song.artist}</span>{!audioSrc && <span className="song-loading-status" role="status">歌曲加载中...</span>}</span>
            <input className="progress-slider" type="range" min="0" max={durationMs ? durationMs / 1000 : 0} step="0.01" value={currentMs / 1000} disabled={!durationMs} onInput={(event) => seekToTime(Number(event.currentTarget.value))} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); seekFromPointer(event); }} onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) seekFromPointer(event); }} onPointerUp={(event) => event.currentTarget.releasePointerCapture(event.pointerId)} aria-label="播放进度" style={{ "--progress": `${durationMs ? Math.min(100, currentMs / durationMs * 100) : 0}%` } as React.CSSProperties} />
            <span className="time-display"><span>{formatTime(currentMs)}</span><span>{formatTime(durationMs)}</span></span>
          </div>
          <button className={`scroll-toggle${autoScroll ? " is-on" : ""}`} type="button" aria-label={autoScroll ? "关闭自动跟随" : "开启自动跟随"} title={autoScroll ? "自动跟随已开启" : "自动跟随已关闭"} aria-pressed={autoScroll} onClick={() => setAutoScroll((value) => !value)}><ListRestart aria-hidden="true" /><span className="sr-only">自动跟随</span></button>
        </div>
        <ol className="lyrics-list" ref={readerRef}>
          {lyrics.map((line, lineIndex) => (
            <li className={`lyric-line${line.aside ? " is-aside" : ""}${lineIndex === activeLine ? " is-active" : ""}`} key={lineIndex} ref={(element) => { lineRefs.current[lineIndex] = element; }}>
              <span className="line-number" aria-hidden="true">{String(lineIndex + 1).padStart(2, "0")}</span>
              <button className="line-content line-seek" type="button" disabled={!lineRanges[lineIndex]} onClick={() => seekToLine(lineIndex)} aria-label={`跳转到第 ${lineIndex + 1} 句：${line.zh}`}>
                <span className="word-strip" lang="ja">{line.words.map((word, wordIndex) => {
                  const range = lineRanges[lineIndex];
                  const lineClock = !range ? 0 : currentMs < range.start ? range.start - 1 : currentMs > range.end ? range.end + 1 : currentMs;
                  return <WordBlock word={word} lineIndex={lineIndex} wordIndex={wordIndex} currentMs={lineClock} timingByKey={timingByKey} key={wordIndex} />;
                })}</span>
                <span className="translation" lang="zh-CN">{line.zh}</span>
              </button>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
