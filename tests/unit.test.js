const { test } = require('node:test');
const assert = require('node:assert/strict');

const permissions = require('../src/lib/permissions');
const { getMessageText, getQuotedMessage, getMessageType } = require('../src/lib/message');
const catalog = require('../src/lib/command-catalog');
const apiManager = require('../src/lib/api-manager');
const autoresponder = require('../src/lib/autoresponder');
const { getDateParts, safeTimezone } = require('../src/lib/time');

test('normalizes device suffixes without merging LID and phone JIDs', () => {
  assert.equal(permissions.normalizeJid('628123:12@s.whatsapp.net'), '628123@s.whatsapp.net');
  assert.equal(permissions.normalizeJid('123456:2@lid'), '123456@lid');
  assert.equal(
    permissions.sameJid('628123:7@s.whatsapp.net', '628123@s.whatsapp.net'),
    true
  );
  assert.equal(permissions.sameJid('123456@lid', '123456@s.whatsapp.net'), false);
});

test('TikTok downloader only accepts HTTPS links to TikTok posts', () => {
  const { isValidTikTokUrl } = require('../src/lib/ytdlp');
  assert.equal(isValidTikTokUrl('https://vt.tiktok.com/AbCd123/'), true);
  assert.equal(isValidTikTokUrl('https://www.tiktok.com/@demo/video/1234567'), true);
  for (const url of ['http://vt.tiktok.com/AbCd123/', 'https://tiktok.com.example.com/AbCd123/', 'https://www.tiktok.com/@demo', 'https://user@vt.tiktok.com/AbCd123/', 'https://vt.tiktok.com:8443/AbCd123/']) {
    assert.equal(isValidTikTokUrl(url), false);
  }
});

test('converts phone numbers and mentions to JIDs', () => {
  assert.equal(permissions.phoneToJid('08123-4567-890'), '6281234567890@s.whatsapp.net');
  assert.equal(permissions.phoneToJid('@628123456789'), '628123456789@s.whatsapp.net');
  assert.equal(permissions.phoneToJid('not a number'), null);
});

test('detects owner using the bot account or OWNER_NUMBER', () => {
  const sock = { user: { id: '628111:3@s.whatsapp.net' } };
  assert.equal(permissions.isOwner(sock, { key: { participant: '628111@s.whatsapp.net' } }), true);
  assert.equal(permissions.isOwner(sock, { key: { participant: '628999@s.whatsapp.net' } }), false);
});

test('Baileys 6 phone aliases preserve owner permissions in group and direct chat', () => {
  const sock = { user: { id: '628111:3@s.whatsapp.net' } };
  const pn = '628111:4@s.whatsapp.net';
  assert.equal(permissions.isOwner(sock, { key: { remoteJid: '1@g.us', participant: '999@lid', participantPn: pn } }), true);
  assert.equal(permissions.isOwner(sock, { key: { remoteJid: '999@lid', senderPn: pn } }), true);
  assert.equal(permissions.isOwner(sock, { key: { remoteJid: '628111@lid' } }), false);
});

test('group metadata can resolve owner and admin without trusting bare LID digits', async () => {
  const sock = {
    user: { id: '628111@s.whatsapp.net' },
    groupMetadata: async () => ({ participants: [
      { id: '900@lid', jid: '628111@s.whatsapp.net' },
      { id: '901@lid', jid: '628222@s.whatsapp.net', admin: 'admin' },
      { id: '902@lid', jid: '628333@s.whatsapp.net' }
    ] })
  };
  const msg = participant => ({ key: { remoteJid: '1@g.us', participant } });
  assert.equal(await permissions.isOwnerOrGroupAdmin(sock, msg('900@lid'), '1@g.us'), true);
  assert.equal(await permissions.isGroupAdmin(sock, '1@g.us', '628222@s.whatsapp.net'), true);
  assert.equal(await permissions.isOwnerOrGroupAdmin(sock, msg('902@lid'), '1@g.us'), false);
});

test('checks group and bot admin with normalized JIDs', async () => {
  const sock = {
    user: { id: '628111:3@s.whatsapp.net' },
    groupMetadata: async () => ({
      participants: [
        { id: '628111:9@s.whatsapp.net', admin: 'admin' },
        { id: '628222@s.whatsapp.net', admin: null }
      ]
    })
  };
  assert.equal(await permissions.isGroupAdmin(sock, '1@g.us', '628222@s.whatsapp.net'), false);
  assert.equal(await permissions.isGroupAdmin(sock, '1@g.us', '628111@s.whatsapp.net'), true);
  assert.equal(await permissions.isBotAdmin(sock, '1@g.us'), true);
});

