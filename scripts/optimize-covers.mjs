import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";

// Generate thumbnails explicitly when artwork changes. Keep backgrounds original.
const root = new URL("../", import.meta.url);
const source = await readFile(new URL("app/song-data.ts", root), "utf8");
const urls = [...new Set([...source.matchAll(/cover: "([^"]+)"/g)].map((match) => match[1]))];
await mkdir(new URL("public/covers/", root), { recursive: true });
const manifest = {};
for (const url of urls) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Cover request failed (${response.status}): ${url}`);
  const input = Buffer.from(await response.arrayBuffer());
  const variants = {};
  for (const width of [256, 640]) {
    const output = await sharp(input).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 88 }).toBuffer();
    const hash = createHash("sha256").update(output).digest("hex").slice(0, 16);
    const path = `/covers/${hash}-${width}.webp`;
    await writeFile(new URL(`public${path}`, root), output);
    variants[width] = path;
    console.log(`${decodeURIComponent(url.split("/").pop())} ${width}px: ${input.length} -> ${output.length} bytes`);
  }
  manifest[url] = variants;
}
await writeFile(new URL("app/cover-thumbnails.json", root), JSON.stringify(manifest, null, 2) + "\n");
