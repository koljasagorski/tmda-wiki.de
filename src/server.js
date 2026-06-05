// Bun-native HTTP-Server für tmda-wiki.de auf node1 (Migration weg von
// Cloudflare Workers). Spiegelt das Verhalten von src/index.js (Worker), aber:
//   - ASSETS-Binding  → Dateisystem (./public)
//   - Workers-AI      → self-hosted Ollama (HTTP)
//   - HTMLRewriter    → Bun-eingebaut (gleiche API wie im Worker)
// seo.js ist pures ESM (keine Bindings) und wird unverändert wiederverwendet.

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { join, normalize } from 'node:path';
import {
  SITE_NAME,
  SITE_LOCALE,
  DEFAULT_SITE_URL,
  metaForPath,
  metaForFolge,
  knownRoutePaths,
  buildJsonLd,
} from './seo.js';

// ---------- Config (aus ENV, Defaults entsprechen den wrangler-vars) ----------
const ENV = {
  SITE_URL: process.env.SITE_URL || DEFAULT_SITE_URL,
  YOUTUBE_CHANNEL_ID: process.env.YOUTUBE_CHANNEL_ID || '',
  YOUTUBE_PLAYLIST_ID: process.env.YOUTUBE_PLAYLIST_ID || '',
  TURNSTILE_SITE_KEY: process.env.TURNSTILE_SITE_KEY || '',
  TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY || '',
  TURNSTILE_QUESTION_THRESHOLD: process.env.TURNSTILE_QUESTION_THRESHOLD || '6',
  // KI-Chat: bevorzugt Groq (schnell, gute Qualität, free tier). Fällt auf
  // self-hosted Ollama zurück, wenn kein GROQ_API_KEY gesetzt ist.
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  GROQ_MODEL: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
  AI_MODEL: process.env.AI_MODEL || 'llama3.1:8b',
  OLLAMA_URL: (process.env.OLLAMA_URL || 'http://127.0.0.1:11434').replace(/\/+$/, ''),
  // Kontext-Budgets (Zeichen) — Defaults so gewählt, dass eine Anfrage unter
  // Groqs Free-Tier-Limit (6000 Tokens/Minute) bleibt. ~3.3 Zeichen/Token (DE).
  AI_WIKI_CHARS: Number(process.env.AI_WIKI_CHARS || 9000),
  AI_TRANSCRIPT_CHARS: Number(process.env.AI_TRANSCRIPT_CHARS || 4000),
  AI_SYSTEM_CHARS: Number(process.env.AI_SYSTEM_CHARS || 15000),
  PORT: Number(process.env.PORT || 3000),
  PUBLIC_DIR: process.env.PUBLIC_DIR || new URL('../public', import.meta.url).pathname,
};

// ---------- Datei-Helper (ersetzt das ASSETS-Binding) ----------
const PUBLIC_DIR = normalize(ENV.PUBLIC_DIR);

function publicPath(relPath) {
  // Path-Traversal verhindern: normalisieren und Prefix erzwingen
  const p = normalize(join(PUBLIC_DIR, relPath.replace(/^\/+/, '')));
  if (!p.startsWith(PUBLIC_DIR)) return null;
  return p;
}

async function readPublicJson(name) {
  try {
    const f = Bun.file(join(PUBLIC_DIR, 'data', `${name}.json`));
    if (!(await f.exists())) return { items: [] };
    return await f.json();
  } catch {
    return { items: [] };
  }
}

async function readPublicText(relPath) {
  const p = publicPath(relPath);
  if (!p) return null;
  const f = Bun.file(p);
  if (!(await f.exists())) return null;
  return await f.text();
}

const app = new Hono();

app.use('/api/*', cors());

app.get('/api/health', (c) => c.json({ ok: true, name: 'tmda-wiki' }));

// ---------- Data endpoints ----------
const dataFiles = [
  'episodes', 'startup-ideen', 'kalles-corner', 'geruechte', 'glossar',
  'erfindungen', 'orte', 'gaeste', 'zitate', 'fun-facts', 'hosts',
];

