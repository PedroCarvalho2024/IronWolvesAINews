<#
.SYNOPSIS
  Publish the IronWolves newsletter: build the site locally, commit new content, push to GitHub.
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

Write-Host "==> Building site" -ForegroundColor Cyan
node build.js
if ($LASTEXITCODE -ne 0) { throw "build failed" }

$status = git status --porcelain -- digests data memes assets src build.js
if (-not $status) {
  Write-Host "==> Nothing new to publish" -ForegroundColor Yellow
  exit 0
}

if (-not $Message) {
  $latest = Get-ChildItem digests -Filter "ai-digest-*.md" | Sort-Object Name | Select-Object -Last 1
  if ($latest) { $Message = "digest $($latest.BaseName -replace '^ai-digest-','')" } else { $Message = "update content $(Get-Date -Format yyyy-MM-dd)" }
}

Write-Host "==> Committing: $Message" -ForegroundColor Cyan
git add digests data memes assets src build.js
git commit -m $Message
if ($LASTEXITCODE -ne 0) { throw "commit failed" }

if ($NoPush) { Write-Host "==> Skipping push (-NoPush)" -ForegroundColor Yellow; exit 0 }

Write-Host "==> Pushing" -ForegroundColor Cyan
git push
if ($LASTEXITCODE -ne 0) { throw "push failed" }
Write-Host "==> Done. GitHub Actions will deploy to Pages in about a minute." -ForegroundColor Green
