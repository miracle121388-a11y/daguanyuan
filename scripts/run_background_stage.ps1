param(
  [Parameter(Mandatory)][ValidateSet('models:optimize','models:verify','models:views','models:ground','models:planting','models:planting:resume','models:understory','build','test:e2e')][string]$Stage,
  [Parameter(Mandatory)][ValidatePattern('^[a-z0-9][a-z0-9-]+$')][string]$Name
)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
$gardenStarted = [DateTime]::UtcNow.ToString('o')
$gardenExit = 1
try {
  # Windows PowerShell treats redirected native stderr as an error record.
  # Keep warnings in the log and use the actual npm exit code for the result.
  $ErrorActionPreference = 'Continue'
  & npm.cmd run $Stage *> (Join-Path 'reports/acceptance' ($Name + '.log'))
  $gardenExit = $LASTEXITCODE
  $ErrorActionPreference = 'Stop'
} catch {
  $_ | Out-String | Add-Content -LiteralPath (Join-Path 'reports/acceptance' ($Name + '.log'))
} finally {
  @{ stage=$Stage; name=$Name; startedAt=$gardenStarted; completedAt=[DateTime]::UtcNow.ToString('o'); exitCode=$gardenExit; processId=$PID } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path 'reports/acceptance' ($Name + '.status.json')) -Encoding utf8
}
exit $gardenExit
