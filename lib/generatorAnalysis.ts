import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildAssetProfile } from "@/lib/assetProfile";
import { maskSensitiveText } from "@/lib/promptMasking";
import { resolveDirectionReferenceQueries } from "@/lib/references";
import type {
  AnalysisSource,
  AssetProfile,
  DesignDirection,
  GeneratorAnalysis,
  ImageDirection,
  LayoutModule,
  LayoutStructure,
  LayoutVariant,
  Mood,
  ProjectIntent,
  ReferenceQuery,
  RegenerateMoodsResponse,
  UiDirection,
  VisualDirection,
} from "@/types";

const MODEL_NAME = "gemini-2.5-flash-lite";

const PROMPT = `당신은 설계 문서를 분석해 디자인 방향(레이아웃 구조 + 키비주얼 방향)과 무드보드 초안을 만드는 어시스턴트입니다.
아래 문서 내용을 읽고 JSON만 반환하세요. 마크다운 코드블록, 설명, 주석은 금지합니다.

필수 JSON 구조:
{
  "projectIntent": {"title": "프로젝트명", "description": "한 줄 설명", "domain": "도메인", "target": "주요 사용자", "tags": ["태그"]},
  "assetTypeRaw": "dashboard|webpage|web-app|landing|event-page|mobile-app|brochure|proposal|poster|report|image|other",
  "directions": [
    {
      "id": "kebab-case-id",
      "label": "방향 이름 (예: 관제 대시보드, 로그인 키비주얼)",
      "appliesTo": "이 방향이 적용되는 화면/영역",
      "needsUi": true,
      "needsVisual": false,
      "ui": {
        "screenTypes": [
          {
            "icon": "기호",
            "name": "필요 산출물 구성",
            "count": 1,
            "desc": "필요한 이유",
            "layoutVariants": [
              {
                "id": "v1",
                "structure": "command-center|map-centric|kpi-wall|incident-focused|split-monitoring|generic-dashboard|generic-list|generic-detail|cover-logotype|cover-full-bleed|cover-minimal-text|numbered-list|timeline|card-grid|split-content|editorial-grid|page-spread|infographic-page|comparison-table|vision-statement|proposal-section|report-page|poster-layout",
                "title": "변형 이름 (예: 지도 중심 관제형)",
                "description": "이 구조가 적합한 이유",
                "density": "compact|comfortable|spacious",
                "modules": [{"id": "module-id", "label": "모듈 이름", "weight": "primary|secondary|support"}],
                "notes": ["이 변형에 대한 판단 근거"]
              }
            ]
          }
        ]
      },
      "visual": {
        "promptSeeds": ["english image generation prompt"],
        "promptSeedsKo": ["promptSeeds와 같은 순서로, 무슨 이미지인지 한국어로 직역"],
        "imageDirections": [{"id": "id", "title": "방향 이름", "styleNotes": "스타일 방향 설명", "promptSeedIndexes": [0], "stockQueries": ["Pexels/Unsplash 검색용 2~4단어 영어 명사구"]}],
        "themeRecommendation": {"preferred": "light|dark|both", "reason": "테마 제안 이유", "alternatives": ["고려사항"]}
      },
      "referenceKeywordsByPlatform": {"Dribbble": ["keyword"], "Pinterest": ["keyword"]}
    }
  ],
  "palette": [{"name": "색상명", "hex": "#000000", "role": "역할"}],
  "moods": [{"title": "무드명", "desc": "이 무드가 적합한 이유", "colors": ["#000000"], "keywords": ["english keyword"]}],
  "keywordGroups": {"deliverable": ["산출물 형태 키워드"], "colorMood": ["컬러/무드 키워드"], "design": ["디자인 키워드"], "domain": ["도메인 키워드"]}
}

규칙:
- assetTypeRaw는 "이 문서 자체가 최종적으로 어떤 산출물로 제작되는가"를 기준으로 판단하세요. 문서 본문이 설명하는 대상 제품/서비스가 어떤 UI를 갖추면 좋겠는지를 기준으로 판단하지 마세요. 예를 들어 회사소개서/브로셔 문서 안에 "우리 플랫폼은 홈페이지, 모듈 소개, 데모 신청 화면이 있다"는 내용이 있어도, 이 문서 자체는 웹사이트가 아니라 브로셔이므로 assetTypeRaw는 "brochure"여야 합니다. 파일명(아래 "문서 파일명")에 브로셔/제안서/보고서/포스터 등의 단어가 있으면 강한 우선 신호로 사용하세요.
- 이 프로젝트에 UI 레이아웃 방향과 비주얼/키비주얼 방향이 모두 필요하면 directions 배열에 각각 별도의 항목을 만드세요. 하나의 direction에 ui와 visual을 동시에 넣지 말고 분리하세요 (예: 관제 대시보드 프로젝트라면 "관제 대시보드" ui-only 방향 1개 + "로그인 키비주얼" visual-only 방향 1개).
- needsUi가 true인 direction은 ui 필드를 반드시 채우고, needsVisual이 true인 direction은 visual 필드를 반드시 채우세요. 반대 필드는 생략하세요.
- layoutVariants는 direction 전체가 공유하는 풀이 아니라 **각 screenType(화면/Deliverable) 전용**입니다. screenType마다 그 화면 성격에 맞는 layoutVariants를 1~3개씩 따로 작성하세요 — 예를 들어 "표지" screenType과 "본문" screenType은 서로 다른 구조 후보를 가져야 하며, 같은 구조를 두 screenType에 그대로 복사하지 마세요.
- 대시보드/관리자/운영 문서: "Main"류(대표/현황) 화면은 command-center, map-centric, kpi-wall, incident-focused, split-monitoring, generic-dashboard 중에서 고르세요(관제실/지도/교통/장애대응/CCTV/모니터링 내용이 있으면 command-center/map-centric/kpi-wall/incident-focused/split-monitoring을 우선 사용). 목록류 화면은 generic-list, 상세류 화면은 generic-detail을 사용하세요.
- 브로셔/포스터/제안서/보고서처럼 이 문서 자체가 인쇄물·편집물(assetTypeRaw가 brochure/poster/proposal/report)이면, screenType의 성격별로 다음 후보 중에서 구조를 고르세요(generic-dashboard 계열은 쓰지 마세요):
  - 표지 화면: cover-logotype(로고/타이포 중심), cover-full-bleed(풀블리드 이미지), cover-minimal-text(미니멀 텍스트) 중 1~3개
  - 목차·소개 화면: numbered-list(넘버드 리스트), timeline(타임라인), card-grid(카드 그리드) 중 1~3개
  - 본문 화면: split-content(좌우 분할), editorial-grid(에디토리얼 그리드), page-spread(페이지 스프레드) 중 1~3개
  - 차별화요소·결론 화면: infographic-page(인포그래픽), comparison-table(비교 테이블), vision-statement(비전 선언) 중 1~3개
  - 포스터(assetTypeRaw가 poster)는 표지 화면에 poster-layout을 우선 포함하세요. 제안서는 본문/결론 화면에 proposal-section을, 보고서는 report-page를 후보로 포함할 수 있습니다.
- 로그인/인증 화면, 홈페이지 히어로, 제안서 표지, 브로셔 표지처럼 키비주얼이 필요한 화면이 문서에 있으면 visual-only 방향을 별도로 만들고 promptSeeds를 3개 작성하세요.
- 홈페이지/랜딩/이벤트 페이지는 ui(섹션 레이아웃)와 visual(히어로 키비주얼)을 모두 필요로 하는 경우가 많습니다 — 이 경우에도 두 개의 별도 direction으로 분리하세요.
- 브로셔/제안서/보고서/포스터는 ui(편집 레이아웃)와 visual(표지 키비주얼) 모두 별도 direction으로 만드세요.
- promptSeedsKo는 promptSeeds 각 문장을 빠짐없이 직역한 한국어 문장이어야 합니다. 구도/조명/크롭/스타일 등 세부 묘사를 생략하거나 한 줄로 뭉뚱그려 요약하지 마세요. promptSeeds와 같은 개수, 같은 순서여야 합니다.
- stockQueries는 Freepik 같은 생성형 이미지가 아니라 Pexels/Unsplash 실제 사진 검색용입니다. abstract/background/futuristic/digital 같은 추상 표현만으로 구성하지 말고 실제로 사진에 찍힐 수 있는 구체적인 장면/장소/사물(예: smart city control room, gis dashboard map, hospital reception desk)을 도메인과 결합해 작성하세요.
- 표지/표지 키비주얼은 악수, 회의 장면, 사무실 사람 사진을 피하고 기술 추상 배경, 제품/인프라 컨셉, 브랜드 비주얼 소재를 우선하세요.
- keywordGroups는 산출물형태, 컬러무드, 디자인키워드, 도메인키워드 네 묶음으로 분리하세요. 너무 추상적인 한 단어를 피하고 산출물 유형과 도메인을 조합한 2~5단어 검색어로 작성하세요.
- screenTypes의 icon은 이모지나 □▣◇▦◫ 같은 기호 1글자만 쓰세요. "Document", "Cover" 같은 단어를 icon 자리에 쓰지 마세요(그건 name 자리에 씁니다).
- referenceKeywordsByPlatform은 direction마다 그 direction에 어울리는 플랫폼만 채우세요(예: ui-only 방향이면 Dribbble/Figma Community/Mobbin 등, visual-only 방향이면 Pinterest/Behance 등).
- referenceKeywordsByPlatform 키워드는 플랫폼 성격에 맞게 작성하세요. Behance/Pinterest/Dribbble/Figma Community와 브랜드 계열 플랫폼(Brand New, BrandB, World Brand Design, Brand Archive, Fonts in Use)에는 기술 용어를 나열하지 마세요(예: "AI 빅데이터 지식그래프 온톨로지" 금지). 대신 산출물 종류 + 디자인 스타일 중심의 짧은 구문 2~4단어로 쓰세요(예: "technology brochure design", "editorial case study", "dashboard UI inspiration"). Mobbin/Page Flows/AppShots는 화면·플로우 명사 1~3단어만 쓰세요(예: "onboarding flow", "login screen"). Google과 GDWEB/DBDIC/DBCUT처럼 실제 서비스·홈페이지를 찾는 플랫폼에는 도메인 기술 용어를 그대로 써도 됩니다(최대 7단어).
- 기술자료 추천은 만들지 마세요.
- palette는 5~6개, moods는 정확히 3개를 제안하세요.
{{PRIMARY_COLOR_RULE}}

문서 파일명: {{FILE_TITLE}}

문서 내용:
"""
{{DOCUMENT}}
"""`;

