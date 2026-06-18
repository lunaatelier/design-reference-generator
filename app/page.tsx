"use client";

import { useEffect, useMemo, useState } from "react";
import FileDropzone from "@/components/FileDropzone";
import { buildImageSearchQuery } from "@/lib/moodImageQuery";
import type { AnalyzeResponse, GeneratorAnalysis, MoodImage } from "@/types";

const purposeTone = {
  "ui-reference": "bg-teal-100 text-teal-900 border-teal-200",
  "image-reference": "bg-amber-100 text-amber-950 border-amber-200",
};

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

function getAssetSampleLabel(assetType: string): string {
  if (/brochure|proposal|report|poster/i.test(assetType)) return "표지와 내지 샘플";
  if (/dashboard|admin/i.test(assetType)) return "대시보드 화면 샘플";
  if (/landing|web|homepage|event/i.test(assetType)) return "랜딩/홈페이지 샘플";
  return "구현 샘플";
}

function buildImagePromptVariants(prompt: string, moodTitle: string, colors: string[]): string[] {
  const palette = colors.slice(0, 4).join(", ");
  return [
    `${prompt}, palette ${palette}, ${moodTitle} mood, clean composition, no text, no logo`,
    `${prompt}, refined editorial crop, strong focal visual, ${moodTitle} direction, colors ${palette}, no people unless explicitly required`,
    `${prompt}, production-ready key visual, layered depth, premium lighting, ${moodTitle} moodboard style, avoid handshake and meeting scenes`,
  ];
}

