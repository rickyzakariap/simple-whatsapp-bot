'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { pairingOptions, createPairingHandler } = require('../src/lib/pairing');

test('code mode uses a supported Windows Chrome companion instead of the bot name as OS', () => {
  const entry = readFileSync(join(__dirname, '..', 'index.js'), 'utf8');
  assert.match(entry, /browser:\s*options\?\.mode === 'code'\s*\?\s*\['Windows', 'Chrome', '[0-9.]+'\]/);
});

test('default pairing mode normalizes an international phone number', () => {
  assert.deepEqual(pairingOptions({ phone: '+62 812-0000-0000', isTTY: true }), {
    mode: 'code', phone: '6281200000000'
  });
});

test('QR mode needs no phone number', () => {
  assert.deepEqual(pairingOptions({ mode: 'qr', isTTY: true }), { mode: 'qr' });
});

test('invalid modes and ambiguous numbers are rejected before connecting', () => {
  assert.throws(() => pairingOptions({ mode: 'other', isTTY: true }), /PAIRING_MODE/);
  for (const phone of ['', '081200000000', '6281x00000000', '+62 8+12', '6281200000000000']) {
    assert.throws(() => pairingOptions({ phone, isTTY: true }), /PAIRING_PHONE/);
  }
});

test('fresh pairing requires a terminal but existing sessions do not', () => {
  for (const mode of ['qr', 'code']) {
    assert.throws(() => pairingOptions({ mode }), /terminal/);
  }
  for (const creds of [{ registered: true }, { account: {} }]) {
    assert.equal(pairingOptions({ creds }), null);
  }
  assert.notEqual(pairingOptions({ creds: { me: { id: 'pending' } }, mode: 'qr', isTTY: true }), null);
});

test('pairing code waits for real registration readiness and is requested once per socket', async () => {
  const events = [];
  const handle = createPairingHandler({
    options: { mode: 'code', phone: '6281200000000' },
    requestCode: async phone => { events.push(phone); return 'DUMMY123'; },
    showCode: code => events.push(code),
    showQr: qr => events.push(qr)
  });
  await handle({ connection: 'connecting' });
  assert.deepEqual(events, []);
  await Promise.all([handle({ qr: 'first' }), handle({ qr: 'second' })]);
  assert.deepEqual(events, ['6281200000000', 'DUMMY123']);
});

test('QR mode renders refreshed QR data without asking for a pairing code', async () => {
  const events = [];
  const handle = createPairingHandler({
    options: { mode: 'qr' },
    requestCode: () => assert.fail('unexpected code request'),
    showQr: qr => events.push(qr)
  });
  await handle({ qr: 'first' });
  await handle({ qr: 'second' });
  await handle({ isNewLogin: true });
  await handle({ qr: 'stale' });
  assert.deepEqual(events, ['first', 'second']);
});

test('a code arriving after socket close is not displayed', async () => {
  let resolveCode;
  const pending = new Promise(resolve => { resolveCode = resolve; });
  const handle = createPairingHandler({
    options: { mode: 'code' },
    requestCode: () => pending,
    showCode: () => assert.fail('stale code displayed')
  });
  const request = handle({ qr: 'ready' });
  await handle({ connection: 'close' });
  resolveCode('DUMMY123');
  await request;
});

test('a rejected code request after socket close does not report a second failure', async () => {
  let rejectCode;
  const pending = new Promise((_, reject) => { rejectCode = reject; });
  const handle = createPairingHandler({
    options: { mode: 'code' },
    requestCode: () => pending,
    showCode: () => assert.fail('stale code displayed')
  });
  const request = handle({ qr: 'ready' });
  await handle({ connection: 'close' });
  rejectCode(new Error('closed'));
  await request;
});

test('pairing failure reaches caller without retrying on each QR refresh', async () => {
  let requests = 0;
  const handle = createPairingHandler({
    options: { mode: 'code' },
    requestCode: async () => { requests++; throw new Error('connection closed'); },
    showCode: () => assert.fail('unexpected code display')
  });
  await assert.rejects(handle({ qr: 'ready' }), /connection closed/);
  await handle({ qr: 'refresh' });
  assert.equal(requests, 1);
});
