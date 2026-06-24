"use client";

import { useEffect, useMemo, useState } from "react";
import FileDropzone from "@/components/FileDropzone";
import { buildImageSearchQueries, buildRelevanceTerms } from "@/lib/moodImageQuery";
import { buildReferenceGroups } from "@/lib/references";
import type {
  AnalyzeResponse,
  AssetProfile,
  DesignDirection,
  GeneratorAnalysis,
  ImageDirection,
  LayoutModule,
  LayoutVariant,
  Mood,
  MoodImage,
  ReferenceQuery,
} from "@/types";

// Matches the assetTypeRaw enum in lib/generatorAnalysis.ts's Gemini prompt — keep in sync.
const assetTypeOptions = [
  { value: "dashboard", label: "대시보드" },
  { value: "webpage", label: "웹사이트" },
  { value: "web-app", label: "웹 앱" },
  { value: "landing", label: "랜딩 페이지" },
  { value: "event-page", label: "이벤트 페이지" },
  { value: "mobile-app", label: "모바일 앱" },
  { value: "brochure", label: "브로셔/리플렛" },
  { value: "proposal", label: "제안서" },
  { value: "poster", label: "포스터" },
  { value: "report", label: "보고서" },
  { value: "image", label: "이미지/키비주얼" },
  { value: "other", label: "기타(확인 필요)" },
];

const paletteAdjustmentOptions = [
  {
    label: "더 밝게",
    brief: "선택 무드를 유지하되 배경 비중을 높이고, 채도는 낮추며, 포인트 컬러는 1개만 선명하게 재구성합니다.",
  },
  {
    label: "더 고급스럽게",
    brief: "저채도 뉴트럴과 깊은 메인 컬러를 중심으로, 금속감이나 과한 그라데이션 없이 프리미엄 톤으로 재구성합니다.",
  },
  {
    label: "더 기술적으로",
    brief: "차가운 블루/시안 계열을 보조로 쓰되 전체 화면이 파랗게 보이지 않도록 무채색 표면과 데이터 포인트 컬러를 분리합니다.",
  },
  {
    label: "더 따뜻하게",
    brief: "현재 구조를 유지하면서 신뢰감 있는 웜 그레이, 부드러운 포인트 컬러, 낮은 대비의 배경색으로 재구성합니다.",
  },
];

