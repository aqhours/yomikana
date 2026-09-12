export type Segment = { text: string; reading?: string };
export type Word = { jp: Segment[]; romaji: string; meaning: string };
export type LyricLine = { words: Word[]; zh: string; aside?: boolean };
export type Timing = { start: number; end: number };
export type TimedCharacter = Timing & { text: string };
export type DisplayCharacter = { key: string; text: string; lineIndex: number };
export type Song = {
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

