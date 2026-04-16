// api/lib/redact.test.js — run with: node --test api/lib/redact.test.js

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { redactContext, redactMessage, redactHistory, StreamRehydrator } = require('./redact');

const SAMPLE_PROFILE = {
  firstName: 'Hans',
  lastName:  'Muster',
  birthDate: '15.03.1983',
  canton:    'ZH',
  city:      'Horgen',
  postalCode:'8810',
  address:   'Bahnhofstrasse 12',
  ahvNumber: '756.1234.5678.90',
  iban:      'CH93 0076 2011 6238 5295 7',
  company:   'Acme AG',
  email:     'hans.muster@example.ch',
  maritalStatus: 'married',
  children:  2,
  notes:     'Paid IBAN CH44 0000 1111 2222 3333 4 to vendor',
};

const SAMPLE_CONTEXT = {
  today: '2026-04-16',
  _profile: SAMPLE_PROFILE,
  accounts: [
    { label: 'Hans Savings Raiffeisen', balance: 45000 },
    { label: '3a at ZKB',               balance: 82000 },
  ],
  scenarios: [{ name: 'Muster household', income: 120000 }],
};

// ────────────────────────────────────────────────────────────────────────────

test('redactContext: replaces known PII with deterministic placeholders', () => {
  const { redacted, map } = redactContext(SAMPLE_CONTEXT);
  const json = JSON.stringify(redacted);

  // These MUST be gone
  assert.ok(!json.includes('Hans'),    'firstName must be redacted');
  assert.ok(!json.includes('Muster'),  'lastName must be redacted');
  assert.ok(!json.includes('756.1234.5678.90'), 'AHV must be redacted');
  assert.ok(!json.includes('Horgen'),  'city must be redacted');
  assert.ok(!json.includes('Acme AG'), 'company must be redacted');
  assert.ok(!json.includes('hans.muster@example.ch'), 'email must be redacted');
  assert.ok(!json.includes('Bahnhofstrasse'), 'address must be redacted');

  // These MUST remain (needed for tax advice)
  assert.ok(json.includes('"canton":"ZH"'),        'canton must be kept');
  assert.ok(json.includes('"maritalStatus":"married"'), 'marital status must be kept');
  assert.ok(json.includes('"children":2'),         'children count must be kept');
  assert.ok(json.includes('45000'),                'balances must be kept');
  assert.ok(json.includes('Raiffeisen'),           'bank institution is not PII');
  assert.ok(json.includes('ZKB'),                  'bank institution is not PII');

  // Map must contain the real→placeholder entries
  assert.equal(map.get('Hans Muster'), 'PERSON_1');
  assert.equal(map.get('756.1234.5678.90'), 'AHV_1');
});

test('redactContext: catches PII inside nested account labels', () => {
  const { redacted } = redactContext(SAMPLE_CONTEXT);
  const label = redacted.accounts[0].label;
  assert.ok(!label.includes('Hans'), `account label leaked name: ${label}`);
  assert.match(label, /PERSON_1(_FIRST)?/);
});

test('redactContext: detects free-text IBAN inside profile notes via regex', () => {
  const { map } = redactContext(SAMPLE_CONTEXT);
  // The IBAN in profile.notes is different from profile.iban — only catchable via regex.
  assert.ok(map.has('CH44 0000 1111 2222 3333 4'), 'notes IBAN must be detected');
});

test('redactContext: never produces invalid JSON', () => {
  const { redacted } = redactContext(SAMPLE_CONTEXT);
  assert.doesNotThrow(() => JSON.stringify(redacted));
});

test('redactContext: empty/missing profile does not crash', () => {
  assert.doesNotThrow(() => redactContext({}));
  assert.doesNotThrow(() => redactContext({ _profile: null }));
  assert.doesNotThrow(() => redactContext(null));
});

// ────────────────────────────────────────────────────────────────────────────

test('redactMessage: replaces profile values in user-typed text', () => {
  const { map, counter } = redactContext(SAMPLE_CONTEXT);
  const out = redactMessage('Hi, I am Hans Muster from Horgen', map, counter);
  assert.ok(!out.includes('Hans Muster'));
  assert.ok(!out.includes('Horgen'));
  assert.ok(out.includes('PERSON_1'));
});

test('redactMessage: catches free-text AHV / IBAN / email not in profile', () => {
  const { map, counter } = redactContext(SAMPLE_CONTEXT);
  const out = redactMessage(
    'Contact my neighbor at jane@example.org. Her AHV is 756.9999.8888.77.',
    map, counter,
  );
  assert.ok(!out.includes('jane@example.org'));
  assert.ok(!out.includes('756.9999.8888.77'));
  assert.match(out, /EMAIL_\d+/);
  assert.match(out, /AHV_\d+/);
});

