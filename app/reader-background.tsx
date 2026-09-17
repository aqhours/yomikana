"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { BackgroundRender, MeshGradientRenderer } from "@applemusic-like-lyrics/core";

// The library is imported only after the reader opens, never during SSR.
export default function ReaderBackground({ album, playing, lowFreqVolumeRef }: { album: string; playing: boolean; lowFreqVolumeRef: RefObject<number> }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const syncRef = useRef<(() => void) | null>(null);
  const playingRef = useRef(playing);
  useEffect(() => {
    playingRef.current = playing;
    syncRef.current?.();
  }, [playing]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let background: BackgroundRender<MeshGradientRenderer> | undefined;
    let loadingAlbum = false;
    let volumeFrame = 0;
    let lastVolumeUpdate = 0;
    let contextLost = false;
    const updateVolume = (now: number) => {
      if (now - lastVolumeUpdate >= 1000 / 30) {
        background?.setLowFreqVolume(lowFreqVolumeRef.current);
        lastVolumeUpdate = now;
      }
      volumeFrame = requestAnimationFrame(updateVolume);
    };
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      cancelAnimationFrame(volumeFrame);
      if (!background || contextLost) return;
      background.setLowFreqVolume(0);
      // Static mode still finishes the first artwork frame, unlike pause().
      const still = motion.matches || !playingRef.current;
      background.setFlowSpeed(still ? 0 : .2);
      background.setStaticMode(still);
      if (document.hidden) background.pause();
      else background.resume();
      if (!still && !document.hidden) volumeFrame = requestAnimationFrame(updateVolume);
    };
    syncRef.current = sync;
    motion.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    const lost = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      cancelAnimationFrame(volumeFrame);
      host.dataset.ready = "false";
      background?.pause();
    };
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = album;
    void (async () => {
      try {
        const [library] = await Promise.all([import("@applemusic-like-lyrics/core"), image.decode()]);
        if (disposed) return;
        background = library.BackgroundRender.new(library.MeshGradientRenderer);
        const canvas = background.getElement();
        canvas.style.zIndex = "0";
        canvas.addEventListener("webglcontextlost", lost);
        host.appendChild(canvas);
        background.setFPS(30);
        background.setRenderScale(.5);
        background.setFlowSpeed(.2);
        background.setHasLyric(true);
        background.setLowFreqVolume(0);
        loadingAlbum = true;
        try { await background.setAlbum(image); } finally { loadingAlbum = false; }
        if (disposed) { background.dispose(); return; }
        host.dataset.ready = "true";
        sync();
      } catch (error) {
        if (disposed) background?.dispose();
        if (!disposed) {
          host.dataset.ready = "false";
          background?.dispose();
          background = undefined;
          console.warn("AMLL background unavailable; using static cover background.", error);
        }
      }
    })();
    return () => {
      disposed = true;
      cancelAnimationFrame(volumeFrame);
      syncRef.current = null;
      motion.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      background?.getElement().removeEventListener("webglcontextlost", lost);
      if (loadingAlbum) {
        background?.pause();
        background?.getElement().remove();
      } else background?.dispose();
    };
  }, [album, lowFreqVolumeRef]);

  return <div ref={hostRef} className="reader-background" aria-hidden="true" />;
}
