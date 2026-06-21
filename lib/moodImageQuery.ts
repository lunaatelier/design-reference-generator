import type { GeneratorAnalysis } from "@/types";

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

function isDocumentAsset(assetType: string): boolean {
  return /brochure|proposal|report|poster/i.test(assetType);
}

function isWebAsset(assetType: string): boolean {
  return /web|landing|homepage|event/i.test(assetType);
}

// 스톡 이미지 검색은 단어를 많이 합칠수록(예: 키워드 3개를 그대로 이어붙이면) 교집합이 옅어져서
// 가장 흔한 단어("abstract", "tech")에만 맞는 엉뚱한 결과가 나온다. 키워드별로 짧게 끊어 따로 검색한다.
function trimWords(phrase: string): string {
  return phrase.trim().split(/\s+/).slice(0, MAX_QUERY_WORDS).join(" ");
}

function isGenericOnly(query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return words.length > 0 && words.every((word) => GENERIC_FILLER_WORDS.has(word));
}

export function buildImageSearchQueries(analysis: GeneratorAnalysis, mood: GeneratorAnalysis["moods"][number]): string[] {
  const { assetType, domain } = analysis.project;

  const stockQueries = analysis.stockImageQueries.filter((query) => !PEOPLE_PATTERN.test(query)).map(trimWords).filter(Boolean);
  if (stockQueries.length) {
    // 구체적인(도메인 앵커가 있는) 검색어를 먼저, abstract/tech류만 있는 검색어는 뒤로
    const specific = stockQueries.filter((query) => !isGenericOnly(query));
    const generic = stockQueries.filter(isGenericOnly);
    return [...specific, ...generic].slice(0, MAX_QUERIES);
  }

  const keywords = analysis.imageKeywords.filter((keyword) => !PEOPLE_PATTERN.test(keyword));
  if (keywords.length) return keywords.slice(0, 2).map(trimWords);

  if (isDocumentAsset(assetType)) return [`${domain} abstract technology background`];
  if (isWebAsset(assetType)) return [`${domain} hero image`];

  const moodKeywords = mood.keywords.filter((keyword) => !PEOPLE_PATTERN.test(keyword));
  return [[...moodKeywords.slice(0, 2), domain].filter(Boolean).join(" ")];
}

// 검색 결과 재랭킹에 쓸 "이 프로젝트와 관련 있다"는 신호 단어 목록.
// project.domain/assetType/keywordGroups.domain/screenTypes 이름에서 뽑은 실제 맥락 단어이므로
// 프로젝트마다 자동으로 달라진다(하드코딩된 도메인 목록이 아님).
export function buildRelevanceTerms(analysis: GeneratorAnalysis): string[] {
  const sources = [
    analysis.project.domain,
    analysis.project.assetType,
    ...analysis.keywordGroups.domain,
    ...analysis.screenTypes.map((screen) => screen.name),
    ...analysis.stockImageQueries,
  ];

  const terms = sources
    .flatMap((source) => source.toLowerCase().split(/[^a-z0-9가-힣]+/))
    .filter((word) => word.length > 2 && !GENERIC_FILLER_WORDS.has(word));

  return Array.from(new Set(terms));
}
