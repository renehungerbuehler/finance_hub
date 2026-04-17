#!/usr/bin/env bash
# Peak Privacy API spike — answers the open questions before we write the provider handler.
#
# Usage:
#   export PP_TOKEN='your_token_here'
#   bash scripts/peakprivacy-spike.sh
#
# Writes one JSON file per probe into ./pp-spike-out/ so you can paste the dir listing
# or the individual files back into the chat.

set -uo pipefail

: "${PP_TOKEN:?Set PP_TOKEN env var with your Peak Privacy API token}"

BASE='https://api.peakprivacy.ch/v1'
OUT='pp-spike-out'
mkdir -p "$OUT"

# ── Auth-header detection ────────────────────────────────────────────────
# First run of the spike came back with 401 on every probe, so the header
# format may be wrong. Walk through the common variants against the cheapest
# endpoint (/ai/models) and pick the first that doesn't 401.
#
# Variants tried (in order):
#   A. Api-token: <token>               (what Google's indexed docs showed)
#   B. Authorization: Bearer <token>    (OpenAI / industry standard)
#   C. X-Api-Key: <token>
#   D. Authorization: <token>           (bare, no "Bearer")
#   E. ?api_token=<token> query param

detect_auth() {
  local url="$BASE/ai/models"
  local name status
  for variant in \
      "A|Api-token: $PP_TOKEN" \
      "B|Authorization: Bearer $PP_TOKEN" \
      "C|X-Api-Key: $PP_TOKEN" \
      "D|Authorization: $PP_TOKEN"; do
    name="${variant%%|*}"
    hdr="${variant#*|}"
    status=$(curl -sS -o /dev/null -w '%{http_code}' \
      -H "$hdr" -H 'Accept: application/json' "$url")
    echo "  variant $name  [$(echo "$hdr" | cut -d: -f1)]  →  HTTP $status" >&2
    if [ "$status" != "401" ] && [ "$status" != "403" ]; then
      echo "$hdr"
      return 0
    fi
  done
  # Last resort: query param
  status=$(curl -sS -o /dev/null -w '%{http_code}' \
    -H 'Accept: application/json' "$url?api_token=$PP_TOKEN")
  echo "  variant E  [?api_token=…]  →  HTTP $status" >&2
  if [ "$status" != "401" ] && [ "$status" != "403" ]; then
    echo "QUERY"
    return 0
  fi
  return 1
}

echo "── 00-auth-detect ──"
echo "Walking through auth header variants against $BASE/ai/models …" >&2
if AUTH_HDR=$(detect_auth); then
  if [ "$AUTH_HDR" = "QUERY" ]; then
    echo "  ✓ Token accepted as ?api_token= query param"
    USE_QUERY=1
  else
    echo "  ✓ Token accepted with header:  $(echo "$AUTH_HDR" | cut -d: -f1)"
    USE_QUERY=0
  fi
else
  echo "  ✗ All auth variants returned 401/403."
  echo "    → This token is most likely a BROWSER SESSION JWT, not an API token."
  echo "    → Log into treuhandsuisse.peakprivacy.ch → Settings → API Tokens"
  echo "      (or equivalent) and generate a real API token."
  echo "    → Still running probes with the original Api-token: header so you"
  echo "      can see endpoint existence (401 = endpoint exists, 404 = doesn't)."
  AUTH_HDR="Api-token: $PP_TOKEN"
  USE_QUERY=0
fi
echo

hdr=(-H "$AUTH_HDR"
     -H 'X-Requested-With: XMLHttpRequest'
     -H 'Accept: application/json'
     -H 'Content-Type: application/json')

probe() {
  local name="$1"; shift
  echo "── $name ──"
  local body_file="$OUT/$name.body.json"
  local meta_file="$OUT/$name.meta.txt"
  curl -sS -o "$body_file" \
       -w "HTTP_STATUS=%{http_code}\nCONTENT_TYPE=%{content_type}\nTIME_TOTAL=%{time_total}\n" \
       "$@" > "$meta_file"
  cat "$meta_file"
  echo "  body → $body_file ($(wc -c < "$body_file") bytes)"
  # Show first 400 chars so the user sees it immediately in terminal
  head -c 400 "$body_file"; echo; echo
}

echo
echo "============================================================"
echo " Peak Privacy API spike  ($(date -u +%FT%TZ))"
echo "============================================================"
echo

