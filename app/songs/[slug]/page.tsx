import SongReader from "../../song-reader";

const songSlugs = ["kimi-no-kokoro", "yume-mirai", "happy-party-train", "yuuki-wa-doko-ni", "over-next-rainbow", "eternal-hours", "aozora-jumping-heart", "mirai-ticket", "yume-kataru-yori-yume-utaou", "miracle-wave", "my-mai-tonight", "sora-mo-kokoro-mo-hareru-kara", "water-blue-new-world"];

export function generateStaticParams() {
  return songSlugs.map((slug) => ({ slug }));
}

export default async function SongPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <SongReader songSlug={songSlugs.includes(slug) ? slug : "kimi-no-kokoro"} />;
}
