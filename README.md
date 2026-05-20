# TMDA Wiki

Ein Fan-Wiki für den Podcast **„Teenager mit deutschem Akzent"** (TMDA) von **Fynn Kliemann** und **Nisse Ingwersen**. Jeden Dienstag eine neue Folge — hier sammeln wir alles, was dabei rausfällt: Startup-Ideen mit Punkten, Kalles Corner, Gerüchte der Woche, Inside-Jokes, Erfindungen und mehr.

Läuft auf **Cloudflare Workers**, mit AI-Chat über **Workers AI** (Llama 3.1).

---

## Inhaltliche Rubriken

Alle Rubriken werden aus den Folgen-Transkripten extrahiert. Stand `npm run aggregate`:

| Rubrik | Was drinsteckt |
|---|---|
| **Folgen-Archiv** | Alle Folgen mit Titel, Datum, Themen, Kurzbeschreibung |
| **Startup-Idee der Woche** | Fynns Idee + Nisses Bewertung (Skala bis 24 Punkte) |
| **Kalles Corner** | Anekdote/Beitrag von Kalle (ab Folge ~37) |
| **Gerücht der Woche** | Klatsch & Insiderwissen über Promis |
| **Erfindungen, die keiner braucht** | Absurde Produktideen |
| **Glossar & Inside-Jokes** | Wiederkehrende Phrasen, Slang |
| **Zitate** | Beste Sätze pro Folge |
| **Erwähnte Personen** | Index aller genannten Promis/Künstler |
| **Fun Facts** | Spontaner Fun Fact am Folgenanfang |
| **Hosts & Cast** | Fynn, Nisse, Kalle — Bio, Diskografie, Projekte, Social |
| **AI-Chat** | Frag das Wiki direkt (Workers AI, kennt auch Hosts-Bios) |
| **Transkripte gesucht** | Aufruf an Helfer:innen für Sprecher-zugeordnete Transkripte |

### Auf der Startseite

- **Neueste YouTube-Folge** wird automatisch als Embed gezeigt (über die RSS-Feed-Lookup im Worker, gecacht).
- **Stats-Grid** mit allen Counts.
- **Top-bewertete Startup-Idee** als Highlight-Card.

### Floating Chat

Ein **AI-Chat-Button** unten rechts auf allen Seiten. Klick → Modal mit gleicher Chat-Logik wie die `/chat`-Seite. Beide teilen sich Question-Count, Spenden-Callout (nach 3 Fragen) und Bot-Schutz.

### Bot-Schutz mit Cloudflare Turnstile

**Alle N Fragen** (Default: 6, also bei Frage 6, 12, 18, …) wird ein Cloudflare-Turnstile-Captcha eingeblendet. Das ist Interval-basiert, weil Turnstile-Tokens single-use sind und „immer ab Frage 5" bedeuten würde, dass jede Frage einen neuen Token braucht.

Konfiguration in `wrangler.jsonc`:
- `TURNSTILE_SITE_KEY` (public, var)
- `TURNSTILE_QUESTION_THRESHOLD` (Interval, default `"6"`)
- `TURNSTILE_SECRET_KEY` → setzen via `npx wrangler secret put TURNSTILE_SECRET_KEY`

Solange die Keys leer sind, läuft alles ohne Captcha (graceful degradation).

### 🥚 Easter Eggs

Alles in `public/easter-eggs.js`. Drück <kbd>?</kbd> auf der Seite für das komplette Cheatsheet als Overlay.

**Tipp-Trigger** (auf der Wiki-Seite, ohne fokussiertes Input):
- `kalle` → Schwensen-Quote · `papst` → Maya-2033-Countdown · `fanta` → 🐐-Regen
- `flutschi` / Konami-Code → Flutschi-Modus · `crazy` → Pele-Beckenbauer
- `thelen` → 🥕-Regen „Karsten ist Gemüse" · `tabletten` / `matrjoschka` → 💊-Pop
- `marsalek` → Wanted-Poster · `hartz4` → 🐛 Cursor-Trail · `iris` → Werbungs-Blitz
- `windrad` → Hologramm · `bosse` → fiktives Album-Cover · `lindemann` → Krisen-PR-Quote
- `aaron` → 🌴-Regen

**Klick/Maus-Trigger**:
- Logo 2× klicken → Starfield „Talahons im Weltall"
- 3× Klick auf eine Score-Badge → Konfetti
- 5× Klick auf einen Stat-Counter → Achievement
- Maus in alle 4 Bildschirmecken → Cornerologe
- Long-Press auf Chat-FAB → „Kalle Direct Line"
- Triple-Click „TMDA Wiki" im Footer → Credits

**Zeit/Kontext**:
- Dienstag → Folgentag-Banner · 3am–7am → „Mucki ist tot, ne" · Tab unfocused → Titel rotiert TMDA-Quotes
- Browser-Konsole öffnen → Branded Greeting mit Nisse-Quote
- <kbd>?</kbd> → Help-Overlay mit allen Eggs

