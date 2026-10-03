import { getWebTrack } from "../../../web-track";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const track = getWebTrack(slug);
  return track ? Response.json(track) : Response.json({ error: "Song not found" }, { status: 404 });
}