test('health monitor accepts Baileys WebSocket wrapper state', async t => {
  const health = require('../src/lib/connection-health');
  const warn = t.mock.method(console, 'warn', () => {});
  health.connectionOpened();
  await health.performHealthCheck({ ws: { isOpen: true } });
  assert.equal(warn.mock.callCount(), 0);
  await health.performHealthCheck({ ws: { isOpen: false } });
  assert.equal(warn.mock.callCount(), 1);
});

test('participant commands do not report success when WhatsApp rejects the action', async () => {
  const id = '628111@s.whatsapp.net';
  const key = { remoteJid: '1@g.us', participant: id };
  const sock = {
    user: { id },
    groupMetadata: async () => ({ participants: [{ id, admin: 'admin' }] }),
    groupParticipantsUpdate: async () => [{ status: '403' }],
    sendMessage: async (_, body) => assert.match(body.text, /Could not .*403/)
  };
  for (const name of ['add', 'kick', 'promote', 'demote']) {
    await require(`../src/commands/main/${name}`).execute(sock, { key }, ['6282220000']);
  }
});

test('reads text from plain, caption, ephemeral and view-once messages', () => {
  assert.equal(getMessageText({ conversation: 'hello' }), 'hello');
  assert.equal(getMessageText({ imageMessage: { caption: 'photo' } }), 'photo');
  assert.equal(getMessageText({ ephemeralMessage: { message: { extendedTextMessage: { text: 'secret' } } } }), 'secret');
  assert.equal(getMessageText({ viewOnceMessageV2: { message: { videoMessage: { caption: 'once' } } } }), 'once');
});

test('resolves mentions/replies through ephemeral wrappers', () => {
  const msg = {
    key: { remoteJid: '1@g.us' },
    message: {
      ephemeralMessage: {
        message: {
          extendedTextMessage: {
            text: '.kick',
            contextInfo: { mentionedJid: ['628222:4@s.whatsapp.net'] }
          }
        }
      }
    }
  };
  assert.equal(permissions.getTargetJid(msg, []), '628222@s.whatsapp.net');
});

test('reads quoted messages and their media type', () => {
  const msg = {
    key: { remoteJid: '1@g.us', id: 'new' },
    message: {
      extendedTextMessage: {
        text: '.sticker',
        contextInfo: {
          stanzaId: 'old',
          participant: '628222@s.whatsapp.net',
          quotedMessage: { imageMessage: { caption: 'quoted' } }
        }
      }
    }
  };
  const quoted = getQuotedMessage(msg);
  assert.equal(quoted.key.id, 'old');
  assert.equal(quoted.participant, '628222@s.whatsapp.net');
  assert.equal(getMessageType(quoted.message), 'imageMessage');
});

test('resolves a replied-to user as a command target', () => {
  const msg = {
    key: { remoteJid: '1@g.us' },
    message: {
      extendedTextMessage: {
        text: '.warn',
        contextInfo: { participant: '628333:8@s.whatsapp.net' }
      }
    }
  };
  assert.equal(permissions.getTargetJid(msg, []), '628333@s.whatsapp.net');
});

test('formats dates in the configured timezone', () => {
  const date = new Date('2026-10-20T00:30:00Z');
  const parts = getDateParts(date, 'Asia/Jakarta');
  assert.equal(parts.date, '2026-10-20');
  assert.equal(parts.mmdd, '10-20');
  assert.equal(parts.hhmm, '07:30');
  assert.equal(safeTimezone('Not/AZone'), 'UTC');
});

test('command catalog rejects path traversal', () => {
  assert.equal(catalog.isValidCommandName('../../../index'), false);
  assert.equal(catalog.getCommandMetadata('../../../index'), null);
  assert.equal(catalog.isValidCommandName('help'), true);
  assert.equal(catalog.getCommandMetadata('help').name, 'help');
});

test('API manager resolves relative CoinGecko paths under /api/v3', () => {
  assert.equal(
    apiManager.resolveUrl('/coins/markets'),
    'https://api.coingecko.com/api/v3/coins/markets'
  );
  assert.equal(
    apiManager.resolveUrl('search'),
    'https://api.coingecko.com/api/v3/search'
  );
});

test('autoresponder media paths cannot escape the uploads directory', () => {
  assert.equal(autoresponder.parseMediaFile('MEDIA_FILE:{"path":"../../etc/passwd"}'), null);
  assert.equal(autoresponder.parseMediaFile('hello'), null);
});
