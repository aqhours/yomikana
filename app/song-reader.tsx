"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ListRestart, Maximize, Minimize, Moon, Pause, Play, Sun, X } from "lucide-react";
import { loadAudio } from "./audio-cache";
import FontSelector from "./font-selector";
import { useLyricEdgeSoftness } from "./use-lyric-edge-softness";
import { useReaderFullscreen } from "./use-reader-fullscreen";

import type { Word, LyricLine, Song, Timing, TimedCharacter, DisplayCharacter } from "./song-types";

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

export default function SongReader({ song, coverColors }: { song: Song; coverColors: string[] }) {
  const lyrics = song.lyrics;
  const fullscreen = useReaderFullscreen();
  // Generated by npm run palette:generate (node-vibrant); no image analysis during playback.
  const coverPalette = Object.fromEntries(coverColors.map((color, index) => [`--cover-color-${index + 1}`, color])) as React.CSSProperties;
  const audioRef = useRef<HTMLAudioElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const readerMotionRef = useRef<Animation[]>([]);
  const readerClosingRef = useRef(false);
  useEffect(() => () => { readerMotionRef.current.forEach((animation) => animation.cancel()); }, []);
  const [readerOpen, setReaderOpen] = useState(false);
  useEffect(() => {
    if (!readerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [readerOpen]);
  const readerRef = useRef<HTMLOListElement>(null);
  useLyricEdgeSoftness(readerRef, readerOpen);
  const lineRefs = useRef<(HTMLLIElement | null)[]>([]);
  const animationRef = useRef<number | null>(null);
  const lastClockUpdateRef = useRef(0);
  const [timedCharacters, setTimedCharacters] = useState<TimedCharacter[]>([]);
  const [audioRequested, setAudioRequested] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [lyricFont, setLyricFont] = useState<"sans" | "serif">("sans");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("yomikana-lyric-font");
      // Restore the browser preference after hydration; the server renders the default.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved === "sans" || saved === "serif") setLyricFont(saved);
    } catch { /* Keep the default when browser storage is unavailable. */ }
  }, []);
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
    if (!audioRequested) return;
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
  }, [song.audio, audioRequested]);
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
    if (!readerOpen || !autoScroll || activeLine < 0) return;
    const reader = readerRef.current;
    const line = lineRefs.current[activeLine];
    if (!reader || !line) return;
    const first = lineRefs.current[0];
    const last = lineRefs.current[lyrics.length - 1];
    const followLine = () => {
      const topInset = first?.offsetTop ?? 0;
      // Leave enough trailing space for even the final lyric to reach this anchor.
      const tailSpace = Math.max(80, reader.clientHeight - (last?.offsetHeight ?? 0) - topInset);
      reader.style.paddingBottom = `${tailSpace}px`;
      reader.scrollTo({
        top: Math.max(0, line.offsetTop - topInset),
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      });
    };
    followLine();
    const resize = new ResizeObserver(followLine);
    resize.observe(reader);
    resize.observe(line);
    if (last && last !== line) resize.observe(last);
    return () => resize.disconnect();
  }, [activeLine, autoScroll, readerOpen, lyrics.length]);
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
  const openReader = () => {
    setAudioRequested(true);
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    readerMotionRef.current.forEach((animation) => animation.cancel());
    readerClosingRef.current = false;
    dialog.showModal();
    setReaderOpen(true);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fade = dialog.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: reducedMotion ? 120 : 240, easing: "cubic-bezier(.23,1,.32,1)",
    });
    const content = dialog.querySelector<HTMLElement>(".reader");
    const lift = !reducedMotion && content ? content.animate([
      { transform: "translateY(10px)" }, { transform: "translateY(0)" },
    ], { duration: 280, easing: "cubic-bezier(.23,1,.32,1)" }) : null;
    readerMotionRef.current = lift ? [fade, lift] : [fade];
  };
  const closeReader = () => {
    const dialog = dialogRef.current;
    if (!dialog?.open || readerClosingRef.current) return;
    readerClosingRef.current = true;
    audioRef.current?.pause();
    // Capture the current frame before cancelling an interrupted entrance.
    const opacity = getComputedStyle(dialog).opacity;
    const content = dialog.querySelector<HTMLElement>(".reader");
    const transform = content ? getComputedStyle(content).transform : "none";
    readerMotionRef.current.forEach((animation) => animation.cancel());
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fade = dialog.animate([{ opacity }, { opacity: 0 }], {
      duration: reducedMotion ? 100 : 160, easing: "cubic-bezier(.23,1,.32,1)", fill: "forwards",
    });
    const settle = !reducedMotion && content ? content.animate([
      { transform }, { transform: "translateY(6px)" },
    ], { duration: 160, easing: "cubic-bezier(.23,1,.32,1)", fill: "forwards" }) : null;
    readerMotionRef.current = settle ? [fade, settle] : [fade];
    void fade.finished.then(() => {
      dialog.close();
      readerMotionRef.current.forEach((animation) => animation.cancel());
      readerMotionRef.current = [];
      readerClosingRef.current = false;
    }).catch(() => { /* Cancellation is expected when the reader unmounts. */ });
  };
  const onReaderClosed = () => {
    fullscreen.exit();
    audioRef.current?.pause();
    setReaderOpen(false);
    startRef.current?.focus({ preventScroll: true });
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
        <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={theme === "dark" ? "切换到浅色模式" : "切换到暗色模式"} title={theme === "dark" ? "浅色模式" : "暗色模式"} aria-pressed={theme === "dark"} data-umami-event="theme-change" data-umami-event-theme={theme === "dark" ? "light" : "dark"}>
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
          <button ref={startRef} className="start-link" type="button" onClick={openReader} aria-haspopup="dialog" aria-controls="lyrics-dialog" data-umami-event="reader-start" data-umami-event-song={song.slug}>开始阅读 <span aria-hidden="true">↗</span></button>
        </div>
      </header>
      <dialog ref={dialogRef} id="lyrics-dialog" className="reader-dialog" style={coverPalette} aria-label={`${song.title}${song.titleAccent} · 歌词阅读`} onClose={onReaderClosed} onCancel={(event) => { event.preventDefault(); if (document.fullscreenElement) { void document.exitFullscreen().catch(() => {}); } else { closeReader(); } }}>
      <section className="reader" data-lyric-font={lyricFont} id="lyrics" aria-label="歌词正文">
        <div className="player-bar">
          {/* The synchronized, translated lyric transcript is rendered directly below the audio control. */}
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio ref={audioRef} className="audio-player" preload="metadata" loop src={audioSrc ?? undefined} data-source={song.audio} onPlay={beginClock} onPause={stopClock} onEnded={stopClock} onSeeked={updateClock}>你的浏览器不支持音频播放。</audio>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="mini-cover" src={song.cover} width="256" height="256" decoding="async" loading="lazy" alt="" aria-hidden="true" />
          <button className="play-toggle" type="button" disabled={!audioSrc} onClick={togglePlayback} aria-label={isPlaying ? "暂停" : "播放"} data-umami-event={isPlaying ? "audio-pause" : "audio-play"} data-umami-event-song={song.slug}>
            {isPlaying ? <Pause aria-hidden="true" /> : <Play className="play-icon" aria-hidden="true" />}
          </button>
          <div className="timeline">
            <span className="song-meta"><strong>{song.slug === "mirai-ticket" ? "MIRAI TICKET" : `${song.title}${song.titleAccent}`}</strong><span>{song.artist}</span>{!audioSrc && <span className="song-loading-status" role="status">歌曲加载中...</span>}</span>
            <input className="progress-slider" type="range" min="0" max={durationMs ? durationMs / 1000 : 0} step="0.01" value={currentMs / 1000} disabled={!durationMs} onInput={(event) => seekToTime(Number(event.currentTarget.value))} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); seekFromPointer(event); }} onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) seekFromPointer(event); }} onPointerUp={(event) => event.currentTarget.releasePointerCapture(event.pointerId)} aria-label="播放进度" style={{ "--progress": `${durationMs ? Math.min(100, currentMs / durationMs * 100) : 0}%` } as React.CSSProperties} />
            <span className="time-display"><span>{formatTime(currentMs)}</span><span>{formatTime(durationMs)}</span></span>
          </div>
          <button className={`scroll-toggle${autoScroll ? " is-on" : ""}`} type="button" aria-label={autoScroll ? "关闭自动跟随" : "开启自动跟随"} title={autoScroll ? "自动跟随已开启" : "自动跟随已关闭"} aria-pressed={autoScroll} onClick={() => setAutoScroll((value) => !value)} data-umami-event={autoScroll ? "auto-follow-disable" : "auto-follow-enable"} data-umami-event-song={song.slug}><ListRestart aria-hidden="true" /><span className="sr-only">自动跟随</span></button>
          <FontSelector value={lyricFont} onChange={(nextFont) => {
            setLyricFont(nextFont);
            try { localStorage.setItem("yomikana-lyric-font", nextFont); } catch { /* Font switching still works without storage. */ }
          }} />
          <button className="fullscreen-toggle" type="button" onClick={fullscreen.toggle} disabled={!fullscreen.supported || fullscreen.pending} aria-label={fullscreen.isFullscreen ? "退出全屏" : "进入全屏"} aria-pressed={fullscreen.isFullscreen} title={!fullscreen.supported ? "当前浏览器不支持网页全屏" : fullscreen.isFullscreen ? "退出全屏（Esc）" : "进入全屏"}>
            {fullscreen.isFullscreen ? <Minimize aria-hidden="true" /> : <Maximize aria-hidden="true" />}
          </button>
          {fullscreen.error && <span className="fullscreen-status" role="status">{fullscreen.error}</span>}
          <button className="reader-close" type="button" onClick={closeReader} aria-label="关闭歌词界面" title="关闭歌词界面（Esc）"><X aria-hidden="true" /></button>
        </div>
        <div className="lyrics-viewport">
        <ol className="lyrics-list" ref={readerRef}>
          {lyrics.map((line, lineIndex) => (
            <li className={`lyric-line${line.aside ? " is-aside" : ""}${lineIndex === activeLine ? " is-active" : ""}`} key={lineIndex} ref={(element) => { lineRefs.current[lineIndex] = element; }}>
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
        </div>
      </section>
      </dialog>
    </main>
  );
}
