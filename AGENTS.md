<!-- ai-worklog:start -->
# Work-Log Session Rules (design-reference-generator)

이 프로젝트(`design-reference-generator`)에서 사용자가 `/timestart`, `/time`, `/w-note`를 입력하면 아래 규칙을 따른다.

## 공통 기준

- 시간대는 KST 기준으로 처리한다.
- AI 협업 사람 능동시간은 `IDLE_CAP = 10분` 기준으로 계산한다.
- 공식은 `AI 협업 사람 능동시간 = Σ min(gap_i, 10분)`이다.
- AI 응답 생성 시간, 도구 실행 시간, 접속 유지 시간은 능동시간에서 제외한다.
- 원본 세션 로그, 전체 로컬 경로, 계정명, 세션 ID는 기록하지 않는다.
- 산정 기준 상세 문서: workspace 루트 기준 `work-log\template\ai-time-standard.md`.
- 기록 저장 위치: workspace 루트 기준 `work-log\design-reference-generator\`.

## `/timestart`

1. 현재 KST 시각을 확인한다.
2. 프로젝트명은 `design-reference-generator`으로 고정한다 (다시 묻지 않는다).
3. 세션 시작 상태를 현재 대화 안에서 유지한다.
4. 아래 형식으로 응답한다.

```text
세션 시작
프로젝트  : design-reference-generator
시작 시각 : [YYYY-MM-DD HH:mm] (KST)
기준      : IDLE_CAP 10분 / AI 응답·도구 실행 시간 제외

작업 목적을 알려주시면 시작하겠습니다.
```

## `/time`

1. 현재 KST 시각을 확인한다.
2. 현재 세션 도구를 Claude Code 또는 Codex로 식별한다.
3. `/timestart` 이후 사용자의 입력 간격을 기준으로 능동시간을 계산한다.
4. 정확한 메시지 타임스탬프에 접근할 수 없으면, 확인 가능한 대화 흐름과 시작/종료 시각을 기준으로 보수적으로 산정하고 그 사실을 짧게 알린다.
5. 이번 세션 작업 내용을 3~5줄로 요약한다.
6. 현재 주차를 토요일 시작, 금요일 종료로 계산한다.
7. `work-log\design-reference-generator\session_[weekStart].md` 파일에 세션 내용을 추가한다.
8. 오늘이 금요일이면 파일 끝에 주간 합계를 추가한다.
9. 아래 형식으로 응답한다.

```text
세션 종료
프로젝트      : design-reference-generator
도구          : [Claude Code / Codex]
세션 시간     : HH:mm ~ HH:mm (KST)
AI 협업 사람 능동시간 : XX분
저장          : work-log/design-reference-generator/session_[weekStart].md
```

## 세션 로그 파일 형식

파일이 없으면 먼저 아래 헤더를 만든다.

```markdown
# design-reference-generator — AI 협업 세션 로그
## 주간: [weekStart](토) ~ [weekEnd](금)

---
```

각 세션은 아래 형식으로 누적한다.

```markdown
### [YYYY-MM-DD (요일)] 세션 N [Claude Code / Codex]
- AI 협업 사람 능동시간: XX분
- 세션 시간: HH:mm ~ HH:mm (KST)
- 작업 내용:
  - [작업 요약 1]
  - [작업 요약 2]
  - [작업 요약 3]

```

금요일에는 필요한 경우 아래 주간 합계를 추가한다.

```markdown
---
## 주간 합계
- 총 AI 협업 사람 능동시간: XX분
- 세션 수: N개 (Claude Code N개 / Codex N개)
- 집계 기간: [weekStart](토) ~ [weekEnd](금)
- 기준: IDLE_CAP 10분, KST 기준
```

## `/w-note`

1. 현재 주차를 토요일 시작, 금요일 종료로 계산한다.
2. `work-log\design-reference-generator\session_[weekStart].md`를 읽는다.
3. 연구노트 초안을 작성해 사용자에게 확인받는다.
4. 확인 후 `work-log\design-reference-generator\research_[weekStart].md`에 저장한다.
<!-- ai-worklog:end -->

