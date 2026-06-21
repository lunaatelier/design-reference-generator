# Design Reference Generator — 프로젝트 컨텍스트

## 목적
설계 문서(md/txt/pdf/ppt/pptx)를 업로드하면 프로젝트에 필요한 디자인 방향(direction)을 UI 레이아웃 변형과 키비주얼 방향으로 분리 판단하고, 그에 맞는 실제 레이아웃 미리보기 + 무드보드 + 컬러 팔레트 + 이미지 생성 프롬프트 + 보조 레퍼런스 링크를 생성하는 도구.

진행 단계와 다음 작업 후보는 `design-reference-generator-status.md` 참조.

## 데이터 흐름

1. `components/FileDropzone.tsx` — 파일 업로드 UI (.md/.txt/.pdf/.ppt/.pptx)
2. `app/page.tsx` → `/api/analyze`로 FormData 전송
3. `app/api/analyze/route.ts` — 파일 받아서 처리
4. `lib/extractText.ts` — 파일에서 텍스트 추출
   - md/txt: 그대로 읽음
   - pdf/ppt/pptx: `officeparser`로 텍스트 추출 (최대 18,000자)
5. `lib/promptMasking.ts` — Gemini 호출 전 마스킹 전처리 (이메일/전화번호/주민번호 형식/IP/내부 URL/API 키 패턴 → `[MASKED_*]` 치환). 분석/재생성 호출 모두 이 마스킹된 텍스트만 사용
6. `lib/assetProfile.ts` — 산출물 유형(`assetType`) → `projectKind`(ui/visual/mixed) · `domainHint` 단일 판단 (다른 파일에 흩어진 분기 없음)
7. `lib/generatorAnalysis.ts` — 핵심 분석 로직
   - 마스킹된 텍스트를 Gemini(`gemini-2.5-flash-lite`)에 프롬프트와 함께 전달
   - JSON 응답을 `normalizeAnalysis()`로 정규화 — UI 방향과 키비주얼 방향을 별도의 `DesignDirection`으로 분리 (예: "관제 대시보드" ui-only + "로그인 키비주얼" visual-only)
8. `lib/references.ts` — direction별 `references: ReferenceQuery[]`를 플랫폼별(Dribbble/Behance/Mobbin/Pinterest/Figma Community/Google/GDWEB 등) 검색 URL로 변환 (보조 레퍼런스, 메인 결과물은 아님)
9. `app/page.tsx`의 `Result` 컴포넌트가 결과 렌더링
   - Direction Tabs (방향이 2개 이상이면 표시)
   - Project 개요 / Direction 요약
   - Keyword Groups (산출물형태/컬러무드/디자인/도메인)
   - Palette (5~6색) / Mood Board (3개 무드 선택)
   - Selected Mood (컬러 보정 브리프)
   - UI 방향: Layout Variants (mood당 2~4개 구조적으로 다른 레이아웃 — map-centric/command-center/kpi-wall/incident-focused/split-monitoring/generic-*) + Deliverables + Screen Preview (HTML 다운로드 포함)
   - 키비주얼 방향: Image Prompt Workshop (promptSeeds 기반 생성 프롬프트 + 변형 + 레퍼런스 사진 검색)
   - References (direction별 보조 검색 링크)

## 핵심 설정
- API Key: `.env.local`의 `GEMINI_API_KEY` (서버 환경변수, 브라우저 노출 금지)
- 모델: `gemini-2.5-flash-lite`
- 타입 정의: `types.ts`의 `GeneratorAnalysis`, `DesignDirection`, `AssetProfile`, `AnalyzeResponse` 등
- 보안: Gemini로 나가는 모든 문서 텍스트는 `lib/promptMasking.ts`를 통과 (`docs/Security_KPI_Auto_Measurement_Tool_v4_8...` 기준 — 회사명 전체 NER 마스킹은 범위 밖, 구조적으로 탐지 가능한 패턴만 처리)
