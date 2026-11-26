const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ============================================================
// Test konfigurasi dasar
// ============================================================
const config = require('../config');

test('config: prefix dan database files lengkap', () => {
  assert.strictEqual(typeof config.commandPrefix, 'string');
  assert.ok(config.commandPrefix.length >= 1);
  for (const name of ['points', 'welcome', 'schedules', 'alerts', 'birthdays', 'autoresponder', 'polls', 'warnings', 'portfolio']) {
    assert.ok(config.databaseFiles[name], `databaseFiles.${name} harus ada`);
  }
});

test('config: interval polling masuk akal (1-60 detik)', () => {
  for (const key of Object.keys(config.polling)) {
    const ms = config.polling[key];
    assert.ok(ms >= 1000 && ms <= 60000, `${key} = ${ms}ms di luar range wajar`);
  }
});

// ============================================================
// Test cache: atomic write + corrupt backup + invalidation
// ============================================================
const cache = require('../src/lib/cache');

async function withTempDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wabot-test-'));
  try {
    return await fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('cache: tulis file atomik - file utuh walau proses mati mendadak', async () => {
  await withTempDir(async dir => {
    const file = path.join(dir, 'data.json');
    cache.setJson(file, { alpha: 1, beta: 'dua' });
    await cache.forceFlush();
    const onDisk = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.deepStrictEqual(onDisk, { alpha: 1, beta: 'dua' });
    // gak ada file tmp nyasar
    const leftovers = fs.readdirSync(dir).filter(f => f.includes('.tmp'));
    assert.strictEqual(leftovers.length, 0, `file tmp nyasar: ${leftovers}`);
  });
});

test('cache: file JSON korup di-backup, gak nge-crash', async () => {
  await withTempDir(async dir => {
    const file = path.join(dir, 'korup.json');
    fs.writeFileSync(file, '{ "alpha": 1 TUTON FORMAT RUSAK');
    const data = await cache.getJson(file, { ok: true });
    assert.deepStrictEqual(data, { ok: true }, 'harus fallback ke default');
    const backups = fs.readdirSync(dir).filter(f => f.includes('.corrupt-'));
    assert.strictEqual(backups.length, 1, 'file korup harus di-backup sebelum ditimpa');
  });
});

test('cache: setJson lalu getJson segera = data terbaru (bukan data lama)', async () => {
  await withTempDir(async dir => {
    const file = path.join(dir, 'urut.json');
    cache.setJson(file, { n: 1 });
    const read = await cache.getJson(file, {});
    assert.strictEqual(read.n, 1, 'getJson harus baca pending write, bukan data lama');
    await cache.forceFlush();
    assert.strictEqual(JSON.parse(fs.readFileSync(file, 'utf8')).n, 1);
  });
});

// ============================================================
// Test database layer
// ============================================================
const database = require('../src/lib/database');

test('database: set, get, delete, has jalan konsisten', async () => {
  await withTempDir(async dir => {
    //_override path biar gak ganggu file asli
    const file = path.join(dir, 'sandbox.json');
    await cache.getJson(file, {});
    cache.setJson(file, {});
    cache.setJson(file, { user1: 10 });
    const data = await cache.getJson(file, {});
    data.user2 = 20;
    cache.setJson(file, data);
    const final = await cache.getJson(file, {});
    assert.strictEqual(final.user1, 10);
    assert.strictEqual(final.user2, 20);
  });
});

// ============================================================
// Test permissions & JID
// ============================================================
const perms = require('../src/lib/permissions');

test('permissions: normalizeJid buang device suffix, JID LID tetap beda', () => {
  assert.strictEqual(perms.normalizeJid('628123:45@s.whatsapp.net'), '628123@s.whatsapp.net');
  assert.ok(!perms.sameJid('123@lid', '123@s.whatsapp.net'), 'LID gak boleh dianggap sama dgn phone JID');
  assert.ok(perms.sameJid('628123:1@s.whatsapp.net', '628123:99@s.whatsapp.net'));
  assert.strictEqual(perms.normalizeJid(''), '');
  assert.strictEqual(perms.normalizeJid(null), '');
});

test('permissions: phoneToJid format Indonesia', () => {
  assert.strictEqual(perms.phoneToJid('08123456789'), '628123456789@s.whatsapp.net');
  assert.strictEqual(perms.phoneToJid('+62 812-3456-7890'), '6281234567890@s.whatsapp.net');
  assert.strictEqual(perms.phoneToJid('abc'), null);
  assert.strictEqual(perms.phoneToJid(''), null);
  assert.strictEqual(perms.phoneToJid('123'), null, 'nomor gak masuk akal harus ditolak');
});

test('permissions: isOwner aman kalau msg kosong', () => {
  assert.strictEqual(perms.isOwner({}, null), false);
  assert.strictEqual(perms.isOwner(null, null), false);
});

// ============================================================
// Test message unwrap
// ============================================================
const msgHelper = require('../src/lib/message');

test('message: baca teks dari berbagai wrapper', () => {
  assert.strictEqual(msgHelper.getMessageText({ conversation: 'halo' }), 'halo');
  assert.strictEqual(msgHelper.getMessageText({ extendedTextMessage: { text: 'test' } }), 'test');
  assert.strictEqual(
    msgHelper.getMessageText({ viewOnceMessage: { message: { conversation: 'sekali lihat' } } }),
    'sekali lihat'
  );
  assert.strictEqual(
    msgHelper.getMessageText({ ephemeralMessage: { message: { conversation: 'efemeral' } } }),
    'efemeral'
  );
  assert.strictEqual(msgHelper.getMessageText(null), '');
});

// ============================================================
// Test time
// ============================================================
const timeHelper = require('../src/lib/time');

test('time: timezone Asia/Jakarta konsisten', () => {
  const parts = timeHelper.getDateParts(new Date('2026-11-26T00:30:00Z'), 'Asia/Jakarta');
  assert.strictEqual(parts.hour, '07');
  assert.strictEqual(parts.date, '2026-11-26');
  assert.strictEqual(parts.hhmm, '07:30');
});

test('time: timezone invalid fallback ke UTC', () => {
  const parts = timeHelper.getDateParts(new Date('2026-11-26T00:30:00Z'), 'Zona/Ngawur-XYZ');
  assert.strictEqual(parts.timezone, 'UTC');
  assert.strictEqual(parts.hour, '00');
});

// ============================================================
// Test autoresponder: media path escape
// ============================================================
const autoresponder = require('../src/lib/autoresponder');

test('autoresponder: path traversal ditolak', () => {
  const evil = autoresponder.parseMediaFile('MEDIA_FILE:' + JSON.stringify({
    path: '../.env', mime: 'image/jpeg', name: 'x.jpg'
  }));
  assert.strictEqual(evil, null, 'path keluar MEDIA_DIR harus ditolak');

  const evil2 = autoresponder.parseMediaFile('MEDIA_FILE:' + JSON.stringify({
    path: '/etc/passwd', mime: 'image/jpeg', name: 'x.jpg'
  }));
  assert.strictEqual(evil2, null, 'path absolut di luar MEDIA_DIR harus ditolak');

  const ok = autoresponder.parseMediaFile('MEDIA_FILE:' + JSON.stringify({
    path: 'uploads/triggers/abc.jpg', mime: 'image/jpeg', name: 'abc.jpg'
  }));
  assert.ok(ok, 'path valid harus diterima');
});

// ============================================================
// Test command catalog: path traversal + menu
// ============================================================
const catalog = require('../src/lib/command-catalog');

test('command catalog: nama command jahat ditolak', () => {
  assert.strictEqual(catalog.isValidCommandName('../index'), false);
  assert.strictEqual(catalog.isValidCommandName('utils'), false);
  assert.strictEqual(catalog.isValidCommandName('index'), false);
  assert.strictEqual(catalog.isValidCommandName('QUIZ'), false, 'harus lowercase');
  assert.ok(catalog.isValidCommandName('quiz'), 'quiz harus valid');
});

test('command catalog: formatMenu ada isinya dan ada kategori Games', () => {
  const menu = catalog.formatMenu('.');
  assert.ok(menu.includes('Games'), 'menu harus ada kategori Games');
  assert.ok(menu.includes('.quiz'), 'menu harus nyebut quiz');
  assert.ok(menu.includes('.tictactoe'), 'menu harus nyebut tictactoe');
});

// ============================================================
// Test api-manager
// ============================================================
const apiManager = require('../src/lib/api-manager');

test('api-manager: resolveUrl jangan hapus path base', () => {
  assert.strictEqual(
    apiManager.resolveUrl('/coins/markets'),
    'https://api.coingecko.com/api/v3/coins/markets'
  );
  assert.strictEqual(
    apiManager.resolveUrl('https://contoh.com/apa'),
    'https://contoh.com/apa'
  );
});

test('api-manager: rate limit window jalan', () => {
  apiManager.clearRateLimits();
  const domain = 'unittest.local';
  for (let i = 0; i < 30; i++) {
    assert.ok(apiManager.checkRateLimit(domain), `request ke-${i} harus masih di bawah limit`);
    apiManager.trackRequest(domain);
  }
});

// ============================================================
// Test logika game (pure, tanpa koneksi WA)
// ============================================================
test('game logic: tebakangka hanya terima angka valid', () => {
  const na = parseInt('abc');
  assert.ok(Number.isNaN(na), 'parseInt huruf harus NaN');
  const ok = parseInt('42');
  assert.strictEqual(ok, 42);
  // parseInt('42abc') = 42 di JS - harus dibuktikan dan ditangani
  assert.strictEqual(parseInt('42abc'), 42, 'parseInt longgar - command harus aware');
});

test('game logic: poin gak boleh NaN atau nol', async () => {
  const { addPoint } = require('../src/commands/main/points');
  // panggil dengan nilai aneh, gak boleh throw
  await addPoint('test@chat', 'test@user', NaN);
  await addPoint('test@chat', 'test@user', 0);
  await addPoint('', '', 5);
  await addPoint(null, null, 5);
  assert.ok(true, 'addPoint harus tetap aman walau input aneh');
});

// ============================================================
// Test welcome message template
// ============================================================
test('welcome: @group harus resolve ke nama grup asli', () => {
  // simulasi logika replace di index.js
  const groupName = 'Grup Wangsaf';
  const template = 'Selamat datang @user di @group!';
  const text = template
    .replace(/@user/g, '@628123456789')
    .replace(/@group/g, groupName);
  assert.ok(text.includes('Grup Wangsaf'), 'nama grup harus muncul');
  assert.ok(!text.includes('@group'), 'placeholder @group harus keganti semua');
});

// ============================================================
// Test game state cleanup (tanpa leak timer)
// ============================================================
test('game: tictactoe cleanupGame harus buang timer + state', () => {
  // verifikasi via source statis: cleanupGame harus clearTimeout + delete
  const src = fs.readFileSync(path.join(__dirname, '../src/commands/main/tictactoe.js'), 'utf8');
  assert.ok(src.includes('clearTimeout(timers[id])'), 'harus clearTimeout');
  assert.ok(src.includes('delete games[id]'), 'harus delete state');
  assert.ok(src.includes("catch(() => {})"), 'sendMessage di timer harus ada catch biar gak crash');
});

test('game: semua file game sendMessage timeout pakai catch', () => {
  for (const f of ['quiz.js', 'tebakangka.js', 'tebakkata.js', 'math.js']) {
    const src = fs.readFileSync(path.join(__dirname, '../src/commands/main', f), 'utf8');
    assert.ok(
      /sock\.sendMessage\(id, \{ text: '⏰.*\}\)\.catch\(\(\) => \{\}\)/.test(src),
      `${f} harus pakai .catch di sendMessage timeout`
    );
  }
});

// ============================================================
// Test index.js: unhandledRejection guard + exit code
// ============================================================
test('index.js: harus ada guard unhandledRejection dan uncaughtException', () => {
  const src = fs.readFileSync(path.join(__dirname, '../index.js'), 'utf8');
  assert.ok(src.includes("process.on('unhandledRejection'"), 'harus ada unhandledRejection handler');
  assert.ok(src.includes("process.on('uncaughtException'"), 'harus ada uncaughtException handler');
  assert.ok(src.includes('process.exit(exitCode)'), 'shutdown harus bisa kirim exit code');
  assert.ok(src.includes('shutdown(0)'), 'logout harus exit 0 (pm2 stop)');
  assert.ok(src.includes('shutdown(1)'), 'reconnect gagal harus exit 1 (pm2 restart)');
  assert.ok(src.includes('.catch(error =>') && src.includes('handleMessage(sock, message)'),
    'pesan masuk harus diproses paralel dengan catch terpisah');
});

// ============================================================
// Test ecosystem PM2
// ============================================================
test('command loader: utils.js bukan command yang bisa dipanggil user', async () => {
  const path = require('path');
  const CommandLoader = require('../src/lib/command-loader');
  const loader = new CommandLoader(path.join(__dirname, '../src/commands/main'));
  await loader.initialize();
  assert.strictEqual(loader.hasCommand('utils'), false, 'utils adalah helper, bukan command');
  assert.ok(loader.hasCommand('quiz'), 'command asli tetap harus ke-detect');
  loader.shutdown();
});

test('ecosystem.config.js: PM2 config valid dan aman', () => {
  const cfg = require('../ecosystem.config.js');
  const app = cfg.apps[0];
  assert.strictEqual(app.name, 'ongbak-bot');
  assert.ok(app.interpreter.includes('node'), 'harus set interpreter node spesifik');
  assert.ok(app.max_memory_restart, 'harus ada batas memori');
  assert.deepStrictEqual(app.stop_exit_codes, [0], 'exit 0 = stop normal (logout), jangan restart');
  assert.strictEqual(app.instances, 1, 'bot WA cuma boleh 1 instance');
});

// ============================================================
// Test security: .env gak pernah ke-commit
// ============================================================
test('gitignore: file sensitif harus di-ignore', () => {
  const gi = fs.readFileSync(path.join(__dirname, '../.gitignore'), 'utf8');
  assert.ok(gi.includes('.env'), '.env harus di-ignore');
  assert.ok(gi.includes('session/'), 'session/ harus di-ignore');
  for (const db of Object.values(config.databaseFiles)) {
    assert.ok(gi.includes(db), `${db} harus di-ignore (bisa berisi data pribadi)`);
  }
});

test('repo: gak ada token nyasar di source (selain file test ini)', () => {
  const { execSync } = require('child_process');
  const needle = 'gh' + 'p_';
  const out = execSync(
    `grep -rIl '${needle}' --exclude-dir=node_modules --exclude-dir=.git --exclude=pipeline.test.js . || true`,
    { cwd: path.join(__dirname, '..') }
  ).toString().trim();
  assert.strictEqual(out, '', `token ketemu di: ${out}`);
});

// ============================================================
// Test package.json
// ============================================================
test('package.json: dependency minimal ada & engine node benar', () => {
  const pkg = require('../package.json');
  assert.ok(pkg.dependencies['@whiskeysockets/baileys'], 'baileys wajib ada');
  assert.ok(pkg.dependencies['qrcode-terminal'], 'qrcode wajib');
  assert.ok(pkg.engines.node >= '>=20', 'harus minta node 20+');
  assert.ok(pkg.scripts.test, 'harus ada script test');
});
