// api/lib/redact.js
//
// PII redaction + stream re-hydration for AI chat.
//
// Two-stage privacy layer that runs BEFORE data leaves the server:
//   1. Redact — replace real PII values (names, AHV, IBAN, addresses …) with
//      deterministic placeholders (PERSON_1, AHV_1, …) so the cloud LLM never
//      sees identifying data.
//   2. Re-hydrate — as the model streams tokens back, swap any placeholders
//      in the response text back to the original real values before the
//      browser sees them.
//
// Works with every provider (Anthropic, OpenAI, Gemini, Ollama) because it
// sits around the SSE write path, not inside a provider SDK.
//
// Design notes:
//   • Structured pass uses the known profile schema (see PROFILE_PII_FIELDS).
//     100% reliable because we OWN the schema — no NER guessing.
//   • Free-text pass uses regex for Swiss AHV, IBAN, phone, email, credit card.
//     Catches PII typed mid-chat that isn't in the profile.
//   • Longest-first replacement avoids partial-match bugs
//     ("Hans Muster" must be replaced before "Hans" alone).
//   • Canton, marital status, religion, children, age are KEPT — they shape
//     tax advice and aren't identifying on their own.

'use strict';

// ─── Regex patterns for free-text PII ────────────────────────────────────────
// Ordered: longest/most-specific first so e.g. IBAN doesn't get partially
// matched by the phone regex.
const PII_PATTERNS = [
  // Swiss IBAN: CH + 2 check digits + 5 blocks of 4 digits + 1 (21 chars total, spaces optional)
  { kind: 'IBAN', pattern: /\bCH\d{2}(?:[\s-]?\d{4}){4}[\s-]?\d{1}\b/g },
  // Swiss AHV (new format): 756.XXXX.XXXX.XX
  { kind: 'AHV', pattern: /\b756\.\d{4}\.\d{4}\.\d{2}\b/g },
  // Credit card (Luhn not checked — regex only, 13–19 digits with optional separators)
  { kind: 'CARD', pattern: /\b(?:\d[ -]?){13,19}\b/g },
  // Email
  { kind: 'EMAIL', pattern: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g },
  // Swiss phone: +41 or 0041 or 0 prefix, then 9 digits with optional spaces
  { kind: 'PHONE', pattern: /(?:\+41|0041|\b0)\s?\d{2}\s?\d{3}\s?\d{2}\s?\d{2}\b/g },
];

// ─── Profile fields to redact, grouped by PII kind ───────────────────────────
// Values come from context._profile (built in src/FinanceApp.jsx). Fields not
// listed here (canton, maritalStatus, religion, children, gender, age …) are
// intentionally kept — they shape tax/finance advice and are not identifying.
const PROFILE_PII_FIELDS = {
  PERSON_FIRST: ['firstName'],
  PERSON_LAST:  ['lastName'],
  AHV:          ['ahvNumber'],
  IBAN:         ['iban'],
  ADDRESS:      ['address'],
  CITY:         ['city'],
  POSTAL:       ['postalCode'],
  COMPANY:      ['company', 'businessName'],
  EMAIL:        ['email'],
  PHONE:        ['phone', 'phoneNumber'],
};

// Fields to additionally run the free-text regex pass on (user-authored notes).
const PROFILE_FREETEXT_FIELDS = ['notes', 'businessProjects'];

// ─── Internal helpers ────────────────────────────────────────────────────────

function nextTag(counter, kind) {
  counter[kind] = (counter[kind] || 0) + 1;
  return `${kind}_${counter[kind]}`;
}

/**
 * Build the real→placeholder map from the structured profile object.
 * Also mints a combined "Hans Muster" entry so the full name is replaced
 * before the individual first/last fragments run.
 */
function buildMapFromProfile(profile) {
  const map = new Map();       // real → placeholder
  const counter = {};          // kind → last index issued

  if (!profile || typeof profile !== 'object') return { map, counter };

  // Full name first — longest-first replacement depends on this being present.
  const first = profile.firstName && String(profile.firstName).trim();
  const last  = profile.lastName  && String(profile.lastName).trim();
  if (first && last) {
    counter.PERSON = (counter.PERSON || 0) + 1;
    const idx = counter.PERSON;
    map.set(`${first} ${last}`, `PERSON_${idx}`);
    map.set(`${last}, ${first}`, `PERSON_${idx}`);  // "Muster, Hans" variant
    // Also index the parts so they're caught when mentioned alone.
    if (!map.has(first)) map.set(first, `PERSON_${idx}_FIRST`);
    if (!map.has(last))  map.set(last,  `PERSON_${idx}_LAST`);
  } else if (first) {
    map.set(first, nextTag(counter, 'PERSON_FIRST'));
  } else if (last) {
    map.set(last, nextTag(counter, 'PERSON_LAST'));
  }

  for (const [kind, fields] of Object.entries(PROFILE_PII_FIELDS)) {
    if (kind === 'PERSON_FIRST' || kind === 'PERSON_LAST') continue; // handled above
    for (const f of fields) {
      const v = profile[f];
      if (v === undefined || v === null) continue;
      const s = String(v).trim();
      if (s.length < 2) continue;          // skip junk/empty
      if (map.has(s)) continue;             // already mapped (alias)
      map.set(s, nextTag(counter, kind));
    }
  }

  return { map, counter };
}

/**
 * Apply the map to a string. Longest-first to avoid "Hans" stomping on
 * "Hans Muster". Uses String#split/join (not regex) so special chars in
 * keys (dots in AHV numbers, '@' in emails) don't need escaping.
 */
function applyMap(text, map) {
  if (!text || map.size === 0) return text;
  const entries = [...map.entries()].sort((a, b) => b[0].length - a[0].length);
  let out = text;
  for (const [real, placeholder] of entries) {
    if (!out.includes(real)) continue;
    out = out.split(real).join(placeholder);
  }
  return out;
}

