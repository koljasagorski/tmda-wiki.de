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

## Status — 56/56 LIVE ✅

**Jede** Startup-Idee aus den Folgen 1-56 hat jetzt eine eigene Page — auch die Spaß-/Low-Score- und ungewerteten Ideen. Jede mit komplett individuellem Design-Stil (kein Stil doppelt). Alle Pages haben oben links einen einheitlichen „← Wiki"-Zurück-Button (injiziert via `scripts/inject-back-button.js`, idempotent).

### 22/24 — Top-Tier

- [x] **Operation Nordstrand (Mond-Abschuss)** · Folge 53 · 14/24 · staatliche Weltraum-Behörde / Space-Race-Propaganda (Kosmos-Navy, Gold/Silber, Zertifikat)
- [x] **Der Glasturm** · Folge 54 · durchgefallen (kein expliziter Score) · NEOM „The Line"-Minimalismus (Glas-Weiß, Gletscherblau, ultradünne Grotesk)
- [x] **Chip und Chap** · Folge 55 · 7/24 · Sleep-Tech Nacht-Look (Indigo/Cyan-Glow, Bricolage Grotesque + DM Sans)
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

- [x] **Shability** · Folge 48 · peer-economy warm-handshake (Nunito + coral/forest-green)
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

- [x] **Hellflowers — Keine Macht den Stil-Pflanzen** · Folge 50 · desert/cactus eco (Fraunces + sand/cactus/bloom)
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

- [x] **Reroute Your Praise — Kaba-Spiegel-Satellit-Abo** · Folge 49 · celestial astro-spiritual SaaS (Amiri + Space Grotesk, midnight/gold/beam)
- [x] **Hundeschule der anderen Art** · Folge 11 · xerox flyer (Special Elite + Patrick Hand)
- [x] **WHAT LIFE WEIGHTS** · Folge 9 · contemplative magazine (Cardo + olive/cream)

### < 10 — Spaß-/Low-Score- & ungewertete Ideen (neu)

- [x] **Die AOK-Biegung** · Folge 52 · 3/24 · DDR-Planwirtschaft Propaganda Poster / Konstruktivismus (Oswald + Source Serif 4, Rot/Beige/Stahl, Constructivist diagonal stripes)
- [x] **AQUAVION — wassergelagertes Flugzeug** · Folge 51 · 7/24 · aqua flotation / zero-gravity wellness (Sora + Hanken Grotesk, Spa-Türkis/Glas-Doppelwand, schwebende Partikel, Schneekugel-Motiv)
- [x] **Ad Music / Add Music** · Folge 6 · 9/24 · music-streaming neon (Equalizer/Waveform, cyan)
- [x] **Die Kiste von Gabba** · Folge 56 · 8/24 · Gabba-Rave/Berlin-Club dark-techno (Share Tech Mono + Barlow Condensed, Neon-Grün/Schwarz, Scanlines)
- [x] **Kofferreisen.de** · Folge 40 · 8/24 · billig-airline boarding-pass (navy/gelb, Perforation)
- [x] **Was-Verdient.de** · Folge 29 · 6/24 · fintech bloomberg-terminal (mono, grüne Ziffern, Ticker)
- [x] **Zauberinternat Live (Hogwarts Big Brother)** · Folge 17 · 6/24 · streaming OTT cinematic dark-academia (emerald/gold)
- [x] **Schugon** · Folge 13 · 6/24 · retro teleshopping infomercial (rote Starbursts, Vorher/Nachher)
- [x] **Das schwarze Weltkleid** · Folge 47 · 5/24 · avantgarde haute-couture monochrom (rein schwarz, ultradünn)
- [x] **ROLLBED — Fahrbares Hotel** · Folge 24 · 4/24 · industrielle Fracht/Logistik (stahl/container-orange)
- [x] **Hup-Alarm** · Folge 25 · 2/24 · behörden emergency-broadcast (hazard gelb/schwarz, Sirene)
- [x] **Punching Bulb (PUNCHBÄLLØ)** · Folge 5 · 2/24 · flatpack Möbelkatalog (blau/gelb, Montageanleitung)
- [x] **Steuerquartett** · Folge 31 · 0/24 · Amtsformular × Quartett-Karten (amtsgrau, Stempel)
- [x] **Blinkerhand** · Folge 42 · ungewertet · automotive aftermarket tuning (carbon, DIN-Maßzeichnung)
- [x] **Garbage Pro 360 (G60)** · Folge 36 · ungewertet · Apple-keynote-Parodie (grau/weiß, ultradünn)
- [x] **Jonas von Schwan — Schwan-Export** · Folge 33 · ungewertet · luxus-export Handelshaus (creme/teal/gold ornamental)
- [x] **Fanta GNU** · Folge 1 · ungewertet · softdrink retro-wüsten-pop (orange, Sahara, Hitzeflimmern)

## Konvention bei NEUEN Folgen

Jede neue Folge mit Startup-Idee bekommt eine eigene Page (unabhängig von der Punktzahl):
1. Roadmap-Eintrag in dieser Datei ergänzen
2. PR-Template-Checklist hat dafür eine eigene Checkbox (siehe `.github/PULL_REQUEST_TEMPLATE.md`)
3. Page mit komplett neuem Style (siehe Liste oben — keinen Stil doppelt)
4. Eintrag in `public/data/startup-pages.json` + `node scripts/inject-back-button.js` ausführen
