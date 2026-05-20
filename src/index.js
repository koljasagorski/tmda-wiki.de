import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

app.use('/api/*', cors());

app.get('/api/health', (c) => c.json({ ok: true, name: 'tmda-wiki' }));

// Data endpoints — load JSON aus dem Asset-Bundle
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

// Helper: lade die strukturierten Daten als kompakten Kontext für die AI
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

// AI Chat
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

// Fallback an die statischen Assets
app.all('*', async (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
