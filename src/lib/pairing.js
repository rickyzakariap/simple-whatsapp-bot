'use strict';

function hasLinkedSession(creds) {
  return Boolean(creds?.registered || creds?.account);
}

function pairingOptions({ creds, mode = 'code', phone = '', isTTY }) {
  if (hasLinkedSession(creds)) return null;

  mode = mode.trim().toLowerCase();
  if (mode !== 'code' && mode !== 'qr') throw new Error('PAIRING_MODE harus code atau qr.');
  if (!isTTY) throw new Error('Sesi belum tertaut. Jalankan npm start di terminal sebelum pakai PM2.');
  if (mode === 'qr') return { mode };

  const normalized = phone.trim().replace(/[ -]/g, '').replace(/^\+/, '');
  if (!/^[1-9][0-9]{7,14}$/.test(normalized)) {
    throw new Error('Isi PAIRING_PHONE dengan nomor internasional (contoh: 62812xxxxxxxx).');
  }
  return { mode, phone: normalized };
}

function createPairingHandler({ options, requestCode, showCode, showQr }) {
  let requested = false;
  let finished = false;

  return async ({ qr, connection, isNewLogin }) => {
    if (isNewLogin || connection === 'open' || connection === 'close') finished = true;
    if (!options || finished || !qr) return;
    if (options.mode === 'qr') return showQr(qr);
    if (requested) return;

    // Baileys emits `connecting` before its handshake; first QR proves registration is ready.
    requested = true;
    let code;
    try {
      code = await requestCode(options.phone);
    } catch (error) {
      if (finished) return;
      throw error;
    }
    if (!finished) showCode(code);
  };
}

module.exports = { hasLinkedSession, pairingOptions, createPairingHandler };
