// SEO-Konfiguration — Single Source of Truth für Title, Description,
// Sitemap-Priorität und Robots-Direktiven pro Route.
//
// WICHTIG: Wenn du eine neue Route in public/app.js ergänzt, MUSS du sie
// auch hier eintragen. Der CI-Check `npm run seo-check` weist sonst zurück.

export const SITE_NAME = 'TMDA Wiki';
export const SITE_LOCALE = 'de_DE';
export const DEFAULT_SITE_URL = 'https://tmda-wiki.de';

const DEFAULT = {
  description: 'Inoffizielles Fan-Wiki für „Teenager mit deutschem Akzent“ mit Fynn Kliemann und Nisse Ingwersen. Startup-Ideen mit Punkten, Kalles Corner, Gerüchte, Inside-Jokes, Glossar.',
  keywords: 'TMDA, Teenager mit deutschem Akzent, Fynn Kliemann, Nisse Ingwersen, Podcast, Wiki, Startup-Idee der Woche, Kalles Corner, Kalle Schwensen, Gerücht der Woche, Heimwerkerking',
  changefreq: 'weekly',
  priority: 0.7,
  robots: 'index,follow',
  image: '/og-image.png',
  imageType: 'image/png',
  imageWidth: '1200',
  imageHeight: '630',
};

export const STATIC_ROUTES = {
  '/': {
    title: 'TMDA Wiki — Das inoffizielle Fan-Wiki zu „Teenager mit deutschem Akzent“',
    description: 'Inoffizielles Fan-Wiki zu „Teenager mit deutschem Akzent“ mit Fynn Kliemann & Nisse Ingwersen — 45+ Folgen, Startup-Ideen mit Punkten, Kalles Corner, Gerüchte, Inside-Jokes und AI-Chat.',
    priority: 1.0,
    changefreq: 'daily',
  },
  '/folgen': {
    title: 'Folgen-Archiv — alle TMDA Episoden | TMDA Wiki',
    description: 'Komplettes Folgen-Archiv des TMDA Podcasts mit Themen, Highlights und Kurzbeschreibung pro Episode.',
    priority: 0.9,
  },
  '/startup-ideen': {
    title: 'Startup-Idee der Woche — alle Ideen mit Punkten | TMDA Wiki',
    description: 'Fynn Kliemanns wöchentliche Startup-Idee, bewertet von Nisse auf einer Skala bis 24 Punkte. Sortierbar nach Folge oder Punkten.',
    priority: 0.9,
  },
  '/kalles-corner': {
    title: 'Kalles Corner — alle Anekdoten | TMDA Wiki',
    description: 'Alle Beiträge aus Kalles Corner (ab Folge 37) — kurze, oft erstaunliche Anekdoten über Kalle Schwensen.',
    priority: 0.8,
  },
  '/geruechte': {
    title: 'Gerücht der Woche — Klatsch & Insider | TMDA Wiki',
    description: 'Alle Gerüchte der Woche aus dem TMDA Podcast — Klatsch, Tratsch und (vermeintliches) Insiderwissen über Promis.',
    priority: 0.7,
  },
  '/erfindungen': {
    title: 'Erfindungen, die keiner braucht | TMDA Wiki',
    description: 'Absurde Produktideen und Erfindungen aus dem TMDA Podcast — die kuriosesten Brainstorms aus über 45 Folgen.',
    priority: 0.6,
  },
  '/glossar': {
    title: 'Glossar & Inside-Jokes von A bis Z | TMDA Wiki',
    description: 'Alle wiederkehrenden Begriffe, Slang und Inside-Jokes aus dem TMDA Podcast — alphabetisch sortiert.',
    priority: 0.6,
  },
  '/zitate': {
    title: 'Zitate — Best-of aus dem TMDA Podcast | TMDA Wiki',
    description: 'Die ikonischsten Sätze aus dem TMDA Podcast — Best-of-Zitate pro Folge, von „Crazy crazy, gut gut“ bis „Karsten ist Gemüse“.',
    priority: 0.6,
  },
  '/personen': {
    title: 'Erwähnte Personen — Promi-Index | TMDA Wiki',
    description: 'Alle Personen, die im TMDA Podcast erwähnt wurden — sortiert nach Häufigkeit. Top: Bushido, Elon Musk, Donald Trump.',
    priority: 0.5,
  },
  '/hosts': {
    title: 'Hosts & Cast: Fynn Kliemann, Nisse Ingwersen, Kalle Schwensen | TMDA Wiki',
    description: 'Profile von Fynn Kliemann, Nisse Ingwersen und Kalle Schwensen — Steckbrief, Projekte, Social-Links und Bio.',
    priority: 0.8,
  },
  '/chat': {
    title: 'AI-Chat — Frag das Wiki | TMDA Wiki',
    description: 'Frag das TMDA Wiki direkt mit AI — powered by Cloudflare Workers AI (Llama 3.1).',
    priority: 0.4,
    robots: 'noindex,follow',
  },
  '/transkripte-gesucht': {
    title: 'Transkripte mit Sprecher-Zuordnung gesucht | TMDA Wiki',
    description: 'Wir suchen Folgen-Transkripte mit eindeutiger Sprecher-Zuordnung (Fynn / Nisse / Kalle). Falls du das machen kannst — meld dich gerne per Mail.',
    priority: 0.5,
    changefreq: 'monthly',
  },
  '/eggs': {
    title: '🥚 Easter Eggs | TMDA Wiki',
    description: 'Du hast die versteckte Seite gefunden — hier die Liste aller Easter Eggs im TMDA Wiki.',
    priority: 0.1,
    robots: 'noindex,nofollow',
  },
};