function isLightColor(hex: string): boolean {
  const c = hex.replace("#", "");
  if (c.length !== 6) return false;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// 실제 UI(대시보드/웹앱/모바일 등) 콘텐츠 영역 배경은 거의 항상 무채색이다 - 채도 높은 팔레트
// 컬러를 그대로 까는 건 표지 디자인이 있는 제안서/포스터류에서만 자연스럽다. mood.colors는
// 색 개수가 일정하지 않아 고정 인덱스(예: colors[3])로 "surface"를 집어내면 실제로는 비비드한
// 포인트 컬러가 배경 전체에 깔리는 사고가 난다.
function pickSurfaceColor(colors: string[], domainHint: AssetProfile["domainHint"], themeIsLight: boolean): string {
  if (domainHint === "document") {
    return colors[3] || (themeIsLight ? "#f8fafc" : "#18181b");
  }
  return themeIsLight ? "#f8fafc" : "#0b1220";
}

function buildImagePromptVariants(prompt: string, moodTitle: string, colors: string[]): string[] {
  const palette = colors.slice(0, 4).join(", ");
  return [
    `${prompt}, palette ${palette}, ${moodTitle} mood, clean composition, no text, no logo`,
    `${prompt}, refined editorial crop, strong focal visual, ${moodTitle} direction, colors ${palette}, no people unless explicitly required`,
    `${prompt}, production-ready key visual, layered depth, premium lighting, ${moodTitle} moodboard style, avoid handshake and meeting scenes`,
  ];
}

// buildImagePromptVariants와 한 줄씩 그대로 대응하는 직역. 끝에 태그만 붙이면 세 줄이 거의 같아 보이므로
// 영문 원문의 절(clause) 하나하나를 빠짐없이 옮긴다.
function buildImagePromptVariantsKo(promptKo: string, moodTitle: string, colors: string[]): string[] {
  const palette = colors.slice(0, 4).join(", ");
  return [
    `${promptKo}. 팔레트는 ${palette}, ${moodTitle} 무드, 깔끔한 구성. 텍스트 없음, 로고 없음.`,
    `${promptKo}. 정제된 에디토리얼 크롭(편집형 프레이밍), 강렬한 포컬 비주얼, ${moodTitle} 방향성, 컬러는 ${palette}. 별도로 요구되지 않는 한 인물 없음.`,
    `${promptKo}. 실제 제작에 바로 쓸 수 있는 키 비주얼, 레이어드 뎁스, 프리미엄 조명, ${moodTitle} 무드보드 스타일. 악수나 회의 장면은 피함.`,
  ];
}

function buildImagePromptsFromImage(projectTitle: string, imageDirection: ImageDirection, mood: Mood, image: MoodImage): string[] {
  const colors = mood.colors.slice(0, 4).join(", ");
  const query = image.query;
  const directionText = `${imageDirection.title} ${imageDirection.id}`;

  if (/login|로그인|인증/i.test(directionText)) {
    return [
      `Login hero image for ${projectTitle}, inspired by ${query}, ${mood.title} mood, colors ${colors}, clean secure service atmosphere, no text`,
      `Authentication background visual for ${projectTitle}, ${query}, soft depth, trustworthy digital product style, spacious composition, no text`,
      `Cropped login-side image for a web app, ${query}, refined brand visual, room for form panel on one side, no text`,
    ];
  }
  if (/landing|web|homepage|hero|event|홈페이지|랜딩|히어로/i.test(directionText)) {
    return [
      `Homepage hero image for ${projectTitle}, inspired by ${query}, ${mood.title} mood, colors ${colors}, strong focal point, no text`,
      `Landing page support visual for ${projectTitle}, ${query}, premium digital service mood, clean composition with copy space, no text`,
      `Wide web hero background, ${query}, modern brand direction, polished realistic/abstract blend, no text, no logos`,
    ];
  }
  return [
    `Proposal cover image for ${projectTitle}, inspired by ${query}, ${mood.title} mood, colors ${colors}, editorial composition, no text`,
    `Brochure cover visual for ${projectTitle}, ${query}, refined technology abstract background, strong but uncluttered focal area, no text`,
    `Document section background image, ${query}, professional brand mood, subtle depth, suitable for overlaying headings, no text`,
  ];
}

function buildImagePromptsFromImageKo(projectTitle: string, imageDirection: ImageDirection, mood: Mood, image: MoodImage): string[] {
  const colors = mood.colors.slice(0, 4).join(", ");
  const query = image.query;
  const directionText = `${imageDirection.title} ${imageDirection.id}`;

  if (/login|로그인|인증/i.test(directionText)) {
    return [
      `${projectTitle} 로그인 히어로 이미지 — "${query}" 참고, ${mood.title} 무드, 컬러 ${colors}, 깔끔하고 안전한 서비스 느낌, 텍스트 없음`,
      `${projectTitle} 인증 화면 배경 — "${query}" 기반, 부드러운 깊이감, 신뢰감 있는 디지털 제품 스타일, 여유로운 구성, 텍스트 없음`,
      `웹앱 로그인 분할형 이미지 — "${query}" 참고, 정제된 브랜드 비주얼, 한쪽에 폼 패널 들어갈 공간 확보, 텍스트 없음`,
    ];
  }
  if (/landing|web|homepage|hero|event|홈페이지|랜딩|히어로/i.test(directionText)) {
    return [
      `${projectTitle} 홈페이지 히어로 이미지 — "${query}" 참고, ${mood.title} 무드, 컬러 ${colors}, 강한 포컬 포인트, 텍스트 없음`,
      `${projectTitle} 랜딩페이지 보조 비주얼 — "${query}" 기반, 프리미엄 디지털 서비스 느낌, 카피 들어갈 여백 포함, 텍스트 없음`,
      `와이드 웹 히어로 배경 — "${query}" 참고, 모던 브랜드 방향, 사실적·추상 혼합 톤, 텍스트·로고 없음`,
    ];
  }
  return [
    `${projectTitle} 제안서 표지 이미지 — "${query}" 참고, ${mood.title} 무드, 컬러 ${colors}, 에디토리얼 구성, 텍스트 없음`,
    `${projectTitle} 브로셔 표지 비주얼 — "${query}" 기반, 정제된 기술 추상 배경, 강하지만 정돈된 포컬 영역, 텍스트 없음`,
    `문서 섹션 배경 이미지 — "${query}" 참고, 전문적인 브랜드 무드, 미세한 깊이감, 제목 얹기 적합, 텍스트 없음`,
  ];
}

function SectionTitle({ label, meta }: { label: string; meta?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-zinc-500">{label}</h2>
      {meta && <span className="text-xs font-medium text-zinc-400">{meta}</span>}
    </div>
  );
}

// UI 방향과 비주얼 방향을 탭으로 전환하지 않고 한 화면에 같이 보여주는 대신, 어디까지가
// 공통이고 어디부터 UI/비주얼 전용인지 구분되도록 섹션 사이에 표시하는 구분선.
function GroupDivider({ label, detail }: { label: string; detail?: string }) {
  return (
    <div className="mt-2 flex items-center gap-3">
      <span className="whitespace-nowrap text-xs font-black uppercase tracking-[0.16em] text-teal-700">{label}</span>
      {detail && <span className="whitespace-nowrap text-xs font-semibold text-zinc-400">{detail}</span>}
      <div className="h-px flex-1 bg-zinc-200" />
    </div>
  );
}

function WorkCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-zinc-200 bg-white shadow-sm ${className}`}>{children}</div>;
}

function EditableText({
  value,
  onSave,
  as = "span",
  className = "",
  multiline = false,
}: {
  value: string;
  onSave: (next: string) => void;
  as?: "h1" | "p" | "span";
  className?: string;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    const next = draft.trim();
    if (next && next !== value) onSave(next);
    else setDraft(value);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (editing) {
    const inputClassName = `${className} w-full rounded-md border border-teal-300 bg-white px-2 py-1 outline-none`;
    return multiline ? (
      <textarea
        autoFocus
        rows={2}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => event.key === "Escape" && cancel()}
        className={`${inputClassName} resize-none`}
      />
    ) : (
      <input
        autoFocus
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
          if (event.key === "Escape") cancel();
        }}
        className={inputClassName}
      />
    );
  }

  const Tag = as;
  return (
    <Tag
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      title="클릭해서 수정"
      className={`${className} cursor-text rounded-md decoration-dashed decoration-1 underline-offset-4 hover:bg-teal-50 hover:underline`}
    >
      {value}
    </Tag>
  );
}

function EditableTags({ tags, onChange }: { tags: string[]; onChange: (next: string[]) => void }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const addTag = () => {
    const next = draft.trim();
    if (next && !tags.includes(next)) onChange([...tags, next]);
    setDraft("");
    setAdding(false);
  };

  return (
    <div className="mt-5 flex flex-wrap items-center gap-2">
      {tags.map((tag) => (
        <span key={tag} className="flex items-center gap-1 rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-bold text-zinc-500">
          {tag}
          <button
            type="button"
            onClick={() => onChange(tags.filter((item) => item !== tag))}
            aria-label={`${tag} 삭제`}
            className="text-zinc-400 hover:text-red-600"
          >
            ×
          </button>
        </span>
      ))}
      {adding ? (
        <input
          autoFocus
          value={draft}
          placeholder="태그 입력"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={addTag}
          onKeyDown={(event) => {
            if (event.key === "Enter") addTag();
            if (event.key === "Escape") {
              setDraft("");
              setAdding(false);
            }
          }}
          className="w-24 rounded-md border border-teal-300 px-2 py-1 text-xs outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="rounded-md border border-dashed border-zinc-300 px-2.5 py-1 text-xs font-bold text-zinc-400 hover:border-teal-300 hover:text-teal-700"
        >
          + 태그
        </button>
      )}
    </div>
  );
}

function KeywordGroup({ title, keywords, tone }: { title: string; keywords: string[]; tone: string }) {
  if (!keywords.length) return null;
  return (
    <WorkCard className="p-4">
      <h3 className="mb-3 text-sm font-semibold text-zinc-600">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {keywords.map((keyword) => (
          <span key={keyword} className={`rounded-full border px-3 py-1 text-sm font-medium ${tone}`}>
            {keyword}
          </span>
        ))}
      </div>
    </WorkCard>
  );
}

function Palette({ analysis }: { analysis: GeneratorAnalysis }) {
  return (
    <WorkCard className="p-5">
      <SectionTitle label="Palette" meta={`${analysis.palette.length} colors`} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {analysis.palette.map((color) => (
          <div key={`${color.name}-${color.hex}`} className="min-w-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
            <div className="h-20" style={{ background: color.hex }} />
            <div className="p-3">
              <p className="truncate text-sm font-bold text-zinc-900">{color.name}</p>
              <p className="mt-1 font-mono text-xs text-zinc-500">{color.hex}</p>
              <p className="mt-1 truncate text-xs text-zinc-500">{color.role}</p>
            </div>
          </div>
        ))}
      </div>
    </WorkCard>
  );
}

function MoodCards({
  analysis,
  selectedMoodIndex,
  onSelectMood,
}: {
  analysis: GeneratorAnalysis;
  selectedMoodIndex: number;
  onSelectMood: (index: number) => void;
}) {
  return (
    <WorkCard className="p-5">
      <SectionTitle label="Mood Board" meta="3 directions" />
      <div className="grid gap-4 xl:grid-cols-3">
        {analysis.moods.map((mood, index) => (
          <button
            key={mood.title}
            type="button"
            onClick={() => onSelectMood(index)}
            className={`rounded-lg border bg-zinc-50 p-3 text-left transition-colors ${
              selectedMoodIndex === index ? "border-teal-400 ring-2 ring-teal-100" : "border-zinc-200 hover:border-zinc-400"
            }`}
          >
            <div className="flex min-h-28 flex-col justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">Mood</p>
                <h3 className="mt-2 text-base font-black text-zinc-950">{mood.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-600">{mood.keywords.slice(0, 3).join(", ")}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {mood.colors.map((color) => (
                <span key={color} className="h-8 w-8 rounded-md border border-zinc-300" style={{ background: color }} title={color} />
              ))}
            </div>
            <span className="mt-3 inline-flex rounded-md bg-zinc-900 px-3 py-1 text-xs font-bold text-white">
              {selectedMoodIndex === index ? "선택됨" : "이 무드 선택"}
            </span>
          </button>
        ))}
      </div>
    </WorkCard>
  );
}

function SelectedMoodBoard({
  analysis,
  direction,
  mood,
  colorBrief,
  primaryColor,
  onBriefChange,
  onRegenerate,
  regenerating,
  regenerateError,
  regenerateNote,
}: {
  analysis: GeneratorAnalysis;
  direction: DesignDirection;
  mood: Mood;
  colorBrief: string;
  primaryColor: string;
  onBriefChange: (brief: string) => void;
  onRegenerate: () => void;
  regenerating: boolean;
  regenerateError: string | null;
  regenerateNote: string | null;
}) {
  const colors = mood.colors.length ? mood.colors : analysis.palette.map((item) => item.hex);
  const bg = colors[0] || "#111827";
  const primary = colors[1] || "#2563eb";
  const accent = colors[2] || "#06b6d4";
  const bgIsLight = isLightColor(bg);
  const surface = pickSurfaceColor(colors, analysis.assetProfile.domainHint, bgIsLight);
  const previewLabels = direction.ui?.screenTypes.slice(0, 3) || [];

  return (
    <WorkCard className="p-5">
      <SectionTitle label="Selected Mood" meta={mood.title} />
      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-950">
          <div className="grid min-h-[360px] grid-cols-[0.9fr_1.1fr] max-md:grid-cols-1">
            <div className={`flex flex-col justify-between p-6 ${bgIsLight ? "text-zinc-900" : "text-white"}`} style={{ background: bg }}>
              <div>
                <p className={`text-xs font-bold uppercase tracking-[0.14em] ${bgIsLight ? "text-zinc-500" : "text-white/60"}`}>{direction.label}</p>
                <h3 className="mt-4 text-2xl font-black">{analysis.projectIntent.title}</h3>
                <p className={`mt-4 max-w-sm text-sm leading-6 ${bgIsLight ? "text-zinc-600" : "text-white/75"}`}>{mood.desc}</p>
              </div>
              <div className="grid gap-2">
                {previewLabels.map((item) => (
                  <div key={item.name} className={`rounded-md px-3 py-2 text-sm font-bold ${bgIsLight ? "bg-black/10 text-zinc-800" : "bg-white/12 text-white/90"}`}>
                    {item.name}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid content-between gap-5 p-6" style={{ background: surface }}>
              <div className="grid gap-3">
                <div className="h-4 w-28 rounded-full bg-zinc-300" />
                <div className="h-5 w-48 rounded-full bg-zinc-300" />
                <div className="mt-3 h-28 rounded-lg" style={{ background: primary }} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="h-24 rounded-lg bg-zinc-200" />
                <div className="h-24 rounded-lg bg-zinc-300" />
                <div className="h-24 rounded-lg" style={{ background: accent }} />
              </div>
              <div className="grid gap-2">
                <div className="h-3 rounded-full bg-zinc-300" />
                <div className="h-3 w-3/4 rounded-full bg-zinc-300" />
              </div>
            </div>
          </div>
        </div>
        <div className="grid gap-4">
          <div>
            <h3 className="text-base font-black text-zinc-950">{mood.title}</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{mood.desc}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {colors.map((color) => (
                <span key={color} className="rounded-md border border-zinc-200 bg-white px-2 py-1 font-mono text-xs font-bold text-zinc-700">
                  <span className="mr-2 inline-block h-3 w-3 rounded-full align-middle" style={{ background: color }} />
                  {color}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <h4 className="text-sm font-black text-zinc-800">컬러가 안 맞을 때</h4>
            <div className="mt-3 flex flex-wrap gap-2">
              {paletteAdjustmentOptions.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => onBriefChange(option.brief)}
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-bold text-zinc-700 hover:border-teal-300 hover:text-teal-800"
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="mt-4 rounded-md bg-white p-3 text-sm leading-6 text-zinc-600">
              {colorBrief || "선택한 무드를 기준으로 유지할 방향을 고르면 재생성 브리프가 정리됩니다."}
              {primaryColor && (
                <p className="mt-2 font-semibold text-zinc-800">
                  Primary Color 고정: {primaryColor}
                  <span className="ml-2 rounded-md border border-zinc-200 px-2 py-1 align-middle font-mono text-xs text-zinc-500" style={{ background: primaryColor }} />
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onRegenerate}
              disabled={regenerating || !colorBrief}
              className="mt-3 w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              {regenerating ? "팔레트/무드 재생성 중..." : "이 조건으로 팔레트/무드 다시 생성"}
            </button>
            {!colorBrief && <p className="mt-2 text-xs leading-5 text-zinc-400">보정 옵션을 선택하면 재생성할 수 있습니다.</p>}
            {regenerateError && <p className="mt-2 text-xs leading-5 text-red-600">{regenerateError}</p>}
            {regenerateNote && <p className="mt-2 text-xs leading-5 text-amber-600">{regenerateNote}</p>}
          </div>
        </div>
      </div>
    </WorkCard>
  );
}

function ReferenceKeywordChip({ label }: { label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(label).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
      className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-sm font-semibold text-zinc-700 hover:border-teal-300 hover:text-teal-800"
    >
      {copied ? "복사됨" : label}
    </button>
  );
}

// Dribbble/Behance/Pinterest/Figma Community처럼 양쪽에 다 쓸모 있는 플랫폼(purpose: "both")은
// UI/비주얼 섹션에서 각자 자기 direction의 키워드로 보여준다 — 브로셔처럼 ui-only/visual-only
// 방향이 분리된 경우 같은 플랫폼이 layout 의도 키워드와 image 의도 키워드로 각각 다르게 나오는
// 게 자연스럽다. 단, ui와 visual이 같은 direction(분리되지 않은 fallback 케이스)이면 동일한
// 키워드 목록이 두 섹션에 그대로 중복 노출되므로 그때만 includeBoth=false로 한쪽을 끈다.
function References({
  references,
  mode,
  title,
  includeBoth = true,
}: {
  references: ReferenceQuery[];
  mode: "layout" | "image";
  title: string;
  includeBoth?: boolean;
}) {
  const groups = useMemo(
    () => buildReferenceGroups(references).filter((group) => group.purpose === mode || (includeBoth && group.purpose === "both")),
    [references, mode, includeBoth],
  );
  if (groups.length === 0) return null;

  return (
    <WorkCard className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle label={title} meta={`${groups.length} groups`} />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => (
          <div key={group.name} className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-zinc-950">
                  {group.name}
                  {!group.searchable && (
                    <a
                      href={group.siteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-xs font-semibold text-teal-700 hover:underline"
                    >
                      방문 ↗
                    </a>
                  )}
                </h3>
                <p className="mt-1 text-sm leading-5 text-zinc-500">{group.note}</p>
              </div>
              <span className="rounded-md bg-white px-2 py-1 text-xs font-bold text-zinc-500">{group.items.length}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {group.items.map((item, index) =>
                group.searchable ? (
                  <a
                    key={`${group.name}-${index}`}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-sm font-semibold text-zinc-700 hover:border-teal-300 hover:text-teal-800"
                  >
                    {item.label}
                  </a>
                ) : (
                  <ReferenceKeywordChip key={`${group.name}-${index}`} label={item.label} />
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </WorkCard>
  );
}

export type ScreenLayout = "splash" | "onboarding" | "terms" | "login" | "form" | "dashboard" | "list" | "detail";

const LOGIN_SCREEN_PATTERN = /login|sign\s*in|signin|auth|authentication|로그인|인증/i;

// 화면 이름/설명에서 키워드를 찾지 못하면 detail로 떨어진다. 화면 성격이 뚜렷이 다른
// 진입형(splash/onboarding/terms/login/form) 화면을 먼저 골라내야 모든 화면이
// 같은 "레코드 상세" 모양으로 뭉개지지 않는다.
function detectScreenLayout(name: string, desc: string): ScreenLayout {
  const text = `${name} ${desc}`.toLowerCase();
  if (/splash|스플래시|인트로|intro\b/.test(text)) return "splash";
  if (/onboarding|온보딩|워크스루|walkthrough|시작\s*가이드/.test(text)) return "onboarding";
  if (/terms|약관|동의|consent|agreement/.test(text)) return "terms";
  if (LOGIN_SCREEN_PATTERN.test(text)) return "login";
  if (/profile|프로필|setup|셋업|설정|등록|가입|sign\s*up|signup|edit|form/.test(text)) return "form";
  if (/main|dashboard|home|대시보드|홈|메인|overview|summary|현황|리포트|report|결과/.test(text)) return "dashboard";
  if (/list|table|목록|테이블|카드|grid|feed|조회|이력|기록|history/.test(text)) return "list";
  return "detail";
}

// 문서 desc는 Gemini가 "이 화면이 왜 필요한지"를 요약한 텍스트라 실제 버튼 문구가
// 들어있지 않다. 그래서 desc 본문을 파싱해 라벨을 추출하지 않고, 레이아웃 타입별로
// 합리적인 기본 CTA 문구를 고정해서 쓴다.
function defaultCtaLabel(layout: ScreenLayout): string {
  switch (layout) {
    case "splash":
      return "시작하기";
    case "onboarding":
      return "다음";
    case "terms":
      return "동의하고 계속";
    case "login":
      return "로그인";
    case "form":
      return "완료";
    default:
      return "저장";
  }
}

// 앱 메인 탭 구조에 들어가기 전 단계(진입/단일 액션형) 화면들. 이 화면들은 모바일/데스크탑
// 모두에서 같은 "중앙 카드 한 장" 구조이므로 HTML 다운로드 콘텐츠를 공유한다.
const ENTRY_LAYOUTS: ScreenLayout[] = ["splash", "onboarding", "terms", "login", "form"];

function buildEntryScreenFragment({
  layout,
  screen,
  primary,
  accent,
  cardBg,
  cardLine,
  onSurface,
  textMuted,
}: {
  layout: ScreenLayout;
  screen: { icon: string; name: string; count: number; desc: string };
  primary: string;
  accent: string;
  cardBg: string;
  cardLine: string;
  onSurface: string;
  textMuted: string;
}): string {
  const cta = escapeHtml(defaultCtaLabel(layout));
  const desc = escapeHtml(screen.desc || "화면 설명이 등록되지 않았습니다.");
  const name = escapeHtml(screen.name);
  // primary는 배너/브랜드 블록 색이고, 실제로 누르는 CTA는 accent로 채워야 카드 배경 위에서
  // 또렷하게 도드라진다(나머지 화면들도 동일 규칙: accent = 클릭 가능한 버튼).
  const onAccentText = isLightColor(accent) ? "#18181b" : "#ffffff";
  const ctaButton = `<div style="width:100%;height:46px;border-radius:12px;background:${accent};color:${onAccentText};display:flex;align-items:center;justify-content:center;font-size:13.5px;font-weight:700;">${cta}</div>`;

  if (layout === "splash") {
    return `<div style="display:flex;flex-direction:column;align-items:center;text-align:center;">
  <div style="width:64px;height:64px;border-radius:18px;background:${primary};margin-bottom:16px;"></div>
  <h2 style="font-size:17px;font-weight:900;color:${onSurface};margin-bottom:8px;">${name}</h2>
  <p style="font-size:12.5px;line-height:1.6;color:${textMuted};margin-bottom:24px;">${desc}</p>
  ${ctaButton}
</div>`;
  }

  if (layout === "onboarding") {
    return `<div>
  <div style="width:100%;height:160px;border-radius:18px;background:${accent};margin-bottom:20px;"></div>
  <h2 style="font-size:16px;font-weight:900;color:${onSurface};margin-bottom:8px;text-align:center;">${name}</h2>
  <p style="font-size:12.5px;line-height:1.6;color:${textMuted};text-align:center;margin-bottom:18px;">${desc}</p>
  <div style="display:flex;justify-content:center;gap:6px;margin-bottom:18px;">
    ${[0, 1, 2].map((i) => `<div style="width:6px;height:6px;border-radius:999px;background:${i === 0 ? accent : cardLine};"></div>`).join("")}
  </div>
  ${ctaButton}
</div>`;
  }

  if (layout === "terms") {
    return `<div>
  <h2 style="font-size:16px;font-weight:900;color:${onSurface};margin-bottom:12px;">${name}</h2>
  <div style="max-height:220px;overflow:hidden;border-radius:12px;padding:14px;background:${cardBg};margin-bottom:14px;font-size:11.5px;line-height:1.7;color:${textMuted};">${desc}</div>
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">
    <div style="width:18px;height:18px;border-radius:5px;border:1.5px solid ${accent};flex-shrink:0;"></div>
    <span style="font-size:12.5px;color:${onSurface};">필수 약관에 모두 동의합니다</span>
  </div>
  ${ctaButton}
</div>`;
  }

  if (layout === "login") {
    return `<div>
  <h2 style="font-size:16px;font-weight:900;color:${onSurface};margin-bottom:18px;">${name}</h2>
  <div style="display:grid;gap:10px;margin-bottom:8px;">
    <div style="height:44px;border-radius:10px;padding:0 14px;display:flex;align-items:center;background:${cardBg};font-size:12.5px;color:${textMuted};">이메일</div>
    <div style="height:44px;border-radius:10px;padding:0 14px;display:flex;align-items:center;background:${cardBg};font-size:12.5px;color:${textMuted};">비밀번호</div>
  </div>
  <div style="text-align:right;font-size:11.5px;color:${textMuted};margin-bottom:18px;">비밀번호를 잊으셨나요?</div>
  ${ctaButton}
  <div style="text-align:center;font-size:11.5px;color:${textMuted};margin-top:14px;">계정이 없으신가요? <span style="color:${accent};font-weight:700;">가입하기</span></div>
</div>`;
  }

  return `<div>
  <h2 style="font-size:16px;font-weight:900;color:${onSurface};margin-bottom:6px;">${name}</h2>
  <p style="font-size:12px;line-height:1.6;color:${textMuted};margin-bottom:18px;">${desc}</p>
  <div style="display:grid;gap:12px;margin-bottom:18px;">
    ${["입력 항목 1", "입력 항목 2", "입력 항목 3"]
      .map((label) => `<div><div style="font-size:11px;font-weight:700;color:${textMuted};margin-bottom:5px;">${label}</div><div style="height:42px;border-radius:10px;background:${cardBg};"></div></div>`)
      .join("")}
  </div>
  ${ctaButton}
</div>`;
}

function hasLoginScreen(screenTypes: Array<{ name: string; desc: string }>): boolean {
  return screenTypes.some((screen) => LOGIN_SCREEN_PATTERN.test(`${screen.name} ${screen.desc}`));
}

function PreviewNav({ primary }: { primary: string }) {
  const light = isLightColor(primary);
  return (
    <div className="flex h-10 select-none items-center justify-between px-4" style={{ background: primary }}>
      <div className="flex items-center gap-4">
        <div className={`h-4 w-20 rounded ${light ? "bg-black/20" : "bg-white/30"}`} />
        <div className={`h-2.5 w-12 rounded ${light ? "bg-black/12" : "bg-white/20"}`} />
        <div className={`h-2.5 w-12 rounded ${light ? "bg-black/12" : "bg-white/20"}`} />
      </div>
      <div className={`h-7 w-7 rounded-full ${light ? "bg-black/20" : "bg-white/30"}`} />
    </div>
  );
}

function PreviewDashboard({ colors, screenName, domainHint }: { colors: string[]; screenName: string; domainHint: AssetProfile["domainHint"] }) {
  const primary = colors[0] || "#111827";
  const accent = colors[1] || "#2563eb";
  const surface = pickSurfaceColor(colors, domainHint, isLightColor(colors[0] || "#111827"));
  const surfaceLight = isLightColor(surface);

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 select-none">
      <PreviewNav primary={primary} />
      <div className="flex min-h-72" style={{ background: surface }}>
        <div className="w-16 shrink-0 border-r border-zinc-200 p-2.5" style={{ background: surfaceLight ? "#f0f0f1" : "#18181b" }}>
          <div className="mb-3 h-2 w-10 rounded" style={{ background: accent }} />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="mb-2 h-2 rounded" style={{ background: surfaceLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.15)" }} />
          ))}
        </div>
        <div className="flex-1 grid gap-3 content-start p-4">
          <h4 className={`truncate text-sm font-black ${surfaceLight ? "text-zinc-800" : "text-white"}`}>{screenName}</h4>
          <div className="grid grid-cols-3 gap-2">
            {[accent, "#e4e4e7", "#e4e4e7"].map((bg, i) => (
              <div key={i} className="rounded-lg border border-zinc-200 bg-white p-2.5">
                <div className="h-1.5 w-8 rounded bg-zinc-200" />
                <div className="mt-2 h-5 w-12 rounded" style={{ background: bg }} />
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-3">
            <div className="mb-2 h-1.5 w-12 rounded bg-zinc-200" />
            <div className="flex h-14 items-end gap-1">
              {[35, 55, 40, 70, 45, 85, 60].map((h, i) => (
                <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: i === 5 ? accent : "#e4e4e7" }} />
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <div className="flex gap-4 bg-zinc-50 px-3 py-1.5">
              {[16, 36, 16].map((w, i) => <div key={i} className="h-1.5 rounded bg-zinc-300" style={{ width: `${w}%` }} />)}
            </div>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 border-t border-zinc-100 px-3 py-2">
                <div className="h-5 w-5 rounded-full bg-zinc-200" />
                <div className="h-1.5 flex-1 rounded bg-zinc-200" />
                <div className="h-1.5 w-10 rounded bg-zinc-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewList({ colors, screenName, domainHint }: { colors: string[]; screenName: string; domainHint: AssetProfile["domainHint"] }) {
  const primary = colors[0] || "#111827";
  const accent = colors[1] || "#2563eb";
  const surface = pickSurfaceColor(colors, domainHint, isLightColor(colors[0] || "#111827"));
  const surfaceLight = isLightColor(surface);

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 select-none">
      <PreviewNav primary={primary} />
      <div className="grid gap-3 p-4" style={{ background: surface }}>
        <h4 className={`truncate text-sm font-black ${surfaceLight ? "text-zinc-800" : "text-white"}`}>{screenName}</h4>
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <div className="h-7 w-28 rounded-lg border border-zinc-200 bg-white" />
            <div className="h-7 w-16 rounded-lg" style={{ background: accent }} />
          </div>
          <div className="h-7 w-24 rounded-lg border border-zinc-200 bg-white" />
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-lg border border-zinc-200 bg-white p-3">
              <div className="mb-2 h-10 rounded" style={{ background: i % 3 === 0 ? `${accent}33` : "#f4f4f5" }} />
              <div className="h-2 w-3/4 rounded bg-zinc-200" />
              <div className="mt-1 h-1.5 w-1/2 rounded bg-zinc-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PreviewDetail({ colors, screenName, domainHint }: { colors: string[]; screenName: string; domainHint: AssetProfile["domainHint"] }) {
  const primary = colors[0] || "#111827";
  const accent = colors[1] || "#2563eb";
  const surface = pickSurfaceColor(colors, domainHint, isLightColor(colors[0] || "#111827"));
  const surfaceLight = isLightColor(surface);

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 select-none">
      <PreviewNav primary={primary} />
      <div className="grid gap-3 p-4" style={{ background: surface }}>
        <div className={`flex items-center gap-2 text-xs font-bold ${surfaceLight ? "text-zinc-500" : "text-white/60"}`}>
          <span>목록</span>
          <span>›</span>
          <span style={{ color: accent }}>{screenName}</span>
        </div>
        <div className="grid gap-3 md:grid-cols-[1.4fr_0.6fr]">
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="mb-3 h-3.5 w-1/2 rounded bg-zinc-200" />
            <div className="mb-3 h-px bg-zinc-100" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="grid grid-cols-[80px_1fr] items-center gap-2 border-b border-zinc-50 py-1.5">
                <div className="h-2 rounded bg-zinc-200" />
                <div className="h-2 rounded bg-zinc-100" />
              </div>
            ))}
          </div>
          <div className="grid gap-2 content-start">
            <div className="rounded-lg border border-zinc-200 bg-white p-3">
              <div className="mb-2 h-2 w-10 rounded bg-zinc-200" />
              <div className="h-6 w-16 rounded" style={{ background: `${accent}33` }} />
              <div className="mt-3 grid gap-1.5">
                {[...Array(3)].map((_, i) => <div key={i} className="h-1.5 rounded bg-zinc-100" />)}
              </div>
            </div>
            <div className="h-8 rounded-lg" style={{ background: accent }} />
            <div className="h-8 rounded-lg border border-zinc-200 bg-white" />
          </div>
        </div>
      </div>
    </div>
  );
}

// splash/onboarding/terms/login/form은 사이드바·테이블이 아니라 화면 중앙에 단일
// 액션 카드 하나만 있는 구조라 PreviewDashboard/List/Detail과는 다른 모양이 필요하다.
function PreviewCentered({
  colors,
  screenName,
  domainHint,
  layout,
}: {
  colors: string[];
  screenName: string;
  domainHint: AssetProfile["domainHint"];
  layout: ScreenLayout;
}) {
  const primary = colors[0] || "#111827";
  const accent = colors[1] || "#2563eb";
  const surface = pickSurfaceColor(colors, domainHint, isLightColor(colors[0] || "#111827"));
  const surfaceLight = isLightColor(surface);
  const lineBg = surfaceLight ? "bg-zinc-200" : "bg-white/15";
  const dotInactive = surfaceLight ? "#e4e4e7" : "rgba(255,255,255,0.2)";

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 select-none">
      <PreviewNav primary={primary} />
      <div className="flex min-h-72 items-center justify-center p-6" style={{ background: surface }}>
        <div className="grid w-full max-w-[280px] gap-3">
          {(layout === "splash" || layout === "onboarding") && (
            <div
              className="mx-auto h-14 w-14 rounded-2xl"
              style={{ background: layout === "splash" ? primary : accent }}
            />
          )}
          <h4 className={`truncate text-center text-sm font-black ${surfaceLight ? "text-zinc-800" : "text-white"}`}>{screenName}</h4>
          {layout === "onboarding" && (
            <div className="flex justify-center gap-1.5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: i === 0 ? accent : dotInactive }} />
              ))}
            </div>
          )}
          {layout === "terms" && (
            <>
              <div className={`h-16 rounded-lg ${lineBg}`} />
              <div className="flex items-center gap-2">
                <div className={`h-3.5 w-3.5 rounded border ${surfaceLight ? "border-zinc-300" : "border-white/30"}`} />
                <div className={`h-1.5 w-32 rounded ${lineBg}`} />
              </div>
            </>
          )}
          {(layout === "login" || layout === "form") && (
            <div className="grid gap-2">
              {[...Array(layout === "login" ? 2 : 3)].map((_, i) => (
                <div key={i} className={`h-8 rounded-md border ${surfaceLight ? "border-zinc-200 bg-white" : "border-white/15 bg-white/5"}`} />
              ))}
            </div>
          )}
          <div className="mt-1 h-9 rounded-lg" style={{ background: accent }} />
        </div>
      </div>
    </div>
  );
}

// 모바일 전용 문서(예: "모바일 전용 UI, iPhone 화면비")는 데스크탑 nav+sidebar 와이어프레임이 아니라
// 폰 프레임 안에 상태바/하단 탭바를 갖춘 모바일 형태로 보여줘야 한다.
function PreviewMobile({ colors, screenName, layout }: { colors: string[]; screenName: string; layout: ScreenLayout }) {
  const primary = colors[0] || "#111827";
  const accent = colors[1] || "#2563eb";
  const surface = pickSurfaceColor(colors, "mobile-app", isLightColor(colors[0] || "#111827"));
  const surfaceLight = isLightColor(surface);
  const onSurface = surfaceLight ? "text-zinc-800" : "text-white";
  const cardBg = surfaceLight ? "bg-white" : "bg-white/10";
  const cardLineBg = surfaceLight ? "bg-zinc-200" : "bg-white/15";
  const dotInactive = surfaceLight ? "#e4e4e7" : "rgba(255,255,255,0.2)";
  // 스플래시/온보딩/약관/로그인은 메인 탭 구조에 들어가기 전 단계라 하단 탭바가 없다.
  const showTabBar = layout === "dashboard" || layout === "list" || layout === "detail" || layout === "form";

  return (
    <div className="flex justify-center bg-zinc-100 p-6">
      <div className="w-[300px] overflow-hidden rounded-[28px] border-4 border-zinc-900 bg-zinc-900 shadow-xl select-none">
        <div
          className="flex items-center justify-between px-4 pb-1 pt-2 text-[10px] font-bold"
          style={{ background: surface, color: surfaceLight ? "#18181b" : "#fff" }}
        >
          <span>9:41</span>
          <span>●●●</span>
        </div>
        <div className="flex min-h-[480px] flex-col p-4" style={{ background: surface }}>
          {layout === "splash" || layout === "onboarding" ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              <div className="h-16 w-16 rounded-2xl" style={{ background: layout === "splash" ? primary : accent }} />
              <h4 className={`truncate text-center text-sm font-black ${onSurface}`}>{screenName}</h4>
              {layout === "onboarding" && (
                <div className="flex gap-1.5">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: i === 0 ? accent : dotInactive }} />
                  ))}
                </div>
              )}
              <div className="mt-4 h-11 w-full rounded-xl" style={{ background: accent }} />
            </div>
          ) : (
            <>
              <h4 className={`mb-3 truncate text-sm font-black ${onSurface}`}>{screenName}</h4>
              {layout === "terms" && (
                <div className="grid gap-3">
                  <div className={`h-32 rounded-xl ${cardBg}`} />
                  <div className="flex items-center gap-2">
                    <div className={`h-4 w-4 rounded border ${surfaceLight ? "border-zinc-300" : "border-white/30"}`} />
                    <div className={`h-1.5 w-32 rounded ${cardLineBg}`} />
                  </div>
                  <div className="mt-2 h-11 rounded-xl" style={{ background: accent }} />
                </div>
              )}
              {layout === "login" && (
                <div className="grid gap-3">
                  <div className={`h-11 rounded-xl border ${surfaceLight ? "border-zinc-200 bg-white" : "border-white/15 bg-white/5"}`} />
                  <div className={`h-11 rounded-xl border ${surfaceLight ? "border-zinc-200 bg-white" : "border-white/15 bg-white/5"}`} />
                  <div className="mt-2 h-11 rounded-xl" style={{ background: accent }} />
                  <div className={`h-1.5 w-24 justify-self-center rounded ${cardLineBg}`} />
                </div>
              )}
              {layout === "form" && (
                <div className="grid gap-2.5">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className={`h-11 rounded-xl border ${surfaceLight ? "border-zinc-200 bg-white" : "border-white/15 bg-white/5"}`} />
                  ))}
                  <div className="mt-2 h-11 rounded-xl" style={{ background: accent }} />
                </div>
              )}
              {layout === "dashboard" && (
                <div className="grid gap-3">
                  <div className="h-28 rounded-2xl" style={{ background: primary }} />
                  <div className="grid grid-cols-2 gap-2">
                    <div className={`h-16 rounded-xl ${cardBg}`} />
                    <div className="h-16 rounded-xl" style={{ background: accent }} />
                  </div>
                  <div className={`h-20 rounded-xl ${cardBg}`} />
                </div>
              )}
              {layout === "list" && (
                <div className="grid gap-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className={`flex items-center gap-3 rounded-xl p-2.5 ${cardBg}`}>
                      <div className="h-10 w-10 shrink-0 rounded-lg" style={{ background: i === 0 ? accent : "#e4e4e7" }} />
                      <div className="grid flex-1 gap-1">
                        <div className={`h-2 w-3/4 rounded ${cardLineBg}`} />
                        <div className={`h-1.5 w-1/2 rounded ${cardLineBg}`} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {layout === "detail" && (
                <div className="grid gap-3">
                  <div className="h-36 rounded-2xl" style={{ background: accent }} />
                  <div className={`h-3 w-2/3 rounded ${cardLineBg}`} />
                  <div className={`h-2 w-full rounded ${cardLineBg}`} />
                  <div className={`h-2 w-5/6 rounded ${cardLineBg}`} />
                  <div className="mt-3 h-11 rounded-xl" style={{ background: accent }} />
                </div>
              )}
            </>
          )}
        </div>
        {showTabBar && (
          <div className="flex items-center justify-around border-t border-white/10 py-3" style={{ background: surface }}>
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-5 w-5 rounded-md"
                style={{ background: i === 0 ? accent : surfaceLight ? "#a1a1aa" : "#71717a", opacity: i === 0 ? 1 : 0.5 }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function modulesByWeight(modules: LayoutModule[], weight: LayoutModule["weight"]): LayoutModule[] {
  return modules.filter((module) => module.weight === weight);
}

function PreviewMapCentric({ colors, screenName, domainHint, modules }: { colors: string[]; screenName: string; domainHint: AssetProfile["domainHint"]; modules: LayoutModule[] }) {
  const primary = colors[0] || "#111827";
  const accent = colors[1] || "#2563eb";
  const surface = pickSurfaceColor(colors, domainHint, isLightColor(colors[0] || "#111827"));
  const surfaceLight = isLightColor(surface);
  const mapModule = modulesByWeight(modules, "primary")[0] || { id: "map", label: "지도 캔버스", weight: "primary" as const };
  const sidePanels = [...modulesByWeight(modules, "secondary"), ...modulesByWeight(modules, "support")];
  const panels = sidePanels.length ? sidePanels : [{ id: "panel-1", label: "필터", weight: "secondary" as const }, { id: "panel-2", label: "목록", weight: "support" as const }];

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 select-none">
      <PreviewNav primary={primary} />
      <div className="flex min-h-72" style={{ background: surface }}>
        <div className="relative flex-1 overflow-hidden" style={{ background: surfaceLight ? "#e4e4e7" : "#1f2937" }}>
          <div className="absolute left-3 top-3 rounded-md bg-white/90 px-2 py-1 text-xs font-bold text-zinc-700 shadow-sm">{mapModule.label}</div>
          <div className="absolute inset-0 opacity-40" style={{ backgroundImage: `linear-gradient(120deg, ${accent}33 0%, transparent 40%, ${accent}22 70%)` }} />
          {[...Array(6)].map((_, i) => (
            <span
              key={i}
              className="absolute h-2.5 w-2.5 rounded-full border-2 border-white"
              style={{ background: i % 2 === 0 ? accent : "#ef4444", left: `${15 + i * 13}%`, top: `${20 + ((i * 17) % 60)}%` }}
            />
          ))}
        </div>
        <div className="w-56 shrink-0 border-l border-zinc-200 p-3" style={{ background: surfaceLight ? "#ffffff" : "#18181b" }}>
          <h4 className={`mb-3 truncate text-sm font-black ${surfaceLight ? "text-zinc-800" : "text-white"}`}>{screenName}</h4>
          {panels.map((panel) => (
            <div key={panel.id} className="mb-3 rounded-lg border border-zinc-200 bg-zinc-50 p-2.5">
              <div className="mb-2 text-xs font-bold text-zinc-500">{panel.label}</div>
              <div className="grid gap-1.5">
                {[...Array(3)].map((_, i) => <div key={i} className="h-2 rounded bg-zinc-200" />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PreviewCommandCenter({ colors, screenName, domainHint, modules, density }: { colors: string[]; screenName: string; domainHint: AssetProfile["domainHint"]; modules: LayoutModule[]; density: LayoutVariant["density"] }) {
  const primary = colors[0] || "#111827";
  const accent = colors[1] || "#2563eb";
  const surface = pickSurfaceColor(colors, domainHint, isLightColor(colors[0] || "#111827"));
  const surfaceLight = isLightColor(surface);
  const gap = density === "compact" ? "gap-1.5" : density === "spacious" ? "gap-4" : "gap-2.5";
  const labels = modules.length ? modules.map((m) => m.label) : ["지도/CCTV", "KPI", "알림 피드", "상태"];

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 select-none">
      <PreviewNav primary={primary} />
      <div className={`grid grid-cols-2 ${gap} p-3`} style={{ background: surface }}>
        <h4 className={`col-span-2 truncate text-sm font-black ${surfaceLight ? "text-zinc-800" : "text-white"}`}>{screenName}</h4>
        <div className="col-span-2 grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-lg border border-zinc-200 bg-white p-2">
              <div className="h-1.5 w-8 rounded bg-zinc-200" />
              <div className="mt-2 h-5 w-10 rounded" style={{ background: i === 1 ? accent : "#e4e4e7" }} />
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-zinc-200 p-2.5" style={{ background: surfaceLight ? "#e4e4e7" : "#1f2937" }}>
          <div className="text-xs font-bold text-zinc-500">{labels[0]}</div>
          <div className="mt-2 h-20 rounded" style={{ background: `${accent}33` }} />
        </div>
        <div className="grid gap-2">
          <div className="flex-1 rounded-lg border border-zinc-200 bg-white p-2">
            <div className="text-xs font-bold text-zinc-500">{labels[2] || "알림 피드"}</div>
            <div className="mt-1.5 grid gap-1">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: i === 0 ? "#ef4444" : accent }} />
                  <div className="h-1.5 flex-1 rounded bg-zinc-100" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewKpiWall({ colors, screenName, domainHint, modules, density }: { colors: string[]; screenName: string; domainHint: AssetProfile["domainHint"]; modules: LayoutModule[]; density: LayoutVariant["density"] }) {
  const primary = colors[0] || "#111827";
  const accent = colors[1] || "#2563eb";
  const surface = pickSurfaceColor(colors, domainHint, isLightColor(colors[0] || "#111827"));
  const surfaceLight = isLightColor(surface);
  const tiles = modules.length ? modules : [{ id: "t1", label: "지표 1", weight: "primary" as const }, { id: "t2", label: "지표 2", weight: "primary" as const }, { id: "t3", label: "지표 3", weight: "primary" as const }, { id: "t4", label: "지표 4", weight: "primary" as const }];
  const padding = density === "compact" ? "p-3" : density === "spacious" ? "p-6" : "p-4";

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 select-none">
      <PreviewNav primary={primary} />
      <div className={padding} style={{ background: surface }}>
        <h4 className={`mb-3 truncate text-sm font-black ${surfaceLight ? "text-zinc-800" : "text-white"}`}>{screenName}</h4>
        <div className="grid grid-cols-2 gap-3">
          {tiles.slice(0, 4).map((tile, i) => (
            <div key={tile.id} className="rounded-xl border border-zinc-200 bg-white p-4 text-center">
              <div className="text-xs font-bold text-zinc-500">{tile.label}</div>
              <div className="mt-2 text-2xl font-black" style={{ color: i % 2 === 0 ? accent : "#18181b" }}>
                {[284, 92, 1284, 12][i % 4]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PreviewIncidentFocused({ colors, screenName, domainHint, modules }: { colors: string[]; screenName: string; domainHint: AssetProfile["domainHint"]; modules: LayoutModule[] }) {
  const primary = colors[0] || "#111827";
  const accent = colors[1] || "#2563eb";
  const surface = pickSurfaceColor(colors, domainHint, isLightColor(colors[0] || "#111827"));
  const surfaceLight = isLightColor(surface);
  const detailLabel = modulesByWeight(modules, "secondary")[0]?.label || "상세/대응";

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 select-none">
      <PreviewNav primary={primary} />
      <div className="grid gap-3 p-4 md:grid-cols-[0.55fr_0.45fr]" style={{ background: surface }}>
        <div className="rounded-lg border border-zinc-200 bg-white p-3">
          <h4 className={`mb-2 truncate text-sm font-black ${surfaceLight ? "text-zinc-800" : "text-white"}`}>{screenName}</h4>
          {[...Array(5)].map((_, i) => {
            const severity = i === 0 ? "#ef4444" : i === 1 ? "#f59e0b" : accent;
            return (
              <div key={i} className="flex items-center gap-2.5 border-t border-zinc-100 py-2 first:border-t-0">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: severity }} />
                <div className="h-2 flex-1 rounded bg-zinc-200" />
                <div className="h-2 w-10 rounded bg-zinc-100" />
              </div>
            );
          })}
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-3">
          <div className="text-xs font-bold text-zinc-500">{detailLabel}</div>
          <div className="mt-2 h-20 rounded-lg" style={{ background: `${accent}33` }} />
          <div className="mt-3 grid gap-1.5">
            {[...Array(3)].map((_, i) => <div key={i} className="h-2 rounded bg-zinc-100" />)}
          </div>
          <div className="mt-3 h-8 rounded-lg" style={{ background: accent }} />
        </div>
      </div>
    </div>
  );
}

function PreviewSplitMonitoring({ colors, screenName, domainHint, modules }: { colors: string[]; screenName: string; domainHint: AssetProfile["domainHint"]; modules: LayoutModule[] }) {
  const primary = colors[0] || "#111827";
  const accent = colors[1] || "#2563eb";
  const surface = pickSurfaceColor(colors, domainHint, isLightColor(colors[0] || "#111827"));
  const surfaceLight = isLightColor(surface);
  const tileCount = Math.max(4, Math.min(6, modules.length || 4));

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 select-none">
      <PreviewNav primary={primary} />
      <div className="flex min-h-72" style={{ background: surface }}>
        <div className="grid flex-1 grid-cols-2 gap-1.5 p-2">
          {[...Array(tileCount)].map((_, i) => (
            <div key={i} className="relative flex items-center justify-center rounded" style={{ background: surfaceLight ? "#d4d4d8" : "#27272a" }}>
              <span className="text-[10px] font-bold text-zinc-500">CAM {i + 1}</span>
              {i === 0 && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-500" />}
            </div>
          ))}
        </div>
        <div className="w-44 shrink-0 border-l border-zinc-200 p-3" style={{ background: surfaceLight ? "#ffffff" : "#18181b" }}>
          <h4 className={`mb-3 truncate text-sm font-black ${surfaceLight ? "text-zinc-800" : "text-white"}`}>{screenName}</h4>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="mb-2 flex items-center justify-between rounded-md bg-zinc-50 px-2 py-1.5">
              <span className="text-xs text-zinc-500">상태 {i + 1}</span>
              <span className="h-2 w-2 rounded-full" style={{ background: i === 0 ? "#22c55e" : accent }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 문서형(브로셔/제안서/보고서/포스터) 미리보기는 웹/앱 화면이 아니라 인쇄물 한 장이므로, 다른
// Preview*가 공유하는 PreviewNav(상단 웹 nav바)를 쓰지 않고 종이 한 장처럼 보이는 프레임을 쓴다.
function DocumentPageFrame({ surface, children }: { surface: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-center overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 p-5 select-none">
      <div className="aspect-[3/4] w-full max-w-[260px] overflow-hidden rounded-sm shadow-lg" style={{ background: surface }}>
        {children}
      </div>
    </div>
  );
}

// 표지 archetype의 3가지 후보(로고/타이포 중심형, 풀블리드 이미지형, 미니멀 텍스트형)를 한
// 컴포넌트로 묶었다 — 같은 표지 후보 풀 안에서 서로 시각적으로 뚜렷하게 구분돼야 하기 때문에
// variant마다 구도를 완전히 다르게 그린다.
function PreviewCoverVariant({
  colors,
  screenName,
  domainHint,
  variant,
}: {
  colors: string[];
  screenName: string;
  domainHint: AssetProfile["domainHint"];
  variant: "logotype" | "full-bleed" | "minimal-text";
}) {
  const primary = colors[0] || "#111827";
  const accent = colors[1] || "#2563eb";
  const surface = pickSurfaceColor(colors, domainHint, isLightColor(colors[0] || "#111827"));
  const surfaceLight = isLightColor(surface);
  const onSurface = surfaceLight ? "#18181b" : "#ffffff";
  const onSurfaceMuted = surfaceLight ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.65)";

  if (variant === "full-bleed") {
    return (
      <DocumentPageFrame surface={surface}>
        <div className="flex h-full flex-col gap-4 p-6">
          <div className="h-1.5 w-10 rounded-full" style={{ background: accent }} />
          <div className="flex-1 rounded-md" style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }} />
          <h4 className="truncate text-lg font-black leading-tight" style={{ color: onSurface }}>{screenName}</h4>
          <div className="h-1.5 w-16 rounded-full" style={{ background: onSurfaceMuted }} />
        </div>
      </DocumentPageFrame>
    );
  }

  if (variant === "minimal-text") {
    return (
      <DocumentPageFrame surface={surface}>
        <div className="flex h-full flex-col items-center justify-center gap-4 p-10 text-center">
          <div className="h-px w-10" style={{ background: onSurfaceMuted }} />
          <h4 className="text-lg font-black leading-tight" style={{ color: onSurface }}>{screenName}</h4>
          <p className="text-xs leading-5" style={{ color: onSurfaceMuted }}>여백을 살린 절제된 표지 카피</p>
          <div className="h-px w-10" style={{ background: onSurfaceMuted }} />
        </div>
      </DocumentPageFrame>
    );
  }

  return (
    <DocumentPageFrame surface={surface}>
      <div className="flex h-full flex-col p-6">
        <div className="grid h-10 w-24 place-items-center rounded-sm border" style={{ borderColor: onSurfaceMuted }}>
          <div className="h-2 w-14 rounded-full" style={{ background: accent }} />
        </div>
        <div className="flex-1" />
        <h4 className="truncate text-xl font-black leading-tight" style={{ color: onSurface }}>{screenName}</h4>
        <div className="mt-3 h-1.5 w-16 rounded-full" style={{ background: accent }} />
      </div>
    </DocumentPageFrame>
  );
}

function PreviewEditorialSpread({ colors, screenName, domainHint, dense = false }: { colors: string[]; screenName: string; domainHint: AssetProfile["domainHint"]; dense?: boolean }) {
  const primary = colors[0] || "#111827";
  const accent = colors[1] || "#2563eb";
  const surface = pickSurfaceColor(colors, domainHint, isLightColor(colors[0] || "#111827"));
  const surfaceLight = isLightColor(surface);
  const onSurface = surfaceLight ? "#18181b" : "#ffffff";
  const lineBg = surfaceLight ? "bg-zinc-200" : "bg-white/15";
  const tileBg = surfaceLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.06)";

  return (
    <DocumentPageFrame surface={surface}>
      <div className="grid h-full grid-rows-[auto_1fr] gap-4 p-6">
        <h4 className="truncate text-base font-black" style={{ color: onSurface }}>{screenName}</h4>
        {dense ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="grid gap-1.5 rounded-md p-2.5" style={{ background: tileBg }}>
                <div className="h-10 rounded" style={{ background: i % 2 === 0 ? accent : primary, opacity: 0.7 }} />
                <div className={`h-1.5 w-3/4 rounded ${lineBg}`} />
                <div className={`h-1.5 w-1/2 rounded ${lineBg}`} />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-md" style={{ background: `${accent}33` }} />
            <div className="grid content-start gap-2">
              {[80, 100, 90, 60].map((w, i) => (
                <div key={i} className={`h-1.5 rounded ${lineBg}`} style={{ width: `${w}%` }} />
              ))}
            </div>
          </div>
        )}
      </div>
    </DocumentPageFrame>
  );
}

function PreviewInfographicPage({ colors, screenName, domainHint }: { colors: string[]; screenName: string; domainHint: AssetProfile["domainHint"] }) {
  const accent = colors[1] || "#2563eb";
  const surface = pickSurfaceColor(colors, domainHint, isLightColor(colors[0] || "#111827"));
  const surfaceLight = isLightColor(surface);
  const onSurface = surfaceLight ? "#18181b" : "#ffffff";
  const lineColor = surfaceLight ? "#e4e4e7" : "rgba(255,255,255,0.15)";
  const tileBg = surfaceLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.06)";

  return (
    <DocumentPageFrame surface={surface}>
      <div className="grid h-full grid-rows-[auto_auto_1fr] gap-4 p-6">
        <h4 className="truncate text-base font-black" style={{ color: onSurface }}>{screenName}</h4>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="grid place-items-center gap-1.5 rounded-md p-2.5" style={{ background: tileBg }}>
              <div className="grid h-7 w-7 place-items-center rounded-full text-[10px] font-black text-white" style={{ background: accent }}>{i}</div>
              <div className="h-1.5 w-10 rounded" style={{ background: lineColor }} />
            </div>
          ))}
        </div>
        <div className="flex items-end gap-1.5 rounded-md p-3" style={{ background: tileBg }}>
          {[30, 55, 40, 70, 50].map((h, i) => (
            <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: i === 3 ? accent : lineColor }} />
          ))}
        </div>
      </div>
    </DocumentPageFrame>
  );
}

function PreviewProposalSection({ colors, screenName, domainHint }: { colors: string[]; screenName: string; domainHint: AssetProfile["domainHint"] }) {
  const accent = colors[1] || "#2563eb";
  const surface = pickSurfaceColor(colors, domainHint, isLightColor(colors[0] || "#111827"));
  const surfaceLight = isLightColor(surface);
  const onSurface = surfaceLight ? "#18181b" : "#ffffff";
  const lineBg = surfaceLight ? "bg-zinc-200" : "bg-white/15";
  const tileBg = surfaceLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.06)";

  return (
    <DocumentPageFrame surface={surface}>
      <div className="flex h-full flex-col gap-4 p-6">
        <div className="flex items-center gap-2.5">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-black text-white" style={{ background: accent }}>1</span>
          <h4 className="truncate text-sm font-black" style={{ color: onSurface }}>{screenName}</h4>
        </div>
        <div className="grid gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ background: accent }} />
              <div className={`h-2 w-full rounded ${lineBg}`} />
            </div>
          ))}
        </div>
        <div className="flex-1 rounded-md" style={{ background: tileBg }} />
      </div>
    </DocumentPageFrame>
  );
}

function PreviewReportPage({ colors, screenName, domainHint }: { colors: string[]; screenName: string; domainHint: AssetProfile["domainHint"] }) {
  const accent = colors[1] || "#2563eb";
  const surface = pickSurfaceColor(colors, domainHint, isLightColor(colors[0] || "#111827"));
  const surfaceLight = isLightColor(surface);
  const onSurface = surfaceLight ? "#18181b" : "#ffffff";
  const textMuted = surfaceLight ? "#71717a" : "rgba(255,255,255,0.6)";
  const lineBg = surfaceLight ? "bg-zinc-200" : "bg-white/15";
  const tileBg = surfaceLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.06)";
  const borderColor = surfaceLight ? "#e4e4e7" : "rgba(255,255,255,0.12)";

  return (
    <DocumentPageFrame surface={surface}>
      <div className="flex h-full flex-col gap-3 p-6">
        <div className="flex items-center justify-between border-b pb-2" style={{ borderColor }}>
          <h4 className="truncate text-sm font-black" style={{ color: onSurface }}>{screenName}</h4>
          <span className="text-[10px] font-bold" style={{ color: textMuted }}>p.01</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-md p-2" style={{ background: tileBg }}>
              <div className={`h-1.5 w-8 rounded ${lineBg}`} />
              <div className="mt-1.5 text-xs font-black" style={{ color: i === 1 ? accent : onSurface }}>{[284, "87%", 12][i - 1]}</div>
            </div>
          ))}
        </div>
        <div className="grid flex-1 content-start gap-1.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-2 border-b pb-1.5" style={{ borderColor: surfaceLight ? "#f4f4f5" : "rgba(255,255,255,0.08)" }}>
              <div className={`h-1.5 flex-1 rounded ${lineBg}`} />
              <div className={`h-1.5 w-8 rounded ${lineBg}`} />
            </div>
          ))}
        </div>
      </div>
    </DocumentPageFrame>
  );
}

function PreviewNumberedList({ colors, screenName, domainHint }: { colors: string[]; screenName: string; domainHint: AssetProfile["domainHint"] }) {
  const accent = colors[1] || "#2563eb";
  const surface = pickSurfaceColor(colors, domainHint, isLightColor(colors[0] || "#111827"));
  const surfaceLight = isLightColor(surface);
  const onSurface = surfaceLight ? "#18181b" : "#ffffff";
  const lineBg = surfaceLight ? "bg-zinc-200" : "bg-white/15";

  return (
    <DocumentPageFrame surface={surface}>
      <div className="grid h-full grid-rows-[auto_1fr] gap-4 p-6">
        <h4 className="truncate text-base font-black" style={{ color: onSurface }}>{screenName}</h4>
        <div className="grid content-start gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-black text-white" style={{ background: accent }}>{i}</span>
              <div className={`h-2 flex-1 rounded ${lineBg}`} />
            </div>
          ))}
        </div>
      </div>
    </DocumentPageFrame>
  );
}

function PreviewTimeline({ colors, screenName, domainHint }: { colors: string[]; screenName: string; domainHint: AssetProfile["domainHint"] }) {
  const accent = colors[1] || "#2563eb";
  const surface = pickSurfaceColor(colors, domainHint, isLightColor(colors[0] || "#111827"));
  const surfaceLight = isLightColor(surface);
  const onSurface = surfaceLight ? "#18181b" : "#ffffff";
  const lineColor = surfaceLight ? "#e4e4e7" : "rgba(255,255,255,0.15)";

  return (
    <DocumentPageFrame surface={surface}>
      <div className="flex h-full flex-col gap-6 p-6">
        <h4 className="truncate text-base font-black" style={{ color: onSurface }}>{screenName}</h4>
        <div className="relative mt-4">
          <div className="absolute left-0 right-0 top-[5px] h-px" style={{ background: lineColor }} />
          <div className="relative flex justify-between">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="grid justify-items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: i === 1 ? accent : lineColor }} />
                <div className="h-1.5 w-8 rounded" style={{ background: lineColor }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </DocumentPageFrame>
  );
}

function PreviewPageSpread({ colors, screenName, domainHint }: { colors: string[]; screenName: string; domainHint: AssetProfile["domainHint"] }) {
  const accent = colors[1] || "#2563eb";
  const surface = pickSurfaceColor(colors, domainHint, isLightColor(colors[0] || "#111827"));
  const surfaceLight = isLightColor(surface);
  const onSurface = surfaceLight ? "#18181b" : "#ffffff";
  const lineColor = surfaceLight ? "#e4e4e7" : "rgba(255,255,255,0.15)";

  return (
    <DocumentPageFrame surface={surface}>
      <div className="grid h-full grid-rows-[auto_1fr] gap-4 p-6">
        <h4 className="truncate text-base font-black" style={{ color: onSurface }}>{screenName}</h4>
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((col) => (
            <div key={col} className="grid content-start gap-1.5">
              {[100, 90, 95, 70, 85].map((w, i) => (
                <div key={i} className="h-1.5 rounded" style={{ width: `${w}%`, background: col === 1 && i === 0 ? accent : lineColor }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </DocumentPageFrame>
  );
}

function PreviewComparisonTable({ colors, screenName, domainHint }: { colors: string[]; screenName: string; domainHint: AssetProfile["domainHint"] }) {
  const accent = colors[1] || "#2563eb";
  const surface = pickSurfaceColor(colors, domainHint, isLightColor(colors[0] || "#111827"));
  const surfaceLight = isLightColor(surface);
  const onSurface = surfaceLight ? "#18181b" : "#ffffff";
  const lineColor = surfaceLight ? "#e4e4e7" : "rgba(255,255,255,0.15)";
  const tileBg = surfaceLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.06)";

  return (
    <DocumentPageFrame surface={surface}>
      <div className="grid h-full grid-rows-[auto_1fr] gap-4 p-6">
        <h4 className="truncate text-base font-black" style={{ color: onSurface }}>{screenName}</h4>
        <div className="grid content-start gap-1.5">
          <div className="grid grid-cols-3 gap-1.5">
            <div className="h-5 rounded" />
            <div className="h-5 rounded" style={{ background: tileBg }} />
            <div className="h-5 rounded" style={{ background: tileBg }} />
          </div>
          {[1, 2, 3].map((row) => (
            <div key={row} className="grid grid-cols-3 gap-1.5">
              <div className="h-5 rounded" style={{ background: lineColor }} />
              <div className="grid h-5 place-items-center rounded" style={{ background: row === 2 ? `${accent}33` : tileBg }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: row === 2 ? accent : lineColor }} />
              </div>
              <div className="grid h-5 place-items-center rounded" style={{ background: tileBg }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: lineColor }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </DocumentPageFrame>
  );
}

function PreviewVisionStatement({ colors, screenName, domainHint }: { colors: string[]; screenName: string; domainHint: AssetProfile["domainHint"] }) {
  const accent = colors[1] || "#2563eb";
  const surface = pickSurfaceColor(colors, domainHint, isLightColor(colors[0] || "#111827"));
  const surfaceLight = isLightColor(surface);
  const onSurface = surfaceLight ? "#18181b" : "#ffffff";
  const onSurfaceMuted = surfaceLight ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.65)";

  return (
    <DocumentPageFrame surface={surface}>
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <span className="text-3xl font-black" style={{ color: accent }}>&ldquo;</span>
        <h4 className="text-xl font-black leading-snug" style={{ color: onSurface }}>{screenName}</h4>
        <div className="h-1.5 w-12 rounded-full" style={{ background: accent }} />
        <p className="text-xs leading-5" style={{ color: onSurfaceMuted }}>핵심 메시지를 큰 타이포로 선언하는 결론 화면</p>
      </div>
    </DocumentPageFrame>
  );
}

// 내부 enum 이름을 화면에 그대로 노출하면 "generic-dashboard"가 실제 관제 대시보드처럼 보여 혼동을 준다.
const STRUCTURE_LABELS: Record<LayoutVariant["structure"], string> = {
  "command-center": "관제 센터형",
  "map-centric": "지도 중심형",
  "kpi-wall": "KPI 월형",
  "incident-focused": "장애 대응형",
  "split-monitoring": "분할 모니터링형",
  "generic-dashboard": "정보형 콘텐츠 레이아웃",
  "generic-list": "목록형 레이아웃",
  "generic-detail": "상세형 레이아웃",
  "cover-logotype": "로고/타이포 중심형",
  "cover-full-bleed": "풀블리드 이미지형",
  "cover-minimal-text": "미니멀 텍스트형",
  "numbered-list": "넘버드 리스트형",
  timeline: "타임라인형",
  "card-grid": "카드 그리드형",
  "split-content": "좌우 분할형",
  "editorial-grid": "에디토리얼 그리드형",
  "page-spread": "페이지 스프레드형",
  "infographic-page": "인포그래픽형",
  "comparison-table": "비교 테이블형",
  "vision-statement": "비전 선언형",
  "proposal-section": "제안서 섹션형",
  "report-page": "보고서 페이지형",
  "poster-layout": "포스터형",
};

function LayoutVariantPreview({ variant, colors, screenName, domainHint }: { variant: LayoutVariant; colors: string[]; screenName: string; domainHint: AssetProfile["domainHint"] }) {
  switch (variant.structure) {
    case "map-centric":
      return <PreviewMapCentric colors={colors} screenName={screenName} domainHint={domainHint} modules={variant.modules} />;
    case "command-center":
      return <PreviewCommandCenter colors={colors} screenName={screenName} domainHint={domainHint} modules={variant.modules} density={variant.density} />;
    case "kpi-wall":
      return <PreviewKpiWall colors={colors} screenName={screenName} domainHint={domainHint} modules={variant.modules} density={variant.density} />;
    case "incident-focused":
      return <PreviewIncidentFocused colors={colors} screenName={screenName} domainHint={domainHint} modules={variant.modules} />;
    case "split-monitoring":
      return <PreviewSplitMonitoring colors={colors} screenName={screenName} domainHint={domainHint} modules={variant.modules} />;
    case "generic-list":
      return <PreviewList colors={colors} screenName={screenName} domainHint={domainHint} />;
    case "generic-detail":
      return <PreviewDetail colors={colors} screenName={screenName} domainHint={domainHint} />;
    case "cover-logotype":
      return <PreviewCoverVariant colors={colors} screenName={screenName} domainHint={domainHint} variant="logotype" />;
    case "cover-full-bleed":
    case "poster-layout":
      return <PreviewCoverVariant colors={colors} screenName={screenName} domainHint={domainHint} variant="full-bleed" />;
    case "cover-minimal-text":
      return <PreviewCoverVariant colors={colors} screenName={screenName} domainHint={domainHint} variant="minimal-text" />;
    case "numbered-list":
      return <PreviewNumberedList colors={colors} screenName={screenName} domainHint={domainHint} />;
    case "timeline":
      return <PreviewTimeline colors={colors} screenName={screenName} domainHint={domainHint} />;
    case "card-grid":
    case "editorial-grid":
      return <PreviewEditorialSpread colors={colors} screenName={screenName} domainHint={domainHint} dense />;
    case "split-content":
      return <PreviewEditorialSpread colors={colors} screenName={screenName} domainHint={domainHint} />;
    case "page-spread":
      return <PreviewPageSpread colors={colors} screenName={screenName} domainHint={domainHint} />;
    case "infographic-page":
      return <PreviewInfographicPage colors={colors} screenName={screenName} domainHint={domainHint} />;
    case "comparison-table":
      return <PreviewComparisonTable colors={colors} screenName={screenName} domainHint={domainHint} />;
    case "vision-statement":
      return <PreviewVisionStatement colors={colors} screenName={screenName} domainHint={domainHint} />;
    case "proposal-section":
      return <PreviewProposalSection colors={colors} screenName={screenName} domainHint={domainHint} />;
    case "report-page":
      return <PreviewReportPage colors={colors} screenName={screenName} domainHint={domainHint} />;
    default:
      return <PreviewDashboard colors={colors} screenName={screenName} domainHint={domainHint} />;
  }
}

function LayoutVariantPicker({
  variants,
  selectedId,
  onSelect,
}: {
  variants: LayoutVariant[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
}) {
  if (variants.length <= 1) return null;
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {variants.map((variant) => (
        <button
          key={variant.id}
          type="button"
          onClick={() => onSelect(variant.id)}
          className={`rounded-lg border p-3 text-left transition-colors ${
            selectedId === variant.id ? "border-teal-400 bg-teal-50 ring-2 ring-teal-100" : "border-zinc-200 bg-zinc-50 hover:border-zinc-300"
          }`}
        >
          <p className="font-bold text-zinc-950">{variant.title}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">{STRUCTURE_LABELS[variant.structure]}</p>
          {variant.description && <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-600">{variant.description}</p>}
        </button>
      ))}
    </div>
  );
}

type ScreenTypeItem = { icon: string; name: string; count: number; desc: string };

function ImplementationSample({
  analysis,
  direction,
  mood,
  variant,
  screen,
}: {
  analysis: GeneratorAnalysis;
  direction: DesignDirection;
  mood: Mood;
  variant: LayoutVariant;
  screen: ScreenTypeItem;
}) {
  const colors = mood.colors.length ? mood.colors : analysis.palette.map((item) => item.hex);
  const layout = detectScreenLayout(screen.name, screen.desc);
  const projectTitle = analysis.projectIntent.title;
  const screenTypes = direction.ui?.screenTypes || [];

  const buildHtml = (): string => {
    const primary = colors[0] || "#111827";
    const accent = colors[1] || "#2563eb";
    const surface = pickSurfaceColor(colors, analysis.assetProfile.domainHint, isLightColor(colors[0] || "#111827"));
    const surfaceLight = isLightColor(surface);
    const onSurface = surfaceLight ? "#18181b" : "#ffffff";
    const textMuted = surfaceLight ? "#71717a" : "rgba(255,255,255,0.6)";
    const cardBg = surfaceLight ? "#ffffff" : "rgba(255,255,255,0.1)";
    const cardLine = surfaceLight ? "#f4f4f5" : "rgba(255,255,255,0.08)";
    const onPrimary = isLightColor(primary) ? "#18181b" : "#ffffff";
    const onPrimaryMuted = isLightColor(primary) ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.7)";
    const isMobile = analysis.assetProfile.domainHint === "mobile-app";
    const isDocument = analysis.assetProfile.domainHint === "document";

    let html: string;

    if (isDocument) {
      // 문서형은 entry-layout/모바일 분류보다 항상 먼저 처리한다 — 화면명이 "약관"/"가입" 같은
      // 진입형 키워드와 우연히 겹쳐도 화면 미리보기와 동일한 에디토리얼 페이지로 내려받혀야 한다.
      const onSurfaceMuted = surfaceLight ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.65)";
      const lineBg = surfaceLight ? "#e4e4e7" : "rgba(255,255,255,0.15)";
      const tileBg = surfaceLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.06)";

      const coverLogotypeBody = `<div style="display:flex;flex-direction:column;height:100%;padding:36px;">
  <div style="width:96px;height:40px;border:1px solid ${onSurfaceMuted};border-radius:4px;display:flex;align-items:center;justify-content:center;">
    <div style="width:56px;height:8px;border-radius:999px;background:${accent};"></div>
  </div>
  <div style="flex:1;"></div>
  <h1 style="font-size:26px;font-weight:900;color:${onSurface};">${escapeHtml(screen.name)}</h1>
  <div style="width:64px;height:6px;border-radius:999px;background:${accent};margin-top:12px;"></div>
</div>`;

      const coverFullBleedBody = `<div style="display:flex;flex-direction:column;height:100%;gap:20px;padding:36px;">
  <div style="width:48px;height:6px;border-radius:999px;background:${accent};"></div>
  <div style="flex:1;border-radius:10px;background:linear-gradient(135deg, ${primary}, ${accent});"></div>
  <h1 style="font-size:26px;font-weight:900;color:${onSurface};">${escapeHtml(screen.name)}</h1>
  <div style="width:64px;height:5px;border-radius:999px;background:${onSurfaceMuted};"></div>
</div>`;

      const coverMinimalTextBody = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:16px;padding:48px;text-align:center;">
  <div style="width:40px;height:1px;background:${onSurfaceMuted};"></div>
  <h1 style="font-size:22px;font-weight:900;color:${onSurface};">${escapeHtml(screen.name)}</h1>
  <p style="font-size:12px;line-height:1.6;color:${onSurfaceMuted};">여백을 살린 절제된 표지 카피</p>
  <div style="width:40px;height:1px;background:${onSurfaceMuted};"></div>
</div>`;

      const numberedListBody = `<div style="display:flex;flex-direction:column;height:100%;gap:24px;padding:36px;">
  <h2 style="font-size:20px;font-weight:900;color:${onSurface};">${escapeHtml(screen.name)}</h2>
  <div style="display:flex;flex-direction:column;gap:14px;">
    ${[1, 2, 3, 4].map((i) => `<div style="display:flex;align-items:center;gap:12px;"><span style="width:24px;height:24px;border-radius:999px;background:${accent};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:11px;flex-shrink:0;">${i}</span><div style="height:8px;flex:1;border-radius:4px;background:${lineBg};"></div></div>`).join("")}
  </div>
</div>`;

      const timelineBody = `<div style="display:flex;flex-direction:column;height:100%;gap:24px;padding:36px;">
  <h2 style="font-size:20px;font-weight:900;color:${onSurface};">${escapeHtml(screen.name)}</h2>
  <div style="position:relative;margin-top:16px;">
    <div style="position:absolute;left:0;right:0;top:5px;height:1px;background:${lineBg};"></div>
    <div style="position:relative;display:flex;justify-content:space-between;">
      ${[1, 2, 3, 4].map((i) => `<div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><span style="width:10px;height:10px;border-radius:999px;background:${i === 1 ? accent : lineBg};"></span><div style="height:6px;width:32px;border-radius:4px;background:${lineBg};"></div></div>`).join("")}
    </div>
  </div>
</div>`;

      const visionStatementBody = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:16px;padding:48px;text-align:center;">
  <span style="font-size:32px;font-weight:900;color:${accent};">&ldquo;</span>
  <h2 style="font-size:22px;font-weight:900;color:${onSurface};line-height:1.3;">${escapeHtml(screen.name)}</h2>
  <div style="width:48px;height:6px;border-radius:999px;background:${accent};"></div>
  <p style="font-size:12px;line-height:1.6;color:${onSurfaceMuted};">핵심 메시지를 큰 타이포로 선언하는 결론 화면</p>
</div>`;

      const spreadBody = `<div style="display:grid;grid-template-rows:auto 1fr;gap:24px;height:100%;padding:36px;">
  <h2 style="font-size:20px;font-weight:900;color:${onSurface};">${escapeHtml(screen.name)}</h2>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
    <div style="border-radius:10px;background:${accent}33;"></div>
    <div style="display:grid;gap:10px;align-content:start;">
      ${[90, 100, 95, 70].map((w) => `<div style="height:8px;border-radius:4px;background:${lineBg};width:${w}%;"></div>`).join("")}
    </div>
  </div>
</div>`;

      const gridBody = `<div style="display:grid;grid-template-rows:auto 1fr;gap:24px;height:100%;padding:36px;">
  <h2 style="font-size:20px;font-weight:900;color:${onSurface};">${escapeHtml(screen.name)}</h2>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
    ${[1, 2, 3, 4].map((i) => `<div style="display:grid;gap:8px;border-radius:10px;padding:14px;background:${tileBg};"><div style="height:48px;border-radius:6px;background:${i % 2 === 0 ? accent : primary};opacity:0.7;"></div><div style="height:8px;width:75%;border-radius:4px;background:${lineBg};"></div><div style="height:8px;width:50%;border-radius:4px;background:${lineBg};"></div></div>`).join("")}
  </div>
</div>`;

      const infographicBody = `<div style="display:grid;grid-template-rows:auto auto 1fr;gap:24px;height:100%;padding:36px;">
  <h2 style="font-size:20px;font-weight:900;color:${onSurface};">${escapeHtml(screen.name)}</h2>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;">
    ${[1, 2, 3].map((i) => `<div style="display:grid;justify-items:center;gap:8px;border-radius:10px;padding:14px;background:${tileBg};"><div style="width:34px;height:34px;border-radius:999px;background:${accent};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:13px;">${i}</div><div style="height:8px;width:60%;border-radius:4px;background:${lineBg};"></div></div>`).join("")}
  </div>
  <div style="display:flex;align-items:flex-end;gap:8px;border-radius:10px;padding:16px;background:${tileBg};">
    ${[30, 55, 40, 70, 50].map((h, i) => `<div style="flex:1;border-radius:4px 4px 0 0;height:${h}%;background:${i === 3 ? accent : lineBg};"></div>`).join("")}
  </div>
</div>`;

      const pageSpreadBody = `<div style="display:grid;grid-template-rows:auto 1fr;gap:24px;height:100%;padding:36px;">
  <h2 style="font-size:20px;font-weight:900;color:${onSurface};">${escapeHtml(screen.name)}</h2>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;">
    ${[0, 1, 2]
      .map(
        (col) =>
          `<div style="display:flex;flex-direction:column;gap:6px;">${[100, 90, 95, 70, 85]
            .map((w, i) => `<div style="height:6px;border-radius:4px;width:${w}%;background:${col === 1 && i === 0 ? accent : lineBg};"></div>`)
            .join("")}</div>`,
      )
      .join("")}
  </div>
</div>`;

      const comparisonTableBody = `<div style="display:grid;grid-template-rows:auto 1fr;gap:24px;height:100%;padding:36px;">
  <h2 style="font-size:20px;font-weight:900;color:${onSurface};">${escapeHtml(screen.name)}</h2>
  <div style="display:flex;flex-direction:column;gap:6px;">
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">
      <div style="height:20px;border-radius:4px;"></div>
      <div style="height:20px;border-radius:4px;background:${tileBg};"></div>
      <div style="height:20px;border-radius:4px;background:${tileBg};"></div>
    </div>
    ${[1, 2, 3]
      .map(
        (row) =>
          `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;"><div style="height:20px;border-radius:4px;background:${lineBg};"></div><div style="height:20px;border-radius:4px;background:${row === 2 ? `${accent}33` : tileBg};display:flex;align-items:center;justify-content:center;"><span style="width:6px;height:6px;border-radius:999px;background:${row === 2 ? accent : lineBg};"></span></div><div style="height:20px;border-radius:4px;background:${tileBg};display:flex;align-items:center;justify-content:center;"><span style="width:6px;height:6px;border-radius:999px;background:${lineBg};"></span></div></div>`,
      )
      .join("")}
  </div>
</div>`;

      const proposalBody = `<div style="display:grid;grid-template-rows:auto auto 1fr;gap:20px;height:100%;padding:36px;">
  <div style="display:flex;align-items:center;gap:14px;">
    <span style="width:32px;height:32px;border-radius:999px;background:${accent};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:13px;">1</span>
    <h2 style="font-size:18px;font-weight:900;color:${onSurface};">${escapeHtml(screen.name)}</h2>
  </div>
  <div style="display:grid;gap:10px;">
    ${[1, 2, 3].map(() => `<div style="display:flex;gap:10px;align-items:flex-start;"><span style="margin-top:7px;width:5px;height:5px;border-radius:999px;background:${accent};flex-shrink:0;"></span><div style="height:9px;flex:1;border-radius:4px;background:${lineBg};"></div></div>`).join("")}
  </div>
  <div style="border-radius:10px;background:${tileBg};"></div>
</div>`;

      const reportBody = `<div style="display:grid;grid-template-rows:auto auto 1fr;gap:18px;height:100%;padding:36px;">
  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid ${lineBg};padding-bottom:10px;">
    <h2 style="font-size:18px;font-weight:900;color:${onSurface};">${escapeHtml(screen.name)}</h2>
    <span style="font-size:11px;font-weight:700;color:${textMuted};">p.01</span>
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
    ${[["284", false], ["87%", true], ["12", false]].map(([v, isAccent]) => `<div style="border-radius:8px;padding:12px;background:${tileBg};"><div style="height:7px;width:40%;border-radius:4px;background:${lineBg};margin-bottom:8px;"></div><div style="font-size:18px;font-weight:900;color:${isAccent ? accent : onSurface};">${v}</div></div>`).join("")}
  </div>
  <div style="display:grid;gap:10px;align-content:start;">
    ${[1, 2, 3, 4].map(() => `<div style="display:flex;gap:10px;align-items:center;border-bottom:1px solid ${surfaceLight ? "#f4f4f5" : "rgba(255,255,255,0.08)"};padding-bottom:8px;"><div style="height:8px;flex:1;border-radius:4px;background:${lineBg};"></div><div style="height:8px;width:40px;border-radius:4px;background:${lineBg};"></div></div>`).join("")}
  </div>
</div>`;

      // 화면 미리보기(LayoutVariantPreview)와 동일하게 다운로드 HTML도 15종 구조마다 전용
      // 바디를 쓴다 — card-grid/editorial-grid, split-content는 화면 쪽 컴포넌트 재사용과 같은
      // 이유로 같은 바디를 공유한다(같은 Deliverable 후보 풀 안에서 겹치지 않으면 문제 없음).
      const bodyByDocumentStructure: Partial<Record<LayoutVariant["structure"], string>> = {
        "cover-logotype": coverLogotypeBody,
        "cover-full-bleed": coverFullBleedBody,
        "cover-minimal-text": coverMinimalTextBody,
        "poster-layout": coverFullBleedBody,
        "numbered-list": numberedListBody,
        timeline: timelineBody,
        "card-grid": gridBody,
        "split-content": spreadBody,
        "editorial-grid": gridBody,
        "page-spread": pageSpreadBody,
        "infographic-page": infographicBody,
        "comparison-table": comparisonTableBody,
        "vision-statement": visionStatementBody,
        "proposal-section": proposalBody,
        "report-page": reportBody,
      };
      const pageBody = bodyByDocumentStructure[variant.structure] || spreadBody;

      html = `<!DOCTYPE html>\n<html lang="ko">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${escapeHtml(projectTitle)} — ${escapeHtml(screen.name)}</title>\n  <style>* { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; } body { background: #e4e4e7; display: flex; justify-content: center; padding: 48px 16px; }</style>\n</head>\n<body>\n<div style="width:100%;max-width:560px;aspect-ratio:3/4;border-radius:4px;box-shadow:0 24px 60px rgba(0,0,0,0.25);overflow:hidden;background:${surface};">${pageBody}</div>\n</body>\n</html>`;
    } else if (ENTRY_LAYOUTS.includes(layout)) {
      const fragment = buildEntryScreenFragment({ layout, screen, primary, accent, cardBg, cardLine, onSurface, textMuted });

      html = isMobile
        ? `<!DOCTYPE html>\n<html lang="ko">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${escapeHtml(projectTitle)} — ${escapeHtml(screen.name)}</title>\n  <style>* { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; } body { background: #18181b; display: flex; justify-content: center; padding: 32px 0; }</style>\n</head>\n<body>\n<div style="width:375px;border-radius:36px;overflow:hidden;background:${surface};box-shadow:0 20px 60px rgba(0,0,0,0.35);">\n  <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 20px 4px;font-size:12px;font-weight:700;color:${onSurface};">\n    <span>9:41</span><span>●●●</span>\n  </div>\n  <div style="min-height:600px;padding:24px 20px;display:flex;flex-direction:column;justify-content:center;">\n    ${fragment}\n  </div>\n</div>\n</body>\n</html>`
        : `<!DOCTYPE html>\n<html lang="ko">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${escapeHtml(projectTitle)} — ${escapeHtml(screen.name)}</title>\n  <style>* { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; } body { background: ${surface}; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 40px; }</style>\n</head>\n<body>\n<div style="width:100%;max-width:400px;">${fragment}</div>\n</body>\n</html>`;
    } else if (isMobile) {
      const onPrimaryLocal = onPrimary;
      const onAccent = isLightColor(accent) ? "#18181b" : "#ffffff";
      const screenDesc = escapeHtml(screen.desc || "화면 설명이 등록되지 않았습니다.");
      // 모바일은 모바일 전용 프레임(상태바/탭바)이 핵심이라 5개 구조별 모바일 템플릿을 따로 만들지
      // 않고, 구조를 가장 가까운 기존 3종(대시보드형/목록형/상세형) 중 하나로 매핑한다.
      const mobileVariantKind = variant.structure === "generic-list" ? "list" : variant.structure === "generic-detail" ? "detail" : "dashboard";

      const mobileBodyHtml =
        mobileVariantKind === "dashboard"
          ? `<div style="border-radius:18px;padding:18px;background:${primary};color:${onPrimaryLocal};margin-bottom:12px;">
  <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;opacity:0.75;">${escapeHtml(screen.name)}</div>
  <div style="font-size:28px;font-weight:900;margin-top:8px;">1,284</div>
  <div style="font-size:12px;margin-top:6px;opacity:0.85;">전월 대비 +12%</div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
  <div style="border-radius:14px;padding:14px;background:${cardBg};">
    <div style="font-size:11px;font-weight:700;color:${textMuted};">활성</div>
    <div style="font-size:18px;font-weight:900;color:${onSurface};margin-top:6px;">342</div>
  </div>
  <div style="border-radius:14px;padding:14px;background:${accent};color:#fff;">
    <div style="font-size:11px;font-weight:700;opacity:0.85;">달성률</div>
    <div style="font-size:18px;font-weight:900;margin-top:6px;">87%</div>
  </div>
</div>
<div style="border-radius:14px;padding:14px;background:${cardBg};">
  <div style="font-size:11px;font-weight:700;color:${textMuted};margin-bottom:10px;">최근 활동</div>
  ${[1, 2, 3]
    .map(
      (i) =>
        `<div style="display:flex;justify-content:space-between;padding:8px 0;border-top:${i === 1 ? "none" : `1px solid ${cardLine}`};font-size:12.5px;"><span style="color:${onSurface};">항목 ${i}</span><span style="color:${textMuted};">2026-06-${String(i + 12).padStart(2, "0")}</span></div>`,
    )
    .join("")}
</div>`
          : mobileVariantKind === "list"
          ? `<div style="display:flex;gap:8px;margin-bottom:12px;">
  <div style="flex:1;border-radius:10px;padding:9px 12px;background:${cardBg};font-size:12.5px;color:${textMuted};">검색</div>
  <div style="border-radius:10px;padding:9px 16px;background:${accent};color:#fff;font-size:12.5px;font-weight:700;">+ 추가</div>
</div>
<div style="display:grid;gap:8px;">
  ${[...Array(4)]
    .map(
      (_, i) =>
        `<div style="display:flex;align-items:center;gap:12px;border-radius:12px;padding:10px;background:${cardBg};"><div style="width:40px;height:40px;border-radius:8px;flex-shrink:0;background:${i === 0 ? accent : "#e4e4e7"};"></div><div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:700;color:${onSurface};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(screen.name)} ${i + 1}</div><div style="font-size:11.5px;color:${textMuted};margin-top:2px;">2026-06-${String(i + 10).padStart(2, "0")}</div></div><span style="font-size:10.5px;font-weight:700;color:${accent};background:${accent}22;padding:3px 8px;border-radius:999px;flex-shrink:0;">Active</span></div>`,
    )
    .join("")}
