"use client";

import { useEffect, useState, type RefObject } from "react";

export function useManualLyricScroll(ref: RefObject<HTMLOListElement | null>, open: boolean) {
  const [manual, setManual] = useState(false);

  useEffect(() => {
    const list = ref.current;
    if (!open || !list) return;
    const start = () => setManual(true);
    const key = (event: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"].includes(event.key)) start();
    };
    const drag = (event: PointerEvent) => { if (event.buttons) start(); };
    list.addEventListener("wheel", start, { passive: true });
    list.addEventListener("touchmove", start, { passive: true });
    list.addEventListener("pointermove", drag, { passive: true });
    list.addEventListener("keydown", key);
    return () => {
      list.removeEventListener("wheel", start);
      list.removeEventListener("touchmove", start);
      list.removeEventListener("pointermove", drag);
      list.removeEventListener("keydown", key);
      setManual(false);
    };
  }, [ref, open]);

  return { manual, resumePlayback: () => setManual(false) };
}
