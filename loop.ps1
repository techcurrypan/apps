# Run Claude Code until all phases are done.
# Stops only when: all phases are done (ALLDONE) or a spec decision is needed (DECISIONNEEDED).
# Everything else (usage limit, model or network errors, runs that made no progress) waits and retries.
# Keeps the PC awake while running. Every run's output is saved to a log file.
# Usage:
#   cd X:\git\apps
#   Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
#   .\loop.ps1

$Repo       = "X:\git\apps\devlearn"
$LogDir     = Join-Path $env:USERPROFILE "devlearn-loop-logs"   # outside the repository
$WaitMin    = 20      # wait after a limit or an error
$MaxRuns    = 3000
$PromptFile = "PROMPT.txt"

# Opus 5.5 pinned. Needs Claude Code v2.1.280 or later.
# Do NOT use fable here: in -p mode, Fable can bill usage credits without asking.
$Model  = "claude-opus-5-5"
$Effort = "high"

# Keep the PC awake (no sleep) while this script runs. Released when the window is closed.
Add-Type -Namespace Win32 -Name Power -MemberDefinition '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint esFlags);'
$ES_CONTINUOUS = [uint32]"0x80000000"; $ES_SYSTEM_REQUIRED = [uint32]"0x00000001"
[void][Win32.Power]::SetThreadExecutionState($ES_CONTINUOUS -bor $ES_SYSTEM_REQUIRED)

Set-Location $Repo
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

if (-not (Test-Path $PromptFile)) {
    Write-Host "PROMPT.txt not found: $PromptFile" -ForegroundColor Red
    exit 1
}

function Wait-Minutes($min, $why) {
    Write-Host ("{0}  {1} Waiting {2} min, then resuming." -f (Get-Date -Format 'MM/dd HH:mm'), $why, $min) -ForegroundColor Yellow
    Start-Sleep -Seconds ($min * 60)
}

$noProgress = 0
for ($i = 1; $i -le $MaxRuns; $i++) {
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $log   = Join-Path $LogDir ("run-{0}-{1}.log" -f $stamp, $i)
    Write-Host ""
    Write-Host ("===== run {0}  {1}  model={2} effort={3}  log={4} =====" -f $i, (Get-Date -Format 'MM/dd HH:mm'), $Model, $Effort, $log) -ForegroundColor Cyan

    $before = (& git rev-parse HEAD 2>$null | Out-String).Trim()
    $prompt = Get-Content $PromptFile -Raw -Encoding UTF8
    $out = & claude -p $prompt --model $Model --effort $Effort --dangerously-skip-permissions 2>&1 | Out-String
    $out | Out-File -FilePath $log -Encoding utf8
    Write-Host $out
    $after = (& git rev-parse HEAD 2>$null | Out-String).Trim()

    # The run is told to print only the word, so look at its last line only.
    $last = (($out.Trim() -split "`r?`n") | Select-Object -Last 1).Trim()
    if ($last -match "^ALLDONE\W*$") {
        Write-Host "All phases are done." -ForegroundColor Green
        break
    }
    if ($last -match "^DECISIONNEEDED\W*$") {
        Write-Host ""
        Write-Host "A spec decision is needed." -ForegroundColor Magenta
        Write-Host "1. Read the open items in X:\git\apps\devlearn\docs\decisions.md." -ForegroundColor Magenta
        Write-Host "2. Write your decision in the same item (which option, and why if needed)." -ForegroundColor Magenta
        Write-Host "3. Run .\loop.ps1 again." -ForegroundColor Magenta
        break
    }
    if ($before -ne $after) {
        # The run made a commit: keep going.
        $noProgress = 0
        Start-Sleep -Seconds 30
        continue
    }
    # No new commit: find out why, then wait or retry.
    if ($out -match "(?i)usage limit|session limit|rate limit|hit your limit|limit reached|limit will reset|resets at|out of (credits|usage)|credit balance") {
        Wait-Minutes $WaitMin "Usage limit."
        continue
    }
    if ($out -match "(?i)not a recognized model|issue with the selected model|does not support this model|overloaded|API Error|ECONNRESET|ETIMEDOUT|fetch failed|network error") {
        Wait-Minutes $WaitMin "Model, API or network error (see the log)."
        continue
    }
    $noProgress++
    if ($noProgress -ge 2) {
        Wait-Minutes $WaitMin ("No new commit in {0} runs in a row (see the logs)." -f $noProgress)
    } else {
        Start-Sleep -Seconds 60
    }
}