</div>`
          : `<div style="font-size:12px;font-weight:600;color:${textMuted};margin-bottom:10px;">‹ 목록</div>
<div style="border-radius:16px;height:140px;background:${accent};margin-bottom:14px;"></div>
<h3 style="font-size:16px;font-weight:900;color:${onSurface};margin-bottom:6px;">${escapeHtml(screen.name)}</h3>
<p style="font-size:12.5px;line-height:1.6;color:${textMuted};margin-bottom:14px;">${screenDesc}</p>
<div style="border-radius:14px;padding:4px 14px;background:${cardBg};margin-bottom:14px;">
  ${[["상태", "Active"], ["등록일", "2026-06-19"]]
    .map(
      ([l, v], i) =>
        `<div style="display:flex;justify-content:space-between;padding:10px 0;border-top:${i === 0 ? "none" : `1px solid ${cardLine}`};font-size:12.5px;"><span style="color:${textMuted};font-weight:600;">${l}</span><span style="color:${onSurface};">${v}</span></div>`,
    )
    .join("")}
</div>
<div style="height:46px;border-radius:12px;background:${accent};color:${onAccent};display:flex;align-items:center;justify-content:center;font-size:13.5px;font-weight:700;margin-bottom:8px;">저장</div>
<div style="height:46px;border-radius:12px;background:${cardBg};color:${onSurface};display:flex;align-items:center;justify-content:center;font-size:13.5px;font-weight:700;">취소</div>`;

      const mobileHeaderHtml =
        mobileVariantKind === "list"
          ? `<h2 style="font-size:15px;font-weight:900;color:${onSurface};margin-bottom:14px;">${escapeHtml(screen.name)}</h2>`
          : "";

      html = `<!DOCTYPE html>\n<html lang="ko">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${escapeHtml(projectTitle)} — ${escapeHtml(screen.name)}</title>\n  <style>* { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; } body { background: #18181b; display: flex; justify-content: center; padding: 32px 0; }</style>\n</head>\n<body>\n<div style="width:375px;border-radius:36px;overflow:hidden;background:${surface};box-shadow:0 20px 60px rgba(0,0,0,0.35);">\n  <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 20px 4px;font-size:12px;font-weight:700;color:${onSurface};">\n    <span>9:41</span><span>●●●</span>\n  </div>\n  <div style="min-height:600px;padding:16px;">\n    ${mobileHeaderHtml}${mobileBodyHtml}\n  </div>\n  <div style="display:flex;justify-content:space-around;padding:14px 0;border-top:1px solid rgba(255,255,255,0.08);">\n    ${[...Array(4)]
        .map(
          (_, i) =>
            `<div style="width:20px;height:20px;border-radius:6px;background:${i === 0 ? accent : surfaceLight ? "#a1a1aa" : "#71717a"};opacity:${i === 0 ? 1 : 0.5};"></div>`,
        )
        .join("")}\n  </div>\n</div>\n</body>\n</html>`;
    } else {
      const navHtml = `<nav style="background:${primary};padding:12px 24px;display:flex;align-items:center;justify-content:space-between;">
  <span style="font-weight:900;font-size:16px;color:${onPrimary}">${escapeHtml(projectTitle)}</span>
  <div style="display:flex;gap:20px;">${screenTypes.slice(0, 4).map((s) => `<a href="#" style="color:${onPrimaryMuted};text-decoration:none;font-size:13px;">${escapeHtml(s.name)}</a>`).join("")}</div>