for (const name of dataFiles) {
  app.get(`/api/data/${name}`, async (c) => {
    try {
      const f = Bun.file(join(PUBLIC_DIR, 'data', `${name}.json`));
      if (!(await f.exists())) throw new Error('missing');
      const body = await f.json();
      return new Response(JSON.stringify(body), {
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
        },
      });
    } catch {
      return c.json({ items: [], count: 0, note: 'noch keine Daten — bitte Transkripte hochladen' }, 200);
    }
  });
}

// ---------- Public config (Turnstile site key etc.) ----------
app.get('/api/config', (c) => {
  return c.json({
    turnstileSiteKey: ENV.TURNSTILE_SITE_KEY || '',
    turnstileInterval: Number(ENV.TURNSTILE_QUESTION_THRESHOLD || 6),
    youtubeChannel: !!ENV.YOUTUBE_CHANNEL_ID,
  });
});

// ---------- Latest YouTube video (cached, prefer playlist over channel) ----------
let latestVideoCache = { at: 0, data: null };
app.get('/api/latest-video', async (c) => {
  const playlistId = ENV.YOUTUBE_PLAYLIST_ID;
  const channelId = ENV.YOUTUBE_CHANNEL_ID;
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
    const r = await fetch(feedUrl);
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
async function buildWikiContext() {
  const out = [];
  const [eps, ideen, corner, ger, glo, hosts] = await Promise.all([
    readPublicJson('episodes'), readPublicJson('startup-ideen'), readPublicJson('kalles-corner'),
    readPublicJson('geruechte'), readPublicJson('glossar'), readPublicJson('hosts'),
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
  return out.join('\n').slice(0, ENV.AI_WIKI_CHARS);
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

// ---------- AI Chat (Ollama) ----------
app.post('/api/chat', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { messages = [], folge, turnstileToken, userQuestionCount } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return c.json({ error: 'messages[] erforderlich' }, 400);
  }

  const interval = Number(ENV.TURNSTILE_QUESTION_THRESHOLD || 6);
  const secret = ENV.TURNSTILE_SECRET_KEY;
  const qCount = Number(userQuestionCount || 0);
  const needsCheck = qCount > 0 && qCount % interval === 0;
  if (secret && needsCheck) {
    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '';
    const verified = await verifyTurnstile(secret, turnstileToken, ip);
    if (!verified.ok) {
      return c.json({ error: 'turnstile-required', reason: verified.reason, interval }, 401);
    }
  }

  let folgeContext = '';
  if (folge) {
    const t = await readPublicText(`/transcripts/folge-${String(folge).padStart(2, '0')}.txt`);
    if (t) folgeContext = t.slice(0, ENV.AI_TRANSCRIPT_CHARS);
  }

  const wikiContext = await buildWikiContext();
  const systemPrompt = `Du bist der TMDA-Wiki-Assistent. TMDA = "Teenager mit deutschem Akzent", ein wöchentlicher Podcast von Fynn Kliemann und Nisse Ingwersen. Kalle (in Transkripten oft "Kales") ist der Dritte im Bunde, hat seit Folge 37 seine eigene Rubrik "Kalles Corner".

Antworte locker, kurz und auf Deutsch. Halluziniere keine Folgen-Inhalte. Wenn du etwas im Wiki-Kontext nicht findest, sag das ehrlich. Du darfst auf die Hosts-Bios, Diskografie und Projekte verweisen.

WIKI-KONTEXT:
${wikiContext}

${folgeContext ? `\nTRANSKRIPT-AUSSCHNITT FOLGE #${folge}:\n${folgeContext}` : ''}`;

  const aiMessages = [
    { role: 'system', content: systemPrompt.slice(0, ENV.AI_SYSTEM_CHARS) },
    ...messages.slice(-10).map((m) => ({ role: m.role, content: String(m.content || '').slice(0, 4000) })),
  ];

  try {
    if (ENV.GROQ_API_KEY) {
      // Groq (OpenAI-kompatibel)
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${ENV.GROQ_API_KEY}`,
        },
        body: JSON.stringify({ model: ENV.GROQ_MODEL, messages: aiMessages, max_tokens: 512 }),
      });
      if (!r.ok) throw new Error('groq ' + r.status + ': ' + (await r.text()).slice(0, 200));
      const result = await r.json();
      return c.json({ reply: result.choices?.[0]?.message?.content ?? '', model: ENV.GROQ_MODEL });
    }
    // Fallback: self-hosted Ollama
    const r = await fetch(`${ENV.OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: ENV.AI_MODEL,
        messages: aiMessages,
        stream: false,
        options: { num_predict: 512 },
      }),
    });
    if (!r.ok) throw new Error('ollama ' + r.status + ': ' + (await r.text()).slice(0, 200));
    const result = await r.json();
    return c.json({ reply: result.message?.content ?? '', model: ENV.AI_MODEL });
  } catch (err) {
    return c.json({ error: 'AI nicht verfügbar', detail: String(err) }, 503);
  }
});

// ---------- SEO: robots.txt & sitemap.xml ----------
function siteOrigin() {
  return (ENV.SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, '');
}

app.get('/robots.txt', (c) => {
  const base = siteOrigin();
  const body = ['User-agent: *', 'Allow: /', 'Disallow: /api/', '', `Sitemap: ${base}/sitemap.xml`, ''].join('\n');
  return new Response(body, {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  });
});

app.get('/sitemap.xml', async (c) => {
  const base = siteOrigin();
  const episodes = (await readPublicJson('episodes')).items || [];

  const entries = [];
  for (const path of knownRoutePaths()) {
    const meta = metaForPath(path);
    if (meta.robots && meta.robots.includes('noindex')) continue;
    entries.push({ loc: base + path, changefreq: meta.changefreq, priority: meta.priority });
  }
  for (const ep of episodes) {
    entries.push({ loc: `${base}/folge/${ep.folge}`, lastmod: ep.datum || null, changefreq: 'monthly', priority: 0.7 });
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

// ---------- HTML page with injected SEO meta (HTMLRewriter, Bun built-in) ----------
async function renderPage(c) {
  const url = new URL(c.req.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const base = siteOrigin();
  const fullUrl = base + path;

  let meta = metaForPath(path);
  let extra = {};
  if (!meta && /^\/folge\/\d+$/.test(path)) {
    const folge = Number(path.split('/folge/')[1]);
    const data = await readPublicJson('episodes');
    const ep = (data.items || []).find((e) => e.folge === folge);
    meta = metaForFolge(folge, ep);
    if (ep) extra.episode = ep;
    if (!meta) meta = metaForFolge(folge, null);
  }
  if (!meta) meta = metaForPath('/');

  const jsonld = JSON.stringify(buildJsonLd(path, meta, base, fullUrl, extra)).replace(/<\/(script)/gi, '<\\/$1');

  const indexHtml = await readPublicText('/index.html');
  const baseResp = new Response(indexHtml, { headers: { 'content-type': 'text/html; charset=utf-8' } });

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

// ---------- Static + catch-all (mirrors Worker app.all('*')) ----------
async function serveStaticFile(relPath) {
  const p = publicPath(relPath);
  if (!p) return null;
  const f = Bun.file(p);
  if (!(await f.exists())) return null;
  return new Response(f);
}

app.all('*', async (c) => {
  const url = new URL(c.req.url);
  const path = url.pathname;

  // Statische Files mit Extension → direkt aus public/
  if (/\.[a-zA-Z0-9]+$/.test(path)) {
    const resp = await serveStaticFile(path);
    return resp || c.notFound();
  }

  // Startup-One-Pager: jede Page bringt ihr eigenes HTML/CSS/JS + SEO mit
  if (path.startsWith('/startup/')) {
    const clean = path.replace(/\/+$/, '');
    const resp = await serveStaticFile(`${clean}/index.html`);
    if (resp) return resp;
    return renderPage(c); // unbekannter Slug → SPA-Fallback
  }

  return renderPage(c);
});

export default { fetch: app.fetch, port: ENV.PORT };
