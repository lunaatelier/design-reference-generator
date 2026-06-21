# /time — AI 협업 세션 종료 및 시간 산정

다음 순서로 세션을 종료하고 시간을 산정합니다. 프로젝트명은 `design-reference-generator`으로 고정되어 있습니다.

## 1. 현재 KST 시각 확인

```powershell
Get-Date -Format "yyyy-MM-dd HH:mm:ss (ddd)"
```

## 2. 사용 도구 감지 및 JSONL 선택

```powershell
$workspace = @("D:\workspace", "C:\workspace", "$env:USERPROFILE\workspace") |
    Where-Object { Test-Path $_ } | Select-Object -First 1

# Claude Code JSONL
$encoded = $workspace -replace ":", "-" -replace "\\", "-"
$claudeFile = Get-ChildItem "$env:USERPROFILE\.claude\projects\$encoded" -Filter "*.jsonl" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1

# Codex JSONL (오늘 날짜 폴더)
$today = Get-Date
$codexDir = "$env:USERPROFILE\.codex\sessions\$($today.Year)\$($today.Month.ToString('00'))\$($today.Day.ToString('00'))"
$codexFile = if (Test-Path $codexDir) {
    Get-ChildItem $codexDir -Filter "*.jsonl" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
} else { $null }

# 더 최근에 수정된 파일을 현재 세션으로 판단
if ($codexFile -and $claudeFile) {
    if ($codexFile.LastWriteTime -gt $claudeFile.LastWriteTime) {
        $tool = "Codex"; $sessionFile = $codexFile
    } else {
        $tool = "Claude Code"; $sessionFile = $claudeFile
    }
} elseif ($codexFile) {
    $tool = "Codex"; $sessionFile = $codexFile
} else {
    $tool = "Claude Code"; $sessionFile = $claudeFile
}

Write-Output "감지된 도구: $tool"
Write-Output "세션 파일: $($sessionFile.Name)"
```

## 3. 사용자 메시지 타임스탬프 추출

```powershell
$lines = Get-Content $sessionFile.FullName | Where-Object { $_ -ne "" }
$userTimes = @()

foreach ($line in $lines) {
    try {
        $obj = $line | ConvertFrom-Json
        # Claude Code: type="user", message.role="user"
        # Codex:       type="event_msg", payload.type="user_message"
        $isUser = ($obj.type -eq "user" -and $obj.message.role -eq "user") -or
                  ($obj.type -eq "event_msg" -and $obj.payload.type -eq "user_message")
        if ($isUser) {
            $kst = [datetime]::Parse($obj.timestamp).AddHours(9)
            $userTimes += $kst
        }
    } catch {}
}
$userTimes | ForEach-Object { $_.ToString("HH:mm:ss") }
```

## 4. IDLE_CAP 적용 및 능동시간 계산

추출한 타임스탬프 목록에서 순서대로 gap을 계산하고 합산합니다.

```
공식: AI 협업 사람 능동시간 = Σ min(gap_i, 10분)
- gap_i ≤ 10분 → 전량 포함
- gap_i > 10분 → 10분만 포함 (자리비움 처리)
```

첫 번째 메시지는 gap 계산 대상 제외 (기준점).

## 5. 이번 세션 작업 요약

현재 대화 내용을 바탕으로 이번 세션에서 수행한 작업을 3~5줄로 요약합니다.
민감 정보(전체 경로, 계정명 등)는 마스킹합니다.

## 6. 주차 계산 및 파일 경로 결정

```powershell
$workspace = @("D:\workspace", "C:\workspace", "$env:USERPROFILE\workspace") |
    Where-Object { Test-Path $_ } | Select-Object -First 1

$today = Get-Date
$dow = [int]$today.DayOfWeek
$daysSinceSat = ($dow - 6 + 7) % 7
$weekStart = $today.AddDays(-$daysSinceSat).ToString("yyyy-MM-dd")
$weekEnd = $today.AddDays(-$daysSinceSat + 6).ToString("yyyy-MM-dd")
Write-Output "$weekStart ~ $weekEnd"
```

파일 경로: `$workspace\work-log\design-reference-generator\session_[weekStart].md`

폴더가 없으면 생성 후 파일을 새로 만들고, 있으면 기존 파일에 누적 추가합니다.

## 7. 세션 로그 파일에 기록

파일이 없으면 헤더를 먼저 작성합니다:

```
# design-reference-generator — AI 협업 세션 로그
## 주간: [weekStart](토) ~ [weekEnd](금)

---
```

이어서 아래 형식으로 세션 내용을 추가합니다 (감지된 도구 이름 포함):

```
### [YYYY-MM-DD (요일)] 세션 N [Claude Code / Codex]
- AI 협업 사람 능동시간: XX분
- 세션 시간: HH:MM ~ HH:MM (KST)
- 작업 내용:
  - [왜 요청했는지 + 무엇을 바꿨는지 형태로 기술]
  - ...

```

오늘이 **금요일**이면 주간 합계를 파일 끝에 추가합니다:

```
---
## 주간 합계
- 총 AI 협업 사람 능동시간: XX분
- 세션 수: N개 (Claude Code N개 / Codex N개)
- 집계 기간: [weekStart](토) ~ [weekEnd](금)
- 기준: IDLE_CAP 10분, KST 기준
```

## 8. 결과 출력

```
✅ 세션 종료
프로젝트      : design-reference-generator
도구          : [Claude Code / Codex]
세션 시간     : HH:MM ~ HH:MM (KST)
AI 협업 사람 능동시간 : XX분
저장          : work-log/design-reference-generator/session_[weekStart].md
```
