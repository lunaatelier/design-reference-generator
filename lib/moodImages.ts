import type { MoodImage, MoodImageProvider } from "@/types";

type PexelsPhoto = {
  src?: { medium?: string; large?: string };
  url: string;
  photographer: string;
};

type UnsplashPhoto = {
  urls?: { small?: string };
  links?: { html?: string };
  user?: { name?: string };
};

async function fetchPexelsImages(query: string, apiKey: string): Promise<MoodImage[]> {
  const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=6&orientation=landscape`, {
    headers: { Authorization: apiKey },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { photos?: PexelsPhoto[] };
  return (data.photos || [])
    .filter((photo) => photo.src?.medium || photo.src?.large)
    .map((photo) => ({
      src: (photo.src?.medium || photo.src?.large) as string,
      link: photo.url,
      credit: `${photo.photographer} / Pexels`,
      query,
      provider: "Pexels" as const,
    }));
}

async function fetchUnsplashImages(query: string, apiKey: string): Promise<MoodImage[]> {
  const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=6&orientation=landscape&content_filter=high`, {
    headers: { Authorization: `Client-ID ${apiKey}`, "Accept-Version": "v1" },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { results?: UnsplashPhoto[] };
  return (data.results || [])
    .filter((photo) => photo.urls?.small)
    .map((photo) => ({
      src: photo.urls!.small as string,
      link: photo.links?.html || "",
      credit: `${photo.user?.name || "Creator"} / Unsplash`,
      query,
      provider: "Unsplash" as const,
    }));
}

function interleave<T>(a: T[], b: T[]): T[] {
  const result: T[] = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i += 1) {
    if (a[i]) result.push(a[i]);
    if (b[i]) result.push(b[i]);
  }
  return result;
}

export async function fetchMoodImages(query: string): Promise<{ images: MoodImage[]; providers: MoodImageProvider[] }> {
  const pexelsKey = process.env.PEXELS_API_KEY;
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
  const providers: MoodImageProvider[] = [];
  if (pexelsKey) providers.push("Pexels");
  if (unsplashKey) providers.push("Unsplash");

  const [pexels, unsplash] = await Promise.all([
    pexelsKey ? fetchPexelsImages(query, pexelsKey).catch(() => []) : Promise.resolve([]),
    unsplashKey ? fetchUnsplashImages(query, unsplashKey).catch(() => []) : Promise.resolve([]),
  ]);

  return { images: interleave(pexels, unsplash), providers };
}