</nav>`;

      const sidebarHtml = `<aside style="width:200px;background:${isLightColor(surface) ? "#f4f4f5" : "#18181b"};border-right:1px solid #e4e4e7;padding:16px;min-height:calc(100vh - 48px);">
  ${screenTypes.slice(0, 6).map((s) => { const active = s.name === screen.name; return `<div style="padding:8px 12px;border-radius:6px;margin-bottom:4px;background:${active ? accent : "transparent"};color:${active ? "#fff" : "#71717a"};font-weight:${active ? 700 : 400};font-size:13px;">${escapeHtml(s.icon || "·")} ${escapeHtml(s.name)}</div>`; }).join("")}
</aside>`;

      const dashboardContent = `<main style="flex:1;padding:24px;"><h2 style="font-size:20px;font-weight:900;color:#09090b;margin-bottom:20px;">${escapeHtml(screen.name)}</h2><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px;">${[["총 항목", "1,284"], ["활성", "342"], ["달성률", "87%"]].map(([l, v]) => `<div style="background:#fff;border:1px solid #e4e4e7;border-radius:10px;padding:16px;"><div style="font-size:12px;color:#71717a;font-weight:600;text-transform:uppercase;">${l}</div><div style="font-size:28px;font-weight:900;color:${accent};margin-top:8px;">${v}</div></div>`).join("")}</div><div style="background:#fff;border:1px solid #e4e4e7;border-radius:10px;overflow:hidden;"><table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#f4f4f5;">${["이름", "상태", "날짜", "작업"].map((h) => `<th style="text-align:left;padding:10px 16px;font-size:12px;font-weight:700;color:#71717a;">${h}</th>`).join("")}</tr></thead><tbody>${[...Array(5)].map((_, i) => `<tr style="border-top:1px solid #f4f4f5;"><td style="padding:10px 16px;font-size:13px;">항목 ${i + 1}</td><td style="padding:10px 16px;"><span style="background:${accent}22;color:${accent};padding:2px 10px;border-radius:999px;font-size:11px;font-weight:700;">Active</span></td><td style="padding:10px 16px;font-size:13px;">2026-06-${String(i + 14).padStart(2, "0")}</td><td style="padding:10px 16px;"><button style="padding:6px 12px;background:#fff;border:1px solid #e4e4e7;border-radius:6px;font-size:12px;">보기</button></td></tr>`).join("")}</tbody></table></div></main>`;

      const listContent = `<main style="padding:24px;"><div style="display:flex;justify-content:space-between;margin-bottom:20px;"><div style="display:flex;gap:8px;"><input placeholder="검색..." style="padding:8px 12px;border:1px solid #e4e4e7;border-radius:8px;font-size:13px;"/><button style="padding:8px 20px;background:${accent};color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;">검색</button></div><button style="padding:8px 20px;background:${accent};color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;">+ 추가</button></div><div style="background:#fff;border:1px solid #e4e4e7;border-radius:10px;overflow:hidden;"><table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#f4f4f5;">${["#", "이름", "카테고리", "상태", "날짜"].map((h) => `<th style="text-align:left;padding:10px 16px;font-size:12px;font-weight:700;color:#71717a;">${h}</th>`).join("")}</tr></thead><tbody>${[...Array(8)].map((_, i) => `<tr style="border-top:1px solid #f4f4f5;"><td style="padding:10px 16px;">${i + 1}</td><td style="padding:10px 16px;">레코드 ${i + 1}</td><td style="padding:10px 16px;">카테고리 ${(i % 3) + 1}</td><td style="padding:10px 16px;"><span style="background:${accent}22;color:${accent};padding:2px 10px;border-radius:999px;font-size:11px;font-weight:700;">Active</span></td><td style="padding:10px 16px;">2026-06-${String(i + 10).padStart(2, "0")}</td></tr>`).join("")}</tbody></table></div></main>`;

      const detailContent = `<main style="padding:24px;"><div style="display:flex;gap:8px;align-items:center;margin-bottom:16px;font-size:13px;color:#71717a;"><span>목록</span><span>›</span><span style="color:${accent};font-weight:700;">${escapeHtml(screen.name)}</span></div><div style="display:grid;grid-template-columns:1.4fr 0.6fr;gap:16px;"><div style="background:#fff;border:1px solid #e4e4e7;border-radius:10px;padding:20px;"><h3 style="font-size:16px;font-weight:900;color:#09090b;margin-bottom:16px;">${escapeHtml(screen.name)} 상세</h3>${[["이름", "샘플 항목"], ["카테고리", "카테고리 A"], ["상태", "Active"], ["생성일", "2026-06-19"], ["설명", escapeHtml(screen.desc || "상세 내용")]].map(([l, v]) => `<div style="display:grid;grid-template-columns:120px 1fr;gap:8px;padding:10px 0;border-top:1px solid #f4f4f5;"><span style="font-size:12px;color:#71717a;font-weight:600;">${l}</span><span style="font-size:13px;color:#18181b;">${v}</span></div>`).join("")}</div><div style="display:grid;gap:12px;align-content:start;"><div style="background:#fff;border:1px solid #e4e4e7;border-radius:10px;padding:16px;"><div style="font-size:12px;font-weight:700;color:#71717a;margin-bottom:8px;">상태</div><span style="background:${accent}22;color:${accent};padding:4px 12px;border-radius:999px;font-size:12px;font-weight:700;">Active</span></div><button style="width:100%;padding:10px;background:${accent};color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;">저장</button><button style="width:100%;padding:10px;background:#fff;border:1px solid #e4e4e7;border-radius:8px;font-weight:700;cursor:pointer;">취소</button></div></div></main>`;

      const mapCentricContent = `<main style="flex:1;display:flex;"><div style="flex:1;background:#e4e4e7;position:relative;min-height:480px;"><div style="position:absolute;left:16px;top:16px;background:rgba(255,255,255,0.9);padding:6px 12px;border-radius:6px;font-size:12px;font-weight:700;">${escapeHtml(variant.modules.find((m) => m.weight === "primary")?.label || "지도 캔버스")}</div></div><div style="width:260px;border-left:1px solid #e4e4e7;background:#fff;padding:16px;">${variant.modules.filter((m) => m.weight !== "primary").map((m) => `<div style="margin-bottom:12px;border:1px solid #e4e4e7;border-radius:10px;padding:12px;"><div style="font-size:12px;font-weight:700;color:#71717a;margin-bottom:8px;">${escapeHtml(m.label)}</div>${[1, 2, 3].map(() => `<div style="height:8px;border-radius:4px;background:#e4e4e7;margin-bottom:6px;"></div>`).join("")}</div>`).join("") || "<p style=\"font-size:12px;color:#a1a1aa;\">필터/목록 패널</p>"}</div></main>`;

      const commandCenterContent = `<main style="flex:1;padding:20px;"><h2 style="font-size:18px;font-weight:900;color:#09090b;margin-bottom:16px;">${escapeHtml(screen.name)}</h2><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:12px;">${[1, 2, 3].map((i) => `<div style="background:#fff;border:1px solid #e4e4e7;border-radius:10px;padding:14px;"><div style="font-size:11px;color:#71717a;">지표 ${i}</div><div style="font-size:22px;font-weight:900;color:${accent};margin-top:6px;">${[284, 92, "87%"][i - 1]}</div></div>`).join("")}</div><div style="display:grid;grid-template-columns:1.4fr 0.6fr;gap:12px;"><div style="background:#1f2937;border-radius:10px;min-height:220px;"></div><div style="background:#fff;border:1px solid #e4e4e7;border-radius:10px;padding:14px;"><div style="font-size:12px;font-weight:700;color:#71717a;margin-bottom:8px;">알림 피드</div>${[1, 2, 3].map((i) => `<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;"><span style="width:8px;height:8px;border-radius:50%;background:${i === 1 ? "#ef4444" : accent};"></span><div style="flex:1;height:8px;border-radius:4px;background:#f4f4f5;"></div></div>`).join("")}</div></div></main>`;

      const kpiWallContent = `<main style="flex:1;padding:24px;"><h2 style="font-size:18px;font-weight:900;color:#09090b;margin-bottom:20px;">${escapeHtml(screen.name)}</h2><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;">${(variant.modules.length ? variant.modules : [{ label: "지표 1" }, { label: "지표 2" }, { label: "지표 3" }, { label: "지표 4" }]).slice(0, 4).map((m, i) => `<div style="background:#fff;border:1px solid #e4e4e7;border-radius:14px;padding:24px;text-align:center;"><div style="font-size:12px;font-weight:700;color:#71717a;">${escapeHtml(m.label)}</div><div style="font-size:32px;font-weight:900;color:${i % 2 === 0 ? accent : "#18181b"};margin-top:10px;">${[284, 92, 1284, 12][i % 4]}</div></div>`).join("")}</div></main>`;

      const incidentFocusedContent = `<main style="flex:1;padding:20px;display:grid;grid-template-columns:0.55fr 0.45fr;gap:16px;"><div style="background:#fff;border:1px solid #e4e4e7;border-radius:10px;padding:16px;"><h3 style="font-size:15px;font-weight:900;margin-bottom:10px;">${escapeHtml(screen.name)}</h3>${[1, 2, 3, 4, 5].map((i) => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-top:${i === 1 ? "none" : "1px solid #f4f4f5"};"><span style="width:10px;height:10px;border-radius:50%;background:${i === 1 ? "#ef4444" : i === 2 ? "#f59e0b" : accent};"></span><div style="flex:1;height:8px;border-radius:4px;background:#f4f4f5;"></div></div>`).join("")}</div><div style="background:#fff;border:1px solid #e4e4e7;border-radius:10px;padding:16px;"><div style="font-size:12px;font-weight:700;color:#71717a;">상세/대응</div><div style="height:80px;border-radius:8px;background:${accent}33;margin-top:10px;"></div><button style="margin-top:12px;width:100%;padding:10px;background:${accent};color:#fff;border:none;border-radius:8px;font-weight:700;">대응 처리</button></div></main>`;

      const splitMonitoringContent = `<main style="flex:1;display:flex;"><div style="flex:1;display:grid;grid-template-columns:repeat(2,1fr);gap:6px;padding:8px;">${[1, 2, 3, 4].map((i) => `<div style="background:#27272a;border-radius:6px;min-height:120px;display:flex;align-items:center;justify-content:center;color:#a1a1aa;font-size:11px;">CAM ${i}</div>`).join("")}</div><div style="width:200px;border-left:1px solid #e4e4e7;background:#fff;padding:16px;">${[1, 2, 3].map((i) => `<div style="display:flex;justify-content:space-between;align-items:center;background:#f4f4f5;border-radius:8px;padding:8px 10px;margin-bottom:8px;"><span style="font-size:12px;color:#71717a;">상태 ${i}</span><span style="width:8px;height:8px;border-radius:50%;background:${i === 1 ? "#22c55e" : accent};"></span></div>`).join("")}</div></main>`;

      const contentByStructure: Partial<Record<LayoutVariant["structure"], string>> = {
        "generic-dashboard": dashboardContent,
        "generic-list": listContent,
        "generic-detail": detailContent,
        "map-centric": mapCentricContent,
        "command-center": commandCenterContent,
        "kpi-wall": kpiWallContent,
        "incident-focused": incidentFocusedContent,
        "split-monitoring": splitMonitoringContent,
      };

      const mainContent = contentByStructure[variant.structure] || dashboardContent;
      const contentHtml = `<div style="display:flex;"><div>${sidebarHtml}</div>${mainContent}</div>`;

      html = `<!DOCTYPE html>\n<html lang="ko">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${escapeHtml(projectTitle)} — ${escapeHtml(screen.name)}</title>\n  <style>* { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; } body { background: ${surface}; }</style>\n</head>\n<body>\n${navHtml}\n${contentHtml}\n</body>\n</html>`;
    }

    return html;
  };

  // 매번 파일을 내려받아 직접 열어야 하는 게 번거롭다는 피드백 → 기본 동작은 새 탭에서 바로
  // 렌더링하고, 파일이 실제로 필요한 경우만 별도 다운로드 버튼을 쓰도록 분리했다. blob URL은
  // 그걸 만든 이 탭(메인 앱)이 살아있는 동안 계속 메모리에 남는다 — 새로 연 미리보기 탭을 닫아도
  // 자동으로 해제되지 않으므로, 새 탭이 로드되면(또는 로드 이벤트에 접근 못 하는 경우를 대비해
  // 최대 60초 후) 명시적으로 revoke한다.
  const handleOpenPreview = () => {
    const blob = new Blob([buildHtml()], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const popup = window.open(url, "_blank");
    let revoked = false;
    const revoke = () => {
      if (revoked) return;
      revoked = true;
      URL.revokeObjectURL(url);
    };
    try {
      popup?.addEventListener("load", revoke, { once: true });
    } catch {
      // 팝업 차단 등으로 접근이 막히면 아래 타임아웃 fallback에 맡긴다.
    }
    window.setTimeout(revoke, 60_000);
  };

  const handleDownload = () => {
    const blob = new Blob([buildHtml()], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectTitle}-${screen.name}.html`.replace(/\s+/g, "-");
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <WorkCard className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <SectionTitle label="Screen Preview" meta={`${screen.name} · ${mood.title}`} />
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleOpenPreview}
            className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 hover:border-teal-300 hover:text-teal-800"
          >
            새 탭에서 보기
          </button>
          <button
            type="button"
            onClick={handleDownload}
            title="HTML 다운로드"
            aria-label="HTML 다운로드"
            className="rounded-md border border-zinc-200 bg-white p-1.5 text-zinc-500 hover:border-teal-300 hover:text-teal-800"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12" />
              <path d="M7 11l5 5 5-5" />
              <path d="M5 21h14" />
            </svg>
          </button>
        </div>
      </div>
      {analysis.assetProfile.domainHint === "document" ? (
        // 문서형은 화면명이 우연히 "약관"/"가입" 같은 진입형 키워드와 겹쳐도 항상 에디토리얼
        // 구조로 렌더링해야 한다 — entry-layout 분류가 끼어들면 다시 일반 UI 카드로 보인다.
        <LayoutVariantPreview variant={variant} colors={colors} screenName={screen.name} domainHint={analysis.assetProfile.domainHint} />
      ) : analysis.assetProfile.domainHint === "mobile-app" ? (
        <PreviewMobile colors={colors} screenName={screen.name} layout={layout} />
      ) : ENTRY_LAYOUTS.includes(layout) ? (
        <PreviewCentered colors={colors} screenName={screen.name} domainHint={analysis.assetProfile.domainHint} layout={layout} />
      ) : (
        <LayoutVariantPreview variant={variant} colors={colors} screenName={screen.name} domainHint={analysis.assetProfile.domainHint} />
      )}
    </WorkCard>
  );
}

