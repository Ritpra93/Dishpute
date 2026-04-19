#!/usr/bin/env bash
# Idempotent demo prep: set VOICE_ESCALATE_URL on the web side and seed the DB.
# Does NOT start ngrok (free-tier URLs change each boot — operator pastes the
# URL) and does NOT start the servers (run them in their own terminals so you
# see live stdout during rehearsal).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB_ENV="$ROOT/apps/web/.env.local"

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <ngrok-public-url>"
  echo "  e.g. $0 https://abc123.ngrok-free.app"
  exit 1
fi
NGROK="$1"

touch "$WEB_ENV"
# Remove any existing VOICE_ESCALATE_URL line, then append the new one. Without
# this, repeated runs pile up duplicates in .env.local.
grep -v '^VOICE_ESCALATE_URL=' "$WEB_ENV" > "$WEB_ENV.tmp" || true
mv "$WEB_ENV.tmp" "$WEB_ENV"
echo "VOICE_ESCALATE_URL=$NGROK/calls/outbound" >> "$WEB_ENV"

echo "Seeding demo DB..."
pnpm --filter @counter/web exec tsx scripts/seed-demo.ts

cat <<EOF

Web env updated. VOICE_ESCALATE_URL=$NGROK/calls/outbound

Next, in two separate terminals:
  pnpm --filter @counter/voice dev
  pnpm --filter @counter/web dev

Also update apps/voice/.env.local with:
  NGROK_PUBLIC_URL=$NGROK
  DOORDASH_SUPPORT_NUMBER=+1...   (the phone that rings on stage)

And in the ElevenLabs dashboard, point the agent's tool webhooks at:
  $NGROK/tools/lookup_case
  $NGROK/tools/reference_evidence
  $NGROK/tools/escalate_to_supervisor
  $NGROK/webhooks/elevenlabs/post-call
EOF
