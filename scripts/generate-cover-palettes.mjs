import { readFile, writeFile } from "node:fs/promises";
import { Vibrant } from "node-vibrant/node";
import sharp from "sharp";

// Offline generation keeps image decoding out of playback and avoids CDN canvas CORS.
const source = await readFile(new URL("../app/song-reader.tsx", import.meta.url), "utf8");
const covers = [...new Set([...source.matchAll(/cover: "([^"]+)"/g)].map((match) => match[1]))];
const roles = ["Vibrant", "DarkVibrant", "LightVibrant", "Muted", "DarkMuted", "LightMuted"];
const palettes = {};
for (const cover of covers) {
  const response = await fetch(cover, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Cover request failed (${response.status}): ${cover}`);
  // Normalize WebP as well as JPEG; bound decoding work before color quantization.
  const image = await sharp(Buffer.from(await response.arrayBuffer()))
    .resize(256, 256, { fit: "inside", withoutEnlargement: true }).png().toBuffer();
  const palette = await Vibrant.from(image).quality(1).getPalette();
  const fallback = roles.map((role) => palette[role]).find(Boolean);
  if (!fallback) throw new Error(`No palette extracted: ${cover}`);
  palettes[cover] = roles.map((role) => (palette[role] ?? fallback).hex);
  console.log(`${decodeURIComponent(cover.split("/").pop())}: ${palettes[cover].join(" ")}`);
}
// Only replace the checked-in palette after every cover has been processed successfully.
await writeFile(new URL("../app/cover-palettes.json", import.meta.url), JSON.stringify(palettes, null, 2) + "\n");