test('redactMessage: same real value gets the same placeholder on repeat', () => {
  const { map, counter } = redactContext(SAMPLE_CONTEXT);
  const out1 = redactMessage('Email me at new@example.org', map, counter);
  const out2 = redactMessage('Actually: new@example.org again', map, counter);
  const m1 = out1.match(/EMAIL_\d+/)[0];
  const m2 = out2.match(/EMAIL_\d+/)[0];
  assert.equal(m1, m2, 'stable mapping across messages');
});

// ────────────────────────────────────────────────────────────────────────────

test('redactHistory: redacts text in Anthropic-style content blocks only', () => {
  const { map, counter } = redactContext(SAMPLE_CONTEXT);
  const history = [
    { role: 'user', content: 'Hi from Hans' },
    { role: 'assistant', content: [
      { type: 'text', text: 'Hello Hans Muster!' },
      { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AAA' } },
    ]},
  ];
  const out = redactHistory(history, map, counter);
  assert.ok(!out[0].content.includes('Hans'));
  assert.ok(!out[1].content[0].text.includes('Hans'));
  // Image block preserved unchanged
  assert.deepEqual(out[1].content[1], history[1].content[1]);
});

// ────────────────────────────────────────────────────────────────────────────

test('StreamRehydrator: restores placeholders in single-chunk output', () => {
  const map = new Map([['Hans Muster', 'PERSON_1'], ['756.1234.5678.90', 'AHV_1']]);
  const r = new StreamRehydrator(map);
  const full = 'Hello PERSON_1, your AHV_1 is fine.';
  let out = r.push(full);
  out += r.flush();
  assert.equal(out, 'Hello Hans Muster, your 756.1234.5678.90 is fine.');
});

test('StreamRehydrator: handles placeholders split across chunks', () => {
  const map = new Map([['Hans Muster', 'PERSON_1']]);
  const r = new StreamRehydrator(map);
  const chunks = ['Dear PER', 'SON', '_1, thanks', ' for your message.'];
  let accumulated = '';
  for (const c of chunks) accumulated += r.push(c);
  accumulated += r.flush();
  assert.equal(accumulated, 'Dear Hans Muster, thanks for your message.');
});

test('StreamRehydrator: passes through text with no placeholders', () => {
  const map = new Map([['Hans Muster', 'PERSON_1']]);
  const r = new StreamRehydrator(map);
  const text = 'This response mentions nothing personal at all.';
  let out = '';
  // Feed character by character — worst case for buffering.
  for (const ch of text) out += r.push(ch);
  out += r.flush();
  assert.equal(out, text);
});

test('StreamRehydrator: unknown placeholders in model output are left alone', () => {
  // Model hallucinated "PERSON_42" which isn't in our map — should pass through.
  const map = new Map([['Hans', 'PERSON_1']]);
  const r = new StreamRehydrator(map);
  let out = r.push('Hi PERSON_42 and PERSON_1');
  out += r.flush();
  assert.ok(out.includes('PERSON_42'), 'hallucinated placeholder unchanged');
  assert.ok(out.includes('Hans'),      'real placeholder restored');
});

// ────────────────────────────────────────────────────────────────────────────

test('end-to-end: redact → simulated model → rehydrate yields original values', () => {
  const { redacted, map, counter } = redactContext(SAMPLE_CONTEXT);
  const userMsg = redactMessage('Am I Hans Muster? AHV 756.1234.5678.90?', map, counter);

  // Verify model would receive no PII
  assert.ok(!userMsg.includes('Hans'));
  assert.ok(!userMsg.includes('756.1234.5678.90'));

  // Simulate the model echoing placeholders back across choppy chunks
  const modelOutput = `Yes ${redacted._profile.firstName} ${redacted._profile.lastName}, AHV ${redacted._profile.ahvNumber} is valid.`;
  const r = new StreamRehydrator(map);
  let emitted = '';
  // Split at an awkward point mid-placeholder
  const mid = Math.floor(modelOutput.length / 2);
  emitted += r.push(modelOutput.slice(0, mid));
  emitted += r.push(modelOutput.slice(mid));
  emitted += r.flush();

  assert.ok(emitted.includes('Hans'),  'first name restored');
  assert.ok(emitted.includes('Muster'), 'last name restored');
  assert.ok(emitted.includes('756.1234.5678.90'), 'AHV restored');
});
