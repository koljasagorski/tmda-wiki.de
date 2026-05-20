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
];

for (const name of dataFiles) {
  app.get(`/api/data/${name}`, async (c) => {
    const res = await c.env.ASSETS.fetch(new URL(`/data/${name}.json`, c.req.url));
    if (!res.ok) return c.json({ items: [], note: 'noch keine Daten — bitte Transkripte hochladen' }, 200);
    const data = await res.json();
    return c.json(data);
  });
}

// AI Chat — nutzt Workers AI mit den Transkripten als Kontext
app.post('/api/chat', async (c) => {
  const { messages = [], folge } = await c.req.json().catch(() => ({}));

  if (!Array.isArray(messages) || messages.length === 0) {
    return c.json({ error: 'messages[] erforderlich' }, 400);
  }

  // Lade die letzte(n) relevante(n) Transkripte als Kontext, wenn vorhanden
  let context = '';
  try {
    const indexRes = await c.env.ASSETS.fetch(new URL('/data/transcripts-index.json', c.req.url));
    if (indexRes.ok) {
      const idx = await indexRes.json();
      const target = folge ? idx.find((e) => e.folge === Number(folge)) : null;
      if (target) {
        const tRes = await c.env.ASSETS.fetch(new URL(target.path, c.req.url));
        if (tRes.ok) context = (await tRes.text()).slice(0, 12000);
      }
    }
  } catch (e) {
    // Kein Kontext verfügbar — Chat antwortet trotzdem mit Allgemeinwissen über den Podcast
  }

  const systemPrompt = `Du bist der TMDA-Wiki-Assistent. TMDA = "Teenager mit deutschem Akzent", ein wöchentlicher Podcast von Fynn Kliemann und Nisse Ingwersen.
Du antwortest locker, kurz und auf Deutsch. Du kennst dich mit den Folgen, Startup-Ideen, Inside-Jokes und Rubriken aus.
Wenn du etwas nicht weißt, sag das ehrlich. Halluziniere keine Folgen-Inhalte.

${context ? `KONTEXT (Transkript-Ausschnitt):\n${context}\n` : ''}`;

  const aiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: String(m.content || '').slice(0, 4000) })),
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

// Fallback an die statischen Assets (Workers Assets handhabt /, /styles.css, etc.)
app.all('*', async (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