const REGENERATE_PROMPT = `당신은 디자인 방향 생성기의 컬러 보정 어시스턴트입니다.
아래 프로젝트 정보와 문서 내용을 참고해서 palette와 moods만 다시 생성하세요. JSON만 반환하고 마크다운 코드블록, 설명, 주석은 금지합니다.

필수 JSON 구조:
{
  "palette": [{"name": "색상명", "hex": "#000000", "role": "역할"}],
  "moods": [{"title": "무드명", "desc": "이 무드가 적합한 이유", "colors": ["#000000"], "keywords": ["english keyword"]}]
}

규칙:
- palette는 5~6개, moods는 정확히 3개를 제안하세요.
- 기존에 제안했던 무드/팔레트와는 다른 새로운 조합을 제안하세요.
{{PRIMARY_COLOR_RULE}}
{{BRIEF_RULE}}

프로젝트 정보: {{PROJECT}}

문서 내용:
"""
{{DOCUMENT}}
"""`;

function buildPrompt(documentText: string, primaryColor?: string, fileTitle?: string): string {
  const primaryColorRule = primaryColor
    ? `- 사용자가 지정한 Primary Color는 "${primaryColor}"입니다. palette와 moods 전체를 이 컬러를 중심으로 구성하세요.`
    : "";
  return PROMPT.replace("{{DOCUMENT}}", documentText)
    .replace("{{PRIMARY_COLOR_RULE}}", primaryColorRule)
    .replace("{{FILE_TITLE}}", fileTitle || "(파일명 없음)");
}

