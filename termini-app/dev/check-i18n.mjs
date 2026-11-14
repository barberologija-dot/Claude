// Checks that every text key used in the code exists in the translation file.
import fs from 'node:fs';
import path from 'node:path';
const dict = JSON.parse(fs.readFileSync('src/i18n/sl.json', 'utf8'));
const has = k => k.split('.').reduce((o, p) => (o == null ? o : o[p]), dict) !== undefined;
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p) : /\.(tsx?|ts)$/.test(p) && files.push(p); } })('src');
files.push('functions/api/notify.ts');
let missing = 0;
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/\bt(?:List)?\(\s*(?:[\w?.! =]+\?\s*)?'([a-z_]+\.[a-z0-9_.]+)'(?:\s*:\s*'([a-z_]+\.[a-z0-9_.]+)')?/g)) {
    for (const k of [m[1], m[2]].filter(Boolean)) if (!has(k)) { console.log(`missing "${k}" (${f})`); missing++; }
  }
  for (const m of src.matchAll(/'((?:errors|status|admin|auth|booking|my|shop|common|account|landing|legal|nav)\.[a-z0-9_]+)'/g)) if (!has(m[1])) { console.log(`missing "${m[1]}" (${f})`); missing++; }
}
console.log(missing ? `${missing} missing keys` : 'all translation keys found');
process.exit(missing ? 1 : 0);
