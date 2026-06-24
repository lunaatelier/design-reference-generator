"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ENTRY_LAYOUTS, LayoutVariantPreview, PreviewCentered, PreviewMobile } from "@/components/preview/LayoutVariantPreview";
import { previewStorageKey } from "@/lib/previewStorage";
import type { DeliverableContent, PreviewPayload } from "@/types";

// content는 회색 박스 와이어프레임과 별개로 그 아래에 추가되는 실데이터 패널이다 — 15종
// 와이어프레임 컴포넌트 내부의 mock placeholder를 직접 갈아치우지 않고(범위가 크고 이번
// 단계는 "안전, 버튼 미연결"로 합의됨), 같은 화면에 "구조는 와이어프레임 그대로 + 실제
// 추출 텍스트는 아래에 별도 패널로" 보여주는 절충안. Freepik 등 이미지 자동 생성은 범위
// 밖으로 합의됐으므로 imageHint는 컬러 블록 + 설명 텍스트로만 표시한다.
function ContentPanel({ content, colors }: { content: DeliverableContent; colors: string[] }) {
  return (
    <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6">
      <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">추출된 본문 (문서 원문)</p>
      {content.title && <h2 className="mt-2 text-xl font-black text-zinc-950">{content.title}</h2>}
      {content.body.length > 0 && (
        <div className="mt-3 grid gap-2 text-sm leading-6 text-zinc-700">
          {content.body.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      )}
      {content.imageHint && (
        <div className="mt-4 grid gap-2">
          <div className="h-32 rounded-lg" style={{ background: `linear-gradient(135deg, ${colors[0] || "#111827"}, ${colors[1] || "#2563eb"})` }} />
          <p className="text-xs text-zinc-500">이미지 자리: {content.imageHint}</p>
        </div>
      )}
    </div>
  );
}

export default function PreviewPage() {
  const params = useParams<{ id: string }>();
  const [payload, setPayload] = useState<PreviewPayload | null>(null);
  const [status, setStatus] = useState<"loading" | "missing" | "ready">("loading");

  useEffect(() => {
    // sessionStorage 읽기는 클라이언트 마운트 이후에만 가능하다 — Promise.resolve().then()으로
    // 감싸서 setState를 effect 본문에서 동기로 호출하지 않게 한다(app/page.tsx의 mood-images
    // 로딩 effect와 같은 패턴, react-hooks/set-state-in-effect 회피).
    Promise.resolve().then(() => {
      const id = params?.id;
      if (!id) {
        setStatus("missing");
        return;
      }
      const raw = sessionStorage.getItem(previewStorageKey(id));
      if (!raw) {
        setStatus("missing");
        return;
      }
      try {
        setPayload(JSON.parse(raw) as PreviewPayload);
        setStatus("ready");
      } catch {
        setStatus("missing");
      }
    });
  }, [params?.id]);

  if (status === "loading") {
    return <div className="p-10 text-sm text-zinc-500">불러오는 중...</div>;
  }

  if (status === "missing" || !payload) {
    return (
      <div className="p-10 text-sm text-zinc-500">
        미리보기 데이터를 찾을 수 없습니다. 이 페이지는 메인 화면에서 생성한 sessionStorage 데이터가 있어야 열립니다.
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-100 p-6">
      <div className="mx-auto max-w-5xl">
        <p className="mb-4 text-xs font-bold uppercase tracking-wide text-zinc-500">
          {payload.projectTitle} · {payload.screenName}
        </p>
        {payload.domainHint === "document" ? (
          // app/page.tsx의 ImplementationSample과 동일한 분기 — 문서형은 mobile/entry-layout
          // 판단보다 항상 먼저 LayoutVariantPreview로 렌더한다(화면명이 "약관"/"가입" 같은
          // 진입형 키워드와 우연히 겹쳐도 일반 UI 카드로 보이면 안 되기 때문).
          <LayoutVariantPreview variant={payload.variant} colors={payload.colors} screenName={payload.screenName} domainHint={payload.domainHint} />
        ) : payload.domainHint === "mobile-app" ? (
          <PreviewMobile colors={payload.colors} screenName={payload.screenName} layout={payload.layout} />
        ) : ENTRY_LAYOUTS.includes(payload.layout) ? (
          <PreviewCentered colors={payload.colors} screenName={payload.screenName} domainHint={payload.domainHint} layout={payload.layout} />
        ) : (
          <LayoutVariantPreview variant={payload.variant} colors={payload.colors} screenName={payload.screenName} domainHint={payload.domainHint} />
        )}
        {payload.content && <ContentPanel content={payload.content} colors={payload.colors} />}
      </div>
    </main>
  );
}