function buildRegeneratePrompt(documentText: string, projectIntent: ProjectIntent, brief?: string, primaryColor?: string): string {
  const primaryColorRule = primaryColor
    ? `- Primary Color는 "${primaryColor}"로 고정되어 있습니다. 이 컬러는 절대 변경하지 말고, palette에 정확히 이 hex값으로 포함하고 모든 무드의 핵심 컬러로 유지하세요. 나머지 팔레트만 새로운 방향에 맞게 재구성하세요.`
    : "";
  const briefRule = brief ? `- 사용자가 요청한 보정 방향: "${brief}"` : "";
  return REGENERATE_PROMPT.replace("{{DOCUMENT}}", documentText)
    .replace("{{PROJECT}}", JSON.stringify(projectIntent))
    .replace("{{PRIMARY_COLOR_RULE}}", primaryColorRule)
    .replace("{{BRIEF_RULE}}", briefRule);
}

function enforcePrimaryColor(result: RegenerateMoodsResponse, primaryColor: string): RegenerateMoodsResponse {
  const normalized = primaryColor.toLowerCase();
  const palette = result.palette.some((item) => item.hex.toLowerCase() === normalized)
    ? result.palette
    : result.palette.map((item, index) => (index === 0 ? { ...item, hex: primaryColor, name: item.name || "Primary", role: "Primary" } : item));

  const moods = result.moods.map((mood) => {
    if (mood.colors.some((color) => color.toLowerCase() === normalized)) return mood;
    const colors = [...mood.colors];
    const replaceIndex = colors.length > 1 ? 1 : 0;
    colors[replaceIndex] = primaryColor;
    return { ...mood, colors };
  });

  return { palette, moods };
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) throw new Error("Gemini 응답에서 JSON을 찾을 수 없습니다.");
  return text.slice(start, end + 1);
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

const UI_SCREEN_STRUCTURES: LayoutStructure[] = [
  "command-center",
  "map-centric",
  "kpi-wall",
  "incident-focused",
  "split-monitoring",
  "generic-dashboard",
  "generic-list",
  "generic-detail",
];

const DOCUMENT_STRUCTURES: LayoutStructure[] = [
  "cover-logotype",
  "cover-full-bleed",
  "cover-minimal-text",
  "numbered-list",
  "timeline",
  "card-grid",
  "split-content",
  "editorial-grid",
  "page-spread",
  "infographic-page",
  "comparison-table",
  "vision-statement",
  "proposal-section",
  "report-page",
  "poster-layout",
];

// A Deliverable's layoutVariants are scoped to what actually makes sense for that kind of
// screen — a cover and a table-of-contents shouldn't draw from the same generic pool. This is
// a code-side heuristic only (not part of the JSON contract); see
// memory/project_deliverable-scoped-layouts.md for the full design.
type DeliverableArchetype = "cover" | "toc" | "body" | "closing" | "main" | "list" | "detail";

function detectDeliverableArchetype(domainHint: AssetProfile["domainHint"], name: string, desc: string): DeliverableArchetype {
  const text = `${name} ${desc}`.toLowerCase();
  if (domainHint === "document") {
    if (/cover|표지/.test(text)) return "cover";
    if (/toc|목차|소개|intro|overview/.test(text)) return "toc";
    if (/infographic|차별화|결론|마무리|conclusion|closing|differentiat/.test(text)) return "closing";
    return "body";
  }
  if (/list|table|목록|테이블|history|이력/.test(text)) return "list";
  if (/detail|상세/.test(text)) return "detail";
  return "main";
}

const ARCHETYPE_STRUCTURE_CANDIDATES: Record<DeliverableArchetype, Array<{ structure: LayoutStructure; title: string; description: string }>> = {
  cover: [
    { structure: "cover-logotype", title: "로고/타이포 중심형", description: "로고와 타이포그래피 중심으로 정돈된 표지입니다." },
    { structure: "cover-full-bleed", title: "풀블리드 이미지형", description: "이미지가 전면을 채우는 임팩트 있는 표지입니다." },
    { structure: "cover-minimal-text", title: "미니멀 텍스트형", description: "여백을 살리고 텍스트만으로 절제된 인상을 주는 표지입니다." },
  ],
  toc: [
    { structure: "numbered-list", title: "넘버드 리스트형", description: "번호를 붙여 순서대로 항목을 나열합니다." },
    { structure: "timeline", title: "타임라인형", description: "흐름이나 단계를 시간순으로 보여줍니다." },
    { structure: "card-grid", title: "카드 그리드형", description: "항목을 카드 단위로 그리드에 배치합니다." },
  ],
  body: [
    { structure: "split-content", title: "좌우 분할형", description: "이미지와 텍스트를 좌우로 나눠 배치합니다." },
    { structure: "editorial-grid", title: "에디토리얼 그리드형", description: "콘텐츠를 균등한 그리드로 정리합니다." },
    { structure: "page-spread", title: "페이지 스프레드형", description: "여러 컬럼으로 텍스트를 흐르게 하는 잡지형 본문입니다." },
  ],
  closing: [
    { structure: "infographic-page", title: "인포그래픽형", description: "수치와 프로세스를 시각화합니다." },
    { structure: "comparison-table", title: "비교 테이블형", description: "표 형태로 비교 정보를 정리합니다." },
    { structure: "vision-statement", title: "비전 선언형", description: "핵심 메시지를 큰 타이포로 선언합니다." },
  ],
  main: [
    { structure: "generic-dashboard", title: "기본 대시보드형", description: "정보 구조를 우선 정리하는 기본 레이아웃입니다." },
    { structure: "kpi-wall", title: "KPI 월형", description: "핵심 지표를 큰 타일로 강조합니다." },
    { structure: "command-center", title: "관제 센터형", description: "지도/지표/알림을 한 화면에 모읍니다." },
  ],
  list: [{ structure: "generic-list", title: "목록형 레이아웃", description: "탐색과 비교를 위한 목록 레이아웃입니다." }],
  detail: [{ structure: "generic-detail", title: "상세형 레이아웃", description: "상세 확인과 후속 행동을 위한 레이아웃입니다." }],
};

function defaultLayoutVariantsForArchetype(archetype: DeliverableArchetype): LayoutVariant[] {
  return ARCHETYPE_STRUCTURE_CANDIDATES[archetype].map((entry, index) => ({
    id: `variant-${index + 1}`,
    structure: entry.structure,
    title: entry.title,
    description: entry.description,
    density: "comfortable",
    modules: [],
    notes: [],
  }));
}

