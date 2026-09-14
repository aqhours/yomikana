// Estimate the existing background's top edge without modifying its rendering.
export async function readerChromeColor(surface: HTMLElement, source: string) {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = source;
  await image.decode();
  const bounds = surface.getBoundingClientRect();
  const scale = 96 / bounds.width;
  const before = getComputedStyle(surface, "::before");
  const after = getComputedStyle(surface, "::after");
  const width = 96;
  const height = Math.max(1, Math.ceil(bounds.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.fillStyle = getComputedStyle(surface).backgroundColor;
  context.fillRect(0, 0, width, height);
  const bw = parseFloat(before.width) * scale;
  const bh = parseFloat(before.height) * scale;
  const bx = parseFloat(before.left) * scale;
  const by = parseFloat(before.top) * scale;
  const ratio = Math.max(bw / image.naturalWidth, bh / image.naturalHeight);
  const iw = image.naturalWidth * ratio;
  const ih = image.naturalHeight * ratio;
  context.filter = before.filter.replace(/blur\(([\d.]+)px\)/, (_, pixels) => `blur(${Number(pixels) * scale}px)`);
  context.drawImage(image, bx + (bw - iw) / 2, by + (bh - ih) / 2, iw, ih);
  context.filter = "none";
  // Same angle and palette weights as the existing reader gradient.
  const h = parseFloat(after.height) * scale;
  const dx = Math.sin(155 * Math.PI / 180);
  const dy = -Math.cos(155 * Math.PI / 180);
  const length = width * Math.abs(dx) + h * Math.abs(dy);
  const gradient = context.createLinearGradient(width / 2 - dx * length / 2, h / 2 - dy * length / 2, width / 2 + dx * length / 2, h / 2 + dy * length / 2);
  const style = getComputedStyle(surface);
  for (const [stop, index, alpha, fallback] of [[0, 1, .58, "#168fbd"], [.55, 2, .35, "#244777"], [1, 5, .72, "#303b50"]] as const) {
    const color = style.getPropertyValue(`--cover-color-${index}`).trim() || fallback;
    gradient.addColorStop(stop, `${color}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`);
  }
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, Math.min(3, height)).data;
  const channels = [0, 0, 0];
  for (let i = 0; i < pixels.length; i += 4) channels.forEach((_, c) => { channels[c] += pixels[i + c]; });
  return `rgb(${channels.map((sum) => Math.round(sum / (pixels.length / 4))).join(", ")})`;
}
