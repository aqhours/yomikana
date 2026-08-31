import { readFile, writeFile } from "node:fs/promises";

const [sourcePath, destinationPath, firstLyricStart] = process.argv.slice(2);

if (!sourcePath || !destinationPath || !firstLyricStart) {
  throw new Error("Usage: node scripts/import-qrc.mjs <source.qrc> <destination.yrc> <first-lyric-start-ms>");
}

const minimumStart = Number(firstLyricStart);
if (!Number.isFinite(minimumStart)) throw new Error("first-lyric-start-ms must be a number");

const xml = await readFile(sourcePath, "utf8");
const lyricContent = xml.match(/LyricContent="([\s\S]*?)"\/>/)?.[1];

if (!lyricContent) throw new Error("The QRC file does not contain LyricContent");

const decoded = lyricContent
  .replaceAll("&quot;", '"')
  .replaceAll("&amp;", "&")
  .replaceAll("&lt;", "<")
  .replaceAll("&gt;", ">");

const converted = decoded
  .split(/\r?\n/)
  .filter((line) => {
    const lineStart = line.match(/^\[(\d+),/)?.[1];
    return lineStart && Number(lineStart) >= minimumStart;
  })
  .map((line) => {
    const header = line.match(/^\[\d+,\d+\]/)?.[0] ?? "";
    const body = line.slice(header.length);
    const tokens = [...body.matchAll(/([^()]*)\((\d+),(\d+)\)/g)]
      .map((match) => `(${match[2]},${match[3]},0)${match[1]}`)
      .join("");
    return `${header}${tokens}`;
  })
  .join("\n");

await writeFile(destinationPath, `${converted}\n`);
