import type { GeneratorAnalysis, ReferenceGroup } from "@/types";

function makeQuery(query: string): string {
  return encodeURIComponent(query).replace(/%20/g, "+");
}

type PlatformConfig = {
  siteUrl: string;
  note: string;
  /** layout(UI/구조) 전용, image(키비주얼) 전용, 또는 둘 다 다루는 플랫폼인지. lib/generatorAnalysis.ts의
   * buildLayoutPlatformKeywords / buildImagePlatformKeywords 배정과 일치시켜 둡니다. */
  purpose: "layout" | "image" | "both";
  /** 검증된 검색 URL이 있을 때만 설정. 없으면 사이트 방문 링크 + 키워드 복사 UX로 표시됩니다. */
  searchUrl?: (query: string) => string;
};

const PLATFORMS: Record<string, PlatformConfig> = {
  Dribbble: {
    siteUrl: "https://dribbble.com",
    note: "시각 스타일과 UI 톤 탐색",
    purpose: "both",
    searchUrl: (q) => `https://dribbble.com/search/${makeQuery(q)}`,
  },
  Behance: {
    siteUrl: "https://www.behance.net",
    note: "프로젝트 맥락과 케이스스터디 탐색",
    purpose: "both",
    searchUrl: (q) => `https://www.behance.net/search/projects?search=${makeQuery(q)}`,
  },
  Mobbin: {
    siteUrl: "https://mobbin.com",
    note: "실제 제품 화면 패턴 탐색",
    purpose: "both",
    searchUrl: (q) => `https://mobbin.com/search?q=${makeQuery(q)}`,
  },
  Pinterest: {
    siteUrl: "https://www.pinterest.com",
    note: "무드보드와 이미지 방향 탐색",
    purpose: "both",
    searchUrl: (q) => `https://www.pinterest.com/search/pins/?q=${makeQuery(q)}`,
  },
  "Figma Community": {
    siteUrl: "https://www.figma.com/community",
    note: "UI kit, 컴포넌트, 템플릿 탐색",
    purpose: "both",
    searchUrl: (q) => `https://www.figma.com/community/search?resource_type=files&q=${makeQuery(q)}`,
  },
  Google: {
    siteUrl: "https://www.google.com",
    note: "유사 기업 웹사이트와 실제 서비스 탐색",
    purpose: "both",
    searchUrl: (q) => `https://www.google.com/search?q=${makeQuery(q)}`,
  },
  GDWEB: {
    siteUrl: "https://www.gdweb.co.kr",
    note: "국내 홈페이지/랜딩/이벤트 선정작 - 키워드 복사 후 사이트에서 직접 검색",
    purpose: "both",
  },
  "Land-book": {
    siteUrl: "https://land-book.com",
    note: "랜딩페이지 전문 레퍼런스 탐색",
    purpose: "both",
    searchUrl: (q) => `https://land-book.com/?search_keywords=${makeQuery(q)}`,
  },
  "Page Flows": {
    siteUrl: "https://pageflows.com",
    note: "온보딩/체크아웃 등 유저 플로우 단위 레퍼런스 탐색",
    purpose: "layout",
    searchUrl: (q) => `https://pageflows.com/search/?q=${makeQuery(q)}&request_inform=web`,
  },
  "Brand New": {
    siteUrl: "https://www.underconsideration.com/brandnew",
    note: "브랜드 리디자인 케이스 스터디 탐색",
    purpose: "layout",
    searchUrl: (q) => `https://www.underconsideration.com/brandnew/?s=${makeQuery(q)}`,
  },
  // 아래 플랫폼은 검색 URL 패턴이 검증되지 않아 사이트 방문 링크 + 키워드 복사로만 제공합니다.
  Awwwards: { siteUrl: "https://www.awwwards.com", note: "크리에이티브 웹사이트 수상작 — 키워드 복사 후 사이트에서 직접 검색", purpose: "layout" },
  "Lapa Ninja": { siteUrl: "https://www.lapa.ninja", note: "랜딩페이지 7,300개+ 아카이브 — 키워드 복사 후 사이트에서 직접 검색", purpose: "layout" },
  DBDIC: { siteUrl: "https://dbdic.co.kr", note: "컬러/레이아웃/스타일 필터 탐색 — 키워드 복사 후 사이트에서 직접 검색", purpose: "layout" },
  DBCUT: { siteUrl: "https://dbcut.com", note: "국내 오픈/리뉴얼 최신 트렌드 — 키워드 복사 후 사이트에서 직접 검색", purpose: "layout" },
  AppShots: { siteUrl: "https://appshots.design", note: "앱 스크린/플로우 아카이브 — 키워드 복사 후 사이트에서 직접 검색", purpose: "layout" },
  "UI Bowl": { siteUrl: "https://uibowl.io", note: "국내 모바일 UI 패턴 — 키워드 복사 후 사이트에서 직접 검색", purpose: "layout" },
  "World Brand Design": { siteUrl: "https://worldbranddesign.com", note: "글로벌 브랜드/패키지 디자인 — 키워드 복사 후 사이트에서 직접 검색", purpose: "image" },
  "Brand Archive": { siteUrl: "https://brandarchive.xyz", note: "로고/아트디렉션 아카이브 — 키워드 복사 후 사이트에서 직접 검색", purpose: "image" },
  BrandB: { siteUrl: "https://brandb.net", note: "국내 CI/BI 브랜드 아카이브 — 키워드 복사 후 사이트에서 직접 검색", purpose: "layout" },
  "Fonts in Use": { siteUrl: "https://fontsinuse.com", note: "실제 사용된 서체 레퍼런스 — 키워드 복사 후 사이트에서 직접 검색", purpose: "image" },
};

export function buildReferences(analysis: GeneratorAnalysis): ReferenceGroup[] {
  return Object.entries(PLATFORMS)
    .map(([name, config]) => {
      const keywords = analysis.platformKeywords[name] || [];
      return {
        name,
        note: config.note,
        siteUrl: config.siteUrl,
        searchable: Boolean(config.searchUrl),
        purpose: config.purpose,
        items: keywords.map((keyword) => ({
          label: keyword,
          url: config.searchUrl ? config.searchUrl(keyword) : config.siteUrl,
        })),
      };
    })
    .filter((group) => group.items.length);
}
