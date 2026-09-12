"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";

function subscribe(callback: () => void) {
  document.addEventListener("fullscreenchange", callback);
  return () => document.removeEventListener("fullscreenchange", callback);
}

export function useReaderFullscreen(target: RefObject<HTMLDivElement | null>) {
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
        // Fullscreen must sit above the modal in the browser top layer.
        // A dialog cannot be a fullscreen target, so use its content surface.
        if (!target.current) return;
        await target.current.requestFullscreen();
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