// Dynamische Routen — handled via metaForDynamic
export const DYNAMIC_PATTERNS = [
  { match: /^\/folge\/(\d+)$/, handler: 'folge' },
];

export function isDynamicRoute(path) {
  return DYNAMIC_PATTERNS.some((p) => p.match.test(path));
}

export function knownRoutePaths() {
  return Object.keys(STATIC_ROUTES);
}

export function metaForPath(path) {
  const norm = path.replace(/\/+$/, '') || '/';
  const cfg = STATIC_ROUTES[norm];
  if (!cfg) return null;
  return { ...DEFAULT, ...cfg };
}

export function metaForFolge(folge, ep) {
  if (!ep) {
    return { ...DEFAULT, title: `Folge #${folge} — TMDA Wiki`, robots: 'noindex,follow' };
  }
  const themen = (ep.themen || []).slice(0, 5).join(', ');
  return {
    ...DEFAULT,
    title: `Folge #${folge}: ${ep.titel} | TMDA Wiki`,
    description: ep.kurzbeschreibung
      ? `${ep.kurzbeschreibung} ${themen ? '(Themen: ' + themen + ')' : ''}`.slice(0, 300)
      : `TMDA Podcast Folge ${folge}: ${ep.titel}${themen ? '. Themen: ' + themen : ''}.`.slice(0, 300),
    priority: 0.7,
    changefreq: 'monthly',
    lastmod: ep.datum || null,
  };
}

// Konvertiert "H:MM:SS" oder "MM:SS" zu ISO 8601 Duration (PT1H2M3S)
function toIsoDuration(s) {
  if (!s || typeof s !== 'string') return undefined;
  const parts = s.split(':').map((n) => parseInt(n, 10) || 0);
  let h = 0, m = 0, sec = 0;
  if (parts.length === 3) [h, m, sec] = parts;
  else if (parts.length === 2) [m, sec] = parts;
  else return undefined;
  let out = 'PT';
  if (h) out += h + 'H';
  if (m) out += m + 'M';
  if (sec) out += sec + 'S';
  return out === 'PT' ? undefined : out;
}

// JSON-LD Builder — strukturierte Daten für Rich Snippets
export function buildJsonLd(path, meta, siteUrl, fullUrl, extra = {}) {
  if (path === '/') {
    return {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      description: meta.description,
      url: siteUrl,
      inLanguage: 'de',
      potentialAction: {
        '@type': 'SearchAction',
        target: `${siteUrl}/folgen`,
        'query-input': 'required name=search_term',
      },
    };
  }
  if (path.startsWith('/folge/') && extra.episode) {
    const ep = extra.episode;
    return {
      '@context': 'https://schema.org',
      '@type': 'PodcastEpisode',
      name: ep.titel,
      episodeNumber: ep.folge,
      url: fullUrl,
      description: meta.description,
      inLanguage: 'de',
      datePublished: ep.datum || undefined,
      timeRequired: toIsoDuration(ep.laufzeit),
      partOfSeries: {
        '@type': 'PodcastSeries',
        name: 'Teenager mit deutschem Akzent',
        url: 'https://open.spotify.com/show/1U68QUHMUz360Ft1NCK9Ur',
      },
    };
  }
  if (path === '/hosts') {
    return {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: meta.title,
      description: meta.description,
      url: fullUrl,
    };
  }
  // Generic CollectionPage for list routes
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: meta.title,
    description: meta.description,
    url: fullUrl,
    inLanguage: 'de',
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: siteUrl },
  };
}
