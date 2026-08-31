"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { ListRestart, Pause, Play } from "lucide-react";

type Segment = { text: string; reading?: string };
type Word = { jp: Segment[]; romaji: string; meaning: string };
type LyricLine = { words: Word[]; zh: string; aside?: boolean };
type Timing = { start: number; end: number };
type TimedCharacter = Timing & { text: string };
type DisplayCharacter = { key: string; text: string; lineIndex: number };

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
const lyrics: LyricLine[] = [
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

function collectDisplayCharacters(): DisplayCharacter[] {
  const characters: DisplayCharacter[] = [];
  lyrics.forEach((line, lineIndex) => line.words.forEach((word, wordIndex) => word.jp.forEach((part, partIndex) => {
    Array.from(part.text).forEach((text, characterIndex) => {
      if (alignable(text)) characters.push({ key: `${lineIndex}-${wordIndex}-${partIndex}-${characterIndex}`, text, lineIndex });
    });
  })));
  return characters;
}

function alignTimings(display: DisplayCharacter[], timed: TimedCharacter[]) {
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

export default function Home() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const readerRef = useRef<HTMLElement>(null);
  const lineRefs = useRef<(HTMLLIElement | null)[]>([]);
  const animationRef = useRef<number | null>(null);
  const lastClockUpdateRef = useRef(0);
  const [timedCharacters, setTimedCharacters] = useState<TimedCharacter[]>([]);
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const displayCharacters = useMemo(() => collectDisplayCharacters(), []);
  const { timingByKey, lineRanges } = useMemo(() => alignTimings(displayCharacters, timedCharacters), [displayCharacters, timedCharacters]);
  const activeLine = lineRanges.findIndex((range, index) => {
    if (!range || currentMs < range.start) return false;
    const next = lineRanges.slice(index + 1).find(Boolean);
    return !next || currentMs < next.start;
  });

  useEffect(() => { fetch("/audio/kimi-no-kokoro.yrc").then((response) => response.text()).then((text) => setTimedCharacters(parseYrc(text))).catch(() => setTimedCharacters([])); }, []);
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
    if (audioRef.current.paused || audioMs - lastClockUpdateRef.current >= 30) {
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

  return (
    <main>
      <header className="hero">
        <div className="hero-inner">
          <figure className="album-art">
            {/* Keep the original artwork file untouched rather than routing it through an optimizer. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/kimi-no-kokoro-cover.jpg" width="1400" height="1400" alt="《君のこころは輝いてるかい？》专辑封面" />
          </figure>
          <h1>君のこころは<br /><em>輝いてるかい？</em></h1>
          <p className="title-cn">你的心灵是否光芒闪耀？</p>
          <dl className="credits" aria-label="歌曲制作信息">
            <div><dt>作詞</dt><dd>畑亜貴</dd></div>
            <div><dt>作曲</dt><dd>光增ハジメ</dd></div>
            <div><dt>編曲</dt><dd>EFFY</dd></div>
            <div><dt>演唱</dt><dd>Aqours</dd></div>
          </dl>
          <a className="start-link" href="#lyrics">开始阅读 <span aria-hidden="true">↓</span></a>
        </div>
      </header>
      <section className="reader" id="lyrics" aria-label="歌词正文">
        <div className="player-bar">
          {/* The synchronized, translated lyric transcript is rendered directly below the audio control. */}
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio ref={audioRef} className="audio-player" preload="metadata" src="/audio/kimi-no-kokoro.mp3" onPlay={beginClock} onPause={stopClock} onEnded={stopClock} onSeeked={updateClock}>你的浏览器不支持音频播放。</audio>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="mini-cover" src="/kimi-no-kokoro-cover.jpg" width="1400" height="1400" alt="" aria-hidden="true" />
          <button className="play-toggle" type="button" onClick={togglePlayback} aria-label={isPlaying ? "暂停" : "播放"}>
            {isPlaying ? <Pause aria-hidden="true" /> : <Play className="play-icon" aria-hidden="true" />}
          </button>
          <div className="timeline">
            <span className="song-meta"><strong>君のこころは輝いてるかい？</strong><span>Aqours</span></span>
            <input className="progress-slider" type="range" min="0" max={durationMs ? durationMs / 1000 : 0} step="0.01" value={currentMs / 1000} onInput={(event) => seekToTime(Number(event.currentTarget.value))} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); seekFromPointer(event); }} onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) seekFromPointer(event); }} onPointerUp={(event) => event.currentTarget.releasePointerCapture(event.pointerId)} aria-label="播放进度" style={{ "--progress": `${durationMs ? Math.min(100, currentMs / durationMs * 100) : 0}%` } as React.CSSProperties} />
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