// Restricting to "is this any known structure" wasn't enough — Gemini could still hand back a
// UI-screen structure (e.g. generic-dashboard) for a brochure direction and it would pass
// straight through, reproducing the exact "brochure rendered as an app dashboard" bug this
// enum split exists to fix. Only accept structures from the family that matches domainHint, and
// fall back to that Deliverable's own first archetype candidate (not a fixed global default).
function normalizeStructure(value: unknown, domainHint: AssetProfile["domainHint"], archetype: DeliverableArchetype): LayoutStructure {
  const allowed = domainHint === "document" ? DOCUMENT_STRUCTURES : UI_SCREEN_STRUCTURES;
  if (typeof value === "string" && (allowed as string[]).includes(value)) return value as LayoutStructure;
  return ARCHETYPE_STRUCTURE_CANDIDATES[archetype][0].structure;
}

function normalizeLayoutModule(raw: unknown): LayoutModule {
  const data = (raw || {}) as Partial<LayoutModule>;
  return {
    id: data.id || "module",
    label: data.label || "Module",
    weight: data.weight === "primary" || data.weight === "support" ? data.weight : "secondary",
  };
}

function normalizeLayoutVariant(raw: unknown, index: number, domainHint: AssetProfile["domainHint"], archetype: DeliverableArchetype): LayoutVariant {
  const data = (raw || {}) as Partial<LayoutVariant>;
  return {
    id: data.id || `variant-${index + 1}`,
    structure: normalizeStructure(data.structure, domainHint, archetype),
    title: data.title || `레이아웃 ${index + 1}`,
    description: data.description || "",
    density: data.density === "compact" || data.density === "spacious" ? data.density : "comfortable",
    modules: Array.isArray(data.modules) ? data.modules.map(normalizeLayoutModule) : [],
    notes: asStringArray(data.notes),
  };
}

const FALLBACK_SCREEN_ICONS = ["▦", "▣", "◇", "▤", "◫", "□"];

// Gemini is told to put a single emoji/symbol in `icon`, but sometimes puts a whole word
// (e.g. "Document") there instead — that overflows the fixed-size icon box in the
// Deliverables UI. Treat anything that looks like a real word (2+ letters) as invalid.
function isValidIcon(icon: unknown): icon is string {
  if (typeof icon !== "string") return false;
  const trimmed = icon.trim();
  return Boolean(trimmed) && trimmed.length <= 4 && !/[a-zA-Z가-힣]{2,}/.test(trimmed);
}

function defaultScreenTypes(domainHint: AssetProfile["domainHint"]): UiDirection["screenTypes"] {
  if (domainHint === "document") {
    return [
      { icon: "□", name: "Cover", count: 1, desc: "첫 인상과 핵심 메시지를 전달하는 표지", layoutVariants: defaultLayoutVariantsForArchetype("cover") },
      { icon: "▣", name: "Content Spread", count: 3, desc: "주요 정보와 가치 제안을 정리하는 본문", layoutVariants: defaultLayoutVariantsForArchetype("body") },
      { icon: "◇", name: "Infographic", count: 1, desc: "수치와 프로세스를 시각화하는 영역", layoutVariants: defaultLayoutVariantsForArchetype("closing") },
    ];
  }
  return [
    { icon: "▦", name: "Main", count: 1, desc: "핵심 정보와 행동을 모으는 대표 화면", layoutVariants: defaultLayoutVariantsForArchetype("main") },
    { icon: "▤", name: "List / Table", count: 1, desc: "탐색과 비교를 위한 목록 화면", layoutVariants: defaultLayoutVariantsForArchetype("list") },
    { icon: "◫", name: "Detail", count: 1, desc: "상세 확인과 후속 행동을 위한 화면", layoutVariants: defaultLayoutVariantsForArchetype("detail") },
  ];
}

function normalizeScreenType(raw: unknown, index: number, domainHint: AssetProfile["domainHint"]): UiDirection["screenTypes"][number] {
  const data = (raw || {}) as Partial<{ icon: string; name: string; count: number; desc: string; layoutVariants: unknown[] }>;
  const name = data.name || `화면 ${index + 1}`;
  const desc = data.desc || "";
  const archetype = detectDeliverableArchetype(domainHint, name, desc);
  const rawVariants = Array.isArray(data.layoutVariants) ? data.layoutVariants : [];
  const variants = rawVariants.map((variant, vIndex) => normalizeLayoutVariant(variant, vIndex, domainHint, archetype)).slice(0, 4);
  return {
    icon: isValidIcon(data.icon) ? data.icon.trim() : FALLBACK_SCREEN_ICONS[index % FALLBACK_SCREEN_ICONS.length],
    name,
    count: typeof data.count === "number" && data.count > 0 ? data.count : 1,
    desc,
    layoutVariants: variants.length ? variants : defaultLayoutVariantsForArchetype(archetype),
  };
}

function normalizeUiDirection(raw: unknown, domainHint: AssetProfile["domainHint"]): UiDirection {
  const data = (raw || {}) as { screenTypes?: unknown };
  const rawScreenTypes = Array.isArray(data.screenTypes) ? data.screenTypes : [];
  return {
    screenTypes: rawScreenTypes.length ? rawScreenTypes.map((item, index) => normalizeScreenType(item, index, domainHint)) : defaultScreenTypes(domainHint),
  };
}

// Pexels/Unsplash는 한국어 도메인명을 이해하지 못하므로 스톡 검색 전용 영문 표기를 따로 둔다.
const DOMAIN_EN_MAP: Record<string, string> = {
  "AI 솔루션": "AI technology",
  헬스케어: "healthcare",
  금융: "finance",
  교육: "education",
  커머스: "ecommerce",
  제조: "manufacturing",
  공공: "public sector",
  물류: "logistics",
  부동산: "real estate",
};

function domainToEnglish(domain: string): string {
  return DOMAIN_EN_MAP[domain] || domain;
}

