import type { AssetProfile } from "@/types";

export function isLightColor(hex: string): boolean {
  const c = hex.replace("#", "");
  if (c.length !== 6) return false;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
}

// 실제 UI(대시보드/웹앱/모바일 등) 콘텐츠 영역 배경은 거의 항상 무채색이다 - 채도 높은 팔레트
// 컬러를 그대로 까는 건 표지 디자인이 있는 제안서/포스터류에서만 자연스럽다. mood.colors는
// 색 개수가 일정하지 않아 고정 인덱스(예: colors[3])로 "surface"를 집어내면 실제로는 비비드한
// 포인트 컬러가 배경 전체에 깔리는 사고가 난다.
export function pickSurfaceColor(colors: string[], domainHint: AssetProfile["domainHint"], themeIsLight: boolean): string {
  if (domainHint === "document") {
    return colors[3] || (themeIsLight ? "#f8fafc" : "#18181b");
  }
  return themeIsLight ? "#f8fafc" : "#0b1220";
}
