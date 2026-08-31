"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ListRestart, Moon, Pause, Play, Sun } from "lucide-react";

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

const yumeLyrics: LyricLine[] = [
  { words: [yw("u-mi", "海", s("海", "うみ")), yw("no", "的", s("の")), yw("ko-do-u", "心跳、律动", s("鼓動", "こどう")), yw("a-o-i", "蓝色的", s(" "), s("青", "あお"), s("い")), yw("ka-ze", "风", s("風", "かぜ")), yw("ni", "向、在", s("に")), yw("to-ke-te-ku", "渐渐融化、融入", s("とけてく"))], zh: "海的心跳，融于湛蓝清风中" },
  { words: [yw("i-ron-na", "各种各样的", s("いろんな")), yw("o-mo-i-de", "回忆", s("思", "おも"), s("い"), s("出", "で"))], zh: "数不尽的回忆" },
  { words: [yw("ma-t-te", "飞舞着", s("舞", "ま"), s("って")), yw("wa", "主题助词", s("は")), yw("ton-de-i-t-ta", "飞散而去", s("飛", "と"), s("んでいった"))], zh: "舞于空中，飞散而去" },
  { words: [yw("do-re", "哪一个", s("どれ")), yw("mo", "也、都", s("も")), yw("min-na", "全部、大家", s("みんな")), yw("da-i-ji", "重要、珍贵", s("大事", "だいじ")), yw("da-ka-ra", "因为", s("だから"))], zh: "所有的一切，在我心底都是最重要的" },
  { words: [yw("ma-da-ma-da", "还想继续", s("まだまだ")), yw("ka-sa-ne-ta-i", "想要重叠、累积", s("重", "かさ"), s("ねたい"))], zh: "我仍愿能与你心意重叠" },
  { words: [yw("ne-ga-i", "心愿", s("願", "ねが"), s("い")), yw("o", "宾语助词", s("を")), yw("ka-na-e-ru", "使愿望实现", s("叶", "かな"), s("える")), yw("u-re-shi-sa", "喜悦", s("嬉", "うれ"), s("しさ"))], zh: "若心愿能实现，那该有多么开心" },
  { words: [yw("ko-ko-ro", "心、心意", s("ココロ")), yw("tsu-na-ga-t-te", "相连", s("繋", "つな"), s("がって")), yw("se-ka-i", "世界", s(" "), s("セカイ")), yw("ga", "主语助词", s("が")), yw("hi-ro-ga-t-te", "延伸、展开", s("広", "ひろ"), s("がって"))], zh: "心心相连，世界不断延伸" },
  { words: [yw("mi-e-ta", "看见了", s("見", "み"), s("えた")), yw("to-o-i", "遥远的", s("遠", "とお"), s("い")), yw("so-ra", "天空", s("空", "そら"))], zh: "领略高远的蓝天" },
  { words: [yw("ta-chi-a-ga-ru", "振作站起", s("立", "た"), s("ちあがる")), yw("yu-u-ki", "勇气", s("勇気", "ゆうき")), yw("no", "的", s("の")), yw("a-to", "之后", s("あと")), yw("wa", "主题助词", s("は"))], zh: "鼓起振作站起的勇气" },
  { words: [yw("ma-e", "前方", s("前", "まえ")), yw("e", "向、往", s("へ")), yw("to", "方向助词", s("と")), yw("su-su-mu", "前进", s("進", "すす"), s("む")), yw("yu-u-ki", "勇气", s("勇気", "ゆうき")), yw("da-yo", "就是哦", s("だよ"))], zh: "接下来，便需要不断向前的勇气了" },
  { words: [yw("ma-zu", "首先", s("まず")), yw("wa-ra-t-te", "笑一笑", s("笑", "わら"), s("って")), yw("sa", "语气词", s("さ"))], zh: "先笑一笑吧" },
  { words: [yw("gu-u", "握拳、加油动作", s("グー")), yw("shi-te", "做、摆出", s("して")), yw("e-i-e-i", "嘿咻、加油声", s("エイエイッ")), yw("ya-a", "呐喊声", s("やーっ"))], zh: "失意受挫后，也要为自己鼓劲", aside: true },
  { words: [yw("da-i-jo-u-bu", "没问题、不要紧", s("大丈夫", "だいじょうぶ")), yw("da-yo", "哦、呀", s("だよ"))], zh: "一切都会好的" },
  { words: [yw("yu-me", "梦想", s("ユメ")), yw("wa", "主题助词", s("は")), yw("mu-ge-n-da-i", "无限大", s("無限大", "むげんだい"))], zh: "梦想，是无限大的" },
  { words: [yw("a-ki-ra-me-na-i", "不放弃", s("あきらめない")), yw("ka-gi-ri", "只要、在……限度内", s("限", "かぎ"), s("り")), yw("tsu-zu-ku", "延续", s("続", "つづ"), s("く")), yw("n-da", "说明、强调", s("んだ"))], zh: "只要不放弃，便会永远延续" },
  { words: [yw("ya-ri-ta-i", "想做、想完成", s("やりたい")), yw("ko-to", "事情", s("こと")), yw("ga", "主语助词", s("が")), yw("kyo-u", "今天", s("今日", "きょう")), yw("mo", "也", s("も")), yw("u-ma-re", "诞生", s("生", "う"), s("まれ"))], zh: "今天，脑海中也诞生了想完成的事情" },
  { words: [yw("o-do-ri-ta-ku", "想要跳舞", s("踊", "おど"), s("りたく")), yw("na-ru", "变得", s("なる")), yw("n-da", "说明、强调", s("んだ"))], zh: "让我想跳起舞步" },
  { words: [yw("yu-me", "梦想", s("ユメ")), yw("wa", "主题助词", s("は")), yw("mu-ge-n-da-i", "无限大", s("無限大", "むげんだい"))], zh: "梦想，是无限大的" },
  { words: [yw("do-ko-ma-de-mo", "无论到哪里", s("どこまでも")), yw("o-i-ka-ke-te", "追逐着", s("追", "お"), s("いかけて")), yw("mi-yo-u", "试着……吧", s("みよう")), yw("yo", "语气词", s("よ"))], zh: "我会不断追随梦的身影" },
  { words: [yw("ko-no", "这个", s("この")), yw("sa-ki", "前方、今后", s("先", "さき")), yw("ni", "在、于", s("に")), yw("a-ru", "存在", s("ある")), yw("to-ki-me-ki", "心动、悸动", s("トキメキ")), yw("o", "宾语助词", s("を"))], zh: "把今后的心动" },
  { words: [yw("i-s-sho", "一起", s("一緒", "いっしょ")), yw("ni", "共同、一起", s("に")), yw("ne", "呢、吧", s("ね")), yw("da-ki-shi-me-yo-u", "拥抱吧", s("抱", "だ"), s("きしめよう")), yw("zu-t-to", "永远、一直", s(" "), s("ずっと"))], zh: "一起拥入怀中，永远如此" },
  { words: [yw("na-mi", "海浪", s("波", "なみ")), yw("wa", "主题助词", s("は")), yw("u-ta-u", "歌唱", s("歌", "うた"), s("う")), yw("i-tsu-ka", "曾经、某时", s(" "), s("いつか")), yw("wa-su-re-ta", "忘记了的", s("忘", "わす"), s("れた")), yw("me-ro-di-i", "旋律", s("メロディー"))], zh: "海浪放声歌唱，唱起我曾淡忘的旋律" },
  { words: [yw("o-sa-na-i", "年幼的", s("幼", "おさな"), s("い")), yw("ko-ro", "时候", s("ころ")), yw("ki-i-ta", "听过", s("聞", "き"), s("いた")), yw("ta-n-ju-n-na", "单纯的", s(" "), s("単純", "たんじゅん"), s("な")), yw("ko-to-ba", "话语", s("言葉", "ことば")), yw("ga", "主语助词", s("が"))], zh: "小时候曾听过的单纯话语" },
  { words: [yw("fu-i-ni", "不经意间、突然", s("不意", "ふい"), s("に")), yw("yo-mi-ga-e-ru", "苏醒、复苏", s("よみがえる"))], zh: "不经意间，在脑海中苏醒" },
  { words: [yw("da-i-su-ki", "最喜欢", s("ダイスキ")), yw("wa", "主题助词", s("は")), yw("sa-i-kyo-u", "最强", s("最強", "さいきょう")), yw("da-yo", "就是哦", s("だよ")), yw("to", "引用助词", s("と"))], zh: "“我喜欢你”是最强大的声援" },
  { words: [yw("ge-n-ki-na", "精神饱满的", s("元気", "げんき"), s("な")), yw("ko-e", "声音", s("声", "こえ")), yw("de", "用、以", s("で")), yw("yon-de", "呼喊", s("呼", "よ"), s("んで")), yw("mi-ta", "试着做了", s("みた"))], zh: "试着用精神满满的声音呐喊吧" },
  { words: [yw("sa-a", "来吧", s("さあ")), yw("wa-ra-t-cha-e", "笑出来吧", s("笑", "わら"), s("っちゃえ"))], zh: "来笑一笑吧" },
  { words: [yw("da-s-shu", "冲刺", s("ダッシュ")), yw("ka-ra", "之后、从", s("から")), yw("wa-i-wa-i", "欢闹声", s("ワイワイッ")), yw("o-o", "欢呼声", s("おーっ"))], zh: "向前冲刺后，便是无限的喜悦", aside: true },
  { words: [yw("da-i-jo-u-bu", "没问题、不要紧", s("大丈夫", "だいじょうぶ")), yw("da-ne", "对吧", s("だね"))], zh: "一切都会好的，对吧" },
  { words: [yw("mi-ra-i", "未来", s("ミライ")), yw("mu-ge-n-da-i", "无限大", s("無限大", "むげんだい"))], zh: "未来，是无限大的" },
  { words: [yw("ku-ji-ke-so-u-na", "似乎要受挫的", s("くじけそうな")), yw("to-ki", "时候", s("時", "とき")), yw("mo", "也", s("も")), yw("a-ru", "有、存在", s("ある")), yw("ke-do", "但是、虽然", s("けど"))], zh: "虽然有时也会受挫沮丧" },
  { words: [yw("hi-to-ya-su-mi", "稍作休息", s("ひと"), s("休", "やす"), s("み")), yw("mo", "也", s("も")), yw("sa-ku-se-n", "策略、作战", s("作戦", "さくせん")), yw("da-ka-ra", "因为、所以", s("だから"))], zh: "但稍作休息也是继续奋起的策略" },
  { words: [yw("a-se-ra-zu-ni", "不要着急", s("焦", "あせ"), s("らずに")), yw("ya-ro-u", "来做吧", s("やろう")), yw("yo", "语气词", s("よ"))], zh: "不要着急，慢慢来吧" },
  { words: [yw("mi-ra-i", "未来", s("ミライ")), yw("mu-ge-n-da-i", "无限大", s("無限大", "むげんだい"))], zh: "未来，是无限大的" },
  { words: [yw("i-tsu-ma-de-mo", "无论何时、永远", s("いつまでも")), yw("yu-me", "梦想", s("ユメ")), yw("o", "宾语助词", s("を")), yw("ka-ta-ri-ta-i", "想要畅谈", s("語", "かた"), s("りたい")), yw("n-da", "说明、强调", s("んだ"))], zh: "不论何时，我都想畅谈梦想" },
  { words: [yw("ko-no", "这个", s("この")), yw("sa-ki", "前方、今后", s("先", "さき")), yw("wa", "主题助词", s("は")), yw("mi-chi-na-ru", "未知的", s("未知", "みち"), s("なる")), yw("bo-u-ke-n", "冒险", s("冒険", "ぼうけん"))], zh: "今后，是未知的冒险" },
  { words: [yw("i-s-sho", "一起", s("一緒", "いっしょ")), yw("ni-ne", "一起吧", s("にね")), yw("no-ri-ko-e-yo-u", "跨越吧", s("乗", "の"), s("りこえよう")), yw("i-s-sho-ni", "相伴同行", s(" "), s("一緒", "いっしょ"), s("に"))], zh: "一起跨越万难吧，我们两人相伴" },
  { words: [yw("o-o-ki-na", "巨大的", s("大", "おお"), s("きな")), yw("ki-bo-u", "希望", s("希望", "きぼう")), yw("a-a", "啊", s(" "), s("ああ")), yw("e-ga-i-te", "描绘", s("描", "えが"), s("いて")), yw("su-su-mo-u", "前进吧", s("進", "すす"), s("もう"))], zh: "描绘出巨大的希望，并肩向前吧" },
  { words: [yw("i-ka-na-ku-cha", "必须前进", s("行", "い"), s("かなくちゃ")), yw("i-ka-na-ku-cha", "必须前进", s(" "), s("行", "い"), s("かなくちゃ"))], zh: "该向前了，是时候向前走了" },
  { words: [yw("do-ko-e", "去哪里", s("どこへ？")), yw("no-zo-mu", "期望、向往", s(" "), s("望", "のぞ"), s("む")), yw("ba-sho", "地方", s("場所", "ばしょ")), yw("e", "向、往", s("へ"))], zh: "要去哪里？去往憧憬之处" },
  { words: [yw("yu-me", "梦想", s("ユメ")), yw("wa", "主题助词", s("は")), yw("mu-ge-n-da-i", "无限大", s("無限大", "むげんだい"))], zh: "梦想，是无限大的" },
  { words: [yw("a-ki-ra-me-na-i", "不放弃", s("あきらめない")), yw("ka-gi-ri", "只要", s("限", "かぎ"), s("り")), yw("tsu-zu-ku", "延续", s("続", "つづ"), s("く")), yw("n-da", "说明、强调", s("んだ"))], zh: "只要不放弃，便会永远延续" },
  { words: [yw("ya-ri-ta-i", "想做、想完成", s("やりたい")), yw("ko-to", "事情", s("こと")), yw("ga", "主语助词", s("が")), yw("kyo-u", "今天", s("今日", "きょう")), yw("mo", "也", s("も")), yw("ta-ku-sa-n", "许多", s("たくさん"))], zh: "今天，也有数不尽想完成的事情" },
  { words: [yw("zen-bu", "全部", s("ぜんぶ")), yw("ya-ro-u", "放手去做吧", s("やろう")), yw("yo", "语气词", s("よ"))], zh: "全部放手去做吧" },
  { words: [yw("yu-me", "梦想", s("ユメ")), yw("wa", "主题助词", s("は")), yw("mu-ge-n-da-i", "无限大", s("無限大", "むげんだい"))], zh: "梦想，是无限大的" },
  { words: [yw("do-ko-ma-de-mo", "无论到哪里", s("どこまでも")), yw("o-i-ka-ke-te", "追逐着", s("追", "お"), s("いかけて")), yw("mi-yo-u", "试着……吧", s("みよう")), yw("yo", "语气词", s("よ"))], zh: "我会不断追随梦的身影" },
  { words: [yw("ko-no", "这个", s("この")), yw("sa-ki", "前方、今后", s("先", "さき")), yw("ni", "在、于", s("に")), yw("a-ru", "存在", s("ある")), yw("to-ki-me-ki", "心动、悸动", s("トキメキ")), yw("o", "宾语助词", s("を"))], zh: "把今后的心动" },
  { words: [yw("i-s-sho", "一起", s("一緒", "いっしょ")), yw("ni", "共同、一起", s("に")), yw("ne", "呢、吧", s("ね")), yw("da-ki-shi-me-yo-u", "拥抱吧", s("抱", "だ"), s("きしめよう")), yw("zu-t-to", "永远、一直", s(" "), s("ずっと"))], zh: "一起拥入怀中，永远如此" },
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

    fetch(song.audio, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Audio request failed with ${response.status}`);
        return response.arrayBuffer();
      })
      .then((buffer) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(new Blob([buffer], { type: "audio/mpeg" }));
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
            <span className="song-meta"><strong>{song.title}{song.titleAccent}</strong><span>{song.artist}</span></span>
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
