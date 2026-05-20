#!/usr/bin/env node
/**
 * SEO-Coverage-Check für die TMDA Wiki.
 *
 * Findet alle Routen, die in `public/app.js` definiert sind (im `views`-Objekt
 * und in `path.startsWith('/X/')` Pattern), und prüft ob sie in
 * `src/seo.js` → STATIC_ROUTES bzw. DYNAMIC_PATTERNS abgedeckt sind.
 *
 * Außerdem werden die Metadaten auf grundlegende Sanity-Checks geprüft:
 * - Title nicht leer, <= 70 Zeichen
 * - Description nicht leer, 80-200 Zeichen
 *
 * Exit Code 1 bei Fehlern → CI failed.
 */
import { readFileSync } from 'node:fs';
import { STATIC_ROUTES, DYNAMIC_PATTERNS, metaForPath } from '../src/seo.js';

const APP_JS = new URL('../public/app.js', import.meta.url).pathname;
const errors = [];
const warnings = [];

// 1. Routes aus app.js extrahieren
const appSource = readFileSync(APP_JS, 'utf8');

// Static routes: vom views object: '/path': renderX,
const viewsMatch = appSource.match(/const views = \{([\s\S]*?)\};/);
const definedRoutes = new Set();
if (viewsMatch) {
  for (const m of viewsMatch[1].matchAll(/'(\/[\w-]*)'/g)) {
    definedRoutes.add(m[1]);
  }
}

// Dynamic patterns: path.startsWith('/X/')
const dynamicRoutes = new Set();
for (const m of appSource.matchAll(/path\.startsWith\('(\/[\w-]+\/)'\)/g)) {
  dynamicRoutes.add(m[1]);
}

console.log(`Gefunden in app.js: ${definedRoutes.size} statische, ${dynamicRoutes.size} dynamische Routen`);

// 2. Statische Routen müssen in STATIC_ROUTES sein
for (const route of definedRoutes) {
  if (!STATIC_ROUTES[route]) {
    errors.push(`Route ${route} ist in app.js definiert, fehlt aber in src/seo.js → STATIC_ROUTES`);
  }
}

// 3. Dynamische Routen müssen in DYNAMIC_PATTERNS sein
for (const dyn of dynamicRoutes) {
  const found = DYNAMIC_PATTERNS.some((p) => {
    const sample = dyn + '1';
    return p.match.test(sample);
  });
  if (!found) {
    errors.push(`Dynamische Route ${dyn}:n hat kein passendes Pattern in src/seo.js → DYNAMIC_PATTERNS`);
  }
}

// 4. Metadaten-Sanity-Checks
for (const [path, cfg] of Object.entries(STATIC_ROUTES)) {
  const meta = metaForPath(path);
  if (!meta.title || meta.title.length < 10) {
    errors.push(`${path}: title fehlt oder zu kurz`);
  } else if (meta.title.length > 75) {
    warnings.push(`${path}: title ist ${meta.title.length} Zeichen (Empfehlung <= 65, max 70)`);
  }
  if (!meta.description || meta.description.length < 60) {
    errors.push(`${path}: description fehlt oder zu kurz (<60 chars)`);
  } else if (meta.description.length > 220) {
    warnings.push(`${path}: description ist ${meta.description.length} Zeichen (Google schneidet bei ~160 ab)`);
  }
  if (cfg.priority != null && (cfg.priority < 0 || cfg.priority > 1)) {
    errors.push(`${path}: priority muss zwischen 0 und 1 liegen`);
  }
}

// 5. Report
if (warnings.length) {
  console.log('\n⚠️  Warnungen:');
  for (const w of warnings) console.log('  - ' + w);
}
if (errors.length) {
  console.log('\n❌ Fehler:');
  for (const e of errors) console.log('  - ' + e);
  console.log(`\nSEO-Check fehlgeschlagen mit ${errors.length} Fehler(n).`);
  process.exit(1);
}

console.log(`\n✅ SEO-Check OK — ${Object.keys(STATIC_ROUTES).length} statische Routen, ${DYNAMIC_PATTERNS.length} dynamische Pattern, alle abgedeckt.`);
