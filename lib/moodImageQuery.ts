import type { AssetProfile, DesignDirection, GeneratorAnalysis, ImageDirection, Mood } from "@/types";

const PEOPLE_PATTERN = /handshake|meeting|office\s*people|business\s*people|corporate\s*photography|shaking\s*hands|group\s*of\s*people/i;
const MAX_QUERY_WORDS = 4;
const MAX_QUERIES = 4;

// abstract/background류 단독 표현만으로 검색하면 스톡 사이트는 모션블러 같은 범용 테크 이미지를 준다.
// 도메인 앵커 없이 이 단어들로만 구성된 검색어는 뒤로 미룬다(완전 배제는 아님 - 다른 후보가 없을 때를 위해).
const GENERIC_FILLER_WORDS = new Set([
  "abstract",
  "background",
  "futuristic",
  "digital",
  "network",
  "data",
  "streams",
  "stream",
  "tech",
  "technology",
  "modern",
]);

// 스톡 이미지 검색은 단어를 많이 합칠수록(예: 키워드 3개를 그대로 이어붙이면) 교집합이 옅어져서
// 가장 흔한 단어("abstract", "tech")에만 맞는 엉뚱한 결과가 나온다. 키워드별로 짧게 끊어 따로 검색한다.
function trimWords(phrase: string): string {
  return phrase.trim().split(/\s+/).slice(0, MAX_QUERY_WORDS).join(" ");
}

function isGenericOnly(query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return words.length > 0 && words.every((word) => GENERIC_FILLER_WORDS.has(word));
}

// 이 함수는 visual 방향(키비주얼/스톡 사진)을 렌더링할 때만 호출된다 — ui-only 방향(대시보드
// 레이아웃 등)은 스톡 사진이 구조와 무관하므로 이 모듈을 거치지 않는다.
export function buildImageSearchQueries(imageDirection: ImageDirection, mood: Mood, assetProfile: AssetProfile, domain: string): string[] {
  const stockQueries = imageDirection.stockQueries.filter((query) => !PEOPLE_PATTERN.test(query)).map(trimWords).filter(Boolean);
  if (stockQueries.length) {
    // 구체적인(도메인 앵커가 있는) 검색어를 먼저, abstract/tech류만 있는 검색어는 뒤로
    const specific = stockQueries.filter((query) => !isGenericOnly(query));
    const generic = stockQueries.filter(isGenericOnly);
    return [...specific, ...generic].slice(0, MAX_QUERIES);
  }

  if (assetProfile.domainHint === "document") return [`${domain} abstract technology background`];
  if (assetProfile.domainHint === "marketing-web") return [`${domain} hero image`];

  const moodKeywords = mood.keywords.filter((keyword) => !PEOPLE_PATTERN.test(keyword));
  return [[...moodKeywords.slice(0, 2), domain].filter(Boolean).join(" ")];
}

// 검색 결과 재랭킹에 쓸 "이 프로젝트와 관련 있다"는 신호 단어 목록.
// projectIntent.domain/assetProfile.assetType/keywordGroups.domain/screenTypes 이름/stockQueries에서
// 뽑은 실제 맥락 단어이므로 프로젝트마다 자동으로 달라진다(하드코딩된 도메인 목록이 아님).
export function buildRelevanceTerms(analysis: GeneratorAnalysis, direction: DesignDirection): string[] {
  const sources = [
    analysis.projectIntent.domain,
    analysis.assetProfile.assetType,
    ...analysis.keywordGroups.domain,
    ...(direction.ui?.screenTypes.map((screen) => screen.name) || []),
    ...(direction.visual?.imageDirections.flatMap((imageDirection) => imageDirection.stockQueries) || []),
  ];

  const terms = sources
    .flatMap((source) => source.toLowerCase().split(/[^a-z0-9가-힣]+/))
    .filter((word) => word.length > 2 && !GENERIC_FILLER_WORDS.has(word));

  return Array.from(new Set(terms));
}
