"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Type } from "lucide-react";

type Font = "sans" | "serif";
const options = [
  { value: "sans", label: "Noto Sans", description: "无衬线 · 清晰简洁" },
  { value: "serif", label: "原衬线字体", description: "衬线 · 经典书卷感" },
] as const;

export default function FontSelector({ value, onChange }: { value: Font; onChange: (font: Font) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();
  const selected = options.findIndex((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    items.current[selected]?.focus();
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open, selected]);

  const close = () => { setOpen(false); trigger.current?.focus(); };

  return (
    <div className="lyric-font-control" ref={root} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <button ref={trigger} className="font-trigger" type="button" aria-label={`歌词字体：${options[selected].label}`} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined} onClick={() => setOpen(!open)} onKeyDown={(event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); }
      }}>
        <Type aria-hidden="true" /><span>{options[selected].label}</span><ChevronDown className="font-chevron" aria-hidden="true" />
      </button>
      {open && <div className="font-menu" id={menuId} role="menu" tabIndex={-1} aria-label="歌词字体" onKeyDown={(event) => {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); return; }
        const index = items.current.findIndex((item) => item === document.activeElement);
        let next: number;
        if (event.key === "ArrowDown") next = (index + 1) % options.length;
        else if (event.key === "ArrowUp") next = (index + options.length - 1) % options.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = options.length - 1;
        else return;
        event.preventDefault(); items.current[next]?.focus();
      }}>
        <div className="font-menu-heading" role="presentation">歌词字体</div>
        {options.map((option, index) => <button key={option.value} ref={(element) => { items.current[index] = element; }} type="button" className="font-option" role="menuitemradio" aria-checked={value === option.value} tabIndex={-1} onClick={() => { onChange(option.value); close(); }}>
          <span className={`font-preview font-preview-${option.value}`} aria-hidden="true">あ</span>
          <span className="font-option-copy"><strong>{option.label}</strong><small>{option.description}</small></span>
          <Check className="font-check" aria-hidden="true" />
        </button>)}
      </div>}
    </div>
  );
}