# ── 1. List models  ────────────────────────────────────────────
probe "01-models" -X GET "$BASE/ai/models" "${hdr[@]}"

# ── 2. List assistants / constructors (endpoint name guessed; try 2 variants) ──
probe "02-assistants" -X GET "$BASE/ai/assistants" "${hdr[@]}"
probe "03-constructors" -X GET "$BASE/ai/constructors" "${hdr[@]}"

# ── 4. Account / quota info (endpoint name guessed) ────────────
probe "04-account" -X GET "$BASE/account" "${hdr[@]}"
probe "05-usage"   -X GET "$BASE/usage"   "${hdr[@]}"

# ── 6. Minimal completion, non-streaming, gpt-eu ───────────────
probe "06-completion-gpt-eu" -X POST "$BASE/ai/completions" "${hdr[@]}" \
  --data-raw '{
    "model": "gpt-eu",
    "messages": [{"role":"user","content":"Reply with the single word: pong"}],
    "max_tokens": 10,
    "anonymize": false
  }'

# ── 7. Same with anonymize=true + PII probe ────────────────────
# Should see name/AHV stripped in request logs, re-hydrated in response.
probe "07-anonymize" -X POST "$BASE/ai/completions" "${hdr[@]}" \
  --data-raw '{
    "model": "gpt-eu",
    "messages": [{"role":"user","content":"My name is Hans Muster, AHV 756.1234.5678.90, IBAN CH93 0076 2011 6238 5295 7. Please repeat my AHV number back to me."}],
    "max_tokens": 80,
    "anonymize": true
  }'

# ── 8. Streaming test ──────────────────────────────────────────
echo "── 08-streaming ──"
echo "Raw first 600 bytes of streamed response (watching for 'data:' SSE frames):"
curl -sS -N -X POST "$BASE/ai/completions" "${hdr[@]}" \
  --data-raw '{
    "model": "gpt-eu",
    "messages": [{"role":"user","content":"Count from 1 to 5, one number per line."}],
    "max_tokens": 40,
    "stream": true
  }' 2>&1 | head -c 600 > "$OUT/08-streaming.body.txt"
cat "$OUT/08-streaming.body.txt"; echo; echo

# ── 9. Attachment / file-upload endpoint probe ─────────────────
# Try the common patterns. These should 404 or 401/403 with a hint.
probe "09-files-get"  -X GET  "$BASE/files" "${hdr[@]}"
probe "10-uploads-get" -X GET "$BASE/uploads" "${hdr[@]}"

# ── 11. Try OpenAI-style inline image block (base64 1x1 PNG) ───
# If accepted, Peak Privacy mirrors OpenAI's vision schema and we get image support for free.
PNG_B64='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
probe "11-inline-image" -X POST "$BASE/ai/completions" "${hdr[@]}" \
  --data-raw "{
    \"model\": \"gpt-eu\",
    \"messages\": [{
      \"role\": \"user\",
      \"content\": [
        {\"type\":\"text\",\"text\":\"What color is this image?\"},
        {\"type\":\"image_url\",\"image_url\":{\"url\":\"data:image/png;base64,$PNG_B64\"}}
      ]
    }],
    \"max_tokens\": 40
  }"

# ── 12. Try Anthropic-style image block (different schema) ─────
probe "12-anthropic-style-image" -X POST "$BASE/ai/completions" "${hdr[@]}" \
  --data-raw "{
    \"model\": \"gpt-eu\",
    \"messages\": [{
      \"role\": \"user\",
      \"content\": [
        {\"type\":\"text\",\"text\":\"What color is this image?\"},
        {\"type\":\"image\",\"source\":{\"type\":\"base64\",\"media_type\":\"image/png\",\"data\":\"$PNG_B64\"}}
      ]
    }],
    \"max_tokens\": 40
  }"

echo
echo "============================================================"
echo " Done.  All results in ./$OUT/"
echo "============================================================"
echo
echo "Paste the output above (or zip and share ./$OUT) — that answers:"
echo "  • Which model IDs exist  (01)"
echo "  • Whether Constructors/Assistants are API-exposed  (02–03)"
echo "  • Quota/plan info  (04–05)"
echo "  • gpt-eu works  (06)"
echo "  • anonymize behavior  (07)"
echo "  • Streaming support  (08)"
echo "  • File upload endpoint shape  (09–10)"
echo "  • Which multimodal schema they follow  (11–12)"