// assetType별로 실제로 사진에 찍힐 수 있는 구체적 장면(scene)을 붙여서, "abstract background"류의
// 범용 표현 대신 도메인 + 장면 조합으로 스톡 검색이 가능하게 한다.
const ASSET_SCENE_NOUNS: Record<string, string[]> = {
  dashboard: ["control room", "operations center", "monitoring center"],
  webpage: ["technology workspace", "modern office team"],
  "web-app": ["technology workspace", "modern office team"],
  landing: ["technology workspace", "modern office team"],
  "event-page": ["event venue", "conference stage"],
  brochure: ["infrastructure facility", "technology center"],
  proposal: ["infrastructure facility", "technology center"],
  report: ["infrastructure facility", "technology center"],
  poster: ["city skyline", "architecture exterior"],
};

function buildFallbackStockQueries(domain: string, assetType: string): string[] {
  const domainEn = domainToEnglish(domain);
  const scenes = ASSET_SCENE_NOUNS[assetType] || ["control room", "technology center"];
  return scenes.map((scene) => `${domainEn} ${scene}`);
}

function defaultPromptSeeds(domain: string, assetType: string): string[] {
  return [
    `premium ${domain} ${assetType} cover key visual, abstract technology background, layered depth, refined editorial composition, no people, no handshake`,
    `modern ${domain} brand visual for ${assetType}, product and infrastructure concept, clean lighting, professional presentation cover, no office meeting scene`,
    `sophisticated ${domain} hero image, geometric data-inspired forms, subtle texture, high-end corporate brochure visual, minimal and credible`,
  ];
}

function defaultPromptSeedsKo(domain: string, assetType: string): string[] {
  return [
    `프리미엄 ${domain} ${assetType} 표지 키 비주얼, 추상적인 기술 배경, 레이어드 뎁스, 정제된 에디토리얼 구성, 인물 없음, 악수 장면 없음`,
    `${assetType}를 위한 모던한 ${domain} 브랜드 비주얼, 제품 및 인프라 컨셉, 깔끔한 조명, 전문적인 발표용 표지, 사무실 회의 장면 없음`,
    `정교한 ${domain} 히어로 이미지, 데이터에서 영감을 받은 기하학적 형태, 섬세한 텍스처, 고급 기업 브로셔용 비주얼, 미니멀하고 신뢰감 있는 톤`,
  ];
}

function normalizePromptSeeds(promptSeeds: unknown, promptSeedsKo: unknown, domain: string, assetType: string): { en: string[]; ko: string[] } {
  const en = asStringArray(promptSeeds).slice(0, 3);
  const ko = asStringArray(promptSeedsKo).slice(0, 3);
  if (en.length && ko.length === en.length) return { en, ko };
  if (en.length) return { en, ko: en.map(() => "") };
  return { en: defaultPromptSeeds(domain, assetType), ko: defaultPromptSeedsKo(domain, assetType) };
}

function normalizeImageDirection(raw: unknown, index: number): ImageDirection {
  const data = (raw || {}) as Partial<ImageDirection>;
  return {
    id: data.id || `image-direction-${index + 1}`,
    title: data.title || `이미지 방향 ${index + 1}`,
    styleNotes: data.styleNotes || "",
    promptSeedIndexes: Array.isArray(data.promptSeedIndexes) && data.promptSeedIndexes.length ? data.promptSeedIndexes : [0],
    stockQueries: asStringArray(data.stockQueries),
  };
}

function defaultImageDirection(domain: string, assetType: string): ImageDirection {
  return {
    id: "image-direction-default",
    title: "키비주얼 방향",
    styleNotes: "",
    promptSeedIndexes: [0, 1, 2],
    stockQueries: buildFallbackStockQueries(domain, assetType),
  };
}

function normalizeVisualDirection(raw: unknown, domain: string, assetType: string): VisualDirection {
  const data = (raw || {}) as { promptSeeds?: unknown; promptSeedsKo?: unknown; imageDirections?: unknown[]; themeRecommendation?: unknown };
  const { en, ko } = normalizePromptSeeds(data.promptSeeds, data.promptSeedsKo, domain, assetType);
  const rawImageDirections = Array.isArray(data.imageDirections) ? data.imageDirections.map((item, index) => normalizeImageDirection(item, index)) : [];
  const imageDirections = rawImageDirections.length ? rawImageDirections : [defaultImageDirection(domain, assetType)];
  const theme = (data.themeRecommendation || {}) as Partial<VisualDirection["themeRecommendation"]>;
  return {
    promptSeeds: en,
    promptSeedsKo: ko,
    imageDirections,
    themeRecommendation: {
      preferred: theme.preferred === "light" || theme.preferred === "dark" ? theme.preferred : "both",
      reason: theme.reason || "문서만으로 단일 테마를 확정하지 않고 라이트/다크 양쪽 가능성을 비교합니다.",
      alternatives: asStringArray(theme.alternatives).length ? asStringArray(theme.alternatives) : ["사용 환경과 브랜드 톤에 따라 최종 선택"],
    },
  };
}

function normalizeDirection(raw: unknown, index: number, assetProfile: AssetProfile, domain: string): DesignDirection {
  const data = (raw || {}) as {
    id?: string;
    label?: string;
    appliesTo?: string;
    moodIndexes?: number[];
    needsUi?: boolean;
    needsVisual?: boolean;
    ui?: unknown;
    visual?: unknown;
    referenceKeywordsByPlatform?: Record<string, unknown>;
  };
  const needsUi = Boolean(data.needsUi) || Boolean(data.ui);
  const needsVisual = Boolean(data.needsVisual) || Boolean(data.visual);
  const ui = needsUi ? normalizeUiDirection(data.ui, assetProfile.domainHint) : undefined;
  const visual = needsVisual ? normalizeVisualDirection(data.visual, domain, assetProfile.assetType) : undefined;
  const geminiQueries: ReferenceQuery[] = Object.entries(data.referenceKeywordsByPlatform || {}).map(([platform, keywords]) => ({
    platform,
    keywords: asStringArray(keywords),
  }));

  return {
    id: data.id || `direction-${index + 1}`,
    label: data.label || (needsVisual && !needsUi ? "키비주얼 방향" : "메인 화면 방향"),
    appliesTo: data.appliesTo || "",
    moodIndexes: Array.isArray(data.moodIndexes) && data.moodIndexes.length ? data.moodIndexes : [0, 1, 2],
    ui,
    visual,
    references: resolveDirectionReferenceQueries(geminiQueries, assetProfile, domain, needsUi, needsVisual),
  };
}

