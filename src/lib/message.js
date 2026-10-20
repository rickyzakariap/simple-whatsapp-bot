const { normalizeMessageContent, getContentType } = require('@whiskeysockets/baileys');

/**
 * Baileys wraps some messages in ephemeral/view-once/document-with-caption
 * envelopes. Unwrap those before reading text or media.
 */
function unwrapMessage(message, depth = 0) {
  if (!message || typeof message !== 'object' || depth > 5) return message;

  const wrapped =
    message.ephemeralMessage?.message ||
    message.viewOnceMessage?.message ||
    message.viewOnceMessageV2?.message ||
    message.viewOnceMessageV2Extension?.message ||
    message.documentWithCaptionMessage?.message ||
    message.editedMessage?.message ||
    message.protocolMessage?.editedMessage;

  if (wrapped) return unwrapMessage(wrapped, depth + 1);

  // Baileys also ships this helper; it handles future wrapper variants.
  const normalized = normalizeMessageContent(message);
  if (normalized && normalized !== message) {
    return unwrapMessage(normalized, depth + 1);
  }

  return message;
}

function getMessageText(message) {
  const content = unwrapMessage(message);
  if (!content) return '';

  return (
    content.conversation ||
    content.extendedTextMessage?.text ||
    content.imageMessage?.caption ||
    content.videoMessage?.caption ||
    content.documentMessage?.caption ||
    content.audioMessage?.caption ||
    content.buttonsResponseMessage?.selectedButtonId ||
    content.listResponseMessage?.singleSelectReply?.selectedRowId ||
    content.templateButtonReplyMessage?.selectedId ||
    content.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson ||
    ''
  );
}

function getContextInfo(message) {
  const content = unwrapMessage(message);
  if (!content) return null;

  return (
    content.extendedTextMessage?.contextInfo ||
    content.imageMessage?.contextInfo ||
    content.videoMessage?.contextInfo ||
    content.documentMessage?.contextInfo ||
    content.audioMessage?.contextInfo ||
    content.stickerMessage?.contextInfo ||
    content.buttonsResponseMessage?.contextInfo ||
    content.listResponseMessage?.contextInfo ||
    content.templateButtonReplyMessage?.contextInfo ||
    content.interactiveResponseMessage?.contextInfo ||
    null
  );
}

function getQuotedMessage(msg) {
  if (!msg || !msg.message) return null;
  const contextInfo = getContextInfo(msg.message);
  if (!contextInfo?.quotedMessage) return null;

  return {
    message: unwrapMessage(contextInfo.quotedMessage),
    key: {
      remoteJid: msg.key.remoteJid,
      id: contextInfo.stanzaId,
      participant: contextInfo.participant
    },
    participant: contextInfo.participant,
    contextInfo
  };
}

function getMessageType(message) {
  const content = unwrapMessage(message);
  if (!content) return null;
  return getContentType(content);
}

function isMediaMessage(message) {
  const type = getMessageType(message);
  return ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage']
    .includes(type);
}

module.exports = {
  unwrapMessage,
  getMessageText,
  getContextInfo,
  getQuotedMessage,
  getMessageType,
  isMediaMessage
};
