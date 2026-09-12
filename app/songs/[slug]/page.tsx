import SongReader from "../../song-reader";
import { songs } from "../../song-data";
import coverPalettes from "../../cover-palettes.json";
import coverThumbnails from "../../cover-thumbnails.json";

const songSlugs = Object.keys(songs);

export function generateStaticParams() {
  return songSlugs.map((slug) => ({ slug }));
}

export default async function SongPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const song = songs[slug] ?? songs["kimi-no-kokoro"];
  const coverColors = (coverPalettes as Record<string, string[]>)[song.cover] ?? [];
  const thumbnails = coverThumbnails as Record<string, Record<string, string>>;
  const songWithThumbnail = { ...song, cover: thumbnails[song.cover]?.[256] ?? song.cover };
  return <SongReader key={song.slug} song={songWithThumbnail} coverColors={coverColors} />;
}
