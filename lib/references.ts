import type { AssetProfile, DesignDirection, ReferenceGroup, ReferenceQuery } from "@/types";

function makeQuery(query: string): string {
  return encodeURIComponent(query).replace(/%20/g, "+");
}

type PlatformConfig = {
  siteUrl: string;
  note: string;
  /** layout(UI/구조) 전용, image(키비주얼) 전용, 또는 둘 다 다루는 플랫폼인지. */
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

type DomainHint = AssetProfile["domainHint"];

function allowedLayoutPlatforms(domainHint: DomainHint): Set<string> {
  if (domainHint === "marketing-web") return new Set(["Dribbble", "Behance", "Pinterest", "Figma Community", "Google", "GDWEB", "Land-book", "Awwwards", "Lapa Ninja", "DBDIC", "DBCUT"]);
  if (domainHint === "dashboard-ops") return new Set(["Dribbble", "Behance", "Pinterest", "Figma Community", "Google", "Mobbin", "Page Flows"]);
  if (domainHint === "mobile-app") return new Set(["Dribbble", "Behance", "Mobbin", "Pinterest", "Figma Community", "Page Flows", "AppShots", "UI Bowl"]);
  if (domainHint === "document") return new Set(["Dribbble", "Behance", "Pinterest", "Figma Community", "Brand New", "BrandB", "Fonts in Use"]);
  return new Set(["Dribbble", "Behance", "Pinterest", "Figma Community"]);
}

function allowedImagePlatforms(domainHint: DomainHint): Set<string> {
  const allowed = new Set(["Dribbble", "Behance", "Pinterest", "Figma Community"]);
  if (domainHint === "marketing-web") ["Google", "GDWEB", "Land-book"].forEach((p) => allowed.add(p));
  if (domainHint === "document") ["World Brand Design", "Brand Archive", "Brand New", "BrandB", "Fonts in Use"].forEach((p) => allowed.add(p));
  if (domainHint === "dashboard-ops") allowed.add("Mobbin");
  if (domainHint === "mobile-app") ["Mobbin", "AppShots", "UI Bowl"].forEach((p) => allowed.add(p));
  return allowed;
}

function buildLayoutKeywordsByPlatform(domain: string, assetType: string, domainHint: DomainHint): Record<string, string[]> {
  const isWeb = domainHint === "marketing-web";
  const isDashboard = domainHint === "dashboard-ops";
  const isMobile = domainHint === "mobile-app";
  const isDocument = domainHint === "document";
  const primaryLayoutKeyword = isDocument ? `${domain} ${assetType} layout` : isDashboard ? `${domain} dashboard UI` : `${domain} UI design`;
  const secondaryLayoutKeyword = isDocument ? `${domain} editorial layout` : isDashboard ? `${domain} admin dashboard` : `${domain} interface design`;
  return {
    Dribbble: [primaryLayoutKeyword, secondaryLayoutKeyword],
    Behance: [`${domain} ${assetType} case study`, isDocument ? "enterprise brochure layout" : "enterprise dashboard case study"],
    Mobbin: isMobile ? ["mobile onboarding flow", "mobile profile setup"] : isDashboard ? ["dashboard app screen", "admin settings flow"] : [],
    Pinterest: [`${domain} layout inspiration`, isDocument ? "editorial design moodboard" : "dashboard UI inspiration"],
    "Figma Community": [isDocument ? "proposal brochure layout template" : "dashboard UI kit", isWeb ? "landing page template" : "admin dashboard template", "component library"],
    Google: isWeb
      ? [`${domain} company website`, `${domain} service homepage reference`, `${domain} competitor website`]
      : isDashboard
        ? [`${domain} dashboard UI reference`, `${domain} admin dashboard example`]
        : [],
    GDWEB: isWeb ? [`${domain} 홈페이지`, `${domain} 이벤트페이지`, "기업 홈페이지"] : [],
    "Land-book": isWeb ? [`${domain} landing page`, "SaaS landing page design"] : [],
    "Page Flows": isDashboard || isMobile ? ["onboarding flow", "settings flow", "account setup flow"] : [],
    Awwwards: isWeb ? [`${domain} corporate website`, "agency website design"] : [],
    "Lapa Ninja": isWeb ? [`${domain} landing page`, "SaaS homepage design"] : [],
    DBDIC: isWeb ? [`${domain} 홈페이지 레이아웃`, "GNB 구조 레퍼런스"] : [],
    DBCUT: isWeb ? [`${domain} 홈페이지 리뉴얼`, "기업사이트 트렌드"] : [],
    AppShots: isMobile ? ["mobile app screen", "profile setup screen"] : /login/i.test(assetType) ? ["login UI flow"] : [],
    "UI Bowl": isMobile ? ["탭 컴포넌트", "카드 컴포넌트", "폼 컴포넌트"] : [],
    "Brand New": isDocument ? [`${domain} rebrand case study`, "identity redesign"] : [],
    BrandB: isDocument ? [`${domain} CI BI 디자인`, "브랜드 리뉴얼"] : [],
  };
}

function buildImageKeywordsByPlatform(domain: string, assetType: string, domainHint: DomainHint): Record<string, string[]> {
  const isMarketingWeb = domainHint === "marketing-web";
  const isDashboard = domainHint === "dashboard-ops";
  const isMobile = domainHint === "mobile-app";
  const isDocument = domainHint === "document";
  return {
    Dribbble: [`${domain} cover visual`, `${domain} hero visual`],
    Behance: [`${domain} brand visual case study`, `${assetType} cover visual design`],
    Mobbin: isDashboard || isMobile || /login/i.test(assetType) ? ["login screen visual", "authentication screen illustration"] : [],
    Pinterest: [`${domain} key visual`, "technology abstract background"],
    "Figma Community": ["hero section visual template", "proposal cover template"],
    Google: isMarketingWeb ? [`${domain} hero image website`, `${domain} landing page hero visual`] : [],
    GDWEB: isMarketingWeb ? [`${domain} 홈페이지 비주얼`, `${domain} 랜딩페이지 히어로`] : [],
    "Land-book": isMarketingWeb ? [`${domain} landing page`] : [],
    "Page Flows": [],
    "World Brand Design": isDocument ? [`${domain} brand identity`, "corporate branding visual"] : [],
    "Brand Archive": isDocument ? ["art direction reference", "brand application visual"] : [],
    "Fonts in Use": isDocument ? ["editorial typography", "report typography reference"] : [],
  };
}

function toReferenceQueries(keywordsByPlatform: Record<string, string[]>, allowed: Set<string>): ReferenceQuery[] {
  return Object.entries(keywordsByPlatform)
    .filter(([platform, keywords]) => allowed.has(platform) && keywords.filter(Boolean).length > 0)
    .map(([platform, keywords]) => ({ platform, keywords: keywords.filter(Boolean) }));
}

function mergeReferenceQueries(base: ReferenceQuery[], extra: ReferenceQuery[]): ReferenceQuery[] {
  const byPlatform = new Map<string, Set<string>>();
  for (const query of [...base, ...extra]) {
    const set = byPlatform.get(query.platform) || new Set<string>();
    query.keywords.forEach((keyword) => keyword && set.add(keyword));
    byPlatform.set(query.platform, set);
  }
  return Array.from(byPlatform.entries()).map(([platform, keywords]) => ({ platform, keywords: Array.from(keywords) }));
}

/**
 * Builds the default per-direction reference queries (used by lib/generatorAnalysis.ts'
 * normalizeAnalysis when Gemini's referenceKeywordsByPlatform is sparse/empty for a direction),
 * merges them with whatever Gemini provided, and filters the result to platforms applicable to
 * this direction's needs.
 */
export function resolveDirectionReferenceQueries(
  geminiQueries: ReferenceQuery[] | undefined,
  assetProfile: AssetProfile,
  domain: string,
  needsLayout: boolean,
  needsImage: boolean,
): ReferenceQuery[] {
  const allowed = new Set<string>();
  let defaults: ReferenceQuery[] = [];

  if (needsLayout) {
    allowedLayoutPlatforms(assetProfile.domainHint).forEach((p) => allowed.add(p));
    defaults = defaults.concat(toReferenceQueries(buildLayoutKeywordsByPlatform(domain, assetProfile.assetType, assetProfile.domainHint), allowedLayoutPlatforms(assetProfile.domainHint)));
  }
  if (needsImage) {
    allowedImagePlatforms(assetProfile.domainHint).forEach((p) => allowed.add(p));
    defaults = defaults.concat(toReferenceQueries(buildImageKeywordsByPlatform(domain, assetProfile.assetType, assetProfile.domainHint), allowedImagePlatforms(assetProfile.domainHint)));
  }

  const merged = mergeReferenceQueries(defaults, geminiQueries || []);
  return merged.filter((query) => allowed.has(query.platform) && query.keywords.length > 0);
}

export function buildReferenceGroups(direction: DesignDirection): ReferenceGroup[] {
  return direction.references
    .map((query) => {
      const config = PLATFORMS[query.platform];
      if (!config) return null;
      const group: ReferenceGroup = {
        name: query.platform,
        note: config.note,
        siteUrl: config.siteUrl,
        searchable: Boolean(config.searchUrl),
        purpose: config.purpose,
        items: query.keywords.map((keyword) => ({
          label: keyword,
          url: config.searchUrl ? config.searchUrl(keyword) : config.siteUrl,
        })),
      };
      return group;
    })
    .filter((group): group is ReferenceGroup => group !== null && group.items.length > 0);
}