function buildImagePromptsFromImage(analysis: GeneratorAnalysis, mood: GeneratorAnalysis["moods"][number], image: MoodImage): string[] {
  const { title, assetType } = analysis.project;
  const colors = mood.colors.slice(0, 4).join(", ");
  const query = image.query;

  if (/login/i.test(assetType)) {
    return [
      `Login hero image for ${title}, inspired by ${query}, ${mood.title} mood, colors ${colors}, clean secure service atmosphere, no text`,
      `Authentication background visual for ${title}, ${query}, soft depth, trustworthy digital product style, spacious composition, no text`,
      `Cropped login-side image for a web app, ${query}, refined brand visual, room for form panel on one side, no text`,
    ];
  }
  if (/landing|web|homepage|event/i.test(assetType)) {
    return [
      `Homepage hero image for ${title}, inspired by ${query}, ${mood.title} mood, colors ${colors}, strong focal point, no text`,
      `Landing page support visual for ${title}, ${query}, premium digital service mood, clean composition with copy space, no text`,
      `Wide web hero background, ${query}, modern brand direction, polished realistic/abstract blend, no text, no logos`,
    ];
  }
  return [
    `Proposal cover image for ${title}, inspired by ${query}, ${mood.title} mood, colors ${colors}, editorial composition, no text`,
    `Brochure cover visual for ${title}, ${query}, refined technology abstract background, strong but uncluttered focal area, no text`,
    `Document section background image, ${query}, professional brand mood, subtle depth, suitable for overlaying headings, no text`,
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
  mood: GeneratorAnalysis["moods"][number];
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
  const surface = colors[3] || "#f8fafc";

  return (
    <WorkCard className="p-5">
      <SectionTitle label="Selected Mood" meta={mood.title} />
      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-950">
          <div className="grid min-h-[360px] grid-cols-[0.9fr_1.1fr] max-md:grid-cols-1">
            <div className="flex flex-col justify-between p-6 text-white" style={{ background: bg }}>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/60">{analysis.project.assetType}</p>
                <h3 className="mt-4 text-2xl font-black">{analysis.project.title}</h3>
                <p className="mt-4 max-w-sm text-sm leading-6 text-white/75">{mood.desc}</p>
              </div>
              <div className="grid gap-2">
                {analysis.screenTypes.slice(0, 3).map((item) => (
                  <div key={item.name} className="rounded-md bg-white/12 px-3 py-2 text-sm font-bold text-white/90">
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

const referenceFilterOptions = [
  { value: "all" as const, label: "전체" },
  { value: "layout" as const, label: "UI" },
  { value: "image" as const, label: "이미지" },
];

function References({ analysis }: { analysis: GeneratorAnalysis }) {
  const [filter, setFilter] = useState<"all" | "layout" | "image">("all");
  const showFilter = analysis.referenceNeeds.layout && analysis.referenceNeeds.image;
  const visibleGroups = showFilter
    ? analysis.references.filter((group) => filter === "all" || group.purpose === "both" || group.purpose === filter)
    : analysis.references;

  return (
    <WorkCard className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle label="Reference Platforms" meta={`${visibleGroups.length} groups`} />
        {showFilter && (
          <div className="flex gap-1 rounded-full border border-zinc-200 bg-zinc-50 p-1">
            {referenceFilterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  filter === option.value ? "bg-zinc-950 text-white" : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visibleGroups.map((group) => (
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

function ImplementationSample({ analysis, mood }: { analysis: GeneratorAnalysis; mood: GeneratorAnalysis["moods"][number] }) {
  const sampleLabel = getAssetSampleLabel(analysis.project.assetType);
  const hasEnoughStructure = analysis.screenTypes.length >= 2;
  const hasPalette = mood.colors.length >= 3 || analysis.palette.length >= 3;
  const hasReferences = analysis.references.length > 0;
  const checks = [
    ["구성 정의", hasEnoughStructure ? "가능" : "보강 필요", hasEnoughStructure],
    ["컬러 적용", hasPalette ? "가능" : "보강 필요", hasPalette],
    ["레퍼런스 연결", hasReferences ? "가능" : "보강 필요", hasReferences],
  ] as const;
  const colors = mood.colors.length ? mood.colors : analysis.palette.map((item) => item.hex);
  const primary = colors[1] || "#2563eb";
  const accent = colors[2] || "#06b6d4";

  return (
    <WorkCard className="p-5">
      <SectionTitle label="Implementation Check" meta={sampleLabel} />
      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="grid gap-3">
          {checks.map(([label, status, ok]) => (
            <div key={label} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
              <span className="text-sm font-bold text-zinc-700">{label}</span>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${ok ? "bg-teal-100 text-teal-900" : "bg-amber-100 text-amber-900"}`}>
                {status}
              </span>
            </div>
          ))}
          <p className="rounded-lg bg-zinc-950 p-4 text-sm leading-6 text-zinc-200">
            {hasEnoughStructure && hasPalette
              ? "현재 분석 결과로 선택 무드 기반의 정적 HTML/CSS 샘플을 만들 수 있습니다."
              : "구현 샘플을 만들기 전에 화면 구성이나 컬러 기준을 조금 더 보강하는 편이 좋습니다."}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-black text-zinc-950">{sampleLabel}</h3>
            <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-bold text-zinc-500">{mood.title}</span>
          </div>
          <div className="grid gap-3 md:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-lg p-5 text-white" style={{ background: colors[0] || "#111827" }}>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/60">{analysis.project.domain}</p>
              <h4 className="mt-5 text-xl font-black">{analysis.project.title}</h4>
              <div className="mt-8 h-24 rounded-lg bg-white/16" />
            </div>
            <div className="grid gap-3">
              {analysis.screenTypes.slice(0, 3).map((item, index) => (
                <div key={item.name} className="grid grid-cols-[40px_1fr] gap-3 rounded-lg bg-zinc-50 p-3">
                  <span className="grid h-10 w-10 place-items-center rounded-md text-sm font-black text-white" style={{ background: index === 0 ? primary : accent }}>
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-black text-zinc-900">{item.name}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </WorkCard>
  );
}

function ImagePromptWorkshop({
  analysis,
  prompts,
  mood,
}: {
  analysis: GeneratorAnalysis;
  prompts: string[];
  mood: GeneratorAnalysis["moods"][number];
}) {
  const [selectedPromptIndex, setSelectedPromptIndex] = useState(0);
  const [images, setImages] = useState<MoodImage[]>([]);
  const [providers, setProviders] = useState<string[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imagesError, setImagesError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<MoodImage | null>(null);

  const query = useMemo(() => buildImageSearchQuery(analysis, mood), [analysis, mood]);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve()
      .then(() => {
        if (cancelled) return Promise.reject(new Error("cancelled"));
        setImagesLoading(true);
        setImagesError(null);
        return fetch("/api/mood-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
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
  }, [query]);

  const selectedPrompt = prompts[selectedPromptIndex] || "";
  const basePromptVariants = selectedPrompt ? buildImagePromptVariants(selectedPrompt, mood.title, mood.colors) : [];
  const imagePromptVariants = selectedImage ? buildImagePromptsFromImage(analysis, mood, selectedImage) : [];

  if (!prompts.length) return null;

  return (
    <WorkCard className="p-5">
      <SectionTitle label="Image Prompt Workshop" meta={query} />
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div>
          <h3 className="mb-3 text-sm font-bold text-zinc-700">레퍼런스 이미지</h3>
          {providers.length === 0 && (
            <p className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs leading-5 text-zinc-500">
              Pexels/Unsplash API 키가 설정되지 않아 레퍼런스 이미지를 불러올 수 없습니다. .env.local에 PEXELS_API_KEY 또는 UNSPLASH_ACCESS_KEY를 추가하면 이 영역에 검색 결과 이미지가 표시됩니다.
            </p>
          )}
          {providers.length > 0 && imagesLoading && <p className="text-xs text-zinc-400">이미지를 불러오는 중...</p>}
          {imagesError && <p className="text-xs text-red-600">{imagesError}</p>}
          {providers.length > 0 && !imagesLoading && !imagesError && images.length === 0 && (
            <p className="text-xs text-zinc-400">이 키워드로 이미지를 찾지 못했습니다.</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            {images.map((image, index) => (
              <button
                key={`${image.link}-${index}`}
                type="button"
                onClick={() => setSelectedImage(image)}
                className={`overflow-hidden rounded-lg border text-left transition-colors ${
                  selectedImage?.link === image.link ? "border-amber-300 ring-2 ring-amber-200" : "border-zinc-200 hover:border-zinc-400"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.src} alt={image.credit} className="h-28 w-full object-cover" />
                <span className="block truncate px-2 py-1 text-xs text-zinc-500">{image.credit}</span>
              </button>
            ))}
          </div>
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
                {imagePromptVariants.map((prompt) => (
                  <p key={prompt} className="rounded-lg border border-amber-200 bg-amber-50 p-4 font-mono text-sm leading-7 text-amber-950">
                    {prompt}
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
                    </button>
                  ))}
                </div>
                <div className="grid gap-3">
                  {basePromptVariants.map((prompt) => (
                    <p key={prompt} className="rounded-lg border border-zinc-200 bg-white p-4 font-mono text-sm leading-7 text-zinc-700">
                      {prompt}
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
  const [selectedMoodIndex, setSelectedMoodIndex] = useState(0);
  const [colorBrief, setColorBrief] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const [regenerateNote, setRegenerateNote] = useState<string | null>(null);
  const selectedMood = analysis.moods[selectedMoodIndex] || analysis.moods[0];

  const handleRegenerate = async () => {
    setRegenerating(true);
    setRegenerateError(null);
    setRegenerateNote(null);
    try {
      const res = await fetch("/api/regenerate-mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentText, project: analysis.project, brief: colorBrief, primaryColor }),
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
              {analysis.referencePurposes.map((purpose) => (
                <span key={purpose.value} className={`rounded-full border px-3 py-1 text-sm font-bold ${purposeTone[purpose.value]}`}>
                  {purpose.label}
                </span>
              ))}
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm font-semibold text-zinc-700">
                {analysis.project.assetType}
              </span>
            </div>
            <EditableText
              as="h1"
              className="mt-5 text-3xl font-black text-zinc-950 max-sm:text-2xl"
              value={analysis.project.title}
              onSave={(title) => onAnalysisUpdate({ ...analysis, project: { ...analysis.project, title } })}
            />
            <EditableText
              as="p"
              multiline
              className="mt-3 max-w-3xl text-base leading-7 text-zinc-600"
              value={analysis.project.description}
              onSave={(description) => onAnalysisUpdate({ ...analysis, project: { ...analysis.project, description } })}
            />
            <EditableTags
              tags={analysis.project.tags}
              onChange={(tags) => onAnalysisUpdate({ ...analysis, project: { ...analysis.project, tags } })}
            />
          </div>
          <div className="border-l border-zinc-200 bg-zinc-50 p-6 max-lg:border-l-0 max-lg:border-t">
            <SectionTitle label="Reference Plan" />
            <p className="mb-4 text-sm leading-6 text-zinc-600">{analysis.referenceNeeds.reason}</p>
            <ol className="grid gap-3">
              {analysis.referencePlan.slice(0, 3).map((item, index) => (
                <li key={item} className="flex gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-zinc-900 text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="text-sm leading-6 text-zinc-700">{item}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </WorkCard>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <WorkCard className="p-5">
          <SectionTitle label="Deliverables" meta={`${analysis.screenTypes.length} items`} />
          <div className="grid gap-3">
            {analysis.screenTypes.map((item) => (
              <div key={item.name} className="grid grid-cols-[40px_1fr_auto] items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <span className="grid h-10 w-10 place-items-center rounded-md bg-white text-base font-black text-teal-700">{item.icon || "□"}</span>
                <div className="min-w-0">
                  <p className="font-bold text-zinc-950">{item.name}</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-600">{item.desc}</p>
                </div>
                <span className="rounded-md bg-white px-2 py-1 text-xs font-bold text-zinc-500">{item.count}</span>
              </div>
            ))}
          </div>
        </WorkCard>

        <WorkCard className="p-5">
          <SectionTitle label="Design Criteria" />
          <div className="grid gap-3">
            {analysis.directions.map((direction, index) => (
              <div key={direction} className="grid grid-cols-[56px_1fr] gap-3 rounded-lg border border-zinc-200 bg-white p-4">
                <span className="font-mono text-lg font-black text-zinc-300">{String(index + 1).padStart(2, "0")}</span>
                <p className="text-sm leading-6 text-zinc-700">{direction}</p>
              </div>
            ))}
          </div>
        </WorkCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        {keywordGroups.map(([title, keywords, tone]) => (
          <KeywordGroup key={title} title={title} keywords={keywords} tone={tone} />
        ))}
      </div>

      <Palette analysis={analysis} />
      <MoodCards analysis={analysis} selectedMoodIndex={selectedMoodIndex} onSelectMood={setSelectedMoodIndex} />
      {selectedMood && (
        <SelectedMoodBoard
          analysis={analysis}
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
      {selectedMood && <ImplementationSample analysis={analysis} mood={selectedMood} />}
      <References analysis={analysis} />

      {analysis.referenceNeeds.image && selectedMood && (
        <ImagePromptWorkshop key={selectedMood.title} analysis={analysis} prompts={analysis.imagePrompts} mood={selectedMood} />
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "분석에 실패했습니다.");
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
