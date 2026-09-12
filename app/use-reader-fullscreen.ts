"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  document.addEventListener("fullscreenchange", callback);
  return () => document.removeEventListener("fullscreenchange", callback);
}

export function useReaderFullscreen() {
  const isFullscreen = useSyncExternalStore(subscribe, () => Boolean(document.fullscreenElement), () => false);
  const supported = useSyncExternalStore(subscribe, () => Boolean(document.fullscreenEnabled), () => false);
  const owned = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const sync = () => { if (!document.fullscreenElement) owned.current = false; };
    document.addEventListener("fullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      if (owned.current && document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    };
  }, []);

  const exit = () => {
    if (owned.current && document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    }
  };

  const toggle = async () => {
    if (pending || !document.fullscreenEnabled) return;
    setPending(true);
    setError("");
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        // A dialog itself cannot enter native fullscreen. Its document can,
        // while the modal keeps its focus handling and cover-backed surface.
        await document.documentElement.requestFullscreen();
        owned.current = true;
      }
    } catch {
      setError("未能切换全屏，请重试或检查浏览器是否允许全屏。");
    } finally {
      setPending(false);
    }
  };

  return { isFullscreen, supported, pending, error, toggle, exit };
}
