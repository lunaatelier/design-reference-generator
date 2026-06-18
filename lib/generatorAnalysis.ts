import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildReferences } from "@/lib/references";
import type { AnalysisSource, GeneratorAnalysis, ReferencePurpose, ReferencePurposeValue, RegenerateMoodsResponse } from "@/types";

const MODEL_NAME = "gemini-2.5-flash-lite";

const PROMPT = `당신은 설계 문서를 분석해 디자인 레퍼런스 수집안과 무드보드 초안을 만드는 어시스턴트입니다.
아래 문서 내용을 읽고 JSON만 반환하세요. 마크다운 코드블록, 설명, 주석은 금지합니다.

필수 JSON 구조:
{
  "project": {"title": "프로젝트명", "description": "한 줄 설명", "domain": "도메인", "target": "주요 사용자", "assetType": "dashboard|webpage|web-app|landing|event-page|brochure|proposal|poster|report|image|other", "tags": ["태그"]},
  "referenceNeeds": {"layout": true, "image": true, "reason": "레이아웃/UI와 이미지 레퍼런스가 각각 필요한지 판단한 이유"},
  "referencePurposes": [{"value": "ui-reference|image-reference", "label": "UI/레이아웃 또는 이미지/키비주얼", "reason": "그 목적이 필요한 이유"}],
  "themeRecommendation": {"preferred": "light|dark|both", "reason": "테마 제안 이유", "alternatives": ["고려사항"]},
  "referencePlan": ["수집 단계 1", "수집 단계 2", "수집 단계 3"],
  "screenTypes": [{"icon": "기호", "name": "필요 산출물 구성", "count": 1, "desc": "필요한 이유"}],
  "directions": ["디자인 판단 기준 1", "판단 기준 2", "판단 기준 3"],
  "palette": [{"name": "색상명", "hex": "#000000", "role": "역할"}],
  "moods": [{"title": "무드명", "desc": "이 무드가 적합한 이유", "colors": ["#000000"], "keywords": ["english keyword"]}],
  "keywordGroups": {"deliverable": ["산출물 형태 키워드"], "colorMood": ["컬러/무드 키워드"], "design": ["디자인 키워드"], "domain": ["도메인 키워드"]},
  "referenceKeywords": ["english reference search keyword"],
  "platformKeywords": {"Dribbble": ["keyword"], "Behance": ["keyword"], "Mobbin": ["keyword"], "Pinterest": ["keyword"], "Figma Community": ["keyword"], "GDWEB": ["keyword"], "Land-book": ["keyword"], "Page Flows": ["keyword"]},
  "imageKeywords": ["english image search keyword"],
  "imagePrompts": ["english image generation prompt"]
}

규칙:
- 레퍼런스 목적은 하나만 고르지 말고 referenceNeeds.layout과 referenceNeeds.image를 각각 판단하세요.
- referencePurposes에는 필요한 목적을 모두 넣으세요. 둘 다 필요하면 ui-reference와 image-reference를 모두 넣으세요.
- UI/레이아웃 레퍼런스는 대시보드, 홈페이지, 랜딩페이지, 이벤트페이지, 제안서 UI, 운영 화면, 앱 화면, 브로셔 표지/내지/인포그래픽 편집 레이아웃을 포함합니다.
- 이미지 레퍼런스는 제안서 표지, 로그인 이미지, 홈페이지 히어로 이미지, 삽입 비주얼, 추상 배경을 포함합니다.
- 브로슈어, 제안서, 보고서, 포스터는 기본적으로 layout과 image를 모두 true로 판단하세요. 표지/내지/인포그래픽 구성은 UI/레이아웃 레퍼런스이고, 표지 키비주얼/삽입 비주얼/배경 소재는 이미지 레퍼런스입니다.
- 기술자료 추천은 만들지 마세요.
- keywordGroups는 산출물형태, 컬러무드, 디자인키워드, 도메인키워드 네 묶음으로 분리하세요.
- keywordGroups와 platformKeywords는 너무 추상적인 한 단어를 피하고, 산출물 유형과 도메인을 조합한 2~5단어 검색어로 작성하세요.
- 홈페이지/랜딩/이벤트 페이지/기업 사이트이면 GDWEB과 Land-book 키워드를 반드시 포함하세요.
- 대시보드/어드민/B2B 화면이면 Page Flows 키워드를 유저 플로우 단위(예: onboarding flow, checkout flow, settings flow)로 포함하세요.
- image가 true이면 imagePrompts를 Freepik, Gemini Image 등에 넣을 수 있는 영문 프롬프트 3개로 작성하세요.
- image가 false일 때만 imagePrompts를 빈 배열로 두세요.
- 홈페이지/랜딩/이벤트/기업 사이트는 유사 기업 웹사이트, 히어로 이미지 레퍼런스, UI 섹션 레퍼런스를 모두 제안하세요.
- 대시보드/관리자 화면은 로그인 이미지 레퍼런스와 실제 제품 UI 레퍼런스를 분리해서 제안하세요.
- 제안서/브로셔/보고서는 표지 이미지 레퍼런스와 제안서/브로셔 레이아웃 UI 레퍼런스를 분리해서 제안하세요.
- 화면 또는 페이지 구성이 문서에 있으면, 선택 무드를 적용한 실제 HTML/CSS 샘플을 만들 수 있는지 판단할 수 있도록 screenTypes와 directions를 구체적으로 작성하세요.
- 브로셔/제안서/보고서 표지 이미지는 악수, 회의 장면, 사무실 사람 사진을 피하고 기술 추상 배경, 제품/인프라 컨셉, 브랜드 비주얼 소재를 우선하세요.
- palette는 5~6개, moods는 정확히 3개를 제안하세요.
{{PRIMARY_COLOR_RULE}}

문서 내용:
"""
{{DOCUMENT}}
"""`;

