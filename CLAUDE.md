# Design Reference Generator — 프로젝트 컨텍스트

## 목적
설계 문서(md/txt/pdf/ppt/pptx)를 업로드하면 산출물 유형(대시보드/브로셔/제안서/랜딩페이지 등)을 자동 판단하고, 그에 맞는 레퍼런스 검색 링크 + 무드보드 + 컬러 팔레트 + 이미지 프롬프트를 생성하는 도구.

진행 단계와 다음 작업 후보는 `design-reference-generator-status.md` 참조.

## 데이터 흐름

1. `components/FileDropzone.tsx` — 파일 업로드 UI (.md/.txt/.pdf/.ppt/.pptx)
2. `app/page.tsx` → `/api/analyze`로 FormData 전송
3. `app/api/analyze/route.ts` — 파일 받아서 처리
4. `lib/extractText.ts` — 파일에서 텍스트 추출
   - md/txt: 그대로 읽음
   - pdf/ppt/pptx: `officeparser`로 텍스트 추출 (최대 18,000자)
5. `lib/generatorAnalysis.ts` — 핵심 분석 로직
   - 추출 텍스트를 Gemini(`gemini-2.5-flash-lite`)에 프롬프트와 함께 전달
   - JSON 응답을 `normalizeAnalysis()`로 정규화 (누락 필드는 기본값 보강)
   - 산출물 유형(`assetType`)에 따라 `referenceNeeds.layout/image` 자동 판단
6. `lib/references.ts` — 플랫폼별(Dribbble/Behance/Mobbin/Pinterest/Figma Community/Google/GDWEB) 키워드를 검색 URL로 변환
7. `app/page.tsx`의 `Result` 컴포넌트가 결과 렌더링
   - Project 개요 / Reference Plan
   - Deliverables (구성 항목)
   - Design Criteria (판단 기준)
   - Keyword Groups (산출물형태/컬러무드/디자인/도메인)
   - Palette (5~6색)
   - Mood Board (3개 무드 선택)
   - Selected Mood (와이어프레임 미리보기 + 컬러 보정 브리프)
   - Implementation Check (샘플 구현 가능 여부)
   - References (플랫폼별 검색 링크)
   - Image Prompt Workshop (선택 무드 기반 이미지 프롬프트 3종 변형)

## 핵심 설정
- API Key: `.env.local`의 `GEMINI_API_KEY` (서버 환경변수, 브라우저 노출 금지)
- 모델: `gemini-2.5-flash-lite`
- 타입 정의: `types.ts`의 `GeneratorAnalysis`, `AnalyzeResponse`, `ReferenceGroup` 등