function ImagePromptWorkshop({
  analysis,
  direction,
  imageDirection,
  mood,
  defaultCollapsed,
}: {
  analysis: GeneratorAnalysis;
  direction: DesignDirection;
  imageDirection: ImageDirection;
  mood: Mood;
  defaultCollapsed: boolean;
}) {
  const [selectedPromptIndex, setSelectedPromptIndex] = useState(0);
  const [images, setImages] = useState<MoodImage[]>([]);
  const [providers, setProviders] = useState<string[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imagesError, setImagesError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<MoodImage | null>(null);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(!defaultCollapsed);

  const visual = direction.visual;
  const prompts = imageDirection.promptSeedIndexes.map((index) => visual?.promptSeeds[index]).filter((value): value is string => Boolean(value));
  const promptsKo = imageDirection.promptSeedIndexes.map((index) => visual?.promptSeedsKo[index]).filter((value): value is string => Boolean(value));
  const projectTitle = analysis.projectIntent.title;

  const queries = useMemo(() => buildImageSearchQueries(imageDirection, mood, analysis.assetProfile, analysis.projectIntent.domain), [imageDirection, mood, analysis]);
  const gainTerms = useMemo(() => buildRelevanceTerms(analysis, direction), [analysis, direction]);
  const queryKey = queries.join("|");

  useEffect(() => {
    if (!expanded) return;
    let cancelled = false;

    Promise.resolve()
      .then(() => {
        if (cancelled) return Promise.reject(new Error("cancelled"));
        setImagesLoading(true);
        setImagesError(null);
        return fetch("/api/mood-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ queries, gainTerms, page }),
        });
      })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) throw new Error(data.error);
        setImages(data.images || []);
        setProviders(data.providers || []);
      })
      .catch((err) => {
        if (!cancelled && err instanceof Error && err.message !== "cancelled") {
          setImagesError(err.message || "이미지를 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (!cancelled) setImagesLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, page, expanded]);

  const handleRegenerateImages = () => {
    setSelectedImage(null);
    setPage((current) => {
      let next = Math.floor(Math.random() * 5) + 1;
      if (next === current) next = next === 5 ? 1 : next + 1;
      return next;
    });
  };

  const selectedPrompt = prompts[selectedPromptIndex] || "";
  const selectedPromptKo = promptsKo[selectedPromptIndex] || "";
  const basePromptVariants = selectedPrompt ? buildImagePromptVariants(selectedPrompt, mood.title, mood.colors) : [];
  const basePromptVariantsKo = selectedPromptKo ? buildImagePromptVariantsKo(selectedPromptKo, mood.title, mood.colors) : [];
  const imagePromptVariants = selectedImage ? buildImagePromptsFromImage(projectTitle, imageDirection, mood, selectedImage) : [];
  const imagePromptVariantsKo = selectedImage ? buildImagePromptsFromImageKo(projectTitle, imageDirection, mood, selectedImage) : [];

  if (!prompts.length) return null;

  return (
    <WorkCard className="p-5">
      <SectionTitle label="Image Prompt Workshop" meta={queries.join(" · ")} />
      <div className="grid gap-5">
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-700">레퍼런스 이미지</h3>
              {defaultCollapsed && (
                <p className="mt-1 text-xs leading-5 text-zinc-400">
                  이 산출물은 UI/레이아웃 레퍼런스가 우선입니다. 실사 이미지는 보조 소재입니다.
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              {expanded && providers.length > 0 && (
                <button
                  type="button"
                  onClick={handleRegenerateImages}
                  disabled={imagesLoading}
                  className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 hover:border-teal-300 hover:text-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {imagesLoading ? "불러오는 중..." : "다른 이미지 보기"}
                </button>
              )}
              {defaultCollapsed && (
                <button
                  type="button"
                  onClick={() => setExpanded((current) => !current)}
                  className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 hover:border-teal-300 hover:text-teal-800"
                >
                  {expanded ? "접기" : "보조 이미지 소재 보기"}
                </button>
              )}
            </div>
          </div>
          {expanded && providers.length === 0 && (
            <p className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs leading-5 text-zinc-500">
              Pexels/Unsplash API 키가 설정되지 않아 레퍼런스 이미지를 불러올 수 없습니다. .env.local에 PEXELS_API_KEY 또는 UNSPLASH_ACCESS_KEY를 추가하면 이 영역에 검색 결과 이미지가 표시됩니다.
            </p>
          )}
          {expanded && providers.length > 0 && imagesLoading && <p className="text-xs text-zinc-400">이미지를 불러오는 중...</p>}
          {expanded && imagesError && <p className="text-xs text-red-600">{imagesError}</p>}
          {expanded && providers.length > 0 && !imagesLoading && !imagesError && images.length === 0 && (
            <p className="text-xs text-zinc-400">이 키워드로 이미지를 찾지 못했습니다.</p>
          )}
          {expanded && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((image, index) => (
              <button
                key={`${image.link}-${index}`}
                type="button"
                onClick={() => setSelectedImage(image)}
                title={image.description || undefined}
                className={`overflow-hidden rounded-lg border text-left transition-colors ${
                  selectedImage?.link === image.link ? "border-amber-300 ring-2 ring-amber-200" : "border-zinc-200 hover:border-zinc-400"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.src} alt={image.credit} className="h-40 w-full object-cover" />
                <span className="block truncate px-2 pt-1 text-xs text-zinc-500">{image.credit}</span>
                <span className="block truncate px-2 pb-1 font-mono text-[11px] text-zinc-400">query: {image.query}</span>
              </button>
            ))}
          </div>
          )}
        </div>
        <div>
          {selectedImage ? (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-700">선택한 이미지 기준 프롬프트</h3>
                <button type="button" onClick={() => setSelectedImage(null)} className="text-xs font-semibold text-teal-700 hover:underline">
                  기본 프롬프트로 돌아가기
                </button>
              </div>
              <div className="grid gap-3">
                {imagePromptVariants.map((prompt, index) => (
                  <p key={prompt} className="rounded-lg border border-amber-200 bg-amber-50 p-4 font-mono text-sm leading-7 text-amber-950">
                    {prompt}
                    {imagePromptVariantsKo[index] && (
                      <span className="mt-2 block font-sans text-xs leading-6 text-amber-700">{imagePromptVariantsKo[index]}</span>
                    )}
                  </p>
                ))}
              </div>
            </>
          ) : (
            <>
              <h3 className="mb-3 text-sm font-bold text-zinc-700">기본 프롬프트</h3>
              <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
                <div className="grid gap-2">
                  {prompts.map((prompt, index) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => setSelectedPromptIndex(index)}
                      className={`rounded-lg border p-3 text-left font-mono text-sm leading-6 ${
                        selectedPromptIndex === index ? "border-amber-300 bg-amber-50 text-amber-950" : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-400"
                      }`}
                    >
                      {prompt}
                      {promptsKo[index] && (
                        <span className="mt-2 block font-sans text-xs leading-6 text-zinc-500">{promptsKo[index]}</span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="grid gap-3">
                  {basePromptVariants.map((prompt, index) => (
                    <p key={prompt} className="rounded-lg border border-zinc-200 bg-white p-4 font-mono text-sm leading-7 text-zinc-700">
                      {prompt}
                      {basePromptVariantsKo[index] && (
                        <span className="mt-2 block font-sans text-xs leading-6 text-zinc-500">{basePromptVariantsKo[index]}</span>
                      )}
                    </p>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </WorkCard>
  );
}

function Result({
  response,
  primaryColor,
  onAnalysisUpdate,
}: {
  response: AnalyzeResponse;
  primaryColor: string;
  onAnalysisUpdate: (analysis: GeneratorAnalysis) => void;
}) {
  const { analysis, documentText, analysisSource } = response;
  // 탭으로 "UI냐 비주얼이냐"를 고르게 하지 않고, 이 산출물에 필요한 UI 방향과 비주얼 방향을
  // 둘 다 찾아서 한 화면에 동시에 보여준다. 스키마상 한 프로젝트에 ui 방향과 visual 방향은
  // 각각 최대 1개씩만 나오므로(같은 direction에 둘 다 있는 mixed 케이스 포함) find()로 충분하다.
  const uiDirection = analysis.directions.find((item) => item.ui);
  const visualDirection = analysis.directions.find((item) => item.visual);
  const moodBoardDirection = uiDirection || visualDirection || analysis.directions[0];
  const [selectedMoodIndex, setSelectedMoodIndex] = useState(0);
  const [colorBrief, setColorBrief] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const [regenerateNote, setRegenerateNote] = useState<string | null>(null);
  const selectedMood = analysis.moods[selectedMoodIndex] || analysis.moods[0];
  const screenTypes = uiDirection?.ui?.screenTypes || [];
  const [selectedScreenIndex, setSelectedScreenIndex] = useState(0);
  const selectedScreen = screenTypes[selectedScreenIndex] || screenTypes[0];
  // layoutVariants는 selectedScreen(Deliverable) 전용 풀이라, Deliverable을 바꾸면 이전 선택 id가
  // 새 풀에 없을 수 있다 — handleSelectScreen/handleAssetTypeChange에서 같이 리셋해준다.
  const [selectedLayoutVariantId, setSelectedLayoutVariantId] = useState<string | undefined>(selectedScreen?.layoutVariants[0]?.id);
  const [selectedImageDirectionId, setSelectedImageDirectionId] = useState<string | undefined>(visualDirection?.visual?.imageDirections[0]?.id);
  const [reclassifying, setReclassifying] = useState(false);
  const [reclassifyError, setReclassifyError] = useState<string | null>(null);

  const handleSelectScreen = (index: number) => {
    setSelectedScreenIndex(index);
    setSelectedLayoutVariantId(screenTypes[index]?.layoutVariants[0]?.id);
  };

  const handleAssetTypeChange = async (assetType: string) => {
    setReclassifying(true);
    setReclassifyError(null);
    try {
      const res = await fetch("/api/reclassify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis, assetType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "재분류에 실패했습니다.");
      const updated = data.analysis as GeneratorAnalysis;
      onAnalysisUpdate(updated);
      const nextUi = updated.directions.find((item) => item.ui);
      const nextVisual = updated.directions.find((item) => item.visual);
      setSelectedLayoutVariantId(nextUi?.ui?.screenTypes[0]?.layoutVariants[0]?.id);
      setSelectedImageDirectionId(nextVisual?.visual?.imageDirections[0]?.id);
      setSelectedScreenIndex(0);
    } catch (err) {
      setReclassifyError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setReclassifying(false);
    }
  };

  const selectedLayoutVariant = selectedScreen?.layoutVariants.find((item) => item.id === selectedLayoutVariantId) ?? selectedScreen?.layoutVariants[0];
  const selectedImageDirection = visualDirection?.visual?.imageDirections.find((item) => item.id === selectedImageDirectionId) ?? visualDirection?.visual?.imageDirections[0];
  const showImageWorkshop = Boolean(visualDirection?.visual) && Boolean(selectedImageDirection) && Boolean(selectedMood);
  const defaultCollapsed = Boolean(uiDirection) && Boolean(visualDirection) && !hasLoginScreen(screenTypes);

  const handleRegenerate = async () => {
    setRegenerating(true);
    setRegenerateError(null);
    setRegenerateNote(null);
    try {
      const res = await fetch("/api/regenerate-mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentText, projectIntent: analysis.projectIntent, brief: colorBrief, primaryColor }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "재생성에 실패했습니다.");
      onAnalysisUpdate({ ...analysis, palette: data.palette, moods: data.moods });
      setSelectedMoodIndex(0);
      if (data.source === "fallback") {
        setRegenerateNote("Gemini 응답을 받지 못해 키워드 기반 추정 팔레트/무드로 대체했습니다.");
      }
    } catch (err) {
      setRegenerateError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setRegenerating(false);
    }
  };

  const compositionSummary = [
    uiDirection?.ui
      ? { tag: "UI", title: uiDirection.label, detail: uiDirection.appliesTo || "레이아웃/화면 구성", meta: `Deliverable ${uiDirection.ui.screenTypes.length}개` }
      : null,
    visualDirection?.visual
      ? { tag: "비주얼", title: visualDirection.label, detail: visualDirection.appliesTo || "키비주얼/이미지 방향", meta: `키비주얼 방향 ${visualDirection.visual.imageDirections.length}개` }
      : null,
  ].filter((item): item is { tag: string; title: string; detail: string; meta: string } => Boolean(item));

  // ui-only/visual-only로 분리되지 않고 같은 direction이 ui+visual을 동시에 갖는 경우(Gemini
  // 미응답 시 fallback 경로)에는 uiDirection과 visualDirection이 동일 객체라 references도 완전히
  // 같다 — 이때만 비주얼 섹션에서 "both" 플랫폼을 빼서 동일 키워드가 두 섹션에 그대로 중복되는
  // 것을 막는다. 분리된 정상 케이스(예: 브로셔의 편집 레이아웃 방향 + 표지 키비주얼 방향)는 같은
  // 플랫폼이라도 각 방향마다 다른 키워드를 갖고 있으므로 양쪽에 다 보여주는 게 맞다.
  const sameDirection = Boolean(uiDirection && visualDirection && uiDirection === visualDirection);
  const layoutReferenceTitle = analysis.assetProfile.domainHint === "document" ? "편집·레이아웃 Reference Platforms" : "UI Reference Platforms";

  const keywordGroups = useMemo(
    () =>
      [
        ["산출물 형태", analysis.keywordGroups.deliverable, "border-zinc-200 bg-zinc-50 text-zinc-700"],
        ["컬러 무드", analysis.keywordGroups.colorMood, "border-amber-200 bg-amber-50 text-amber-900"],
        ["디자인 키워드", analysis.keywordGroups.design, "border-teal-200 bg-teal-50 text-teal-900"],
        ["도메인 키워드", analysis.keywordGroups.domain, "border-rose-200 bg-rose-50 text-rose-900"],
      ] as const,
    [analysis],
  );

  return (
    <section className="grid gap-5">
      {analysisSource === "fallback" && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Gemini 응답을 받지 못해 키워드 기반 추정 결과를 표시하고 있습니다. (예: API 할당량 초과)
        </div>
      )}

      <WorkCard className="overflow-hidden">
        <div className="grid grid-cols-[1.1fr_0.9fr] max-lg:grid-cols-1">
          <div className="p-6">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={analysis.assetProfile.assetType}
                disabled={reclassifying}
                onChange={(event) => handleAssetTypeChange(event.target.value)}
                className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm font-semibold text-zinc-700 disabled:opacity-60"
              >
                {!assetTypeOptions.some((option) => option.value === analysis.assetProfile.assetType) && (
                  <option value={analysis.assetProfile.assetType}>{analysis.assetProfile.assetType}</option>
                )}
                {assetTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-sm font-bold text-teal-900">
                {analysis.assetProfile.projectKind === "ui" ? "UI/레이아웃" : analysis.assetProfile.projectKind === "visual" ? "이미지/키비주얼" : "UI + 키비주얼"}
              </span>
              {reclassifying && <span className="text-xs font-semibold text-zinc-400">반영 중...</span>}
            </div>
            {reclassifyError && <p className="mt-1 text-xs font-semibold text-red-600">{reclassifyError}</p>}
            <EditableText
              as="h1"
              className="mt-5 text-3xl font-black text-zinc-950 max-sm:text-2xl"
              value={analysis.projectIntent.title}
              onSave={(title) => onAnalysisUpdate({ ...analysis, projectIntent: { ...analysis.projectIntent, title } })}
            />
            <EditableText
              as="p"
              multiline
              className="mt-3 max-w-3xl text-base leading-7 text-zinc-600"
              value={analysis.projectIntent.description}
              onSave={(description) => onAnalysisUpdate({ ...analysis, projectIntent: { ...analysis.projectIntent, description } })}
            />
            <EditableTags
              tags={analysis.projectIntent.tags}
              onChange={(tags) => onAnalysisUpdate({ ...analysis, projectIntent: { ...analysis.projectIntent, tags } })}
            />
          </div>
          <div className="border-l border-zinc-200 bg-zinc-50 p-6 max-lg:border-l-0 max-lg:border-t">
            <SectionTitle label="이 산출물의 구성" meta={`${compositionSummary.length}개`} />
            <ol className="grid gap-3">
              {compositionSummary.map((item) => (
                <li key={item.tag} className="flex gap-3">
                  <span className="grid h-7 w-12 shrink-0 place-items-center rounded-md bg-zinc-900 text-xs font-bold text-white">{item.tag}</span>
                  <div className="text-sm leading-6 text-zinc-700">
                    <p className="font-bold text-zinc-900">{item.title}</p>
                    <p className="text-zinc-600">{item.detail}</p>
                    <p className="text-xs font-semibold text-zinc-400">{item.meta}</p>
                  </div>
                </li>
              ))}
              {compositionSummary.length === 0 && <li className="text-sm text-zinc-500">UI/비주얼 방향이 아직 없습니다.</li>}
            </ol>
          </div>
        </div>
      </WorkCard>

      <GroupDivider label="공통" detail="모든 방향에 같이 적용되는 키워드/팔레트/무드" />

      <div className="grid gap-4 xl:grid-cols-4">
        {keywordGroups.map(([title, keywords, tone]) => (
          <KeywordGroup key={title} title={title} keywords={keywords} tone={tone} />
        ))}
      </div>

      <Palette analysis={analysis} />
      <MoodCards analysis={analysis} selectedMoodIndex={selectedMoodIndex} onSelectMood={setSelectedMoodIndex} />
      {selectedMood && moodBoardDirection && (
        <SelectedMoodBoard
          analysis={analysis}
          direction={moodBoardDirection}
          mood={selectedMood}
          colorBrief={colorBrief}
          primaryColor={primaryColor}
          onBriefChange={setColorBrief}
          onRegenerate={handleRegenerate}
          regenerating={regenerating}
          regenerateError={regenerateError}
          regenerateNote={regenerateNote}
        />
      )}

      {uiDirection?.ui && (
        <>
          <GroupDivider label="UI 방향" detail={uiDirection.label} />

          <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
            <WorkCard className="p-5">
              <SectionTitle label="Deliverables" meta="화면 선택 → 레이아웃 후보도 같이 바뀝니다" />
              <div className="grid gap-2">
                {screenTypes.map((item, index) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => handleSelectScreen(index)}
                    className={`grid grid-cols-[40px_1fr_auto] items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                      selectedScreenIndex === index
                        ? "border-teal-400 bg-teal-50 ring-2 ring-teal-100"
                        : "border-zinc-200 bg-zinc-50 hover:border-zinc-300"
                    }`}
                  >
                    <span className={`grid h-10 w-10 place-items-center rounded-md text-base font-black ${selectedScreenIndex === index ? "bg-teal-600 text-white" : "bg-white text-teal-700"}`}>
                      {item.icon || "□"}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-zinc-950">{item.name}</p>
                      <p className="mt-1 text-sm leading-6 text-zinc-600">{item.desc}</p>
                    </div>
                    <span className="rounded-md bg-white px-2 py-1 text-xs font-bold text-zinc-500">{item.count}</span>
                  </button>
                ))}
              </div>
            </WorkCard>

            {selectedMood && selectedScreen && selectedLayoutVariant && (
              <ImplementationSample analysis={analysis} direction={uiDirection} mood={selectedMood} variant={selectedLayoutVariant} screen={selectedScreen} />
            )}
          </div>

          {selectedScreen && selectedScreen.layoutVariants.length > 1 && (
            <WorkCard className="p-5">
              <SectionTitle label="Layout Variants" meta={`${selectedScreen.name} · ${selectedScreen.layoutVariants.length} variants`} />
              <LayoutVariantPicker
                variants={selectedScreen.layoutVariants}
                selectedId={selectedLayoutVariantId}
                onSelect={setSelectedLayoutVariantId}
              />
              {selectedLayoutVariant && selectedLayoutVariant.notes.length > 0 && (
                <ul className="mt-4 grid gap-1.5 text-sm leading-6 text-zinc-600">
                  {selectedLayoutVariant.notes.map((note) => (
                    <li key={note}>· {note}</li>
                  ))}
                </ul>
              )}
            </WorkCard>
          )}

          <References references={uiDirection.references} mode="layout" title={layoutReferenceTitle} />
        </>
      )}

      {visualDirection?.visual && (
        <>
          <GroupDivider label="비주얼 방향" detail={visualDirection.label} />

          {showImageWorkshop && selectedImageDirection && selectedMood && (
            <ImagePromptWorkshop
              key={`${visualDirection.id}-${selectedImageDirection.id}-${selectedMood.title}`}
              analysis={analysis}
              direction={visualDirection}
              imageDirection={selectedImageDirection}
              mood={selectedMood}
              defaultCollapsed={defaultCollapsed}
            />
          )}

          <References references={visualDirection.references} mode="image" title="비주얼 Reference Platforms" includeBoth={!sameDirection} />
        </>
      )}
    </section>
  );
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [primaryColor, setPrimaryColor] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (primaryColor.trim()) formData.append("primaryColor", primaryColor.trim());
      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      let data: { error?: string } | AnalyzeResponse;
      try {
        data = await res.json();
      } catch {
        throw new Error(`서버 응답을 읽을 수 없습니다 (status ${res.status}). 잠시 후 다시 시도해주세요.`);
      }
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "분석에 실패했습니다.");
      setResult(data as AnalyzeResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f3f1ec]">
      <div className="mx-auto grid max-w-[1480px] grid-cols-[360px_1fr] gap-6 px-6 py-6 max-lg:grid-cols-1">
        <aside className="lg:sticky lg:top-6 lg:h-[calc(100vh-48px)]">
          <div className="flex h-full flex-col rounded-lg border border-zinc-800 bg-zinc-950 text-white shadow-xl">
            <div className="border-b border-white/10 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-300">Reference Lab</p>
              <h1 className="mt-3 text-2xl font-black">Design Reference Generator</h1>
              <p className="mt-3 text-sm leading-6 text-zinc-400">PPTX, PDF, TXT 문서를 분석해 레퍼런스 수집안을 구성합니다.</p>
            </div>
            <div className="grid gap-4 p-5">
              <FileDropzone selectedFile={file} onFileSelected={setFile} disabled={loading} />
              <div className="relative z-10">
                <label className="block text-xs font-bold uppercase tracking-[0.18em] text-zinc-500" htmlFor="primaryColor">
                  Primary Color (선택)
                </label>
                <input
                  id="primaryColor"
                  type="text"
                  value={primaryColor}
                  onChange={(event) => setPrimaryColor(event.target.value)}
                  disabled={loading}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="#007BFF 또는 브랜드 컬러 설명"
                  className="relative z-10 mt-2 w-full rounded-md border border-white/20 bg-zinc-900 px-3 py-2 text-sm text-white caret-teal-300 outline-none placeholder:text-zinc-500 focus:border-teal-300 focus:bg-zinc-900 focus:ring-2 focus:ring-teal-300/30 disabled:opacity-60"
                />
                <p className="mt-2 text-xs leading-5 text-zinc-500">입력하면 이 컬러를 기준으로 팔레트/무드를 구성합니다.</p>
              </div>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!file || loading}
                className="rounded-lg bg-teal-400 px-5 py-3 text-sm font-black text-zinc-950 transition-colors hover:bg-teal-300 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
              >
                {loading ? "분석 중..." : "레퍼런스 수집안 생성"}
              </button>
              {error && <div className="rounded-lg border border-red-400/40 bg-red-950/50 p-3 text-sm leading-6 text-red-100">{error}</div>}
            </div>
            <div className="mt-auto border-t border-white/10 p-5">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-white/6 p-3">
                  <p className="text-zinc-500">Input</p>
                  <p className="mt-1 font-bold text-zinc-200">MD TXT PDF PPTX</p>
                </div>
                <div className="rounded-lg bg-white/6 p-3">
                  <p className="text-zinc-500">Engine</p>
                  <p className="mt-1 font-bold text-zinc-200">Gemini API</p>
                </div>
              </div>
              <p className="mt-4 text-xs leading-5 text-zinc-500">GEMINI_API_KEY는 서버 환경변수에서 사용됩니다.</p>
            </div>
          </div>
        </aside>

        <section className="grid gap-6">
          {!result ? (
            <div className="grid min-h-[calc(100vh-48px)] place-items-center rounded-lg border border-dashed border-zinc-300 bg-white/70 p-8">
              <div className="max-w-2xl text-center">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-400">Waiting for document</p>
                <h2 className="mt-4 text-3xl font-black text-zinc-950 max-sm:text-2xl">문서를 업로드하면 결과 보드가 생성됩니다.</h2>
                <div className="mt-8 grid gap-3 text-left md:grid-cols-3">
                  {["산출물 구성", "키워드 그룹", "무드보드"].map((item) => (
                    <div key={item} className="rounded-lg border border-zinc-200 bg-white p-4 text-sm font-bold text-zinc-700 shadow-sm">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <Result response={result} primaryColor={primaryColor.trim()} onAnalysisUpdate={(analysis) => setResult({ ...result, analysis })} />
          )}
        </section>
      </div>
    </main>
  );
}
