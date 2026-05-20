# 🚀 Startup-Pages Roadmap

Jede Startup-Idee der Woche aus dem TMDA Podcast bekommt eine eigene **One-Pager-Seite** — komplett individuell gestaltet, als wäre es ein echtes Produkt. Pro Page eigenes Design, eigene Farben, eigener Aufbau. Kein Shared-CSS.

## Konvention

- **Path**: `/startup/<slug>` → serves `public/startup/<slug>/index.html`
- **Self-contained**: HTML/CSS/JS inline, keine Abhängigkeiten zur Wiki-CSS
- **Eigene SEO**: `<title>`, `<meta description>`, OG-Tags, JSON-LD direkt im File
- **Footer**: dezenter Back-to-Wiki Link mit Folge-Reference
- **Hero-Bild**: Custom SVG (zukünftig optional KI-generierte PNGs unter `public/startup/<slug>/og.png`)
- **Eingehende Links**: Nur auf der `/startup-ideen`-Übersichtsseite via slug-Match in `public/data/startup-pages.json`

## Workflow für neue Startups

1. **Eintrag** in `public/data/startup-pages.json` (folge, ideeMatch, slug, domain, tagline)
2. **Ordner** `public/startup/<slug>/` mit `index.html` anlegen
3. **Page bauen**: komplett individuelles Design, neuer Look gegenüber bestehenden
4. **SEO**: title 50-65 Zeichen, description 140-160, OG-Image
5. **Linken**: `/startup-ideen` Übersicht erkennt slug-Match automatisch → Link erscheint

## Status — 39 Startup-Ideen mit Punkten

### ✅ Live

- [x] **HATS — Hot Air to Sock Adapter** · Folge 45 · 22/24 · industrial engineering style
- [x] **windradhologramm.de** · Folge 44 · 22/24 · eco-tech with cynical twist

### 📋 Top-Bewertet (22/24+ Punkte) — Priorität 1

- [ ] **Das letzte was ich sehe.de** — Werbung in die Iris brennen · Folge 41 · 22/24 · dystopian medical
- [ ] **Tabletten-Matruschka** · Folge 32 · 22/24 · pharma + russian aesthetic
- [ ] **Navi-Plugin mit Kinderstimme** · Folge 8 · 22/24 · friendly app-store style

### 📋 21/24 — Priorität 2

- [ ] **Zusammenfuehren.de / Zusammenpunktfuehren** · Folge 28 · 21/24 · brutalist navi-app

### 📋 20/24 — Priorität 3

- [ ] **The 500** · Folge 39 · 20/24
- [ ] **Fingerabdruck-Handschuhe** (von Hoerer Jonas Tiele) · Folge 34 · 20/24
- [ ] **Wohnmobil-Levelling per Luftfahrwerk** · Folge 26 · 20/24
- [ ] **Like Mike / Holiday in a life with** · Folge 10 · 20/24

### 📋 19/24

- [ ] **LKW-plane-kostenlos.de** · Folge 2 · 19/24

### 📋 18/24

- [ ] **Hello Flowers** · Folge 38 · 18/24
- [ ] **rapidnews.com — KI Fake-News-Generator** · Folge 35 · 18/24
- [ ] **Body-Tracking-Anzug zur Rückenschmerz-Rekonstruktion** · Folge 27 · 18/24
- [ ] **Silikonfinger** · Folge 16 · 18/24
- [ ] **Reborn.de — Zeugenschutz für alle** · Folge 14 · 18/24

### 📋 17/24

- [ ] **neuhier.de (mitg.de / dgf.de)** · Folge 46 · 17/24
- [ ] **Google Maps Premium für Reiche** · Folge 22 · 17/24
- [ ] **My Most Private Bag — Designer-Blutbeutel** · Folge 19 · 17/24

### 📋 16/24 und tiefer

Liste der restlichen ~20 Startups wird beim Erstellen befüllt. Siehe `public/data/startup-ideen.json` für die volle Liste.

## Design-Diversity-Briefing

Damit jede Page komplett anders aussieht, hier die Style-Ideen pro Tier (keine darf doppelt vorkommen):

- Industrial Engineering / Schwarz-Gelb-Warning · ✓ HATS
- Eco-Tech mit Green-Sky · ✓ windradhologramm
- Dystopian Medical / Schwarz + Medical Red
- Pharma + Russian Aesthetic / White + Red
- Friendly App-Store / Pastel
- Brutalist Mono
- Y2K Retro
- Luxury Black (für rich/exclusive Startups)
- Y-Combinator-Clean
- Webbrutalismus / Comic Sans
- Cyberpunk Neon
- Eco-Brand-Warm
- 90er-IT-Beige
- Premium-Tech-Glass-Morphism
- Conspiracy-Theorist (für die absurden)

## Konvention bei NEUEN Folgen

Wenn eine neue Folge kommt und eine Startup-Idee mit Punkten ≥ 16 enthält:
1. Roadmap-Eintrag in dieser Datei ergänzen
2. PR-Template-Checklist hat dafür eine eigene Checkbox (siehe `.github/PULL_REQUEST_TEMPLATE.md`)
3. Page in den nächsten 1-2 PRs nachreichen
