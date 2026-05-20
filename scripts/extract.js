#!/usr/bin/env node
/**
 * Extrahiert Rubriken aus den Transkripten in ./transcripts/
 * und schreibt strukturierte JSON-Dateien nach ./public/data/.
 *
 * Heuristisch + grob — bitte nach dem ersten Lauf die JSON-Dateien
 * sichten und Hand anlegen wo's Mist baut. Die Regexen sind bewusst
 * konservativ; lieber weniger false positives als Mülldaten.
 *
 * Aufruf: npm run extract
 */
import { readdir, readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, basename } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const TRANSCRIPTS_DIR = join(ROOT, 'transcripts');
const PUBLIC_DATA = join(ROOT, 'public', 'data');
const PUBLIC_TRANSCRIPTS = join(ROOT, 'public', 'transcripts');

const SPEAKER_RX = /^\s*(Fynn|Nisse|Kalle)\s*:/i;

// Parser für YAML-ähnlichen Frontmatter (einfach gehalten)
function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { meta: {}, body: raw };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (kv) {
      const [, k, v] = kv;
      meta[k] = v.trim().replace(/^"|"$/g, '');
    }
  }
  return { meta, body: raw.slice(m[0].length) };
}

// Findet die Startup-Idee + Punkte
function findStartupIdee(body, folge) {
  const ideen = [];
  // Suche nach Blöcken, die "Startup-Idee" / "Idee der Woche" erwähnen
  const blockRx = /(startup[- ]?idee|idee der woche)[^.\n]{0,200}/gi;
  for (const m of body.matchAll(blockRx)) {
    const around = body.slice(Math.max(0, m.index - 100), m.index + 1500);
    // Punkte: "X von 10", "X/10", "X Punkte"
    const pktMatch = around.match(/(\d{1,2})\s*(?:\/|von)\s*10|(\d{1,2})\s*Punkte?/i);
    const punkte = pktMatch ? Number(pktMatch[1] || pktMatch[2]) : null;
    const idee = around.split('\n').filter(Boolean).slice(0, 3).join(' ').slice(0, 250);
    ideen.push({ folge, idee, beschreibung: around.slice(0, 400).replace(/\s+/g, ' ').trim(), punkte });
  }
  // Dedup: gleiche Beschreibung
  const seen = new Set();
  return ideen.filter((x) => {
    const k = (x.beschreibung || '').slice(0, 80);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// Kalles Corner: Blöcke um den Marker
function findKallesCorner(body, folge, meta) {
  const items = [];
  const rx = /Kalles?\s+Corner/gi;
  for (const m of body.matchAll(rx)) {
    const start = m.index;
    const slice = body.slice(start, start + 1500);
    items.push({
      folge,
      datum: meta.datum || null,
      titel: 'Kalles Corner',
      inhalt: slice.replace(/\s+/g, ' ').slice(0, 600).trim(),
    });
  }
  return items;
}

// Gerücht der Woche
function findGeruechte(body, folge, meta) {
  const items = [];
  const rx = /Ger(?:ü|ue)cht\s+der\s+Woche/gi;
  for (const m of body.matchAll(rx)) {
    const slice = body.slice(m.index, m.index + 1500);
    items.push({
      folge,
      datum: meta.datum || null,
      titel: 'Gerücht der Woche',
      inhalt: slice.replace(/\s+/g, ' ').slice(0, 600).trim(),
    });
  }
  return items;
}

// Fun Fact
function findFunFacts(body, folge) {
  const items = [];
  const rx = /Fun[\s-]?Fact[^.\n]{0,300}/gi;
  for (const m of body.matchAll(rx)) {
    items.push({ folge, text: m[0].replace(/\s+/g, ' ').trim() });
  }
  return items;
}

// Zitate: alles in Anführungszeichen über 30 Zeichen
function findZitate(body, folge) {
  const items = [];
  const rx = /[„"]([^„"]{30,250})["“]/g;
  for (const m of body.matchAll(rx)) {
    items.push({ folge, zitat: m[1].trim() });
  }
  return items.slice(0, 12);
}

async function main() {
  if (!existsSync(TRANSCRIPTS_DIR)) {
    console.error('transcripts/ existiert nicht.');
    process.exit(1);
  }
  await mkdir(PUBLIC_DATA, { recursive: true });
  await mkdir(PUBLIC_TRANSCRIPTS, { recursive: true });

  const files = (await readdir(TRANSCRIPTS_DIR))
    .filter((f) => /\.(md|txt)$/i.test(f) && !f.startsWith('_') && f.toLowerCase() !== 'readme.md');

  const episodes = [];
  const startupIdeen = [];
  const kallesCorner = [];
  const geruechte = [];
  const funFacts = [];
  const zitate = [];
  const index = [];

  for (const f of files.sort()) {
    const raw = await readFile(join(TRANSCRIPTS_DIR, f), 'utf8');
    const { meta, body } = parseFrontmatter(raw);
    const folge = Number(meta.folge) || Number((f.match(/(\d+)/) || [])[1]) || null;

    episodes.push({
      folge,
      titel: meta.titel || basename(f, '.md'),
      datum: meta.datum || null,
      laufzeit: meta.laufzeit || null,
      themen: [],
    });

    startupIdeen.push(...findStartupIdee(body, folge));
    kallesCorner.push(...findKallesCorner(body, folge, meta));
    geruechte.push(...findGeruechte(body, folge, meta));
    funFacts.push(...findFunFacts(body, folge));
    zitate.push(...findZitate(body, folge));

    // Kopiere Transkript in public/ damit der Chat-Worker drauf zugreifen kann
    const outName = `folge-${String(folge || 0).padStart(2, '0')}.txt`;
    await copyFile(join(TRANSCRIPTS_DIR, f), join(PUBLIC_TRANSCRIPTS, outName));
    index.push({ folge, path: `/transcripts/${outName}` });
  }

  episodes.sort((a, b) => (b.folge || 0) - (a.folge || 0));
  startupIdeen.sort((a, b) => (b.folge || 0) - (a.folge || 0));
  kallesCorner.sort((a, b) => (b.folge || 0) - (a.folge || 0));
  geruechte.sort((a, b) => (b.folge || 0) - (a.folge || 0));

  const now = new Date().toISOString();
  const write = (name, items) =>
    writeFile(join(PUBLIC_DATA, name), JSON.stringify({ updatedAt: now, items }, null, 2));

  await Promise.all([
    write('episodes.json', episodes),
    write('startup-ideen.json', startupIdeen),
    write('kalles-corner.json', kallesCorner),
    write('geruechte.json', geruechte),
    write('fun-facts.json', funFacts),
    write('zitate.json', zitate),
    writeFile(join(PUBLIC_DATA, 'transcripts-index.json'), JSON.stringify(index, null, 2)),
  ]);

  console.log(`✓ ${episodes.length} Folgen verarbeitet`);
  console.log(`  ${startupIdeen.length} Startup-Ideen`);
  console.log(`  ${kallesCorner.length} Kalles-Corner-Einträge`);
  console.log(`  ${geruechte.length} Gerüchte`);
  console.log(`  ${funFacts.length} Fun-Facts, ${zitate.length} Zitate`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
