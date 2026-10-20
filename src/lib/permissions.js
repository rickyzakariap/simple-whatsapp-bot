const { jidNormalizedUser, isJidGroup } = require('@whiskeysockets/baileys');
const config = require('../../config');
const { getContextInfo: getMessageContextInfo } = require('./message');

/**
 * Normalize a WhatsApp JID.
 *
 * Baileys may expose the same user as `628123:12@s.whatsapp.net`,
 * `628123@s.whatsapp.net`, or `123456@lid`. Device suffixes must be stripped
 * before comparing IDs, but the server part must be kept because a LID is not
 * interchangeable with a phone-number JID.
 */
function normalizeJid(jid) {
  if (!jid || typeof jid !== 'string') return '';
  const value = jid.trim();
  if (!value) return '';

  try {
    return jidNormalizedUser(value);
  } catch {
    // Fallback for malformed/unknown JIDs.
    return value.replace(/:\d+(?=@)/, '');
  }
}

function getJidServer(jid) {
  const normalized = normalizeJid(jid);
  const at = normalized.lastIndexOf('@');
  return at === -1 ? '' : normalized.slice(at + 1).toLowerCase();
}

function getJidUser(jid) {
  const normalized = normalizeJid(jid);
  const at = normalized.lastIndexOf('@');
  return at === -1 ? normalized : normalized.slice(0, at);
}

/**
 * Compare two JIDs. Phone-number JIDs may have different device suffixes, but
 * a LID and a phone-number JID are deliberately not treated as the same user.
 */
function sameJid(a, b) {
  const left = normalizeJid(a);
  const right = normalizeJid(b);
  if (!left || !right) return false;
  if (left === right) return true;

  const leftServer = getJidServer(left);
  const rightServer = getJidServer(right);
  if (leftServer !== rightServer) return false;

  return getJidUser(left) === getJidUser(right);
}

function getSender(msg) {
  if (!msg || !msg.key) return '';
  return normalizeJid(
    msg.key.participant ||
    msg.key.participantAlt ||
    msg.key.remoteJid ||
    msg.key.remoteJidAlt ||
    ''
  );
}

/**
 * All identifiers that can represent the configured bot account.
 */
function getBotJids(sock) {
  const ids = new Set();
  const user = sock && sock.user;
  if (user) {
    for (const value of [user.id, user.lid, user.phoneNumber]) {
      const normalized = normalizeJid(value);
      if (normalized) ids.add(normalized);
    }
  }
  return [...ids];
}

/**
 * The owner is either the account the bot is running as, or an explicitly
 * configured OWNER_NUMBER. `participantAlt`/`remoteJidAlt` are checked too so
 * that LID-based group messages can still be matched to the owner's phone JID.
 */
function getOwnerJids(sock) {
  const ids = new Set(getBotJids(sock));
  for (const value of [
    config.ownerNumber ? `${String(config.ownerNumber).replace(/[^0-9]/g, '')}@s.whatsapp.net` : '',
    ...(config.ownerJids || [])
  ]) {
    const normalized = normalizeJid(value);
    if (normalized) ids.add(normalized);
  }
  return [...ids];
}

function isOwner(sock, msg) {
  const candidates = [
    msg && msg.key && msg.key.participant,
    msg && msg.key && msg.key.participantAlt,
    msg && msg.key && msg.key.remoteJid,
    msg && msg.key && msg.key.remoteJidAlt
  ].filter(Boolean);

  if (candidates.length === 0) return false;

  const ownerJids = getOwnerJids(sock);
  return candidates.some(candidate => ownerJids.some(owner => sameJid(candidate, owner)));
}

function isGroup(jid) {
  if (!jid) return false;
  try {
    return isJidGroup(jid);
  } catch {
    return String(jid).endsWith('@g.us');
  }
}

async function getGroupMetadata(sock, groupJid) {
  if (!sock || typeof sock.groupMetadata !== 'function' || !isGroup(groupJid)) return null;
  try {
    return await sock.groupMetadata(groupJid);
  } catch {
    return null;
  }
}

function findParticipant(metadata, jid) {
  if (!metadata || !Array.isArray(metadata.participants)) return null;
  const target = normalizeJid(jid);
  if (!target) return null;

  return metadata.participants.find(participant => {
    return [participant.id, participant.lid, participant.phoneNumber]
      .filter(Boolean)
      .some(value => sameJid(value, target));
  }) || null;
}

function participantIsAdmin(participant) {
  return Boolean(participant && (participant.admin === 'admin' || participant.admin === 'superadmin'));
}

async function isGroupAdmin(sock, groupJid, userJid) {
  if (!isGroup(groupJid) || !userJid) return false;
  const metadata = await getGroupMetadata(sock, groupJid);
  return participantIsAdmin(findParticipant(metadata, userJid));
}

async function isBotAdmin(sock, groupJid) {
  if (!isGroup(groupJid)) return false;
  const metadata = await getGroupMetadata(sock, groupJid);
  if (!metadata) return false;

  return getBotJids(sock).some(botJid => participantIsAdmin(findParticipant(metadata, botJid)));
}

async function isOwnerOrGroupAdmin(sock, msg, groupJid) {
  if (isOwner(sock, msg)) return true;
  return isGroupAdmin(sock, groupJid, getSender(msg));
}

function phoneToJid(input, defaultCountryCode = '62') {
  if (!input || typeof input !== 'string') return null;

  const trimmed = input.trim();
  if (/@(s\.whatsapp\.net|lid|g\.us)$/i.test(trimmed)) return normalizeJid(trimmed);

  let digits = trimmed.replace(/[^0-9]/g, '');
  if (!digits) return null;

  if (digits.startsWith('00')) digits = digits.slice(2);

  // Indonesian local numbers: 08xxx -> 628xxx.
  if (digits.startsWith('0') && defaultCountryCode) {
    digits = defaultCountryCode + digits.slice(1);
  }

  if (digits.length < 7 || digits.length > 15) return null;
  return `${digits}@s.whatsapp.net`;
}

function getContextInfo(msg) {
  return getMessageContextInfo(msg && msg.message);
}

/**
 * Resolve a target from a mention, a reply, or a phone number/JID argument.
 */
function getTargetJid(msg, args = []) {
  const context = getContextInfo(msg);
  if (context?.mentionedJid?.length) {
    return normalizeJid(context.mentionedJid[0]);
  }
  if (context?.participant) {
    return normalizeJid(context.participant);
  }

  for (const arg of args) {
    if (!arg || typeof arg !== 'string') continue;
    const resolved = phoneToJid(arg);
    if (resolved) return resolved;
  }

  return null;
}

function mentionJid(jid) {
  const normalized = normalizeJid(jid);
  return normalized ? `@${getJidUser(normalized)}` : '';
}

module.exports = {
  normalizeJid,
  sameJid,
  getSender,
  getBotJids,
  getOwnerJids,
  isOwner,
  isGroup,
  getGroupMetadata,
  findParticipant,
  isGroupAdmin,
  isBotAdmin,
  isOwnerOrGroupAdmin,
  phoneToJid,
  getContextInfo,
  getTargetJid,
  mentionJid,
  getJidServer,
  getJidUser
};
