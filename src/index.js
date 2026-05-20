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

// ---------- Public config (Turnstile site key etc.) ----------
app.get('/api/config', (c) => {
  return c.json({
    turnstileSiteKey: c.env.TURNSTILE_SITE_KEY || '',
    turnstileThreshold: Number(c.env.TURNSTILE_QUESTION_THRESHOLD || 5),
    youtubeChannel: !!c.env.YOUTUBE_CHANNEL_ID,
  });
});

// ---------- Latest YouTube video (cached, prefer playlist over channel) ----------
let latestVideoCache = { at: 0, data: null };
app.get('/api/latest-video', async (c) => {
  const playlistId = c.env.YOUTUBE_PLAYLIST_ID;
  const channelId = c.env.YOUTUBE_CHANNEL_ID;
  if (!playlistId && !channelId) {
    return c.json({ ok: false, reason: 'weder YOUTUBE_PLAYLIST_ID noch YOUTUBE_CHANNEL_ID gesetzt' }, 200);
  }
  if (latestVideoCache.data && Date.now() - latestVideoCache.at < 30 * 60 * 1000) {
    return c.json(latestVideoCache.data);
  }
  const feedUrl = playlistId
    ? `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(playlistId)}`
    : `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
  try {
    const r = await fetch(feedUrl, { cf: { cacheTtl: 1800 } });
    if (!r.ok) throw new Error('feed fetch failed: ' + r.status);
    const xml = await r.text();
    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].slice(0, 10).map((m) => {
      const block = m[1];
      const pick = (rx) => (block.match(rx) || [, ''])[1];
      return {
        id: pick(/<yt:videoId>([^<]+)<\/yt:videoId>/),
        title: pick(/<title>([^<]+)<\/title>/),
        published: pick(/<published>([^<]+)<\/published>/),
        link: pick(/<link[^>]+href="([^"]+)"/),
        author: pick(/<name>([^<]+)<\/name>/),
      };
    }).filter((v) => v.id);
    // Bei Playlist: newest published first (Playlists sind oft chronologisch)
    entries.sort((a, b) => (b.published || '').localeCompare(a.published || ''));
    const data = {
      ok: true,
      source: playlistId ? 'playlist' : 'channel',
      videos: entries,
      fetchedAt: new Date().toISOString(),
    };
    latestVideoCache = { at: Date.now(), data };
    return c.json(data);
  } catch (err) {
    return c.json({ ok: false, reason: String(err) }, 502);
  }
});

// ---------- Wiki context for AI ----------
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

  const [eps, ideen, corner, ger, glo, hosts] = await Promise.all([
    load('episodes'), load('startup-ideen'), load('kalles-corner'),
    load('geruechte'), load('glossar'), load('hosts'),
  ]);

  if (hosts.items?.length) {
    out.push('HOSTS UND CAST:');
    for (const h of hosts.items) {
      out.push(`\n${h.name} — ${h.rolle}`);
      if (h.geboren) out.push(`Geboren: ${h.geboren}${h.geburtsort ? ' in ' + h.geburtsort : ''}`);
      if (h.bio) out.push(h.bio);
      if (h.musik) {
        out.push(`Label: ${h.musik.label}`);
        if (h.musik.alben?.length) {
          out.push('Alben: ' + h.musik.alben.map((a) => `${a.titel} (${a.jahr})${a.anmerkung ? ' — ' + a.anmerkung : ''}`).join('; '));
        }
        if (h.musik.highlights?.length) {
          out.push('Highlights: ' + h.musik.highlights.join('; '));
        }
      }
      if (h.projekte?.length) {
        out.push('Projekte: ' + h.projekte.map((p) => `${p.name} (${p.url})`).join(', '));
      }
      if (h.social?.length) {
        out.push('Social: ' + h.social.map((s) => `${s.platform} ${s.handle}`).join(', '));
      }
    }
    out.push('');
  }

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
  return out.join('\n').slice(0, 20000);
}

// ---------- Turnstile verification ----------
async function verifyTurnstile(secret, token, ip) {
  if (!secret) return { ok: true, skipped: true };
  if (!token) return { ok: false, reason: 'no-token' };
  try {
    const body = new FormData();
    body.append('secret', secret);
    body.append('response', token);
    if (ip) body.append('remoteip', ip);
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    });
    const data = await r.json();
    return { ok: !!data.success, reason: data['error-codes']?.join(',') || null };
  } catch (err) {
    return { ok: false, reason: 'verify-error: ' + String(err) };
  }
}

// ---------- AI Chat ----------
app.post('/api/chat', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { messages = [], folge, turnstileToken, userQuestionCount } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return c.json({ error: 'messages[] erforderlich' }, 400);
  }

  // Turnstile-Schwelle: ab der N-ten Frage muss ein gültiges Token mitkommen
  const threshold = Number(c.env.TURNSTILE_QUESTION_THRESHOLD || 5);
  const secret = c.env.TURNSTILE_SECRET_KEY;
  const qCount = Number(userQuestionCount || 0);
  if (secret && qCount >= threshold) {
    const ip = c.req.header('cf-connecting-ip') || '';
    const verified = await verifyTurnstile(secret, turnstileToken, ip);
    if (!verified.ok) {
      return c.json({
        error: 'turnstile-required',
        reason: verified.reason,
        threshold,
      }, 401);
    }
  }

  let folgeContext = '';
  if (folge) {
    try {
      const r = await c.env.ASSETS.fetch(new URL(`/transcripts/folge-${String(folge).padStart(2, '0')}.txt`, c.req.url));
      if (r.ok) folgeContext = (await r.text()).slice(0, 12000);
    } catch {}
  }

  const wikiContext = await buildWikiContext(c.env.ASSETS, c.req.url);
  const systemPrompt = `Du bist der TMDA-Wiki-Assistent. TMDA = "Teenager mit deutschem Akzent", ein wöchentlicher Podcast von Fynn Kliemann und Nisse Ingwersen. Kalle (in Transkripten oft "Kales") ist der Dritte im Bunde, hat seit Folge 37 seine eigene Rubrik "Kalles Corner".

Antworte locker, kurz und auf Deutsch. Halluziniere keine Folgen-Inhalte. Wenn du etwas im Wiki-Kontext nicht findest, sag das ehrlich. Du darfst auf die Hosts-Bios, Diskografie und Projekte verweisen.

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

  const imgUrl = meta.image ? (meta.image.startsWith('http') ? meta.image : base + meta.image) : '';

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
    .on('meta[property="og:image"]', { element(el) { if (imgUrl) el.setAttribute('content', imgUrl); } })
    .on('meta[property="og:image:type"]', { element(el) { if (meta.imageType) el.setAttribute('content', meta.imageType); } })
    .on('meta[property="og:image:width"]', { element(el) { if (meta.imageWidth) el.setAttribute('content', meta.imageWidth); } })
    .on('meta[property="og:image:height"]', { element(el) { if (meta.imageHeight) el.setAttribute('content', meta.imageHeight); } })
    .on('meta[property="og:image:alt"]', { element(el) { el.setAttribute('content', meta.title); } })
    .on('meta[name="twitter:title"]', { element(el) { el.setAttribute('content', meta.title); } })
    .on('meta[name="twitter:description"]', { element(el) { el.setAttribute('content', meta.description); } })
    .on('meta[name="twitter:image"]', { element(el) { if (imgUrl) el.setAttribute('content', imgUrl); } })
    .on('script[data-seo="jsonld"]', { element(el) { el.setInnerContent(jsonld, { html: true }); } })
    .transform(baseResp);
}

// ---------- Catch-all: HTML routes get SEO injection, assets pass through ----------
app.all('*', async (c) => {
  const url = new URL(c.req.url);
  const path = url.pathname;
  if (/\.[a-zA-Z0-9]+$/.test(path)) {
    return c.env.ASSETS.fetch(c.req.raw);
  }
  return renderPage(c);
});

export default app;
