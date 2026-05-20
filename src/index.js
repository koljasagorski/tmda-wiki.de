import { Hono } from 'hono';
import { cors } from 'hono/cors';
import {
  SITE_NAME,
  SITE_LOCALE,
  DEFAULT_SITE_URL,
  STATIC_ROUTES,
  metaForPath,
  metaForFolge,
  knownRoutePaths,
  buildJsonLd,
} from './seo.js';

const app = new Hono();

app.use('/api/*', cors());

app.get('/api/health', (c) => c.json({ ok: true, name: 'tmda-wiki' }));

// ---------- Data endpoints ----------
const dataFiles = [
  'episodes',
  'startup-ideen',
  'kalles-corner',
  'geruechte',
  'glossar',
  'erfindungen',
  'orte',
  'gaeste',
  'zitate',
  'fun-facts',
  'hosts',
];

for (const name of dataFiles) {
  app.get(`/api/data/${name}`, async (c) => {
    try {
      const res = await c.env.ASSETS.fetch(new URL(`/data/${name}.json`, c.req.url));
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('json')) throw new Error('not json');
      return c.json(await res.json());
    } catch {
      return c.json({ items: [], count: 0, note: 'noch keine Daten — bitte Transkripte hochladen' }, 200);
    }
  });
}

// ---------- AI Chat (with wiki context) ----------
async function buildWikiContext(assets, baseUrl) {
  const out = [];
  const load = async (name) => {
    try {
      const r = await assets.fetch(new URL(`/data/${name}.json`, baseUrl));
      return r.ok ? await r.json() : { items: [] };
    } catch {
      return { items: [] };
    }
  };

  const [eps, ideen, corner, ger, glo] = await Promise.all([
    load('episodes'), load('startup-ideen'), load('kalles-corner'), load('geruechte'), load('glossar'),
  ]);

  if (eps.items?.length) {
    out.push('FOLGEN-INDEX:');
    for (const ep of eps.items.slice(0, 50)) {
      out.push(`#${ep.folge}: ${ep.titel}${ep.kurzbeschreibung ? ' — ' + ep.kurzbeschreibung : ''}`);
    }
  }
  if (ideen.items?.length) {
    out.push('\nSTARTUP-IDEEN:');
    for (const i of ideen.items.slice(0, 50)) {
      out.push(`Folge #${i.folge}: ${i.idee} (${i.punkte ?? '?'}/${i.max_punkte || 24}) — ${i.beschreibung || ''}`);
    }
  }
  if (corner.items?.length) {
    out.push('\nKALLES CORNER:');
    for (const k of corner.items.slice(0, 30)) {
      out.push(`Folge #${k.folge}: ${k.titel} — ${k.inhalt || ''}`);
    }
  }
  if (ger.items?.length) {
    out.push('\nGERÜCHTE DER WOCHE:');
    for (const g of ger.items.slice(0, 30)) {
      out.push(`Folge #${g.folge}: ${g.ueber} — ${g.inhalt || ''}`);
    }
  }
  if (glo.items?.length) {
    out.push('\nGLOSSAR/INSIDE-JOKES:');
    for (const g of glo.items.slice(0, 30)) {
      out.push(`${g.begriff}: ${g.bedeutung}`);
    }
  }
  return out.join('\n').slice(0, 16000);
}

app.post('/api/chat', async (c) => {
  const { messages = [], folge } = await c.req.json().catch(() => ({}));
  if (!Array.isArray(messages) || messages.length === 0) {
    return c.json({ error: 'messages[] erforderlich' }, 400);
  }

  let folgeContext = '';
  if (folge) {
    try {
      const r = await c.env.ASSETS.fetch(new URL(`/transcripts/folge-${String(folge).padStart(2, '0')}.txt`, c.req.url));
      if (r.ok) folgeContext = (await r.text()).slice(0, 12000);
    } catch {}
  }

  const wikiContext = await buildWikiContext(c.env.ASSETS, c.req.url);
  const systemPrompt = `Du bist der TMDA-Wiki-Assistent. TMDA = "Teenager mit deutschem Akzent", ein wöchentlicher Podcast von Fynn Kliemann und Nisse Ingwersen. Kalle (in Transkripten oft "Kales") ist der Dritte im Bunde, hat seit ca. Folge 37 seine eigene Rubrik "Kalles Corner".

Antworte locker, kurz und auf Deutsch. Halluziniere keine Folgen-Inhalte. Wenn du etwas im Wiki-Kontext nicht findest, sag das ehrlich.

WIKI-KONTEXT:
${wikiContext}

${folgeContext ? `\nTRANSKRIPT-AUSSCHNITT FOLGE #${folge}:\n${folgeContext}` : ''}`;

  const aiMessages = [
    { role: 'system', content: systemPrompt.slice(0, 28000) },
    ...messages.slice(-10).map((m) => ({ role: m.role, content: String(m.content || '').slice(0, 4000) })),
  ];

  try {
    const result = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: aiMessages,
      max_tokens: 512,
    });
    return c.json({ reply: result.response ?? '', model: 'llama-3.1-8b-instruct' });
  } catch (err) {
    return c.json({ error: 'AI nicht verfügbar', detail: String(err) }, 503);
  }
});

