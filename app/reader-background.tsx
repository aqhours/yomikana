"use client";

import { useEffect, useRef } from "react";
import type { BackgroundRender, MeshGradientRenderer } from "@applemusic-like-lyrics/core";

// The library is imported only after the reader opens, never during SSR.
export default function ReaderBackground({ album, playing }: { album: string; playing: boolean }) {
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
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      if (!background) return;
      // Static mode still finishes the first artwork frame, unlike pause().
      const still = motion.matches || !playingRef.current;
      background.setFlowSpeed(still ? 0 : .2);
      background.setStaticMode(still);
      if (document.hidden) background.pause();
      else background.resume();
    };
    syncRef.current = sync;
    motion.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    const lost = (event: Event) => {
      event.preventDefault();
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
      syncRef.current = null;
      motion.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      background?.getElement().removeEventListener("webglcontextlost", lost);
      if (loadingAlbum) {
        background?.pause();
        background?.getElement().remove();
      } else background?.dispose();
    };
  }, [album]);

  return <div ref={hostRef} className="reader-background" aria-hidden="true" />;
}
