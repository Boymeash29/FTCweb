$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
  $container = docker ps --filter "name=^/supabase_db_website$" --format "{{.Names}}"
  if ($LASTEXITCODE -ne 0 -or -not $container) {
    throw "Start the local Supabase stack first with npm run local:setup."
  }
  Get-Content -Raw supabase\seed.local.sql | docker exec -i $container psql -v ON_ERROR_STOP=1 -U postgres -d postgres
  if ($LASTEXITCODE -ne 0) { throw "Could not initialize local Supabase Storage policies." }
} finally {
  Pop-Location
}
