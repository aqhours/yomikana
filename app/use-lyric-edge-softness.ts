"use client";

import { useEffect, type RefObject } from "react";

// Apply the effect to the text itself, never to the background behind the player.
export function useLyricEdgeSoftness(ref: RefObject<HTMLOListElement | null>, open: boolean) {
  useEffect(() => {
    const viewport = ref.current;
    if (!open || !viewport) return;
    const targets = [...viewport.querySelectorAll<HTMLElement>(".word-jp,.word-romaji,.word-meaning,.translation")];
    const visible = new Set<HTMLElement>();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const update = () => {
      frame = 0;
      const bounds = viewport.getBoundingClientRect();
      // Batch layout reads before writing any styles. Only visible words are measured.
      const values = [...visible].map((element) => {
        const rect = element.getBoundingClientRect();
        const center = (rect.top + rect.bottom) / 2;
        const distance = Math.min(center - bounds.top, bounds.bottom - center);
        const softness = Math.max(0, Math.min(1, (18 - distance) / Math.max(18, rect.height / 2)));
        return { element, softness };
      });
      for (const { element, softness } of values) {
        element.style.filter = softness && !reduced.matches ? `blur(${(softness * 4).toFixed(2)}px)` : "";
        element.style.opacity = softness ? String(1 - softness) : "";
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const element = entry.target as HTMLElement;
        if (entry.isIntersecting) visible.add(element);
        else {
          visible.delete(element);
          element.style.filter = "";
          element.style.opacity = "";
        }
      }
      schedule();
    }, { root: viewport, rootMargin: "48px 0px" });
    targets.forEach((element) => observer.observe(element));
    const resize = new ResizeObserver(schedule);
    resize.observe(viewport);
    targets.forEach((element) => resize.observe(element));
    viewport.addEventListener("scroll", schedule, { passive: true });
    reduced.addEventListener("change", schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resize.disconnect();
      viewport.removeEventListener("scroll", schedule);
      reduced.removeEventListener("change", schedule);
      targets.forEach((element) => { element.style.filter = ""; element.style.opacity = ""; });
    };
  }, [ref, open]);
}
