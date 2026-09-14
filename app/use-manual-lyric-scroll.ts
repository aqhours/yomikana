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
    const scrollbar = (event: PointerEvent) => {
      // A pressed pointer moving over a lyric is still a click, not scrolling.
      if (event.pointerType !== "mouse" || event.target !== list) return;
      const bounds = list.getBoundingClientRect();
      const contentRight = bounds.left + list.clientLeft + list.clientWidth;
      if (event.clientX >= contentRight && event.clientX < bounds.right) start();
    };
    list.addEventListener("wheel", start, { passive: true });
    list.addEventListener("touchmove", start, { passive: true });
    list.addEventListener("pointerdown", scrollbar, { passive: true });
    list.addEventListener("keydown", key);
    return () => {
      list.removeEventListener("wheel", start);
      list.removeEventListener("touchmove", start);
      list.removeEventListener("pointerdown", scrollbar);
      list.removeEventListener("keydown", key);
      setManual(false);
    };
  }, [ref, open]);

  return { manual, resumePlayback: () => setManual(false) };
}
