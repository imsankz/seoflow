param()
$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not (Get-Command bash -ErrorAction SilentlyContinue)) {
  Write-Error 'bash is required to run the SeoFlow installer. Install Git Bash or WSL and try again.'
  exit 1
}

& bash (Join-Path $scriptDir 'install.sh')
exit $LASTEXITCODE