const REGENERATE_PROMPT = `당신은 디자인 레퍼런스 생성기의 컬러 보정 어시스턴트입니다.
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

function buildPrompt(documentText: string, primaryColor?: string): string {
  const primaryColorRule = primaryColor
    ? `- 사용자가 지정한 Primary Color는 "${primaryColor}"입니다. palette와 moods 전체를 이 컬러를 중심으로 구성하세요.`
    : "";
  return PROMPT.replace("{{DOCUMENT}}", documentText).replace("{{PRIMARY_COLOR_RULE}}", primaryColorRule);
}

function buildRegeneratePrompt(documentText: string, project: GeneratorAnalysis["project"], brief?: string, primaryColor?: string): string {
  const primaryColorRule = primaryColor
    ? `- Primary Color는 "${primaryColor}"로 고정되어 있습니다. 이 컬러는 절대 변경하지 말고, palette에 정확히 이 hex값으로 포함하고 모든 무드의 핵심 컬러로 유지하세요. 나머지 팔레트만 새로운 방향에 맞게 재구성하세요.`
    : "";
  const briefRule = brief ? `- 사용자가 요청한 보정 방향: "${brief}"` : "";
  return REGENERATE_PROMPT.replace("{{DOCUMENT}}", documentText)
    .replace("{{PROJECT}}", JSON.stringify(project))
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

function normalizePurpose(value: unknown): ReferencePurposeValue {
  return value === "image-reference" ? "image-reference" : "ui-reference";
}

function makePurpose(value: ReferencePurposeValue, reason?: string): ReferencePurpose {
  return {
    value,
    label: value === "image-reference" ? "이미지/키비주얼" : "UI/레이아웃",
    reason:
      reason ||
      (value === "image-reference"
        ? "표지, 히어로, 삽입 비주얼에 쓸 이미지 방향과 생성 프롬프트가 필요합니다."
        : "산출물의 구조, 편집 레이아웃, 화면 패턴을 찾는 레퍼런스가 필요합니다."),
  };
}

function isDocumentAsset(assetType: string): boolean {
  return /brochure|proposal|report|poster/i.test(assetType);
}

function isWebAsset(assetType: string): boolean {
  return /web|landing|homepage|event/i.test(assetType);
}

function isDashboardAsset(assetType: string): boolean {
  return /dashboard|admin|data|console/i.test(assetType);
}

function normalizeReferenceNeeds(data: Partial<GeneratorAnalysis>, assetType: string): GeneratorAnalysis["referenceNeeds"] {
  const rawNeeds = data.referenceNeeds as Partial<GeneratorAnalysis["referenceNeeds"]> | undefined;
  const requestedPurpose = data.referencePurpose?.value || data.referencePurposes?.[0]?.value;
  let layout = Boolean(rawNeeds?.layout);
  let image = Boolean(rawNeeds?.image);

  if (!layout && !image) {
    const inferred = inferPurpose(assetType);
    layout = inferred === "ui-reference";
    image = inferred === "image-reference";
  }

  if (requestedPurpose === "ui-reference") layout = true;
  if (requestedPurpose === "image-reference") image = true;

  if (isDocumentAsset(assetType) || isWebAsset(assetType)) {
    layout = true;
    image = true;
  }

  return {
    layout,
    image,
    reason:
      rawNeeds?.reason ||
      (layout && image
        ? "이 산출물은 구조/편집 레이아웃과 표지/히어로 키비주얼 레퍼런스가 모두 필요합니다."
        : image
          ? "핵심 이미지나 키비주얼 방향을 정하는 레퍼런스가 우선입니다."
          : "화면 구조와 레이아웃 패턴 레퍼런스가 우선입니다."),
  };
}

function normalizePurposes(data: Partial<GeneratorAnalysis>, needs: GeneratorAnalysis["referenceNeeds"]): ReferencePurpose[] {
  const rawPurposes = Array.isArray(data.referencePurposes) ? data.referencePurposes : data.referencePurpose ? [data.referencePurpose] : [];
  const purposeMap = new Map<ReferencePurposeValue, ReferencePurpose>();

  for (const purpose of rawPurposes) {
    const value = normalizePurpose(purpose?.value);
    purposeMap.set(value, makePurpose(value, purpose?.reason));
  }

  if (needs.layout) purposeMap.set("ui-reference", purposeMap.get("ui-reference") || makePurpose("ui-reference"));
  if (needs.image) purposeMap.set("image-reference", purposeMap.get("image-reference") || makePurpose("image-reference"));

  return Array.from(purposeMap.values());
}

function normalizeAnalysis(raw: unknown): GeneratorAnalysis {
  const data = raw as Partial<GeneratorAnalysis>;
  const project = (data.project || {}) as Partial<GeneratorAnalysis["project"]>;
  const assetType = project.assetType || "dashboard";
  const referenceNeeds = normalizeReferenceNeeds(data, assetType);
  const referencePurposes = normalizePurposes(data, referenceNeeds);
  const purpose = referencePurposes[0]?.value || "ui-reference";
  const platformKeywords = normalizePlatformKeywords(data.platformKeywords, referenceNeeds, String(project.domain || "service"), assetType);
  const analysis: GeneratorAnalysis = {
    project: {
      title: project.title || "Untitled Project",
      description: project.description || "설계 문서 기반 디자인 레퍼런스 방향",
      domain: project.domain || "digital service",
      target: project.target || "user",
      assetType,
      tags: asStringArray(project.tags),
    },
    referencePurpose: {
      value: purpose,
      label: purpose === "image-reference" ? "이미지/키비주얼" : "UI/레이아웃",
      reason: referencePurposes[0]?.reason || referenceNeeds.reason,
    },
    referencePurposes,
    referenceNeeds,
    themeRecommendation: data.themeRecommendation || {
      preferred: "both",
      reason: "문서만으로 단일 테마를 확정하지 않고 라이트/다크 양쪽 가능성을 비교합니다.",
      alternatives: ["사용 환경과 브랜드 톤에 따라 최종 선택"],
    },
    referencePlan: asStringArray(data.referencePlan).length ? asStringArray(data.referencePlan) : ["산출물 유형 분리", "플랫폼별 키워드 검색", "무드와 팔레트 기준 정리"],
    screenTypes: Array.isArray(data.screenTypes) && data.screenTypes.length ? data.screenTypes : defaultScreenTypes(assetType),
    directions: asStringArray(data.directions).length ? asStringArray(data.directions) : ["정보 구조를 먼저 정리", "산출물 유형에 맞는 레이아웃 밀도 선택", "브랜드 톤과 접근성 균형 유지"],
    palette: Array.isArray(data.palette) && data.palette.length ? data.palette : defaultPalette(),
    moods: Array.isArray(data.moods) && data.moods.length ? data.moods.slice(0, 3) : defaultMoods(),
    keywordGroups: normalizeKeywordGroups(data, project.domain || "digital service", assetType),
    referenceKeywords: asStringArray(data.referenceKeywords),
    platformKeywords,
    imageKeywords: asStringArray(data.imageKeywords),
    imagePrompts: referenceNeeds.image ? normalizeImagePrompts(data, String(project.domain || "service"), assetType) : [],
    references: [],
  };

  analysis.references = buildReferences(analysis);
  return analysis;
}

function inferPurpose(assetType: string): ReferencePurposeValue {
  return /image|cover|hero|login/i.test(assetType) ? "image-reference" : "ui-reference";
}

function normalizeKeywordGroups(data: Partial<GeneratorAnalysis>, domain: string, assetType: string): GeneratorAnalysis["keywordGroups"] {
  const groups = (data.keywordGroups || {}) as Partial<GeneratorAnalysis["keywordGroups"]>;
  return {
    deliverable: asStringArray(groups.deliverable).length ? asStringArray(groups.deliverable) : [assetType, `${domain} ${assetType}`],
    colorMood: asStringArray(groups.colorMood).length ? asStringArray(groups.colorMood) : ["clean", "modern", "professional"],
    design: asStringArray(groups.design).length ? asStringArray(groups.design) : [`${domain} ${assetType} design`, "reference moodboard"],
    domain: asStringArray(groups.domain).length ? asStringArray(groups.domain) : [domain],
  };
}

function mergeKeywords(base: Record<string, string[]>, extra: Record<string, string[]>): Record<string, string[]> {
  const merged = { ...base };
  for (const [platform, keywords] of Object.entries(extra)) {
    merged[platform] = Array.from(new Set([...(merged[platform] || []), ...keywords])).filter(Boolean);
  }
  return merged;
}

function normalizePlatformKeywords(
  raw: Record<string, string[]> | undefined,
  needs: GeneratorAnalysis["referenceNeeds"],
  domain: string,
  assetType: string,
): Record<string, string[]> {
  let keywords = raw || {};
  if (needs.layout) keywords = mergeKeywords(keywords, buildLayoutPlatformKeywords(domain, assetType));
  if (needs.image) keywords = mergeKeywords(keywords, buildImagePlatformKeywords(domain, assetType));
  return keywords;
}

function buildLayoutPlatformKeywords(domain: string, assetType: string): Record<string, string[]> {
  const isWeb = isWebAsset(assetType);
  const isDashboard = isDashboardAsset(assetType);
  const documentTemplate = isDocumentAsset(assetType) ? `${domain} ${assetType} layout` : `${domain} UI design`;
  return {
    Dribbble: [documentTemplate, `${domain} editorial layout`],
    Behance: [`${domain} ${assetType} case study`, "enterprise brochure layout"],
    Mobbin: isWeb ? ["marketing website screen", "SaaS landing page"] : [],
    Pinterest: [`${domain} layout inspiration`, "editorial design moodboard"],
    "Figma Community": [isDocumentAsset(assetType) ? "proposal brochure layout template" : "dashboard UI kit", "landing page template", "component library"],
    Google: isWeb ? [`${domain} company website`, `${domain} service homepage reference`, `${domain} competitor website`] : [],
    GDWEB: isWeb ? [`${domain} 홈페이지`, `${domain} 이벤트페이지`, "기업 홈페이지"] : [],
    "Land-book": isWeb ? [`${domain} landing page`, "SaaS landing page design"] : [],
    "Page Flows": isDashboard ? ["onboarding flow", "settings flow", "dashboard navigation flow"] : [],
    Awwwards: isWeb ? [`${domain} corporate website`, "agency website design"] : [],
    "Lapa Ninja": isWeb ? [`${domain} landing page`, "SaaS homepage design"] : [],
    DBDIC: isWeb ? [`${domain} 홈페이지 레이아웃`, "GNB 구조 레퍼런스"] : [],
    DBCUT: isWeb ? [`${domain} 홈페이지 리뉴얼`, "기업사이트 트렌드"] : [],
    AppShots: isDashboard || /login/i.test(assetType) ? ["dashboard app screen", "login UI flow"] : [],
    "UI Bowl": isDashboard ? ["탭 컴포넌트", "카드 컴포넌트", "폼 컴포넌트"] : [],
    "Brand New": isDocumentAsset(assetType) ? [`${domain} rebrand case study`, "identity redesign"] : [],
    BrandB: isDocumentAsset(assetType) ? [`${domain} CI BI 디자인`, "브랜드 리뉴얼"] : [],
  };
}

function buildImagePlatformKeywords(domain: string, assetType: string): Record<string, string[]> {
  return {
    Dribbble: [`${domain} cover visual`, `${domain} hero visual`],
    Behance: [`${domain} brand visual case study`, `${assetType} cover visual design`],
    Mobbin: /login/i.test(assetType) ? ["login screen visual", "authentication screen illustration"] : [],
    Pinterest: [`${domain} key visual`, "technology abstract background"],
    "Figma Community": ["hero section visual template", "proposal cover template"],
    Google: isWebAsset(assetType) ? [`${domain} hero image website`, `${domain} landing page hero visual`] : [],
    GDWEB: isWebAsset(assetType) ? [`${domain} 홈페이지 비주얼`, `${domain} 랜딩페이지 히어로`] : [],
    "Land-book": isWebAsset(assetType) ? [`${domain} landing page`] : [],
    "Page Flows": [],
    "World Brand Design": isDocumentAsset(assetType) ? [`${domain} brand identity`, "corporate branding visual"] : [],
    "Brand Archive": isDocumentAsset(assetType) ? ["art direction reference", "brand application visual"] : [],
    "Fonts in Use": isDocumentAsset(assetType) ? ["editorial typography", "report typography reference"] : [],
  };
}

function normalizeImagePrompts(data: Partial<GeneratorAnalysis>, domain: string, assetType: string): string[] {
  const prompts = asStringArray(data.imagePrompts).slice(0, 3);
  return prompts.length ? prompts : defaultImagePrompts(domain, assetType);
}

function defaultImagePrompts(domain: string, assetType: string): string[] {
  return [
    `premium ${domain} ${assetType} cover key visual, abstract technology background, layered depth, refined editorial composition, no people, no handshake`,
    `modern ${domain} brand visual for ${assetType}, product and infrastructure concept, clean lighting, professional presentation cover, no office meeting scene`,
    `sophisticated ${domain} hero image, geometric data-inspired forms, subtle texture, high-end corporate brochure visual, minimal and credible`,
  ];
}

function defaultScreenTypes(assetType: string): GeneratorAnalysis["screenTypes"] {
  if (/brochure|proposal|report|poster/i.test(assetType)) {
    return [
      { icon: "□", name: "Cover", count: 1, desc: "첫 인상과 핵심 메시지를 전달하는 표지" },
      { icon: "▣", name: "Content Spread", count: 3, desc: "주요 정보와 가치 제안을 정리하는 본문" },
      { icon: "◇", name: "Infographic", count: 1, desc: "수치와 프로세스를 시각화하는 영역" },
    ];
  }
  return [
    { icon: "▦", name: "Main", count: 1, desc: "핵심 정보와 행동을 모으는 대표 화면" },
    { icon: "▤", name: "List / Table", count: 1, desc: "탐색과 비교를 위한 목록 화면" },
    { icon: "◫", name: "Detail", count: 1, desc: "상세 확인과 후속 행동을 위한 화면" },
  ];
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

function defaultMoods(): GeneratorAnalysis["moods"] {
  return [
    { title: "Clean Professional", desc: "명확한 정보 구조와 안정적인 브랜드 톤을 우선합니다.", colors: ["#f8fafc", "#111827", "#2563eb"], keywords: ["clean professional UI"] },
    { title: "Technical Blue", desc: "기술/데이터 성격을 시원한 블루 계열로 표현합니다.", colors: ["#0f172a", "#2563eb", "#06b6d4"], keywords: ["technical blue design"] },
    { title: "Editorial Calm", desc: "문서와 웹 모두에 적용하기 쉬운 절제된 편집 톤입니다.", colors: ["#ffffff", "#64748b", "#111827"], keywords: ["editorial minimal layout"] },
  ];
}

const ASSET_TYPE_RULES: Array<{ pattern: RegExp; assetType: string }> = [
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
  return rule?.assetType || "dashboard";
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

function buildFallbackAnalysis(documentText: string, primaryColor?: string): GeneratorAnalysis {
  const assetType = detectAssetType(documentText);
  const domain = detectDomain(documentText);
  const title = extractTitle(documentText);
  const description = extractDescription(documentText, title);

  const analysis = normalizeAnalysis({
    project: {
      title,
      description,
      domain,
      target: "user",
      assetType,
      tags: [assetType, domain],
    },
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

export async function analyzeDocument(documentText: string, primaryColor?: string): Promise<{ analysis: GeneratorAnalysis; source: AnalysisSource }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: MODEL_NAME });
      const result = await model.generateContent(buildPrompt(documentText, primaryColor));
      const json = extractJson(result.response.text());
      return { analysis: normalizeAnalysis(JSON.parse(json)), source: "gemini" };
    } catch (error) {
      console.error("Gemini 분석 실패, 키워드 기반 추정 결과로 대체합니다.", error);
    }
  }
  return { analysis: buildFallbackAnalysis(documentText, primaryColor), source: "fallback" };
}

export async function regenerateMoods(
  documentText: string,
  project: GeneratorAnalysis["project"],
  brief?: string,
  primaryColor?: string,
): Promise<{ result: RegenerateMoodsResponse; source: AnalysisSource }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: MODEL_NAME });
      const result = await model.generateContent(buildRegeneratePrompt(documentText, project, brief, primaryColor));
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
