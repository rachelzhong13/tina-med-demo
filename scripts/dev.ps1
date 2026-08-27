$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "backend"
$python = Join-Path $backend ".venv\Scripts\python.exe"
if (-not (Test-Path $python)) {
    $python = (Get-Command python).Source
}

Write-Host "Starting product API on http://127.0.0.1:8001"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$backend'; & '$python' -m uvicorn app.product_api:app --reload --port 8001"

Write-Host "Starting Chat API on http://127.0.0.1:8002"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$backend'; `$env:PRODUCT_API_BASE_URL='http://127.0.0.1:8001'; & '$python' -m uvicorn app.chat_api:app --reload --port 8002"

Write-Host "Starting frontend on http://127.0.0.1:5173"
Set-Location (Join-Path $root "frontend")
npm run dev
