// node test/session-format.test.js
'use strict';
const assert = require('assert');
const path = require('path');

const CREDS = { me: { id: '254704955033:12@s.whatsapp.net' }, noiseKey: { private: 'x' }, registered: true };

function fresh(env) {
  for (const k of Object.keys(require.cache)) {
    if (k.includes(`${path.sep}lib${path.sep}session.js`)) delete require.cache[k];
  }
  const saved = { ...process.env };
  for (const [k, v] of Object.entries(env)) process.env[k] = v;
  const mod = require('../lib/session');
  process.env = saved;
  return mod;
}

// 1) default output carries the TALKLESS! prefix and decodes back to creds
const def = fresh({});
const out = def.toSessionString(CREDS);
assert.ok(out.startsWith('TALKLESS!'), `expected TALKLESS! prefix, got ${out.slice(0, 12)}`);
const payload = out.slice('TALKLESS!'.length);
const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
assert.strictEqual(decoded.me.id, CREDS.me.id, 'payload round-trips');

// 2) prefix can be disabled for bare Base64
const bare = fresh({ SESSION_PREFIX: '' });
const out2 = bare.toSessionString(CREDS);
assert.ok(!out2.startsWith('TALKLESS!'), 'empty SESSION_PREFIX drops the prefix');
assert.strictEqual(JSON.parse(Buffer.from(out2, 'base64').toString('utf8')).me.id, CREDS.me.id);

// 3) instructions describe the Telegram paste flow, not .env
const text = def.instructionsText(out);
assert.ok(text.includes('/pastsession'), 'mentions /pastsession');
assert.ok(!/\.env/.test(text), 'no .env instruction');
assert.ok(!/SESSION_ID/.test(text), 'no SESSION_ID env var instruction');
assert.ok(text.includes('TALKLESS ULTRA'), 'branded');

// 4) nothing left over from the previous brand
const all = out + text;
assert.ok(!/pixel/i.test(all), 'no Pixel references in generated text');

console.log('ok — session format matches the Talkless bot');
