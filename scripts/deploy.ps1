$ErrorActionPreference = "Stop"

if (-not (Test-Path "$PSScriptRoot\..\.env")) {
    throw "Missing .env. Copy .env.example to .env and fill the LLM settings before starting Docker Compose."
}

Set-Location (Join-Path $PSScriptRoot "..")
docker compose config | Out-Null
docker compose up -d --build

$healthy = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        $response = Invoke-RestMethod "http://127.0.0.1:8000/api/health"
        if ($response.status -eq "ok") { $healthy = $true; break }
    } catch { Start-Sleep -Seconds 2 }
}

if (-not $healthy) {
    docker compose logs --tail=100
    throw "Backend health check failed."
}

Write-Host "TINA Demo services are running. Existing Nginx must include deploy/nginx.conf."