function normalizeKeywordGroups(data: { keywordGroups?: unknown }, domain: string, assetType: string): GeneratorAnalysis["keywordGroups"] {
  const groups = (data.keywordGroups || {}) as Partial<GeneratorAnalysis["keywordGroups"]>;
  return {
    deliverable: asStringArray(groups.deliverable).length ? asStringArray(groups.deliverable) : [assetType, `${domain} ${assetType}`],
    colorMood: asStringArray(groups.colorMood).length ? asStringArray(groups.colorMood) : ["clean", "modern", "professional"],
    design: asStringArray(groups.design).length ? asStringArray(groups.design) : [`${domain} ${assetType} design`, "reference moodboard"],
    domain: asStringArray(groups.domain).length ? asStringArray(groups.domain) : [domain],
  };
}

function defaultPalette(): GeneratorAnalysis["palette"] {
  return [
    { name: "Ink", hex: "#111827", role: "Headline" },
    { name: "Paper", hex: "#f8fafc", role: "Background" },
    { name: "Blue", hex: "#2563eb", role: "Primary" },
    { name: "Cyan", hex: "#06b6d4", role: "Accent" },
    { name: "Slate", hex: "#64748b", role: "Body Text" },
  ];
}

function defaultMoods(): Mood[] {
  return [
    { title: "Clean Professional", desc: "명확한 정보 구조와 안정적인 브랜드 톤을 우선합니다.", colors: ["#f8fafc", "#111827", "#2563eb"], keywords: ["clean professional UI"] },
    { title: "Technical Blue", desc: "기술/데이터 성격을 시원한 블루 계열로 표현합니다.", colors: ["#0f172a", "#2563eb", "#06b6d4"], keywords: ["technical blue design"] },
    { title: "Editorial Calm", desc: "문서와 웹 모두에 적용하기 쉬운 절제된 편집 톤입니다.", colors: ["#ffffff", "#64748b", "#111827"], keywords: ["editorial minimal layout"] },
  ];
}

function normalizeAnalysis(raw: unknown): GeneratorAnalysis {
  const data = raw as {
    projectIntent?: Partial<ProjectIntent>;
    assetTypeRaw?: string;
    directions?: unknown[];
    palette?: unknown;
    moods?: unknown;
    keywordGroups?: unknown;
  };
  const projectIntentRaw = data.projectIntent || {};
  const assetProfile = buildAssetProfile({ assetType: data.assetTypeRaw });
  const domain = projectIntentRaw.domain || "digital service";

  const projectIntent: ProjectIntent = {
    title: projectIntentRaw.title || "Untitled Project",
    description: projectIntentRaw.description || "설계 문서 기반 디자인 레퍼런스 방향",
    domain,
    target: projectIntentRaw.target || "user",
    tags: asStringArray(projectIntentRaw.tags),
  };

  const rawDirections = Array.isArray(data.directions) ? data.directions : [];
  let directions = rawDirections.map((direction, index) => normalizeDirection(direction, index, assetProfile, domain));
  if (!directions.length) {
    directions = [
      normalizeDirection({ needsUi: assetProfile.needsLayoutVariants, needsVisual: assetProfile.needsImageDirections }, 0, assetProfile, domain),
    ];
  }

  return {
    projectIntent,
    assetProfile,
    directions,
    palette: Array.isArray(data.palette) && data.palette.length ? (data.palette as GeneratorAnalysis["palette"]) : defaultPalette(),
    moods: Array.isArray(data.moods) && data.moods.length ? (data.moods as Mood[]).slice(0, 3) : defaultMoods(),
    keywordGroups: normalizeKeywordGroups(data, domain, assetProfile.assetType),
  };
}

const ASSET_TYPE_RULES: Array<{ pattern: RegExp; assetType: string }> = [
  { pattern: /모바일\s*(앱|전용|화면)|네이티브\s*앱|iOS\s*앱|안드로이드\s*앱|mobile\s*app|iPhone\s*\d/i, assetType: "mobile-app" },
  { pattern: /브로셔|리플렛|brochure|leaflet/i, assetType: "brochure" },
  { pattern: /제안서|proposal/i, assetType: "proposal" },
  { pattern: /보고서|report/i, assetType: "report" },
  { pattern: /포스터|poster/i, assetType: "poster" },
  { pattern: /이벤트\s*페이지|event\s*page/i, assetType: "event-page" },
  { pattern: /랜딩\s*페이지|landing\s*page/i, assetType: "landing" },
  { pattern: /홈페이지|기업\s*사이트|웹사이트|website|homepage/i, assetType: "webpage" },
  { pattern: /대시보드|관리자|admin|dashboard/i, assetType: "dashboard" },
];

const DOMAIN_RULES: Array<{ pattern: RegExp; domain: string }> = [
  { pattern: /인공지능|머신러닝|딥러닝|LLM|VLM|AIOps|AI\s?(전문기업|플랫폼|에이전트|솔루션)/i, domain: "AI 솔루션" },
  { pattern: /헬스케어|건강|의료|병원/i, domain: "헬스케어" },
  { pattern: /금융|은행|보험|핀테크/i, domain: "금융" },
  { pattern: /교육|이러닝|e-?러닝|강의|학원|커리큘럼/i, domain: "교육" },
  { pattern: /커머스|쇼핑|이커머스|쇼핑몰/i, domain: "커머스" },
  { pattern: /제조|공장|스마트팩토리/i, domain: "제조" },
  { pattern: /공공|행정|정부/i, domain: "공공" },
  { pattern: /물류|배송|유통/i, domain: "물류" },
  { pattern: /부동산|건설/i, domain: "부동산" },
];

function detectAssetType(documentText: string): string {
  const rule = ASSET_TYPE_RULES.find((item) => item.pattern.test(documentText));
  // No keyword matched: don't default to "dashboard" — that silently pulls every
  // unclassified document (e.g. a brochure with no recognizable keyword) toward a
  // dashboard-shaped result. "other" instead surfaces as "needs review" to the user.
  return rule?.assetType || "other";
}