// ---------- SEO: robots.txt & sitemap.xml ----------
function siteOrigin(c) {
  const env = c.env.SITE_URL || DEFAULT_SITE_URL;
  return env.replace(/\/+$/, '');
}

app.get('/robots.txt', (c) => {
  const base = siteOrigin(c);
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    '',
    `Sitemap: ${base}/sitemap.xml`,
    '',
  ].join('\n');
  return new Response(body, {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  });
});

app.get('/sitemap.xml', async (c) => {
  const base = siteOrigin(c);
  let episodes = [];
  try {
    const r = await c.env.ASSETS.fetch(new URL('/data/episodes.json', c.req.url));
    if (r.ok) episodes = (await r.json()).items || [];
  } catch {}

  const entries = [];
  for (const path of knownRoutePaths()) {
    const meta = metaForPath(path);
    if (meta.robots && meta.robots.includes('noindex')) continue;
    entries.push({ loc: base + path, changefreq: meta.changefreq, priority: meta.priority });
  }
  for (const ep of episodes) {
    entries.push({
      loc: `${base}/folge/${ep.folge}`,
      lastmod: ep.datum || null,
      changefreq: 'monthly',
      priority: 0.7,
    });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((e) => `  <url>
    <loc>${e.loc}</loc>${e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : ''}
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority.toFixed(1)}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  });
});

// ---------- HTML page with injected SEO meta ----------
async function renderPage(c) {
  const url = new URL(c.req.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const base = siteOrigin(c);
  const fullUrl = base + path;

  let meta = metaForPath(path);
  let extra = {};
  if (!meta && /^\/folge\/\d+$/.test(path)) {
    const folge = Number(path.split('/folge/')[1]);
    try {
      const r = await c.env.ASSETS.fetch(new URL('/data/episodes.json', c.req.url));
      if (r.ok) {
        const data = await r.json();
        const ep = (data.items || []).find((e) => e.folge === folge);
        meta = metaForFolge(folge, ep);
        if (ep) extra.episode = ep;
      }
    } catch {}
    if (!meta) meta = metaForFolge(folge, null);
  }
  if (!meta) {
    meta = metaForPath('/');
  }

  // </script>-safe JSON-LD-Serialisierung
  const jsonld = JSON.stringify(buildJsonLd(path, meta, base, fullUrl, extra))
    .replace(/<\/(script)/gi, '<\\/$1');
  const baseResp = await c.env.ASSETS.fetch(new URL('/', c.req.url));

  return new HTMLRewriter()
    .on('title', { element(el) { el.setInnerContent(meta.title); } })
    .on('meta[name="description"]', { element(el) { el.setAttribute('content', meta.description); } })
    .on('meta[name="keywords"]', { element(el) { if (meta.keywords) el.setAttribute('content', meta.keywords); } })
    .on('meta[name="robots"]', { element(el) { el.setAttribute('content', meta.robots || 'index,follow'); } })
    .on('link[rel="canonical"]', { element(el) { el.setAttribute('href', fullUrl); } })
    .on('meta[property="og:title"]', { element(el) { el.setAttribute('content', meta.title); } })
    .on('meta[property="og:description"]', { element(el) { el.setAttribute('content', meta.description); } })
    .on('meta[property="og:url"]', { element(el) { el.setAttribute('content', fullUrl); } })
    .on('meta[property="og:site_name"]', { element(el) { el.setAttribute('content', SITE_NAME); } })
    .on('meta[property="og:locale"]', { element(el) { el.setAttribute('content', SITE_LOCALE); } })
    .on('meta[name="twitter:title"]', { element(el) { el.setAttribute('content', meta.title); } })
    .on('meta[name="twitter:description"]', { element(el) { el.setAttribute('content', meta.description); } })
    .on('script[data-seo="jsonld"]', { element(el) { el.setInnerContent(jsonld, { html: true }); } })
    .transform(baseResp);
}

// ---------- Catch-all: HTML routes get SEO injection, assets pass through ----------
app.all('*', async (c) => {
  const url = new URL(c.req.url);
  const path = url.pathname;

  // Static assets: anything with an extension (except trailing slash)
  if (/\.[a-zA-Z0-9]+$/.test(path)) {
    return c.env.ASSETS.fetch(c.req.raw);
  }
  // Otherwise render HTML with SEO meta
  return renderPage(c);
});

export default app;