Dazu hängt der **Chat-Bot** nach jeder AI-Antwort eine kleine kursive Hint-Bubble (`.msg-hint`) mit einem zufälligen Egg-Hint an. Die Hint-Texte erklären explizit, dass das Trigger-Wort **auf der Seite** (nicht im Chat-Input) getippt werden muss.

### 🍪 Cookie-Banner

Pure Witz-Compliance — wir setzen keine Tracking-Cookies, nur funktionale localStorage-Keys. Banner erscheint einmal pro Browser (`tmda-cookie-acknowledged`-Flag), schreibt ironisch was wir wirklich speichern, und linkt auf nichts. Das Bild im Banner-Slot lädt aus `/cookies.png` — falls die Datei fehlt, fällt der Banner auf 🍟-Emoji zurück.

---

## Tech Stack

- **Runtime:** Cloudflare Workers
- **Framework:** [Hono](https://hono.dev/) — leichtgewichtig, perfekt für Workers
- **Frontend:** Vanilla HTML/CSS/JS — kein Build-Step, Hash-Routing, Dark/Light-Mode
- **AI Chat:** Cloudflare Workers AI (`@cf/meta/llama-3.1-8b-instruct`) mit dem Wiki-Kontext + Transkripten
- **Static Assets:** Workers Assets (via `wrangler.jsonc`)
- **Datenpipeline:** Python (Cleanup) + Node (Aggregation) + AI (Extraktion)

---

## Projektstruktur

```
tmda-wiki.de/
├── README.md
├── package.json
├── wrangler.jsonc
├── src/
│   └── index.js              # Worker: API + Chat + Asset-Fallback
├── public/                   # Static Frontend (Workers Assets)
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   ├── data/                 # Aggregierte JSON-Rubriken (live im Wiki)
│   │   ├── episodes.json
│   │   ├── startup-ideen.json
│   │   ├── kalles-corner.json
│   │   ├── geruechte.json
│   │   ├── glossar.json
│   │   ├── erfindungen.json
│   │   ├── orte.json
│   │   ├── gaeste.json
│   │   ├── zitate.json
│   │   ├── fun-facts.json
│   │   └── transcripts-index.json
│   └── transcripts/          # Kopie der Transkripte für den AI-Chat
├── transcripts/              # Folgen-Transkripte (Quelldateien)
│   ├── folge-01.txt
│   ├── folge-02.txt
│   └── …
└── scripts/
    ├── import-raw.py         # Rohe YouTube-Subtitles → folge-XX.txt cleanen
    └── aggregate.js          # Per-Episode JSONs → public/data/*.json
```

---

## Datenpipeline

```
                ┌─────────────────────┐
  Roh-ZIP  ───▶ │ import-raw.py       │ ───▶ transcripts/folge-XX.txt
                └─────────────────────┘
                          │
                          ▼
                ┌─────────────────────┐
                │ AI-Extraktion       │ ───▶ /tmp/tmda-extracts/folge-XX.json
                │ (Claude pro Folge)  │       (eine JSON pro Episode)
                └─────────────────────┘
                          │
                          ▼
                ┌─────────────────────┐
                │ aggregate.js        │ ───▶ public/data/*.json
                │ + Copy Transkripte  │       (alle Rubriken)
                └─────────────────────┘
                          │
                          ▼
                Cloudflare Worker
```

### Neue Folgen hinzufügen

1. **Transkript holen** (z.B. YouTube-Untertitel als Text) → in `transcripts/folge-XX.txt` ablegen.
   Format: Frontmatter (folge/titel/laufzeit) + Plain Text mit `[MM:SS] Inhalt` Markern.
2. **AI-Extraktion**: Ein LLM (Claude/GPT) liest das Transkript und schreibt eine JSON nach `/tmp/tmda-extracts/folge-XX.json` (oder `scripts/extracts/folge-XX.json`) gemäß dem Schema in `scripts/aggregate.js`.
3. **Aggregieren**: `npm run aggregate` — überschreibt `public/data/*.json` und die Transkript-Kopie unter `public/transcripts/`.
4. **Deployen**: `npm run deploy`.

#### ⚠️ Wenn eine neue Folge dazukommt — IMMER checken

Eine neue Folge betrifft mehr als nur die JSON-Daten. Bei jeder neuen Folge prüfen:

| Bereich | Was prüfen |
|---|---|
| **`public/data/*.json`** | Wird automatisch durch `npm run aggregate` aktualisiert. |
| **`public/data/hosts.json`** | Hat Kalle/Fynn/Nisse was Neues über sich erzählt? Neue Projekte / Alben / Aussagen, die ins Bio gehören? |
| **Chat-Kontext** (`src/index.js` → `buildWikiContext`) | Lädt alles automatisch aus den Aggregations-JSONs — keine manuelle Aktion nötig, AUSSER die Folge führt eine neue Rubrik ein. |
| **Easter Eggs** (`public/easter-eggs.js`) | Hat die Folge ein **memorable Wort/Zitat**, das ein neues Egg verdient? (Beispiele bisher: „flutschi" → Folge 42, „papst" → Folge 1, „crazy" → Folge 37.) Wenn ja: neuer Eintrag in `TRIGGERS` + Hint in `EASTER_HINTS` in `public/app.js` + Cheatsheet-Eintrag in `easter-eggs.js` → `showHelpOverlay`. |
| **Chat-Hints** (`public/app.js` → `EASTER_HINTS`) | Bei neuem Egg: auch einen Hint hier ergänzen. |
| **SEO** (`src/seo.js`) | Wenn die Folge ein wirklich starkes Thema hat (z.B. neue Diskografie, neuer Skandal), evtl. die `description` der Home/`/folgen`-Route updaten. Pro-Folge-Meta läuft automatisch über `metaForFolge`. |
| **Folgen-Datum-Backfill** | `scripts/aggregate.js` → `KNOWN_DATES`: neue Folge mit Release-Datum eintragen (für sitemap `lastmod` + UI). |
| **YouTube-Embed** | Wird via Playlist-RSS automatisch aktualisiert (30-Min-Cache). Keine Aktion nötig. |
| **Sitemap** | Wird im Worker dynamisch aus `episodes.json` generiert. Automatisch. |

Diese Checkliste ist auch in `.github/PULL_REQUEST_TEMPLATE.md` als Pflicht-Abschnitt, sobald ein PR Files unter `transcripts/` oder `scripts/extracts/` ändert.

---

## Entwicklung

```bash
npm install
npm run dev          # Lokaler Workers-Dev-Server (mit Asset-Serving)
npm run build:data   # Aggregiert aus /tmp/tmda-extracts/ → public/data/
npm run seo-check    # Prüft SEO-Coverage neuer Routen
npm run deploy       # Push nach Cloudflare
```

Voraussetzungen:
- Node.js ≥ 20
- Python 3 (für `import-raw.py`)
- Cloudflare Account + `wrangler login`

### Environment-Variablen (`wrangler.jsonc` → `vars`)

| Variable | Was | Default |
|---|---|---|
| `SITE_URL` | Canonical-URL für Sitemap/OG | `https://tmda-wiki.de` |
| `REPO_URL` | Repo-Link für Footer | `https://github.com/koljasagorski/tmda-wiki.de` |
| `YOUTUBE_CHANNEL_ID` | YouTube-Channel-ID (`UC...`) als Fallback für den Latest-Video-Embed. | `""` |
| `YOUTUBE_PLAYLIST_ID` | YouTube-Playlist-ID (`PL...`) wird **bevorzugt** für den Latest-Video-Embed — saubere Folgenliste ohne Shorts/Random-Videos. | `""` |
| `TURNSTILE_SITE_KEY` | Public Site-Key (vom Cloudflare-Dashboard). Wenn leer, kein Captcha. | `""` |
| `TURNSTILE_QUESTION_THRESHOLD` | Ab welcher Nutzerfrage Turnstile triggert | `"5"` |

### Secrets (via `wrangler secret put`)

| Secret | Was |
|---|---|
| `TURNSTILE_SECRET_KEY` | Server-Secret für Turnstile-Verifikation |

Beispiel: `npx wrangler secret put TURNSTILE_SECRET_KEY`

### Beim Ändern → README mit anpassen

**Konvention für PRs:** wenn du Routes, UI-Komponenten, Env-Vars, Pipelines oder API-Endpunkte ergänzt/änderst, **muss** die README mit aktualisiert werden. Der PR-Template-Check `.github/PULL_REQUEST_TEMPLATE.md` hat dazu eine Checkbox.

---

## SEO

Die Wiki verwendet **Path-basiertes Routing** (kein Hash) und ist damit komplett crawlbar. Pro Route werden Title, Description, Open Graph, Twitter Card und JSON-LD vom Worker via HTMLRewriter pro Request injiziert. `/sitemap.xml` und `/robots.txt` werden ebenfalls dynamisch im Worker generiert.

**Source of Truth:** [`src/seo.js`](./src/seo.js) — dort sind alle Routen mit `title`, `description`, `priority`, `changefreq` und ggf. `robots` konfiguriert.

**Bei jeder neuen Route:**
1. Eintrag in `src/seo.js` → `STATIC_ROUTES` (oder `DYNAMIC_PATTERNS`) ergänzen
2. `npm run seo-check` läuft lokal — CI macht das auch automatisch bei jedem PR
3. PR-Template hat eine SEO-Checkliste, die ausgefüllt werden muss

Die `SITE_URL` ist in `wrangler.jsonc` unter `vars` gesetzt — anpassen, falls die Custom Domain wechselt.

---

## Footer / Repo

Im Footer der Seite wird auf dieses Repo verlinkt:
**https://github.com/koljasagorski/tmda-wiki.de**

---

## Disclaimer

Inoffizielles Fan-Projekt. Keine Verbindung zu Fynn Kliemann, Nisse Ingwersen oder dem Podcast-Team.

**Hör- und Schau-Quellen:**
- [Spotify](https://open.spotify.com/show/1U68QUHMUz360Ft1NCK9Ur)
- [Apple Podcasts](https://podcasts.apple.com/de/podcast/teenager-mit-deutschem-akzent-tmda/id1825080928)
- [YouTube](https://www.youtube.com/@tmda-podcast)
