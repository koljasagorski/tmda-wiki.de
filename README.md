# TMDA Wiki

Ein Fan-Wiki für den Podcast **„Teenager mit deutschem Akzent"** (TMDA) von **Fynn Kliemann** und **Nisse Ingwersen**. Jeden Dienstag eine neue Folge — hier sammeln wir alles, was dabei rausfällt: Startup-Ideen, Kalles Corner, Gerüchte der Woche, Inside-Jokes, Glossar und mehr.

Läuft auf **Cloudflare Workers**, mit AI-Chat über **Workers AI**.

---

## Inhaltliche Rubriken (geplant)

Wird aus den Transkripten gefüllt — Vorschläge sind erweiterbar:

| Rubrik | Beschreibung |
|---|---|
| **Startup-Idee der Woche** | Fynns wöchentliche Geschäftsidee inkl. Bewertung / Punktzahl durch Nisse |
| **Kalles Corner** | Beiträge / Geschichten von Kalle |
| **Gerücht der Woche** | Klatsch, Tratsch und (vermeintliches) Insiderwissen |
| **Fun Fact des Tages** | Der spontane, oft nutzlose Fun Fact am Folgenanfang |
| **Erfindungen, die keiner braucht** | Absurde Produktideen |
| **Missverständnisse über die Welt** | Was die beiden falsch verstanden haben |
| **Wort der Folge** | Wiederkehrende Phrasen, Slang, Insider-Vokabular |
| **Gäste & Erwähnungen** | Wer wurde namentlich erwähnt (Künstler, Promis, Kollegen) |
| **Orte** | Erwähnte Orte (Sri Lanka, Moskau, Abenteuerland, …) |
| **Folgen-Archiv** | Alle Folgen mit Datum, Laufzeit, Themen, Highlights |
| **Glossar / Inside-Jokes** | „Talahons im Weltall", „Trockener Flutschi", running gags |
| **Hosts** | Profile von Fynn & Nisse |
| **Zitate** | Beste Zitate pro Folge |

---

## Tech Stack

- **Runtime:** Cloudflare Workers
- **Framework:** [Hono](https://hono.dev/) (leichtgewichtiges Router-Framework für Workers)
- **Frontend:** Vanilla HTML/CSS/JS — keine Build-Schritte, modernes Design
- **AI Chat:** Cloudflare Workers AI (`@cf/meta/llama-3.1-8b-instruct`) mit den Transkripten als Kontext
- **Static Assets:** Workers Assets (über `wrangler.jsonc`)
- **Daten:** JSON-Dateien in `data/`, generiert aus den Transkripten in `transcripts/`

---

## Projektstruktur

```
tmda-wiki.de/
├── README.md
├── package.json
├── wrangler.jsonc          # Cloudflare Worker config
├── src/
│   └── index.js            # Worker: API + Chat + Asset-Fallback
├── public/                 # Static Frontend (wird über Workers Assets ausgeliefert)
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── data/                   # Strukturierte Daten (aus Transkripten generiert)
│   ├── episodes.json
│   ├── startup-ideen.json
│   ├── kalles-corner.json
│   ├── geruechte.json
│   └── glossar.json
├── transcripts/            # ← HIER kommen die Folgen-Transkripte hin
│   └── README.md           # Format-Doku
└── scripts/
    └── extract.js          # Helper: Rubriken aus Transkripten extrahieren
```

---

## Transkripte hochladen

Bitte ins Verzeichnis [`transcripts/`](./transcripts/) legen. Naming-Convention:

```
transcripts/folge-01.md         # oder .txt
transcripts/folge-02.md
...
transcripts/folge-47.md
```

Format-Empfehlung (gerne auch frei — Hauptsache lesbar):

```markdown
---
folge: 47
titel: Talahons im Weltall
datum: 2026-05-19
laufzeit: 1:02:00
---

[Transkript-Inhalt hier ...]
```

Details siehe [`transcripts/README.md`](./transcripts/README.md).

---

## Entwicklung

```bash
npm install
npm run dev       # Lokaler Workers-Dev-Server
npm run deploy    # Deploy nach Cloudflare
```

Voraussetzungen:
- Node.js ≥ 20
- Cloudflare-Account + `wrangler login`

---

## Roadmap

- [x] Projekt-Scaffold + Cloudflare Worker
- [x] Modernes Frontend-Design (Dark Mode)
- [x] AI-Chat-Endpoint (Workers AI)
- [ ] Transkripte einlesen (steht aus — Upload durch Maintainer)
- [ ] Rubriken-Extraktion (Startup-Ideen, Kalles Corner, …) aus Transkripten
- [ ] Such-Funktion über alle Folgen
- [ ] Episode-Detail-Seiten mit Highlights & Zitaten
- [ ] RSS-Feed-Integration für neue Folgen

---

## Disclaimer

Inoffizielles Fan-Projekt. Keine Verbindung zu Fynn Kliemann, Nisse Ingwersen oder dem Podcast-Team.

**Quellen:**
- Podcast: [Spotify](https://open.spotify.com/show/1U68QUHMUz360Ft1NCK9Ur) · [Apple Podcasts](https://podcasts.apple.com/de/podcast/teenager-mit-deutschem-akzent-tmda/id1825080928) · [YouTube](https://www.youtube.com/@tmda-podcast)