function detectDomain(documentText: string): string {
  const rule = DOMAIN_RULES.find((item) => item.pattern.test(documentText));
  return rule?.domain || "digital service";
}

const GENERIC_LINE_PATTERN = /^(표지|뒷면|앞표지|뒷표지|목차|차례|index|cover|back|agenda|appendix|page\s*\d+|\d+)$/i;

function meaningfulLines(documentText: string): string[] {
  return documentText
    .split("\n")
    .map((item) => item.trim().replace(/^#+\s*/, ""))
    .filter((item) => item.length >= 4 && !GENERIC_LINE_PATTERN.test(item));
}

function extractTitle(documentText: string): string {
  const line = meaningfulLines(documentText)[0];
  if (!line) return "Untitled Project";
  return line.length > 60 ? `${line.slice(0, 60)}...` : line;
}

function extractDescription(documentText: string, title: string): string {
  const line = meaningfulLines(documentText).find((item) => item !== title);
  if (!line) return "설계 문서 기반 디자인 레퍼런스 방향";
  return line.length > 120 ? `${line.slice(0, 120)}...` : line;
}

function buildFallbackAnalysis(documentText: string, primaryColor?: string, fileTitle?: string): GeneratorAnalysis {
  // 파일명을 본문보다 먼저 두어 "브로셔/제안서" 같은 산출물 유형 신호가 정규식 매칭에서 우선되게 한다.
  const detectionText = fileTitle ? `${fileTitle}\n${documentText}` : documentText;
  const assetType = detectAssetType(detectionText);
  const domain = detectDomain(detectionText);
  const title = extractTitle(documentText);
  const description = extractDescription(documentText, title);

  const analysis = normalizeAnalysis({
    projectIntent: { title, description, domain, target: "user", tags: [assetType, domain] },
    assetTypeRaw: assetType,
  });

  if (primaryColor) {
    const { palette, moods } = enforcePrimaryColor({ palette: analysis.palette, moods: analysis.moods }, primaryColor);
    analysis.palette = palette;
    analysis.moods = moods;
  }

  return analysis;
}

const FALLBACK_REGENERATE_PRESETS: Record<string, RegenerateMoodsResponse> = {
  bright: {
    palette: [
      { name: "Paper", hex: "#fafafa", role: "Background" },
      { name: "Mist", hex: "#e8ecef", role: "Surface" },
      { name: "Soft Blue", hex: "#93c5fd", role: "Accent" },
      { name: "Ink Light", hex: "#475569", role: "Body Text" },
      { name: "Cloud", hex: "#f1f5f9", role: "Secondary" },
      { name: "Coral", hex: "#fca5a5", role: "Highlight" },
    ],
    moods: [
      { title: "Airy Minimal", desc: "여백을 넓게 쓰고 채도를 낮춰 가볍고 정돈된 인상을 줍니다.", colors: ["#fafafa", "#e8ecef", "#93c5fd"], keywords: ["airy minimal UI"] },
      { title: "Soft Pastel", desc: "파스텔 톤으로 부드럽고 친근한 분위기를 표현합니다.", colors: ["#f1f5f9", "#93c5fd", "#fca5a5"], keywords: ["soft pastel design"] },
      { title: "Bright Clean", desc: "밝은 배경과 또렷한 포인트 컬러로 명료함을 강조합니다.", colors: ["#fafafa", "#475569", "#93c5fd"], keywords: ["bright clean interface"] },
    ],
  },
  luxury: {
    palette: [
      { name: "Charcoal", hex: "#1f2937", role: "Headline" },
      { name: "Cream", hex: "#f5f0e6", role: "Background" },
      { name: "Deep Olive", hex: "#3f4b3b", role: "Secondary" },
      { name: "Gold Sand", hex: "#c9a227", role: "Accent" },
      { name: "Warm Gray", hex: "#6b6258", role: "Body Text" },
      { name: "White", hex: "#ffffff", role: "Surface" },
    ],
    moods: [
      { title: "Quiet Luxury", desc: "차분한 다크 톤과 골드 포인트로 고급스러운 무드를 만듭니다.", colors: ["#1f2937", "#f5f0e6", "#c9a227"], keywords: ["quiet luxury design"] },
      { title: "Editorial Premium", desc: "에디토리얼한 여백과 톤온톤 구성으로 프리미엄 인상을 줍니다.", colors: ["#f5f0e6", "#3f4b3b", "#1f2937"], keywords: ["editorial premium layout"] },
      { title: "Deep Neutral", desc: "짙은 뉴트럴 컬러를 기반으로 신뢰감 있는 톤을 표현합니다.", colors: ["#1f2937", "#6b6258", "#c9a227"], keywords: ["deep neutral premium"] },
    ],
  },
  technical: {
    palette: [
      { name: "Navy", hex: "#0f172a", role: "Background" },
      { name: "Slate", hex: "#1e293b", role: "Surface" },
      { name: "Cyan", hex: "#22d3ee", role: "Accent" },
      { name: "Cool Gray", hex: "#94a3b8", role: "Body Text" },
      { name: "Paper", hex: "#f8fafc", role: "Inverse" },
      { name: "Steel", hex: "#475569", role: "Secondary" },
    ],
    moods: [
      { title: "Technical Blue", desc: "짙은 네이비와 시안 포인트로 기술/데이터 중심 톤을 표현합니다.", colors: ["#0f172a", "#1e293b", "#22d3ee"], keywords: ["technical blue dashboard"] },
      { title: "Data Console", desc: "콘솔 화면처럼 차분하고 정밀한 인상을 줍니다.", colors: ["#1e293b", "#94a3b8", "#22d3ee"], keywords: ["data console UI"] },
      { title: "Cool Systematic", desc: "쿨톤 그레이와 블루 계열로 체계적인 느낌을 강조합니다.", colors: ["#f8fafc", "#475569", "#22d3ee"], keywords: ["cool systematic interface"] },
    ],
  },
  warm: {
    palette: [
      { name: "Warm White", hex: "#fff8f0", role: "Background" },
      { name: "Taupe", hex: "#b8a99a", role: "Secondary" },
      { name: "Terracotta", hex: "#d98f6f", role: "Accent" },
      { name: "Charcoal Brown", hex: "#4a3f35", role: "Headline" },
      { name: "Sand", hex: "#e8ddcb", role: "Surface" },
      { name: "Sage", hex: "#a3b18a", role: "Highlight" },
    ],
    moods: [
      { title: "Warm Trust", desc: "따뜻한 베이지와 테라코타 톤으로 신뢰감과 친근함을 줍니다.", colors: ["#fff8f0", "#d98f6f", "#4a3f35"], keywords: ["warm trustworthy design"] },
      { title: "Earthy Calm", desc: "흙빛 톤과 세이지 그린으로 안정적이고 편안한 인상을 만듭니다.", colors: ["#e8ddcb", "#a3b18a", "#4a3f35"], keywords: ["earthy calm interface"] },
      { title: "Soft Approachable", desc: "부드러운 웜톤 조합으로 접근하기 쉬운 분위기를 표현합니다.", colors: ["#fff8f0", "#b8a99a", "#d98f6f"], keywords: ["soft approachable UI"] },
    ],
  },
  balanced: {
    palette: [
      { name: "Ink", hex: "#18181b", role: "Headline" },
      { name: "Paper", hex: "#fafafa", role: "Background" },
      { name: "Indigo", hex: "#6366f1", role: "Primary" },
      { name: "Teal", hex: "#14b8a6", role: "Accent" },
      { name: "Stone", hex: "#a8a29e", role: "Body Text" },
      { name: "White", hex: "#ffffff", role: "Surface" },
    ],
    moods: [
      { title: "Balanced Modern", desc: "인디고와 틸을 함께 써서 모던하고 균형 잡힌 느낌을 줍니다.", colors: ["#fafafa", "#18181b", "#6366f1"], keywords: ["balanced modern UI"] },
      { title: "Neutral Structure", desc: "뉴트럴 톤 위에 포인트 컬러를 더해 구조적인 인상을 만듭니다.", colors: ["#ffffff", "#a8a29e", "#14b8a6"], keywords: ["neutral structured layout"] },
      { title: "Versatile Clean", desc: "다양한 화면에 적용하기 쉬운 깔끔하고 범용적인 톤입니다.", colors: ["#fafafa", "#6366f1", "#14b8a6"], keywords: ["versatile clean design"] },
    ],
  },
};

function buildFallbackRegenerate(brief?: string, primaryColor?: string): RegenerateMoodsResponse {
  let preset = FALLBACK_REGENERATE_PRESETS.balanced;
  if (brief?.includes("밝게")) preset = FALLBACK_REGENERATE_PRESETS.bright;
  else if (brief?.includes("고급")) preset = FALLBACK_REGENERATE_PRESETS.luxury;
  else if (brief?.includes("기술")) preset = FALLBACK_REGENERATE_PRESETS.technical;
  else if (brief?.includes("따뜻")) preset = FALLBACK_REGENERATE_PRESETS.warm;

  return primaryColor ? enforcePrimaryColor(preset, primaryColor) : preset;
}

export async function analyzeDocument(
  documentText: string,
  primaryColor?: string,
  fileTitle?: string,
): Promise<{ analysis: GeneratorAnalysis; source: AnalysisSource; documentText: string }> {
  const { masked } = maskSensitiveText(documentText);
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: MODEL_NAME });
      const result = await model.generateContent(buildPrompt(masked, primaryColor, fileTitle));
      const json = extractJson(result.response.text());
      return { analysis: normalizeAnalysis(JSON.parse(json)), source: "gemini", documentText: masked };
    } catch (error) {
      console.error("Gemini 분석 실패, 키워드 기반 추정 결과로 대체합니다.", error);
    }
  }
  return { analysis: buildFallbackAnalysis(masked, primaryColor, fileTitle), source: "fallback", documentText: masked };
}

