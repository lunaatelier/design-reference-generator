// sessionStorage 키 포맷을 app/page.tsx(쓰기)와 app/preview/[id]/page.tsx(읽기) 양쪽이
// 똑같이 써야 하므로 한 곳에 둔다 — 둘 중 한쪽만 포맷을 바꾸면 미리보기가 깨진다.
export function previewStorageKey(id: string): string {
  return `preview-${id}`;
}
