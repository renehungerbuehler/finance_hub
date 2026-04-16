// api/lib/scan-attachment.js
//
// Pre-send attachment scan: OCR the file locally on the server, detect PII
// using the same regex patterns as redact.js, and return a summary of what's
// inside the file so the user can decide whether to send it to the cloud
// provider.
//
// Binary attachments (PDF, PNG, JPG, …) cannot be masked on the fly — they go
// to the provider as-is. This module gives users informed consent: they see
// exactly what sensitive data the file contains before clicking Send.
//
// Extraction strategy:
//   • PDF  → `pdf-parse` (pulls embedded text layer, handles 95% of tax docs
//            and bank statements which are generated, not scanned)
//   • Image→ system `tesseract` binary via child_process (eng+deu+fra+ita)
//   • Text → decoded directly from the base64 payload
//
// Detection: same Swiss-native patterns (AHV, IBAN, phone) + regex (email,
// credit card) + profile-value match (first/last name, address, city) so the
// set of "found" items matches what redact.js would have hidden if the file
// content had been typed directly into the chat.

'use strict';

const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const execFileP = promisify(execFile);

const PII_PATTERNS = [
  { kind: 'iban',  pattern: /\bCH\d{2}(?:[\s-]?\d{4}){4}[\s-]?\d{1}\b/g },
  { kind: 'ahv',   pattern: /\b756\.\d{4}\.\d{4}\.\d{2}\b/g },
  { kind: 'card',  pattern: /\b(?:\d[ -]?){13,19}\b/g },
  { kind: 'email', pattern: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g },
  { kind: 'phone', pattern: /(?:\+41|0041|\b0)\s?\d{2}\s?\d{3}\s?\d{2}\s?\d{2}\b/g },
];

function isTextType(type) {
  if (!type) return false;
  return type.startsWith('text/')
    || type === 'application/json'
    || type === 'text/csv';
}

// ─── Extractors ──────────────────────────────────────────────────────────────

async function extractPdfText(base64) {
  // Lazy-require so the server still boots if the dep is missing — we just
  // can't scan PDFs until someone installs it.
  let pdfParse;
  try { pdfParse = require('pdf-parse'); }
  catch { throw new Error('pdf-parse not installed — run `npm i pdf-parse` in api/'); }
  const buf = Buffer.from(base64, 'base64');
  const result = await pdfParse(buf);
  return result.text || '';
}

async function ocrImage(base64, mimeType) {
  const ext = (mimeType.split('/')[1] || 'png').split('+')[0];
  const tmpName = crypto.randomBytes(8).toString('hex');
  const tmpPath = path.join(os.tmpdir(), `scan-${tmpName}.${ext}`);
  try {
    await fs.writeFile(tmpPath, Buffer.from(base64, 'base64'));
    const { stdout } = await execFileP(
      'tesseract',
      [tmpPath, '-', '-l', 'eng+deu+fra+ita'],
      { timeout: 30000, maxBuffer: 5 * 1024 * 1024 },
    );
    return stdout;
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error('tesseract binary not found on this server. Install with `apk add tesseract-ocr` or equivalent, or use a PDF with an embedded text layer.');
    }
    throw err;
  } finally {
    try { await fs.unlink(tmpPath); } catch {}
  }
}

// ─── Detection ──────────────────────────────────────────────────────────────

function detectPII(text, profile) {
  const findings = {
    ahv: [], iban: [], email: [], phone: [], card: [],
    names: [], addresses: [],
  };
  if (!text || typeof text !== 'string') return findings;

  // Regex pass
  for (const { kind, pattern } of PII_PATTERNS) {
    pattern.lastIndex = 0;
    const matches = text.match(pattern);
    if (matches) findings[kind] = [...new Set(matches.map((m) => m.trim()))];
  }

  // Profile-based pass — only includes values the user has entered into their
  // own profile AND that actually appear in the attachment.
  if (profile && typeof profile === 'object') {
    const names = new Set();
    const first = profile.firstName && String(profile.firstName).trim();
    const last  = profile.lastName  && String(profile.lastName).trim();
    if (first && last) {
      const full = `${first} ${last}`;
      if (text.includes(full)) names.add(full);
    }
    if (first && first.length > 1 && text.includes(first)) names.add(first);
    if (last  && last.length  > 1 && text.includes(last))  names.add(last);
    findings.names = [...names];

    const addresses = new Set();
    for (const f of ['address', 'city', 'postalCode']) {
      const v = profile[f];
      if (v && String(v).length > 2 && text.includes(String(v))) {
        addresses.add(String(v));
      }
    }
    findings.addresses = [...addresses];
  }

  return findings;
}

// ─── Public entry point ─────────────────────────────────────────────────────

async function scanAttachment(attachment, profile) {
  const { name = 'file', type = '', data = '' } = attachment || {};
  if (!data) return { supported: false, reason: 'no data' };

  let text = '';
  let method = 'unknown';
  let extractionError = null;

  try {
    if (type === 'application/pdf') {
      text = await extractPdfText(data);
      method = 'pdf-parse';
    } else if (type.startsWith('image/')) {
      text = await ocrImage(data, type);
      method = 'tesseract';
    } else if (isTextType(type)) {
      text = Buffer.from(data, 'base64').toString('utf8');
      method = 'text';
    } else {
      return { supported: false, reason: `unsupported type: ${type}` };
    }
  } catch (err) {
    extractionError = err.message;
  }

  // If extraction failed or returned nothing, surface that honestly —
  // a PDF with no text layer (scanned, pure image) will come back empty
  // and we want the user to know we couldn't verify it.
  if (extractionError || !text.trim()) {
    return {
      supported: true,
      name, type,
      method,
      extractionError,
      extractionEmpty: !extractionError && !text.trim(),
      findings: { ahv: [], iban: [], email: [], phone: [], card: [], names: [], addresses: [] },
      totalFindings: 0,
    };
  }

  const findings = detectPII(text, profile);
  const totalFindings = Object.values(findings).reduce((s, a) => s + a.length, 0);

  return {
    supported: true,
    name, type,
    method,
    textLength: text.length,
    totalFindings,
    findings,
    textPreview: text.slice(0, 300),
  };
}

module.exports = {
  scanAttachment,
  detectPII,
  _internal: { PII_PATTERNS, isTextType, extractPdfText, ocrImage },
};
