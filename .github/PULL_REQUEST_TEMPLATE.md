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

## Andere Hinweise

<!-- Optional: Screenshots, Breaking Changes, Migrations-Notizen -->
