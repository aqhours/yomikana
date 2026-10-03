import WebPlayback from "../../web-playback";
import { songs } from "../../song-data";
import { catalog } from "../../song-catalog";
import { getWebTrack } from "../../web-track";

const songSlugs = Object.keys(songs);

export function generateStaticParams() {
  return songSlugs.map((slug) => ({ slug }));
}

export default async function SongPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const track = getWebTrack(slug) ?? getWebTrack("kimi-no-kokoro")!;
  return <WebPlayback key={track.song.slug} initialTrack={track} queue={catalog.map((song) => song.slug)} />;
}
