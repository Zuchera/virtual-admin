#!/usr/bin/env node
/* Zuchera licence issuer. Keep zuchera-private-key.pem secret and offline: anyone holding it can mint licences.
   Usage: node issue-license.js --org "Acme Ltd" --tier team|business|enterprise|internal --seats 30 [--addons ai,media,record,build,multi] [--days 365] [--site example.com] [--nowm]
   Prints a licence key: paste it into WordPress > Virtual Office > Licence. */
const c = require('crypto'), fs = require('fs'), path = require('path');
const a = {}; const v = process.argv.slice(2); for (let i = 0; i < v.length; i++) { if (v[i].startsWith('--')) { const k = v[i].slice(2); a[k] = v[i + 1] && !v[i + 1].startsWith('--') ? v[++i] : true; } }
if (!a.org || !a.tier) { console.error('Need --org and --tier (starter|team|business|enterprise)'); process.exit(1); }
const pl = { org: String(a.org), tier: String(a.tier), seats: a.seats ? +a.seats : 0, addons: a.addons ? String(a.addons).split(',') : [], exp: a.days ? Math.floor(Date.now() / 1000) + 86400 * +a.days : 0, site: a.site ? String(a.site) : '', wm: a.nowm ? false : undefined, iat: Math.floor(Date.now() / 1000) };
const b64u = b => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const body = b64u(JSON.stringify(pl)), key = c.createPrivateKey(fs.readFileSync(path.join(__dirname, 'zuchera-private-key.pem')));
console.log(body + '.' + b64u(c.sign(null, Buffer.from(body), key)));
