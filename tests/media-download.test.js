const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const axios = require('axios');
const ig = require('../src/commands/main/ig');
const yt = require('../src/commands/main/yt');
const ytdlp = require('../src/lib/ytdlp');
const { isValidYouTubeUrl } = require('../src/lib/response-helper');

const chat = { key: { remoteJid: '6281110000000@s.whatsapp.net' } };
const cdn = 'https://scontent-test.cdninstagram.com';
const jpeg = Buffer.from('ffd8ffe000104a4649460001', 'hex');
const mp4 = Buffer.from('000000206674797069736f6d', 'hex');
const photo = { is_video: false, display_url: `${cdn}/photo` };
const video = { is_video: true, video_url: `${cdn}/video`, display_url: `${cdn}/thumbnail` };
const embed = (media, shortcode = 'AbCd123') => `<script>s.handle({"contextJSON":${JSON.stringify(JSON.stringify({
  gql_data: { shortcode_media: { shortcode, ...media } }
}))}})</script>`;
const send = out => ({ sendMessage: async (_, payload) => { out.push(payload); } });

test.beforeEach(t => {
  t.mock.method(axios, 'post', async () => { throw new Error('Unexpected legacy scraper request'); });
});

function mockEmbed(t, html, request) {
  return t.mock.method(axios, 'get', async (url, opts) => {
    assert.equal(opts.maxRedirects, 0);
    if (url === 'https://www.instagram.com/p/AbCd123/embed/') return { data: html };
    if (url === 'https://www.instagram.com/reel/AbCd123/embed/') return { data: html };
    return request(url, opts);
  });
}

test('.ig Reel downloads the video from the public embed without forwarding tracking parameters', async t => {
  const out = [];
  const get = mockEmbed(t, embed(video), async url => {
    assert.equal(url, video.video_url);
    return { data: mp4, headers: { 'content-type': 'video/mp4' } };
  });
  await ig.execute(send(out), chat, ['https://www.instagram.com/reel/AbCd123/?tracking=ignored']);
  assert.equal(get.mock.callCount(), 2);
  assert.deepEqual(out.find(m => m.video)?.video, mp4);
});

test('.ig carousel supports mixed media, preserves order and reports the 10-item cap', async t => {
  const out = [];
  const items = [photo, video, ...Array(9).fill(photo)];
  mockEmbed(t, embed({ edge_sidecar_to_children: { edges: items.map(node => ({ node })) } }), async url => url === video.video_url
    ? { data: mp4, headers: { 'content-type': 'video/mp4' } }
    : { data: jpeg, headers: { 'content-type': 'image/jpeg' } });
  await ig.execute(send(out), chat, ['https://instagram.com/p/AbCd123']);
  const media = out.filter(m => m.image || m.video);
  assert.equal(media.length, 10);
  assert.deepEqual(media[0].image, jpeg);
  assert.deepEqual(media[1].video, mp4);
  assert.ok(out.some(m => /10.*11/.test(m.text || '')));
});

test('.ig does not fetch unrelated origins or Story URLs', async t => {
  const get = t.mock.method(axios, 'get', async () => assert.fail('unexpected network request'));
  for (const url of ['https://instagram.com.example.org/p/AbCd123/', 'https://www.instagram.com/stories/demo/12345/', 'https://user@instagram.com/p/AbCd123/', 'http://instagram.com/p/AbCd123/']) {
    const out = [];
    await ig.execute(send(out), chat, [url]);
    assert.match(out[0]?.text || '', /post|reel/i);
  }
  assert.equal(get.mock.callCount(), 0);
});

