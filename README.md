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
| **AI-Chat** | Frag das Wiki direkt (Workers AI) |

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
2. **AI-Extraktion**: Ein LLM (Claude/GPT) liest das Transkript und schreibt eine JSON nach `/tmp/tmda-extracts/folge-XX.json` gemäß dem Schema in `scripts/aggregate.js`.
3. **Aggregieren**: `npm run aggregate` — überschreibt `public/data/*.json`.
4. **Deployen**: `npm run deploy`.

---

## Entwicklung

```bash
npm install
npm run dev          # Lokaler Workers-Dev-Server (mit Asset-Serving)
npm run build:data   # Aggregiert aus /tmp/tmda-extracts/ → public/data/
npm run deploy       # Push nach Cloudflare
```

Voraussetzungen:
- Node.js ≥ 20
- Python 3 (für `import-raw.py`)
- Cloudflare Account + `wrangler login`

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
