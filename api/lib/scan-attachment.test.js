// api/lib/scan-attachment.test.js — run with: node --test api/lib/scan-attachment.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { scanAttachment, detectPII } = require('./scan-attachment');

const PROFILE = {
  firstName: 'Hans',
  lastName:  'Muster',
  address:   'Bahnhofstrasse 12',
  city:      'Horgen',
  postalCode:'8810',
};

// ─── detectPII ──────────────────────────────────────────────────────────────

test('detectPII: finds AHV, IBAN, email, phone in free text', () => {
  const text = `
    Vielen Dank für Ihren Auftrag.
    AHV-Nummer: 756.1234.5678.90
    IBAN: CH93 0076 2011 6238 5295 7
    Bitte kontaktieren Sie uns unter info@example.ch oder +41 44 123 45 67.
  `;
  const f = detectPII(text, null);
  assert.deepEqual(f.ahv,   ['756.1234.5678.90']);
  assert.deepEqual(f.iban,  ['CH93 0076 2011 6238 5295 7']);
  assert.deepEqual(f.email, ['info@example.ch']);
  assert.equal(f.phone.length, 1);
});

test('detectPII: flags profile values that appear in the attachment', () => {
  const text = 'Dear Hans Muster, living at Bahnhofstrasse 12, 8810 Horgen.';
  const f = detectPII(text, PROFILE);
  assert.ok(f.names.includes('Hans Muster'),  'full name detected');
  assert.ok(f.addresses.includes('Bahnhofstrasse 12'), 'address detected');
  assert.ok(f.addresses.includes('Horgen'),    'city detected');
  assert.ok(f.addresses.includes('8810'),      'postal code detected');
});

test('detectPII: does not flag profile values that do not appear', () => {
  const text = 'A totally anonymous memo about nothing.';
  const f = detectPII(text, PROFILE);
  assert.equal(f.names.length, 0);
  assert.equal(f.addresses.length, 0);
});

test('detectPII: deduplicates repeated matches', () => {
  const text = 'AHV 756.1234.5678.90 again AHV 756.1234.5678.90.';
  const f = detectPII(text, null);
  assert.equal(f.ahv.length, 1);
});

test('detectPII: handles empty / null input', () => {
  assert.deepEqual(detectPII('',  null).ahv, []);
  assert.deepEqual(detectPII(null, null).ahv, []);
  assert.deepEqual(detectPII(undefined, PROFILE).names, []);
});

// ─── scanAttachment — text path only (OCR/PDF paths need system binaries) ──

test('scanAttachment: text/plain file with PII is detected end-to-end', async () => {
  const body = 'Hi, I am Hans Muster and my AHV is 756.9999.8888.77.';
  const attachment = {
    name: 'memo.txt',
    type: 'text/plain',
    data: Buffer.from(body).toString('base64'),
  };
  const r = await scanAttachment(attachment, PROFILE);
  assert.equal(r.supported, true);
  assert.equal(r.method, 'text');
  assert.ok(r.totalFindings > 0);
  assert.ok(r.findings.names.includes('Hans Muster'));
  assert.ok(r.findings.ahv.includes('756.9999.8888.77'));
});

test('scanAttachment: CSV file content is scanned', async () => {
  const body = 'account,iban\nMain,CH93 0076 2011 6238 5295 7\n';
  const attachment = {
    name: 'accounts.csv',
    type: 'text/csv',
    data: Buffer.from(body).toString('base64'),
  };
  const r = await scanAttachment(attachment, null);
  assert.equal(r.supported, true);
  assert.equal(r.findings.iban.length, 1);
});

test('scanAttachment: JSON file content is scanned', async () => {
  const body = JSON.stringify({ email: 'hans@example.ch', phone: '+41 79 111 22 33' });
  const attachment = {
    name: 'export.json',
    type: 'application/json',
    data: Buffer.from(body).toString('base64'),
  };
  const r = await scanAttachment(attachment, null);
  assert.equal(r.supported, true);
  assert.equal(r.findings.email.length, 1);
  assert.equal(r.findings.phone.length, 1);
});

test('scanAttachment: clean text file reports zero findings', async () => {
  const body = 'Just some totally innocuous prose about the weather in April.';
  const attachment = {
    name: 'note.txt',
    type: 'text/plain',
    data: Buffer.from(body).toString('base64'),
  };
  const r = await scanAttachment(attachment, null);
  assert.equal(r.supported, true);
  assert.equal(r.totalFindings, 0);
});

test('scanAttachment: unsupported type returns supported=false', async () => {
  const r = await scanAttachment({
    name: 'binary.bin',
    type: 'application/octet-stream',
    data: 'AAAA',
  }, null);
  assert.equal(r.supported, false);
  assert.match(r.reason, /unsupported/);
});

test('scanAttachment: empty data returns supported=false', async () => {
  const r = await scanAttachment({ name: 'x.txt', type: 'text/plain', data: '' }, null);
  assert.equal(r.supported, false);
});
