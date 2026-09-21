"use client";

import { useEffect, type RefObject } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import type { Song, Timing } from "./song-types";
import { lyricIndexAt } from "./lyric-position";

export type PlaybackAction = "previous" | "next" | "toggle";
export type DesktopPlayback = { autoPlay: boolean; canPrevious: boolean; onNext: () => void; onPrevious: () => void };
export type Subtitle = { title: string; japanese: string; translation: string; playing: boolean; ready: boolean; canPrevious: boolean; canNext: boolean; error: string };
type PlaybackStatus = Pick<Subtitle, "ready" | "canPrevious" | "canNext" | "error">;

// Read the actual audio clock even when the main window's animation frames stop.
export function useDesktopLyrics(audioRef: RefObject<HTMLAudioElement | null>, song: Song, ranges: (Timing | null)[], status: PlaybackStatus) {
  useEffect(() => {
    if (!isTauri()) return;
    const audio = audioRef.current;
    if (!audio) return;
    let previous = "";
    let disposed = false;
    let pending = false;
    const publish = () => {
      if (disposed || pending) return;
      const ms = audio.currentTime * 1000;
      const index = lyricIndexAt(ranges, ms);
      const line = song.lyrics[index];
      const payload: Subtitle = {
        title: `${song.title}${song.titleAccent}`,
        japanese: line ? line.words.flatMap((word) => word.jp.map((part) => part.text)).join("") : "",
        translation: line?.zh ?? "",
        playing: !audio.paused && !audio.ended,
        ready: status.ready,
        canPrevious: status.canPrevious,
        canNext: status.canNext,
        error: status.error,
      };
      const serialized = JSON.stringify(payload);
      if (serialized === previous) return;
      pending = true;
      void invoke("publish_lyrics", { payload }).then(() => { previous = serialized; }).catch((error) => {
        console.error("Desktop lyrics sync failed", error);
      }).finally(() => { pending = false; });
    };
    const events = ["timeupdate", "seeking", "seeked", "play", "pause", "ended"];
    events.forEach((event) => audio.addEventListener(event, publish));
    const timer = window.setInterval(publish, 100);
    publish();
    return () => {
      disposed = true;
      clearInterval(timer);
      events.forEach((event) => audio.removeEventListener(event, publish));
    };
  }, [audioRef, song.title, song.titleAccent, song.lyrics, ranges, status.ready, status.canPrevious, status.canNext, status.error]);

  useEffect(() => {
    if (!isTauri()) return;
    return () => { void invoke("publish_lyrics", { payload: { title: "", japanese: "", translation: "", playing: false, ready: false, canPrevious: false, canNext: false, error: "" } }).catch(console.error); };
  }, []);
}
