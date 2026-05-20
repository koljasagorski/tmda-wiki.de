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

## Status — 30/30 LIVE ✅

Alle Startup-Ideen mit Bewertung aus den Folgen 1-47 haben jetzt eine eigene Page. Jede mit komplett individuellem Design-Stil.

### 22/24 — Top-Tier

- [x] **HATS — Hot Air to Sock Adapter** · Folge 45 · industrial engineering
- [x] **windradhologramm.de** · Folge 44 · eco-tech cynical
- [x] **Das letzte was ich sehe.de** · Folge 41 · dystopian medical
- [x] **Tabletten-Matrjoschka** · Folge 32 · pharma luxury serif
- [x] **Kinderstimme Navi** · Folge 8 · friendly pastel app-store

### 21/24

- [x] **Zusammenfuehren.de** · Folge 28 · brutalist mono

### 20/24

- [x] **THE 500** · Folge 39 · performance-athletic neon
- [x] **LEVEL Wohnmobil-Levelling** · Folge 26 · outdoor premium magazine
- [x] **F·P·G Fingerabdruck-Handschuhe** · Folge 34 · classified dossier
- [x] **LIKE MIKE** · Folge 10 · travel-influencer luxury

### 19/24

- [x] **LKW-plane-kostenlos.de** · Folge 2 · highway brutalism

### 18/24

- [x] **Hello Flowers** · Folge 38 · minimalist Aesop-apothecary (Cormorant + sage/clay)
- [x] **rapidnews.com** · Folge 35 · tabloid Boomer-press (Anton + red/yellow blink)
- [x] **AURA Body-Tracking-Anzug** · Folge 27 · medical sports-tech (IBM Plex + cyan/white)
- [x] **FITS Silikonfinger** · Folge 16 · surgical minimal (Manrope thin/bold)
- [x] **Reborn.gov** · Folge 14 · government passport (Source Serif + cream/seal-red)

### 17/24

- [x] **neuhier.de** · Folge 46 · audio-podcast warm pastel (Outfit + orange)
- [x] **ROAD FREE — Google Maps Rich** · Folge 22 · gold luxury exclusive (Marcellus + black/gold)
- [x] **MY MOST PRIVATE BAG** · Folge 19 · fashion editorial (Playfair Display + black/cream)

### 16/24

- [x] **TUBSUIT** · Folge 21 · beach/surfer pastel (Fredoka + aqua/coral)
- [x] **Unicorn ImmoScan** · Folge 4 · proptech editorial (DM Serif Display)

### 14/24

- [x] **Zero You Go** · Folge 37 · bathroom-hygiene pastel (Outfit + soap-green)
- [x] **Hör auf — Habit Detector** · Folge 3 · health-app dark green (Plus Jakarta + neon)

### 13/24

- [x] **Schwabenpresse** · Folge 18 · schwäbisch traditional (Yeseva One + kraft paper)
- [x] **Tinklies®** · Folge 15 · whimsical bathroom-tile (Pacifico + tile blue/pink)
- [x] **KNARSCH** · Folge 12 · y2k cyberpunk (Major Mono + purple/cyan)

### 12/24

- [x] **Bitter Sleeve™** · Folge 43 · energy-drink lime (Bebas Neue + lime/black)
- [x] **DRIVEMARKT** · Folge 20 · arcade pixel-art (Press Start 2P + neon)

### 11/24

- [x] **Hundeschule der anderen Art** · Folge 11 · xerox flyer (Special Elite + Patrick Hand)
- [x] **WHAT LIFE WEIGHTS** · Folge 9 · contemplative magazine (Cardo + olive/cream)

## Konvention bei NEUEN Folgen

Wenn eine neue Folge kommt und eine Startup-Idee mit Punkten ≥ 10 enthält:
1. Roadmap-Eintrag in dieser Datei ergänzen
2. PR-Template-Checklist hat dafür eine eigene Checkbox (siehe `.github/PULL_REQUEST_TEMPLATE.md`)
3. Page mit komplett neuem Style (siehe Liste oben — keinen Stil doppelt)