/**
 * Run regex patterns over text. Each match is added to the map (so the
 * re-hydrator can restore it later) and replaced with a fresh placeholder.
 */
function applyPatterns(text, map, counter) {
  if (!text) return text;
  let out = text;
  for (const { kind, pattern } of PII_PATTERNS) {
    out = out.replace(pattern, (match) => {
      const trimmed = match.trim();
      if (map.has(trimmed)) return map.get(trimmed);
      const tag = nextTag(counter, kind);
      map.set(trimmed, tag);
      return tag;
    });
  }
  return out;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Redact the Finance Hub context blob that gets embedded in the system prompt.
 * Returns the redacted context plus the map needed to re-hydrate responses.
 *
 * Strategy: JSON.stringify → apply map → apply regex → JSON.parse. Running on
 * the stringified form catches PII anywhere in the nested structure (account
 * labels, scenario names, notes, …) without us having to enumerate every path.
 */
function redactContext(context) {
  const { map, counter } = buildMapFromProfile(context?._profile);

  // Pre-seed regex-detected PII from free-text profile fields so those values
  // get stable placeholders before the main pass.
  if (context?._profile) {
    for (const f of PROFILE_FREETEXT_FIELDS) {
      const v = context._profile[f];
      if (typeof v === 'string' && v.length > 0) applyPatterns(v, map, counter);
    }
  }

  const json = JSON.stringify(context);
  let redacted = applyMap(json, map);
  redacted = applyPatterns(redacted, map, counter);

  let redactedContext;
  try {
    redactedContext = JSON.parse(redacted);
  } catch {
    // Safety net: if a replacement somehow broke JSON escaping, fall back to
    // the map-only pass (no regex) which preserves structure.
    redactedContext = JSON.parse(applyMap(json, map));
  }

  return { redacted: redactedContext, map, counter };
}

/**
 * Redact a free-text user message, reusing a map built from the context so
 * the same real values keep the same placeholders across the whole request.
 */
function redactMessage(message, map, counter) {
  if (typeof message !== 'string' || !message) return message;
  let out = applyMap(message, map);
  out = applyPatterns(out, map, counter || {});
  return out;
}

/**
 * Redact conversation history in-place (only text content, never image/PDF
 * attachments). Mirrors the Anthropic-style block shape used in chat.js.
 */
function redactHistory(history, map, counter) {
  if (!Array.isArray(history)) return history;
  return history.map((msg) => {
    if (typeof msg?.content === 'string') {
      return { ...msg, content: redactMessage(msg.content, map, counter) };
    }
    if (Array.isArray(msg?.content)) {
      return {
        ...msg,
        content: msg.content.map((block) => {
          if (block?.type === 'text' && typeof block.text === 'string') {
            return { ...block, text: redactMessage(block.text, map, counter) };
          }
          return block;
        }),
      };
    }
    return msg;
  });
}

// ─── Streaming re-hydration ──────────────────────────────────────────────────

/**
 * Stateful re-hydrator for streamed deltas. Placeholders ("PERSON_1", …) can
 * be split across SSE chunks, so we hold back the tail of the buffer (longer
 * than the longest placeholder) until the next chunk arrives. Flush at the
 * end emits whatever remains.
 */
class StreamRehydrator {
  constructor(map) {
    // Reverse the map: placeholder → real
    this.pairs = [...map.entries()]
      .map(([real, placeholder]) => [placeholder, real])
      .sort((a, b) => b[0].length - a[0].length);
    this.placeholders = this.pairs.map(([p]) => p);
    this.buffer = '';
  }

  /**
   * Absorb a new delta, return whatever is safe to emit.
   *
   * Algorithm: append to buffer, replace all COMPLETE placeholders, then
   * compute the longest suffix that could be the start of any placeholder
   * ("risky tail") and hold only that back for the next chunk. This way we
   * emit as much as possible as soon as possible without ever slicing
   * through the middle of a placeholder.
   */
  push(delta) {
    if (!delta) return '';
    this.buffer += delta;
    const replaced = this._replace(this.buffer);
    const tailLen = this._riskyTailLength(replaced);
    const emit = replaced.slice(0, replaced.length - tailLen);
    this.buffer = replaced.slice(replaced.length - tailLen);
    return emit;
  }

  /**
   * Emit everything remaining, after final replacement.
   */
  flush() {
    const remainder = this._replace(this.buffer);
    this.buffer = '';
    return remainder;
  }

  _replace(text) {
    if (!text) return text;
    let out = text;
    for (const [placeholder, real] of this.pairs) {
      if (!out.includes(placeholder)) continue;
      out = out.split(placeholder).join(real);
    }
    return out;
  }

  /**
   * Longest K such that text.slice(-K) is a strict prefix of some placeholder.
   * If the buffer currently ends with, say, "PER", we must hold it back because
   * the next chunk might bring "SON_1" and form "PERSON_1". But "Paris" ending
   * in "s" does not start any placeholder → K = 0, nothing held back.
   */
  _riskyTailLength(text) {
    let maxK = 0;
    for (const placeholder of this.placeholders) {
      const limit = Math.min(placeholder.length - 1, text.length);
      for (let k = limit; k > maxK; k--) {
        if (text.endsWith(placeholder.slice(0, k))) {
          maxK = k;
          break;
        }
      }
    }
    return maxK;
  }
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  redactContext,
  redactMessage,
  redactHistory,
  StreamRehydrator,
  // Exported for tests
  _internal: { buildMapFromProfile, applyMap, applyPatterns, PII_PATTERNS, PROFILE_PII_FIELDS },
};
