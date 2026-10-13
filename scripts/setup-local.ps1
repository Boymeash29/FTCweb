$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
  $prodEnv = Join-Path $root ".env.production.private"
  $localEnv = Join-Path $root ".env.local"

  if ((Test-Path -LiteralPath $localEnv) -and -not (Test-Path -LiteralPath $prodEnv)) {
    Copy-Item -LiteralPath $localEnv -Destination $prodEnv
    Write-Output "Preserved the previous environment in the ignored .env.production.private file."
  }

  $cli = @("exec", "--yes", "--package=supabase@2.120.0", "--", "supabase")
  & npm @cli stop | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Could not stop the existing local Supabase stack." }
  $startOutput = & npm @cli start
  if ($LASTEXITCODE -ne 0) { throw "Could not start the local Supabase stack." }

  $statusOutput = & npm @cli status --output env
  if ($LASTEXITCODE -ne 0) { throw "Could not read local Supabase settings." }
  $status = @{}
  foreach ($line in $statusOutput) {
    if ($line -match '^(?<name>[A-Z_]+)=(?<value>.*)$') {
      $status[$matches.name] = $matches.value.Trim('"')
    }
  }
  if (-not $status.API_URL -or -not $status.PUBLISHABLE_KEY -or -not $status.SECRET_KEY -or -not $status.ANON_KEY) {
    throw "Supabase CLI did not return the local API, Auth, and Storage settings."
  }
  $apiUri = [Uri]$status.API_URL
  if ($apiUri.Scheme -ne 'http' -or -not $apiUri.IsLoopback) {
    throw "Refusing to configure a non-local Supabase URL."
  }

  $adminRandom = New-Object byte[] 36
  $cronRandom = New-Object byte[] 36
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $rng.GetBytes($adminRandom)
  $rng.GetBytes($cronRandom)
  $rng.Dispose()
  $adminPassword = [Convert]::ToBase64String($adminRandom).TrimEnd('=').Replace('+', 'c').Replace('/', 'd')
  $cronSecret = [Convert]::ToBase64String($cronRandom).TrimEnd('=').Replace('+', 'e').Replace('/', 'f')
  $envText = @(
    "NEXT_PUBLIC_SUPABASE_URL=$($status.API_URL)"
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$($status.PUBLISHABLE_KEY)"
    "SUPABASE_SECRET_KEY=$($status.SECRET_KEY)"
    "NEXT_PUBLIC_SITE_URL=http://localhost:3000"
    "CRON_SECRET=$cronSecret"
    "R2_ACCOUNT_ID=local"
    "R2_ACCESS_KEY_ID=stub"
    "R2_SECRET_ACCESS_KEY=$($status.ANON_KEY)"
    "R2_BUCKET=robotics"
    "R2_PUBLIC_BASE_URL="
    "R2_ENDPOINT=$($status.API_URL.TrimEnd('/'))/storage/v1/s3"
    "R2_REGION=local"
    "LOCAL_ADMIN_EMAIL=local-admin@localhost.test"
    "LOCAL_ADMIN_PASSWORD=$adminPassword"
  ) -join "`n"
  [IO.File]::WriteAllText($localEnv, $envText + "`n", (New-Object System.Text.UTF8Encoding($false)))

  Get-Content -Raw supabase\seed.local.sql | docker exec -i supabase_db_website psql -v ON_ERROR_STOP=1 -U postgres -d postgres
  if ($LASTEXITCODE -ne 0) { throw "Could not initialize local object storage." }
  & node --env-file=.env.local scripts/create-local-admin.mjs
  if ($LASTEXITCODE -ne 0) { throw "Could not initialize the local CMS admin account." }

  Write-Output "Local stack is ready. The generated local-only CMS password is in the ignored .env.local file under LOCAL_ADMIN_PASSWORD."
  Write-Output "Open Supabase Studio at http://127.0.0.1:54323 and email testing at http://127.0.0.1:54324."
} finally {
  Pop-Location
}
