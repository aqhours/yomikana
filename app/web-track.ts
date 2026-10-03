import { songs } from "./song-data";
import coverPalettes from "./cover-palettes.json";
import coverThumbnails from "./cover-thumbnails.json";

// Keep the full lyric library on the server; send only the requested track.
export function getWebTrack(slug: string) {
  if (!Object.hasOwn(songs, slug)) return null;
  const song = songs[slug];
  if (!song) return null;
  const thumbnails = coverThumbnails as Record<string, Record<string, string>>;
  return {
    song: { ...song, cover: thumbnails[song.cover]?.[256] ?? song.cover },
    coverColors: (coverPalettes as Record<string, string[]>)[song.cover] ?? [],
    originalCover: song.cover,
  };
}
