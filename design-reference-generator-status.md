# Design Reference Generator 진행 상태

## 현재 방향

설계 문서를 입력하면 산출물 유형을 판단하고, UI 레이아웃 변형과 키비주얼 방향으로 분리 생성한다.

커버 범위:

- 브로셔 / 리플렛 / 소개서
- 제안서 / 보고서
- 랜딩 페이지 / 웹사이트
- 대시보드 / 관리자 화면
- 포스터 / 홍보물
- 기타 디자인 산출물

## 단계별 전략

1. **Next/API 버전으로 기능 검증** ← 현재 단계 (핵심 기능 구현 완료, 실 API 라이브 검증 진행 중)
2. zip 배포로 소규모 테스트 — Next 앱 + README + 샘플 문서 압축 배포, 팀원 피드백 수집
3. 설치형 앱으로 전환 — 검증 후 Tauri 또는 Electron 검토

## 구현 완료 기능

### 기반 파이프라인
- `.md / .txt / .pdf / .ppt / .pptx` 업로드 → `officeparser` 서버 텍스트 추출 (최대 60,000자)
- `lib/promptMasking.ts` — Gemini 전송 전 이메일/전화/IP/API 키 패턴 마스킹
- `lib/assetProfile.ts` — `assetType` → `projectKind`(ui/visual/mixed) · `domainHint` 단일 판단
- `lib/generatorAnalysis.ts` — Gemini(`gemini-2.5-flash-lite`) 분석 → UI 방향/키비주얼 방향 분리
- `lib/references.ts` — direction별 플랫폼 검색 URL 생성 (Dribbble/Behance/Mobbin/Pinterest/Figma Community/GDWEB 등)
- 레퍼런스 플랫폼 키워드 sanitize — 기술용어 체인 유출 차단 (Behance 등에서 "KPI 자동측정 솔루션" 같은 내부 키워드 노출 방지)

### Layout Variants (Phase 1 — Deliverable-scoped, 2026-06-23 완료)
Deliverable마다 전용 구조 풀(3개)을 갖는 구조로 재설계. 이전에는 방향 전역 4개 풀이 고정돼 있어 Deliverable 선택이 미리보기 구조에 전혀 영향을 주지 않던 버그 해결.

#### document 전용 15종 taxonomy
| Archetype | 구조 후보 3개 |
|---|---|
| cover (표지) | `cover-logotype` / `cover-full-bleed` / `cover-minimal-text` |
| toc (목차·소개) | `numbered-list` / `timeline` / `card-grid` |
| body (본문, 기본값) | `split-content` / `editorial-grid` / `page-spread` |
| closing (차별화·결론) | `infographic-page` / `comparison-table` / `vision-statement` |

제안서 추가 구조: `proposal-section` / 보고서 추가 구조: `report-page` / 포스터 추가 구조: `poster-layout`

#### 비문서형 (dashboard/app 등)
| Archetype | 구조 후보 |
|---|---|
| main | `generic-dashboard` / `kpi-wall` / `command-center` |
| list | `generic-list` |
| detail | `generic-detail` |

#### marketing-web 전용 (2026-06-25 신설)
| Archetype | 구조 후보 3개 |
|---|---|
| web-main | `hero-banner` / `split-hero` / `section-stack` |

웹사이트/홈페이지/랜딩 문서를 분석해도 대시보드 와이어프레임이 나오던 구조적 빈틈 해결.

### Phase 2 — 실데이터 Preview 라우트 (2026-06-24 완료)
"새 탭에서 보기" 버튼이 blob HTML 방식에서 React 라우트(`/preview/[id]`) 방식으로 전환.

- `DeliverableContent`(title / body / imageHint) — Gemini가 문서 원문 그대로 추출
- `app/preview/[id]/page.tsx` — sessionStorage에서 `PreviewPayload`를 읽어 와이어프레임 + 실데이터 패널 렌더
- `lib/previewStorage.ts` — sessionStorage 키 포맷 단일 관리
- 다운로드 버튼(`handleDownload`)은 blob HTML 방식 그대로 유지 (파일 공유 목적)

### 기타 수정
- 문서 텍스트 추출 상한 18,000 → 60,000자 증량 (대용량 PPTX 커버)
- Gemini 실제 에러 메시지 화면 노출 (이전엔 빈 응답으로 떨어지던 문제)
- `applyAssetTypeOverride()` 재분류 회귀 수정 — document/marketing-web/other 3분류 기준으로 통일

## 보류 중

- **Phase 2 5단계**: `buildHtml()` blob 다운로드 코드 중복 정리  
  → 현재 다운로드 버튼은 정상 동작 중. 테스트 후 제거/통합 여부 결정하기로 합의.

## 남은 것 (우선순위 순)

1. **실 Gemini API 라이브 테스트** — 실제 문서(PPTX/PDF)로 Gemini 응답 품질 확인  
   (06-25에 엠큐닉 PPTX로 시도 → 구글 503 서버 혼잡으로 fallback 경로만 확인, 재시도 필요)
2. README 작성
3. zip 배포용 폴더 구성 (2단계 진행 전)

## 중요한 판단 기준

- 민감하거나 비공개 설계 문서는 무료 Gemini API에 넣지 않는다.
- 공용 PC에서는 API key 저장 옵션을 사용하지 않는다.
- 팀 배포 전에는 zip 배포로 먼저 테스트한다.
- 계속 쓸 도구로 판단되면 설치형 앱으로 전환한다.
