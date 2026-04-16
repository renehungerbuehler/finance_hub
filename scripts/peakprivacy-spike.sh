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

hdr=(-H "Api-token: $PP_TOKEN"
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