test('.ig refuses media outside Instagram CDNs and does not treat HTML as video', async t => {
  const out = [];
  const unsafe = { ...video, video_url: 'https://example.org/private' };
  const get = mockEmbed(t, embed({ edge_sidecar_to_children: { edges: [{ node: unsafe }, { node: video }] } }), async url => {
    assert.equal(url, video.video_url);
    return { data: Buffer.from('<html>Login</html>'), headers: { 'content-type': 'text/html' } };
  });
  await ig.execute(send(out), chat, ['https://www.instagram.com/p/AbCd123/']);
  assert.equal(get.mock.callCount(), 2);
  assert.ok(out.every(m => !m.video && !m.image));
  assert.match(out.at(-1)?.text || '', /tidak.*unduh/i);
});

test('.ig refuses a different shortcode in the embed', async t => {
  const out = [];
  const get = mockEmbed(t, embed(video, 'Wrong'), async () => assert.fail('unexpected media request'));
  await ig.execute(send(out), chat, ['https://www.instagram.com/p/AbCd123/']);
  assert.equal(get.mock.callCount(), 1);
  assert.match(out.at(-1)?.text || '', /tidak.*unduh/i);
});

test('.ig rejects non-ASCII bytes that resemble an MP4 signature when decoded', async t => {
  const out = [];
  const invalid = Buffer.from(mp4);
  invalid[4] |= 0x80;
  mockEmbed(t, embed(video), async () => ({ data: invalid, headers: { 'content-type': 'video/mp4' } }));
  await ig.execute(send(out), chat, ['https://www.instagram.com/reel/AbCd123/']);
  assert.ok(out.every(m => !m.video));
  assert.match(out.at(-1)?.text || '', /tidak.*unduh/i);
});

test('YouTube downloader accepts HTTPS single videos, not playlists or channels', () => {
  for (const url of [
    'https://youtu.be/AbCd123_x-y?si=demo',
    'https://www.youtube.com/watch?v=AbCd123_x-y&list=PLdemo',
    'https://m.youtube.com/shorts/AbCd123_x-y',
    'https://youtube.com/live/AbCd123_x-y'
  ]) assert.equal(isValidYouTubeUrl(url), true, url);
  for (const url of [
    'http://youtu.be/AbCd123_x-y',
    'https://www.youtube.com/playlist?list=PLdemo',
    'https://www.youtube.com/@demo/videos',
    'https://www.youtube.com/watch?list=PLdemo',
    'https://www.youtube.com/watch?v=AbCd123_x-y&v=abc',
    'https://youtu.be/AbCd123',
    'https://youtube.com.example.org/watch?v=AbCd123_x-y',
    'https://name@youtu.be/AbCd123_x-y',
    'https://youtu.be:8443/AbCd123_x-y'
  ]) assert.equal(isValidYouTubeUrl(url), false, url);
});

test('.yt returns downloaded video bytes and cleans up its download', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ongbak-yt-test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'video.mp4');
  await fs.writeFile(file, mp4);
  const cleanup = t.mock.fn(() => fs.unlink(file));
  t.mock.method(ytdlp, 'isAvailable', async () => true);
  t.mock.method(ytdlp, 'downloadVideo', async () => ({ path: file, cleanup }));
  const out = [];
  await yt.execute(send(out), chat, ['https://youtu.be/AbCd123_x-y']);
  assert.deepEqual(out.at(-1)?.video, mp4);
  assert.equal(cleanup.mock.callCount(), 1);
  await assert.rejects(fs.stat(file), { code: 'ENOENT' });
});

test('.yt reports a sign-in restriction without exposing raw subprocess output', async t => {
  t.mock.method(ytdlp, 'isAvailable', async () => true);
  t.mock.method(ytdlp, 'downloadVideo', async () => {
    throw Object.assign(new Error('raw log marker'), { stderr: 'ERROR: [youtube] Sign in to confirm you’re not a bot. raw log marker' });
  });
  const out = [];
  await yt.execute(send(out), chat, ['https://youtu.be/AbCd123_x-y']);
  assert.match(out.at(-1)?.text || '', /YouTube.*login/i);
  assert.doesNotMatch(out.at(-1)?.text || '', /raw log marker/);
});