export async function regenerateMoods(
  documentText: string,
  projectIntent: ProjectIntent,
  brief?: string,
  primaryColor?: string,
): Promise<{ result: RegenerateMoodsResponse; source: AnalysisSource }> {
  const { masked } = maskSensitiveText(documentText);
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: MODEL_NAME });
      const result = await model.generateContent(buildRegeneratePrompt(masked, projectIntent, brief, primaryColor));
      const json = extractJson(result.response.text());
      const data = JSON.parse(json) as Partial<RegenerateMoodsResponse>;

      const normalized: RegenerateMoodsResponse = {
        palette: Array.isArray(data.palette) && data.palette.length ? data.palette : defaultPalette(),
        moods: Array.isArray(data.moods) && data.moods.length ? data.moods.slice(0, 3) : defaultMoods(),
      };

      return { result: primaryColor ? enforcePrimaryColor(normalized, primaryColor) : normalized, source: "gemini" };
    } catch (error) {
      console.error("Gemini 재생성 실패, 키워드 기반 추정 결과로 대체합니다.", error);
    }
  }
  return { result: buildFallbackRegenerate(brief, primaryColor), source: "fallback" };
}

/**
 * AI(또는 키워드 휴리스틱)가 추정한 assetType이 틀렸을 때, 사용자가 직접 고른 값으로
 * UI/비주얼 블록 존재 여부와 레퍼런스 검색어를 다시 계산한다. Gemini를 다시 호출하지
 * 않는 순수 로컬 재계산이라 결과는 즉시 반영되고 quota를 쓰지 않는다.
 */
export function applyAssetTypeOverride(analysis: GeneratorAnalysis, assetTypeOverride: string): GeneratorAnalysis {
  const assetProfile = buildAssetProfile({ assetType: assetTypeOverride });
  const domain = analysis.projectIntent.domain;

  const directions = analysis.directions.map((direction) => {
    const ui = assetProfile.needsLayoutVariants ? direction.ui || normalizeUiDirection(undefined, assetProfile.domainHint) : undefined;
    const visual = assetProfile.needsImageDirections
      ? direction.visual || normalizeVisualDirection(undefined, domain, assetProfile.assetType)
      : undefined;
    return {
      ...direction,
      ui,
      visual,
      references: resolveDirectionReferenceQueries(direction.references, assetProfile, domain, Boolean(ui), Boolean(visual)),
    };
  });

  return { ...analysis, assetProfile, directions };
}
