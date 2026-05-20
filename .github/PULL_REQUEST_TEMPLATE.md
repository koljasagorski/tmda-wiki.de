# Pull Request

## Was ändert sich?

<!-- Kurze Zusammenfassung — Was, Warum -->

## Test Plan

- [ ] `npm run dev` läuft lokal durch
- [ ] Build via Cloudflare Worker erfolgreich (siehe `Workers Builds: tmda-wikide`)

## ✅ SEO-Checkliste (Pflicht bei neuen Routen / Inhalten)

> Hintergrund: jede neue Unterseite muss SEO-optimiert sein. Source of Truth: `src/seo.js`. Sitemap und Meta-Tags werden im Worker generiert (`src/index.js` → `renderPage`).

Wenn du eine **neue Route** in `public/app.js` ergänzt:

- [ ] Eintrag in `src/seo.js` → `STATIC_ROUTES` (oder `DYNAMIC_PATTERNS` + `metaForDynamic`) ergänzt
  - [ ] `title` (50–65 Zeichen, „… | TMDA Wiki" am Ende ist Konvention)
  - [ ] `description` (140–160 Zeichen, mit Hauptkeyword)
  - [ ] `priority` & `changefreq` plausibel gesetzt
  - [ ] `robots` falls die Seite nicht indexiert werden soll (z.B. `chat`)
- [ ] Nav-Link in `public/index.html` ergänzt (sofern öffentlich)
- [ ] `npm run seo-check` läuft erfolgreich (Coverage check)

Wenn du **bestehende Inhalte** veränderst, prüfe ob die Beschreibung in `src/seo.js` noch passt.

## 📚 README-Pflicht (bei Änderungen)

- [ ] **README ist auf dem aktuellen Stand**, wenn der PR Routes, UI-Komponenten, Env-Variablen, Pipelines oder API-Endpunkte betrifft

## 🎙️ Neue Folge dazugekommen? (Pflicht-Check)

> Wenn dieser PR Files unter `transcripts/`, `scripts/extracts/` oder `public/data/episodes.json` ergänzt/ändert, müssen folgende Punkte mitgepflegt werden — die Folge betrifft mehr als nur die Rohdaten.

- [ ] **`npm run aggregate`** lief — `public/data/*.json` ist neu generiert
- [ ] **`scripts/aggregate.js` → `KNOWN_DATES`** enthält das Datum der neuen Folge (für Sitemap & UI)
- [ ] **`public/data/hosts.json`** durchgesehen: erzählt die Folge was Neues über Fynn/Nisse/Kalle (neues Album, Projekt, Aussage)?
- [ ] **Easter Eggs geprüft**: gibt es ein **memorable Wort/Zitat** in der Folge, das ein neues Egg verdient? Wenn ja:
  - [ ] Neuer Trigger in `public/easter-eggs.js` → `TRIGGERS`
  - [ ] Neuer Hint in `public/app.js` → `EASTER_HINTS`
  - [ ] Cheatsheet-Eintrag in `public/easter-eggs.js` → `showHelpOverlay`
- [ ] **Chat-Kontext** (`src/index.js` → `buildWikiContext`): nur aktiv werden wenn die Folge eine **komplett neue Rubrik** einführt (sonst läuft alles über die Aggregations-JSONs automatisch)
- [ ] **SEO** (`src/seo.js`): bei starkem neuen Thema die Home-/Folgen-`description` ergänzen — pro-Folge-Meta ist automatisch via `metaForFolge`

## Andere Hinweise

<!-- Optional: Screenshots, Breaking Changes, Migrations-Notizen -->
