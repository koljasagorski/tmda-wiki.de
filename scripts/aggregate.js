#!/usr/bin/env node
/**
 * Aggregiert die per-Episode JSONs aus /tmp/tmda-extracts/ (oder
 * scripts/extracts/) in die finalen Rubriken-Files unter public/data/.
 *
 * Erwartet Files wie folge-XX.json mit dem Schema aus extract.js.
 */
import { readdir, readFile, writeFile, mkdir, copyFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SOURCE_CANDIDATES = ['/tmp/tmda-extracts', join(ROOT, 'scripts/extracts')];
const PUBLIC_DATA = join(ROOT, 'public', 'data');
const TRANSCRIPTS_SRC = join(ROOT, 'transcripts');
const PUBLIC_TRANSCRIPTS = join(ROOT, 'public', 'transcripts');

// Folgen-Daten aus web (Best-Effort): nur Folgen die wir wissen, der Rest bleibt null.
// Datum: jeweils Dienstag wenn nicht anders bekannt.
const KNOWN_DATES = {
  47: '2026-05-19', 46: '2026-05-12', 45: '2026-05-05', 44: '2026-04-28', 43: '2026-04-21',
  42: '2026-04-14', 41: '2026-04-07', 40: '2026-03-31',
};

async function pickSource() {
  for (const p of SOURCE_CANDIDATES) {
    if (existsSync(p)) {
      const s = await stat(p);
      if (s.isDirectory()) return p;
    }
  }
  throw new Error('Keine Extract-Source gefunden: ' + SOURCE_CANDIDATES.join(', '));
}

function shortDesc(s, max = 220) {
  if (!s) return '';
  s = String(s).replace(/\s+/g, ' ').trim();
  return s.length <= max ? s : s.slice(0, max - 1) + '…';
}

async function main() {
  const src = await pickSource();
  await mkdir(PUBLIC_DATA, { recursive: true });
  await mkdir(PUBLIC_TRANSCRIPTS, { recursive: true });

  const files = (await readdir(src)).filter((f) => /^folge-\d+\.json$/.test(f)).sort();
  console.log(`Aggregiere ${files.length} Folgen aus ${src}`);

  const episodes = [];
  const startupIdeen = [];
  const kallesCorner = [];
  const geruechte = [];
  const funFacts = [];
  const erfindungen = [];
  const orte = new Map();           // ort -> {ort, folgen[]}
  const gaeste = new Map();         // name -> {name, folgen[]}
  const zitate = [];
  const glossar = new Map();        // begriff -> {begriff, bedeutung, folge}

  for (const f of files) {
    const raw = await readFile(join(src, f), 'utf8');
    let ep;
    try {
      ep = JSON.parse(raw);
    } catch (e) {
      console.warn(`Skip ${f}: invalid JSON (${e.message})`);
      continue;
    }
    const folge = ep.folge;
    const datum = KNOWN_DATES[folge] || null;

    episodes.push({
      folge,
      titel: ep.titel || null,
      datum,
      laufzeit: ep.laufzeit || null,
      themen: ep.themen || [],
      kurzbeschreibung: ep.kurzbeschreibung || null,
    });

    if (ep.startup_idee && (ep.startup_idee.idee || ep.startup_idee.beschreibung)) {
      startupIdeen.push({
        folge,
        datum,
        idee: ep.startup_idee.idee || null,
        beschreibung: shortDesc(ep.startup_idee.beschreibung, 400),
        punkte: ep.startup_idee.punkte ?? null,
        max_punkte: ep.startup_idee.max_punkte || 24,
        begruendung: shortDesc(ep.startup_idee.begruendung, 240),
      });
    }

    if (ep.kalles_corner) {
      const kc = ep.kalles_corner;
      const titel = kc.titel || kc.thema || 'Kalles Corner';
      const inhalt = kc.inhalt || kc.anekdote || kc.content || '';
      if (titel || inhalt) {
        kallesCorner.push({ folge, datum, titel, inhalt: shortDesc(inhalt, 500) });
      }
    }

    if (ep.gerucht_der_woche && (ep.gerucht_der_woche.ueber || ep.gerucht_der_woche.inhalt)) {
      geruechte.push({
        folge,
        datum,
        ueber: ep.gerucht_der_woche.ueber || null,
        inhalt: shortDesc(ep.gerucht_der_woche.inhalt, 400),
      });
    }

    for (const fact of ep.fun_facts || []) {
      funFacts.push({ folge, text: shortDesc(fact, 300) });
    }

    for (const inv of ep.erfindungen || []) {
      if (!inv) continue;
      erfindungen.push({
        folge,
        name: inv.name || null,
        beschreibung: shortDesc(inv.beschreibung, 300),
      });
    }

    for (const ort of ep.orte || []) {
      const key = String(ort).trim();
      if (!key) continue;
      if (!orte.has(key)) orte.set(key, { ort: key, folgen: [] });
      orte.get(key).folgen.push(folge);
    }

    for (const name of ep.gaeste_erwaehnte || []) {
      const key = String(name).trim();
      if (!key) continue;
      if (!gaeste.has(key)) gaeste.set(key, { name: key, folgen: [] });
      gaeste.get(key).folgen.push(folge);
    }

    for (const z of ep.zitate || []) {
      if (!z) continue;
      zitate.push({
        folge,
        text: shortDesc(z.text || z, 280),
        kontext: shortDesc(z.kontext, 120),
      });
    }

    for (const g of ep.glossar || []) {
      if (!g) continue;
      const key = String(g.begriff || '').trim();
      if (!key) continue;
      if (!glossar.has(key.toLowerCase())) {
        glossar.set(key.toLowerCase(), {
          begriff: key,
          bedeutung: shortDesc(g.bedeutung, 240),
          folge,
        });
      }
    }
  }

  // Copy transcripts to public/ so AI chat can read them
  const trIndex = [];
  if (existsSync(TRANSCRIPTS_SRC)) {
    const trFiles = (await readdir(TRANSCRIPTS_SRC)).filter((f) => /^folge-\d+\.txt$/.test(f));
    for (const f of trFiles) {
      await copyFile(join(TRANSCRIPTS_SRC, f), join(PUBLIC_TRANSCRIPTS, f));
      const folge = Number(f.match(/folge-(\d+)/)[1]);
      trIndex.push({ folge, path: `/transcripts/${f}` });
    }
    trIndex.sort((a, b) => a.folge - b.folge);
  }

  // Sort all by folge desc (newest first)
  const byFolgeDesc = (a, b) => (b.folge || 0) - (a.folge || 0);
  episodes.sort(byFolgeDesc);
  startupIdeen.sort(byFolgeDesc);
  kallesCorner.sort(byFolgeDesc);
  geruechte.sort(byFolgeDesc);
  erfindungen.sort(byFolgeDesc);
  funFacts.sort(byFolgeDesc);
  zitate.sort(byFolgeDesc);

  const now = new Date().toISOString();
  const wrap = (items, extra = {}) => ({ updatedAt: now, count: items.length, items, ...extra });

  const orteSorted = Array.from(orte.values()).sort((a, b) => b.folgen.length - a.folgen.length);
  const gaesteSorted = Array.from(gaeste.values()).sort((a, b) => b.folgen.length - a.folgen.length);
  const glossarSorted = Array.from(glossar.values()).sort((a, b) => a.begriff.localeCompare(b.begriff, 'de'));

  await Promise.all([
    writeFile(join(PUBLIC_DATA, 'episodes.json'), JSON.stringify(wrap(episodes), null, 2)),
    writeFile(join(PUBLIC_DATA, 'startup-ideen.json'), JSON.stringify(wrap(startupIdeen), null, 2)),
    writeFile(join(PUBLIC_DATA, 'kalles-corner.json'), JSON.stringify(wrap(kallesCorner), null, 2)),
    writeFile(join(PUBLIC_DATA, 'geruechte.json'), JSON.stringify(wrap(geruechte), null, 2)),
    writeFile(join(PUBLIC_DATA, 'glossar.json'), JSON.stringify(wrap(glossarSorted), null, 2)),
    writeFile(join(PUBLIC_DATA, 'erfindungen.json'), JSON.stringify(wrap(erfindungen), null, 2)),
    writeFile(join(PUBLIC_DATA, 'orte.json'), JSON.stringify(wrap(orteSorted), null, 2)),
    writeFile(join(PUBLIC_DATA, 'gaeste.json'), JSON.stringify(wrap(gaesteSorted), null, 2)),
    writeFile(join(PUBLIC_DATA, 'zitate.json'), JSON.stringify(wrap(zitate), null, 2)),
    writeFile(join(PUBLIC_DATA, 'fun-facts.json'), JSON.stringify(wrap(funFacts), null, 2)),
    writeFile(join(PUBLIC_DATA, 'transcripts-index.json'), JSON.stringify(trIndex, null, 2)),
  ]);

  console.log(`✓ ${episodes.length} Folgen, ${startupIdeen.length} Startup-Ideen, ${kallesCorner.length} Kalles-Corner-Einträge`);
  console.log(`  ${geruechte.length} Gerüchte, ${erfindungen.length} Erfindungen, ${funFacts.length} Fun-Facts`);
  console.log(`  ${orteSorted.length} Orte, ${gaesteSorted.length} Personen, ${glossarSorted.length} Glossar-Begriffe, ${zitate.length} Zitate`);
}

main().catch((e) => { console.error(e); process.exit(1); });
