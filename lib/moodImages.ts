import type { MoodImage, MoodImageProvider } from "@/types";

type PexelsPhoto = {
  src?: { medium?: string; large?: string };
  url: string;
  photographer: string;
  alt?: string;
};

type UnsplashPhoto = {
  urls?: { small?: string };
  links?: { html?: string };
  user?: { name?: string };
  alt_description?: string;
  description?: string;
};

async function fetchPexelsImages(query: string, apiKey: string, page: number): Promise<MoodImage[]> {
  const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=6&page=${page}&orientation=landscape`, {
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
      description: photo.alt || "",
    }));
}

async function fetchUnsplashImages(query: string, apiKey: string, page: number): Promise<MoodImage[]> {
  const res = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=6&page=${page}&orientation=landscape&content_filter=high`,
    { headers: { Authorization: `Client-ID ${apiKey}`, "Accept-Version": "v1" } },
  );
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
      description: photo.alt_description || photo.description || "",
    }));
}

function interleave<T>(lists: T[][]): T[] {
  const result: T[] = [];
  const max = Math.max(0, ...lists.map((list) => list.length));
  for (let i = 0; i < max; i += 1) {
    for (const list of lists) {
      if (list[i]) result.push(list[i]);
    }
  }
  return result;
}

function dedupeByLink(images: MoodImage[]): MoodImage[] {
  const seen = new Set<string>();
  return images.filter((image) => {
    if (seen.has(image.link)) return false;
    seen.add(image.link);
    return true;
  });
}

// 검색어 자체를 짧고 구체적으로 만들어도, 스톡 사이트가 돌려주는 결과 안에는 여전히 엉뚱한
// generic 이미지가 섞여 들어온다. alt/description/credit 텍스트를 프로젝트 맥락 단어와 대조해
// 관련도가 높은 쪽을 앞으로 보낸다(완전히 걸러내지는 않음 - 점수만 다를 뿐 후보는 유지).
const PENALTY_WORDS = ["abstract", "blur", "motion", "futuristic", "generic", "texture", "wallpaper", "pattern"];

function scoreImage(image: MoodImage, gainTerms: string[]): number {
  const text = `${image.description ?? ""} ${image.credit} ${image.query}`.toLowerCase();
  let score = 0;
  for (const term of gainTerms) {
    if (term && text.includes(term)) score += 2;
  }
  for (const word of PENALTY_WORDS) {
    if (text.includes(word)) score -= 1;
  }
  return score;
}

function rerank(images: MoodImage[], gainTerms: string[]): MoodImage[] {
  if (!gainTerms.length) return images;
  return images
    .map((image, index) => ({ image, index, score: scoreImage(image, gainTerms) }))
    .sort((a, b) => (b.score !== a.score ? b.score - a.score : a.index - b.index))
    .map((entry) => entry.image);
}

export async function fetchMoodImages(
  queries: string[],
  gainTerms: string[] = [],
  page = 1,
): Promise<{ images: MoodImage[]; providers: MoodImageProvider[] }> {
  const pexelsKey = process.env.PEXELS_API_KEY;
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
  const providers: MoodImageProvider[] = [];
  if (pexelsKey) providers.push("Pexels");
  if (unsplashKey) providers.push("Unsplash");

  // 키워드별로 따로 검색해서(diluted query 방지) 묶음 단위로 교차 배치한다.
  const perQuery = await Promise.all(
    queries.map(async (query) => {
      const [pexels, unsplash] = await Promise.all([
        pexelsKey ? fetchPexelsImages(query, pexelsKey, page).catch(() => []) : Promise.resolve([]),
        unsplashKey ? fetchUnsplashImages(query, unsplashKey, page).catch(() => []) : Promise.resolve([]),
      ]);
      return interleave([pexels, unsplash]);
    }),
  );

  const merged = dedupeByLink(interleave(perQuery));
  return { images: rerank(merged, gainTerms), providers };
}
