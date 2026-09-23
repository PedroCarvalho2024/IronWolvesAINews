<#
.SYNOPSIS
  Publish the IronWolves newsletter: sync with GitHub, build the site locally, commit new content, push.
  GitHub Actions then rebuilds and deploys to Pages.

.USAGE
  powershell -ExecutionPolicy Bypass -File scripts\publish.ps1
  powershell -ExecutionPolicy Bypass -File scripts\publish.ps1 -Message "digest 2026-09-23"
  powershell -ExecutionPolicy Bypass -File scripts\publish.ps1 -NoPush     # build + commit only
#>
param(
  [string]$Message = "",
  [switch]$NoPush
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$contentPaths = @("digests", "data", "memes", "assets", "src", "build.js")

# 1. Bring in anything committed elsewhere (GitHub web edits, teammates' merged PRs) before we
#    build, so the page includes it and the push is a fast-forward. Local uncommitted changes are
#    stashed around the pull and restored afterwards.
Write-Host "==> Syncing with GitHub" -ForegroundColor Cyan
git fetch origin
if ($LASTEXITCODE -ne 0) { throw "fetch failed (offline?)" }
git pull --rebase --autostash origin main
if ($LASTEXITCODE -ne 0) {
  git rebase --abort 2>$null
  throw "pull --rebase failed: the same file was changed here and on GitHub. Fix the conflict by hand (git status), then rerun."
}

# 2. Build.
Write-Host "==> Building site" -ForegroundColor Cyan
node build.js
if ($LASTEXITCODE -ne 0) { throw "build failed" }

# 3. Commit any new content.
$status = git status --porcelain -- $contentPaths
if (-not $status) {
  Write-Host "==> Nothing new to commit" -ForegroundColor Yellow
} else {
  if (-not $Message) {
    $changedDigest = $status | Where-Object { $_ -match 'digests/ai-digest-(\d{4}-\d{2}-\d{2})\.md' } |
      ForEach-Object { $Matches[1] } | Sort-Object | Select-Object -Last 1
    if ($changedDigest) { $Message = "digest $changedDigest" } else { $Message = "update content $(Get-Date -Format yyyy-MM-dd)" }
  }
  Write-Host "==> Committing: $Message" -ForegroundColor Cyan
  git add -- $contentPaths
  git commit -m $Message
  if ($LASTEXITCODE -ne 0) { throw "commit failed" }
}

# 4. Push whatever is ahead of origin (this commit, or an earlier one whose push failed).
$ahead = git rev-list --count origin/main..HEAD
if ([int]$ahead -eq 0) {
  Write-Host "==> Already up to date with GitHub" -ForegroundColor Yellow
  exit 0
}
if ($NoPush) { Write-Host "==> Skipping push (-NoPush), $ahead commit(s) waiting" -ForegroundColor Yellow; exit 0 }

Write-Host "==> Pushing $ahead commit(s)" -ForegroundColor Cyan
git push origin main
if ($LASTEXITCODE -ne 0) { throw "push failed" }
Write-Host "==> Done. GitHub Actions will deploy to Pages in about a minute." -ForegroundColor Green
