param(
  [string]$BaseUrl = 'http://127.0.0.1:8000'
)

$ErrorActionPreference = 'Stop'

function Get-Token([string]$chatId, [string]$username) {
  $body = ('{"telegram_chat_id":"' + $chatId + '","username":"' + $username + '","first_name":"Smoke"}')
  $r = Invoke-WebRequest -Method Post -Uri "$BaseUrl/api/v1/auth/telegram" -ContentType 'application/json' -Body $body -TimeoutSec 20
  ($r.Content | ConvertFrom-Json).access_token
}

function Promote-Admin([int64]$chatId) {
  $repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
  $backend = Join-Path $repoRoot 'backend'
  Push-Location $backend
  try {
    $py = if (Test-Path '.\\venv\\Scripts\\python.exe') { '.\\venv\\Scripts\\python.exe' } else { 'python' }
    $code = @"
import asyncio
from sqlalchemy import text
from app.database import engine

async def main():
    async with engine.begin() as conn:
        await conn.execute(
            text('UPDATE users SET is_admin = TRUE WHERE telegram_chat_id = :cid'),
            {'cid': $chatId}
        )

asyncio.run(main())
print('OK promoted')
"@
    & $py -c $code
  } finally {
    Pop-Location
  }
}

function Resolve-Path([string]$pathTemplate, [int64]$userId, [int64]$adminId) {
  $path = $pathTemplate

  # Common replacements
  $path = $path -replace '\\{user_id\\}', [string]$userId
  $path = $path -replace '\\{month\\}', '2025-12'
  $path = $path -replace '\\{currency\\}', 'KGS'

  # Generic numeric ids
  foreach ($name in @('id','expense_id','income_id','goal_id','debt_id','transaction_id','recurring_id','category_id','notification_id','report_id')) {
    $path = $path -replace ('\\{' + $name + '\\}'), '1'
  }

  # Fallback: any remaining {something} -> 1
  $path = [regex]::Replace($path, '\\{[^}]+\\}', '1')
  return $path
}

# 1) OpenAPI
$openapi = Invoke-RestMethod -Uri "$BaseUrl/openapi.json" -TimeoutSec 20

# 2) Tokens
$userToken = Get-Token '9990001' 'smoke_user'
$adminToken = Get-Token '9990002' 'smoke_admin'
Promote-Admin 9990002
$adminToken = Get-Token '9990002' 'smoke_admin'

$userMe = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/v1/auth/me" -Headers @{ Authorization = "Bearer $userToken" } -TimeoutSec 20
$adminMe = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/v1/auth/me" -Headers @{ Authorization = "Bearer $adminToken" } -TimeoutSec 20

$userId = [int64]$userMe.user_id
$adminId = [int64]$adminMe.user_id

# 3) Collect operations
$ops = @()
foreach ($pathProp in $openapi.paths.PSObject.Properties) {
  $pathTemplate = $pathProp.Name
  $methodsObj = $pathProp.Value
  foreach ($mProp in $methodsObj.PSObject.Properties) {
    $method = $mProp.Name.ToUpperInvariant()
    if ($method -notin @('GET','POST','PUT','PATCH','DELETE','OPTIONS','HEAD')) { continue }
    $op = $mProp.Value
    $tags = if ($op.tags) { ($op.tags -join ',') } else { '' }
    $ops += [PSCustomObject]@{
      Method = $method
      PathTemplate = $pathTemplate
      Tags = $tags
      Summary = if ($op.summary) { $op.summary } else { '' }
      HasBody = [bool]$op.requestBody
    }
  }
}
$ops = $ops | Sort-Object PathTemplate, Method

# 4) Execute
$results = New-Object System.Collections.Generic.List[object]
foreach ($op in $ops) {
  $useAdmin = $op.Tags -match 'Admin'
  $token = if ($useAdmin) { $adminToken } else { $userToken }
  $headers = @{ Authorization = "Bearer $token" }

  $path = Resolve-Path $op.PathTemplate $userId $adminId
  $url = "$BaseUrl$path"

  $code = 0
  $err = ''

  try {
    if ($op.Method -in @('POST','PUT','PATCH')) {
      $body = '{}'  # smoke payload
      $resp = Invoke-WebRequest -Method $op.Method -Uri $url -Headers $headers -ContentType 'application/json' -Body $body -TimeoutSec 20
    } else {
      $resp = Invoke-WebRequest -Method $op.Method -Uri $url -Headers $headers -TimeoutSec 20
    }
    $code = [int]$resp.StatusCode
  } catch {
    $resp = $_.Exception.Response
    if ($resp) {
      try { $code = [int]$resp.StatusCode } catch { $code = 0 }
    }
    $err = $_.Exception.Message
  }

  $results.Add([PSCustomObject]@{
    Method = $op.Method
    Path = $path
    Tags = $op.Tags
    Code = $code
    Error = $err
  })
}

# 5) Report
$ts = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
$fail = $results | Where-Object { $_.Code -ge 500 -or $_.Code -eq 0 }

$reportLines = @()
$reportLines += "API smoke report @ $ts"
$reportLines += "BaseUrl: $BaseUrl"
$reportLines += "Total routes: $($results.Count)"
$reportLines += "Failures (>=500 or 0): $(@($fail).Count)"
$reportLines += ''
$reportLines += 'Top failures:'
$reportLines += ($fail | Select-Object -First 30 | ForEach-Object { "[$($_.Code)] $($_.Method) $($_.Path) ($($_.Tags)) :: $($_.Error)" })
$reportLines += ''
$reportLines += 'All results:'
$reportLines += ($results | ForEach-Object { "[$($_.Code)] $($_.Method) $($_.Path) ($($_.Tags))" })

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$outPath = Join-Path $repoRoot 'docs\api_smoke_report.txt'
$reportLines | Out-File -FilePath $outPath -Encoding utf8

Write-Output "Wrote report: $outPath"
Write-Output "Failures: $(@($fail).Count)"
if (@($fail).Count -gt 0) {
  $fail | Select-Object -First 20 | Format-Table -AutoSize | Out-String -Width 400 | Write-Output
}
