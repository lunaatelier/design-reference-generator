# Design Reference Generator 진행 상태

## 현재 방향

설계 문서를 입력하면 산출물 유형을 판단하고, 그에 맞는 레퍼런스 검색어와 무드보드 초안을 생성하는 도구로 진행한다.

중점은 대시보드 전용 자동화가 아니라 다음 산출물 전체를 커버하는 것이다.

- 브로셔 / 리플렛 / 소개서
- 제안서 / 보고서
- 랜딩 페이지 / 웹사이트
- 대시보드 / 관리자 화면
- 포스터 / 홍보물
- 기타 디자인 산출물

## 단계별 전략

1. Next/API 버전으로 기능 검증
   - 현재 진행 단계
   - 서버 API에서 `.md / .txt / .pdf / .ppt / .pptx` 텍스트 추출
   - 추출 텍스트를 Gemini로 분석
   - API key는 `.env.local`의 `GEMINI_API_KEY`로 관리
   - PPT/PPTX는 Gemini에 직접 첨부하지 않고 `officeparser`로 텍스트 추출
   - 브로셔 같은 비대시보드 산출물도 맞게 분류되는지 검증

2. zip 배포로 소규모 테스트
   - Next 앱, README, 샘플 문서를 압축해서 배포
   - 각 사용자가 `.env.local`에 자기 Gemini API key를 등록
   - 팀원 피드백으로 결과 품질과 사용성 확인

3. 설치형 앱으로 전환
   - 검증 후 Tauri 또는 Electron 기반 앱 검토
   - 최초 1회 API key 입력 후 사용자 PC에 저장
   - 결과 저장, PDF/PNG 내보내기, 히스토리 등 확장

## 현재 구현 상태

파일:

- `design-reference-generator.html`
- `app/page.tsx`
- `app/api/analyze/route.ts`
- `lib/extractText.ts`
- `lib/generatorAnalysis.ts`
- `lib/references.ts`

구현된 기능:

- Next 앱/API 기반 분석 경로 추가
- 서버에서 officeparser로 `.pdf / .ppt / .pptx` 텍스트 추출
- Gemini에는 원본 PPTX가 아니라 추출 텍스트를 전송
- Gemini API free tier 선택
- Groq free plan 선택
- API 없이 샘플 생성하는 manual 모드
- `.md / .txt / .pdf / .ppt / .pptx` 업로드
- Gemini 사용 시 PDF 원문을 inlineData로 전달
- PPT/PPTX는 Gemini inlineData MIME 미지원으로 직접 전송하지 않고, 텍스트 붙여넣기 또는 PDF 변환을 안내
- 분석 API key 브라우저 저장 옵션
- 이미지 API key 브라우저 저장 옵션
- Pexels / Unsplash 분위기 이미지 선택 연동
- Dribbble / Behance / Mobbin / Pinterest / Figma Community 검색 링크 생성
- 홈페이지/랜딩/이벤트 페이지 진행 시 GDWEB 검색 링크 생성
- 컬러 팔레트, 구성/산출물 유형, 작업 방향, 무드 카드, 이미지 프롬프트 출력
- 산출물 형태 / 컬러 무드 / 디자인 키워드 / 도메인 키워드 분리 출력
- 보조 이미지 후보 클릭 시 해당 이미지 검색어 기반 프롬프트 3종 생성
- JSON 저장
- 폰트 최소 크기 조정
  - 기본 폰트 16px
  - 라벨/보조 텍스트 최소 14px

최근 수정:

- 단일 HTML의 PPTX inlineData 방식 대신 `recommender`와 같은 서버 텍스트 추출 방식으로 전환
- `officeparser` 기반 PPT/PPTX/PDF 추출 API 추가
- Next 화면에서 generator형 결과 레이아웃 렌더링
- `design-reference-recommender`의 키워드 분리 관점을 generator에 흡수
- 기술 자료 추천은 제외하고 유사 프로젝트/UI/이미지 레퍼런스 중심으로 재정리
- UI 레퍼런스와 이미지 레퍼런스 두 가지 목적만 유지
- 레퍼런스 검색어가 산출물 유형과 도메인을 같이 포함하도록 프롬프트 보강
- 브로셔 PDF에서 대시보드 샘플이 표시되는 문제 대응
- 결과 라벨을 `화면 유형`에서 `구성/산출물 유형`으로 변경
- AI 프롬프트에 산출물 유형 판단 규칙 추가
- 브로셔/리플렛/소개서/PDF 홍보물용 구성 기준 추가
  - Cover
  - Intro Spread
  - Content Spread
  - Infographic
  - CTA / Contact

## 아직 확인해야 할 것

- 실제 Gemini API key로 브로셔 PDF 분석 테스트
- 실제 PPTX로 officeparser 추출 및 Gemini 분석 테스트
- 브로셔 외 제안서/보고서/랜딩/대시보드 문서 테스트
- Gemini 무료 티어에서 PDF 크기와 응답 품질 확인
- Pexels 또는 Unsplash key로 이미지 로드 확인
- 결과 JSON 저장 파일이 실무 재사용에 충분한지 확인

## 중요한 판단 기준

- 개인 테스트/PoC는 현재 HTML 방식으로 진행한다.
- 팀 배포 전에는 zip 배포로 먼저 테스트한다.
- 계속 쓸 도구로 판단되면 설치형 앱으로 전환한다.
- 민감하거나 비공개 설계 문서는 무료 Gemini API에 넣지 않는다.
- 공용 PC에서는 API key 저장 옵션을 사용하지 않는다.

## 다음 작업 후보

- 실제 브로셔 PDF로 Gemini 분석 테스트
- 산출물 유형 선택 드롭다운 추가 검토
- 결과 화면에서 `구성/산출물 유형` 단위가 자연스럽게 보이도록 개선
- README 작성
- zip 배포용 폴더 구성
