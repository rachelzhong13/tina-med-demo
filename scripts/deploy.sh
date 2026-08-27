#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .env ]]; then
  echo "Missing .env. Copy .env.example to .env and fill the LLM settings." >&2
  exit 1
fi

docker compose config >/dev/null
docker compose up -d --build

for _ in $(seq 1 30); do
  if curl --fail --silent http://127.0.0.1:8001/api/health >/dev/null \
    && curl --fail --silent http://127.0.0.1:8002/api/health >/dev/null; then
    echo "TINA product and Chat APIs are running. Existing Nginx must include deploy/nginx.conf."
    exit 0
  fi
  sleep 2
done

docker compose logs --tail=100
echo "Backend health check failed." >&2
exit 1
