import SongReader from "../../song-reader";

const songSlugs = ["kimi-no-kokoro", "yume-mirai", "happy-party-train", "over-next-rainbow"];

export function generateStaticParams() {
  return songSlugs.map((slug) => ({ slug }));
}

export default async function SongPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <SongReader songSlug={songSlugs.includes(slug) ? slug : "kimi-no-kokoro"} />;
}
