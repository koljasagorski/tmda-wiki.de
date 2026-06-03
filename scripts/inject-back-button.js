#!/usr/bin/env node
// Injiziert einen einheitlichen „← Wiki"-Zurück-Button (oben links) in jede
// Startup-One-Pager-Seite. Idempotent: vorhandener Button (id="tmda-back")
// wird übersprungen. Der Button ist self-contained (eigenes <style>, eigene
// Farben) und funktioniert auf hellem wie dunklem Seitendesign.
//
// Aufruf:  node scripts/inject-back-button.js
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STARTUP_DIR = join(__dirname, '..', 'public', 'startup');

const SNIPPET = `
<!-- tmda-back: einheitlicher Zurück-zum-Wiki-Button (via scripts/inject-back-button.js) -->
<style id="tmda-back-style">
#tmda-back{position:fixed!important;top:16px;left:16px;z-index:2147483000!important;display:inline-flex;align-items:center;gap:7px;padding:9px 15px 9px 12px;margin:0;font:600 14px/1 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif!important;color:#fff!important;text-decoration:none!important;background:rgba(22,13,26,.6)!important;border:1px solid rgba(255,255,255,.3)!important;border-radius:999px!important;backdrop-filter:blur(9px) saturate(160%);-webkit-backdrop-filter:blur(9px) saturate(160%);box-shadow:0 6px 22px -8px rgba(0,0,0,.55);transition:background .18s ease,transform .18s ease,border-color .18s ease;}
#tmda-back:hover{background:rgba(240,147,224,.92)!important;color:#2a0c25!important;border-color:rgba(240,147,224,.6)!important;transform:translateY(-1px);}
#tmda-back .tb-arrow{font-size:16px;line-height:1;}
@media print{#tmda-back{display:none!important;}}
</style>
<a href="/startup-ideen" id="tmda-back" aria-label="Zurück zum TMDA-Wiki"><span class="tb-arrow" aria-hidden="true">←</span>Wiki</a>
`;

const dirs = readdirSync(STARTUP_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

let injected = 0, skipped = 0, missing = 0;
for (const slug of dirs) {
  const file = join(STARTUP_DIR, slug, 'index.html');
  if (!existsSync(file)) { missing++; continue; }
  let html = readFileSync(file, 'utf8');
  if (html.includes('id="tmda-back"')) { skipped++; continue; }
  const m = html.match(/<body[^>]*>/i);
  if (!m) { console.warn(`! kein <body> in ${slug}`); missing++; continue; }
  html = html.replace(m[0], m[0] + SNIPPET);
  writeFileSync(file, html);
  injected++;
}
console.log(`Zurück-Button: ${injected} injiziert, ${skipped} schon vorhanden, ${missing} ohne body/fehlend.`);
