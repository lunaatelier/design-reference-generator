import type { ReactNode } from "react";
import { isLightColor, pickSurfaceColor } from "@/lib/previewColors";
import type { AssetProfile, LayoutModule, LayoutVariant, ScreenLayout } from "@/types";

// 앱 메인 탭 구조에 들어가기 전 단계(진입/단일 액션형) 화면들. 이 화면들은 모바일/데스크탑
// 모두에서 같은 "중앙 카드 한 장" 구조이므로, app/page.tsx의 Screen Preview 카드와
// app/preview/[id]/page.tsx가 동일한 분기 로직(domainHint/layout에 따라 어떤 컴포넌트를
// 쓸지)을 공유할 수 있게 여기서 export한다.
export const ENTRY_LAYOUTS: ScreenLayout[] = ["splash", "onboarding", "terms", "login", "form"];

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
export function PreviewCentered({
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
export function PreviewMobile({ colors, screenName, layout }: { colors: string[]; screenName: string; layout: ScreenLayout }) {
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

// marketing-web(웹사이트/홈페이지/랜딩) "web-main" 아키타입 3종. generic-dashboard 계열(관제실/
// 대시보드 가정)과 시각적으로 뚜렷이 구분되도록 히어로/섹션 중심 구도로 그린다. 자세한 배경은
// memory/project_marketing-web-layout-family.md 참고.
function PreviewHeroBanner({ colors, screenName, domainHint }: { colors: string[]; screenName: string; domainHint: AssetProfile["domainHint"] }) {
  const primary = colors[0] || "#111827";
  const accent = colors[1] || "#2563eb";
  const surface = pickSurfaceColor(colors, domainHint, isLightColor(colors[0] || "#111827"));
  const surfaceLight = isLightColor(surface);

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 select-none">
      <PreviewNav primary={primary} />
      <div
        className="flex min-h-72 flex-col items-center justify-center gap-4 px-8 text-center"
        style={{ background: surfaceLight ? `linear-gradient(160deg, ${surface}, ${accent}22)` : `linear-gradient(160deg, ${surface}, ${accent}33)` }}
      >
        <div className={`h-2 w-24 rounded-full ${surfaceLight ? "bg-black/10" : "bg-white/15"}`} />
        <h4 className={`max-w-xs truncate text-lg font-black ${surfaceLight ? "text-zinc-800" : "text-white"}`}>{screenName}</h4>
        <div className={`h-2.5 w-56 rounded ${surfaceLight ? "bg-black/10" : "bg-white/15"}`} />
        <div className={`h-2.5 w-44 rounded ${surfaceLight ? "bg-black/10" : "bg-white/15"}`} />
        <div className="mt-2 h-9 w-32 rounded-full" style={{ background: accent }} />
      </div>
    </div>
  );
}

function PreviewSplitHero({ colors, screenName, domainHint }: { colors: string[]; screenName: string; domainHint: AssetProfile["domainHint"] }) {
  const primary = colors[0] || "#111827";
  const accent = colors[1] || "#2563eb";
  const surface = pickSurfaceColor(colors, domainHint, isLightColor(colors[0] || "#111827"));
  const surfaceLight = isLightColor(surface);

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 select-none">
      <PreviewNav primary={primary} />
      <div className="grid min-h-72 grid-cols-2" style={{ background: surface }}>
        <div className="flex flex-col justify-center gap-3 p-6">
          <div className="h-2 w-16 rounded-full" style={{ background: accent }} />
          <h4 className={`truncate text-base font-black ${surfaceLight ? "text-zinc-800" : "text-white"}`}>{screenName}</h4>
          <div className={`h-2 w-40 rounded ${surfaceLight ? "bg-black/12" : "bg-white/20"}`} />
          <div className={`h-2 w-32 rounded ${surfaceLight ? "bg-black/12" : "bg-white/20"}`} />
          <div className="mt-2 h-8 w-28 rounded-full" style={{ background: accent }} />
        </div>
        <div className="relative m-4 rounded-xl" style={{ background: `linear-gradient(135deg, ${accent}55, ${primary}33)` }} />
      </div>
    </div>
  );
}

function PreviewSectionStack({ colors, screenName, domainHint, modules }: { colors: string[]; screenName: string; domainHint: AssetProfile["domainHint"]; modules: LayoutModule[] }) {
  const primary = colors[0] || "#111827";
  const accent = colors[1] || "#2563eb";
  const surface = pickSurfaceColor(colors, domainHint, isLightColor(colors[0] || "#111827"));
  const surfaceLight = isLightColor(surface);
  const sectionLabels = modules.length ? modules.map((m) => m.label) : ["사업 영역", "주요 지표", "최신 소식"];

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 select-none">
      <PreviewNav primary={primary} />
      <div className="grid min-h-72 gap-px" style={{ background: surfaceLight ? "#e4e4e7" : "#27272a" }}>
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-6 text-center" style={{ background: surface }}>
          <h4 className={`truncate text-sm font-black ${surfaceLight ? "text-zinc-800" : "text-white"}`}>{screenName}</h4>
          <div className={`h-2 w-40 rounded ${surfaceLight ? "bg-black/10" : "bg-white/15"}`} />
        </div>
        {sectionLabels.slice(0, 3).map((label, sectionIndex) => (
          <div key={label} className="p-3" style={{ background: surface }}>
            <div className="mb-2 text-xs font-bold text-zinc-500">{label}</div>
            <div className="grid grid-cols-3 gap-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-lg border border-zinc-200 bg-white p-2">
                  <div className="h-5 rounded" style={{ background: (sectionIndex + i) % 2 === 0 ? `${accent}33` : "#e4e4e7" }} />
                  <div className="mt-2 h-1.5 w-3/4 rounded bg-zinc-200" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 문서형(브로셔/제안서/보고서/포스터) 미리보기는 웹/앱 화면이 아니라 인쇄물 한 장이므로, 다른
// Preview*가 공유하는 PreviewNav(상단 웹 nav바)를 쓰지 않고 종이 한 장처럼 보이는 프레임을 쓴다.
function DocumentPageFrame({ surface, children }: { surface: string; children: ReactNode }) {
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
export const STRUCTURE_LABELS: Record<LayoutVariant["structure"], string> = {
  "command-center": "관제 센터형",
  "map-centric": "지도 중심형",
  "kpi-wall": "KPI 월형",
  "incident-focused": "장애 대응형",
  "split-monitoring": "분할 모니터링형",
  "generic-dashboard": "정보형 콘텐츠 레이아웃",
  "generic-list": "목록형 레이아웃",
  "generic-detail": "상세형 레이아웃",
  "hero-banner": "풀스크린 히어로형",
  "split-hero": "좌우 분할 히어로형",
  "section-stack": "섹션 스택형",
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

// app/page.tsx의 Screen Preview 카드와 app/preview/[id]/page.tsx(Phase 2 골격) 둘 다 같은
// 와이어프레임을 그려야 하므로 page.tsx 밖으로 뽑아 공유 모듈로 분리했다. page.tsx 자체는
// Next.js 라우트 파일이라 default export 외의 추가 named export를 두면 라우트 타입 생성과
// 충돌한다(.next/types 빌드 에러). 자세한 배경은
// memory/project_deliverable-scoped-layouts.md Phase 2 step 2 참고.
export function LayoutVariantPreview({ variant, colors, screenName, domainHint }: { variant: LayoutVariant; colors: string[]; screenName: string; domainHint: AssetProfile["domainHint"] }) {
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
    case "hero-banner":
      return <PreviewHeroBanner colors={colors} screenName={screenName} domainHint={domainHint} />;
    case "split-hero":
      return <PreviewSplitHero colors={colors} screenName={screenName} domainHint={domainHint} />;
    case "section-stack":
      return <PreviewSectionStack colors={colors} screenName={screenName} domainHint={domainHint} modules={variant.modules} />;
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
