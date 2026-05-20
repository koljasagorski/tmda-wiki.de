// Tiny hash-routed SPA — kein Build-Step nötig

const app = document.getElementById('app');
const nav = document.getElementById('primaryNav');
const themeToggle = document.getElementById('themeToggle');

// ---------- Theme ----------
const savedTheme = localStorage.getItem('tmda-theme');
if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
themeToggle?.addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', cur);
  localStorage.setItem('tmda-theme', cur);
});

// ---------- Helpers ----------
const cache = new Map();
async function getData(name) {
  if (cache.has(name)) return cache.get(name);
  try {
    const r = await fetch(`/api/data/${name}`);
    if (!r.ok) throw new Error('not ok');
    const data = await r.json();
    cache.set(name, data);
    return data;
  } catch {
    return { items: [], count: 0, note: 'Daten nicht verfügbar' };
  }
}

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function esc(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function scoreClass(s, max = 24) {
  if (s == null) return '';
  const pct = s / max;
  if (pct >= 0.7) return 'score-high';
  if (pct <= 0.3) return 'score-low';
  return '';
}

function emptyState(rubrik, hint) {
  return `<div class="empty">
    <p><strong>Noch keine ${rubrik}-Daten.</strong></p>
    <p>${hint || 'Lade Transkripte nach <code>transcripts/</code> hoch und führe <code>npm run build:data</code> aus.'}</p>
  </div>`;
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00Z');
  if (isNaN(+d)) return iso;
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ---------- Routing ----------
const views = {
  '/': renderHome,
  '/folgen': renderFolgen,
  '/startup-ideen': renderStartupIdeen,
  '/kalles-corner': renderKallesCorner,
  '/geruechte': renderGeruechte,
  '/erfindungen': renderErfindungen,
  '/glossar': renderGlossar,
  '/zitate': renderZitate,
  '/personen': renderPersonen,
  '/chat': renderChat,
};

function setActive(hash) {
  for (const a of nav.querySelectorAll('a')) {
    a.classList.toggle('active', a.getAttribute('href') === hash);
  }
}

async function router() {
  const fullHash = location.hash.replace(/^#/, '') || '/';
  const [base, param] = fullHash.split('?');
  setActive('#' + base);
  app.innerHTML = '<div class="skeleton" style="width:60%;height:32px;margin-bottom:16px"></div><div class="skeleton" style="width:90%;margin-bottom:8px"></div><div class="skeleton" style="width:80%"></div>';

  if (base.startsWith('/folge/')) {
    const num = Number(base.split('/folge/')[1]);
    return renderFolgeDetail(num);
  }
  const view = views[base] || renderHome;
  await view(param);
  window.scrollTo({ top: 0, behavior: 'instant' });
}
window.addEventListener('hashchange', router);

// ---------- Home ----------
async function renderHome() {
  const [eps, ideen, corner, ger, glo] = await Promise.all([
    getData('episodes'), getData('startup-ideen'), getData('kalles-corner'),
    getData('geruechte'), getData('glossar')
  ]);

  // Top-rated startup idea
  const topIdee = (ideen.items || [])
    .filter(i => i.punkte != null)
    .sort((a, b) => b.punkte - a.punkte)[0];

  app.innerHTML = `
    <section class="hero">
      <div>
        <h1>Das inoffizielle <span class="accent">TMDA</span> Wiki.</h1>
        <p>Alles aus dem Podcast „Teenager mit deutschem Akzent" mit <strong>Fynn Kliemann</strong> und <strong>Nisse Ingwersen</strong> — Startup-Ideen mit Punkten, Kalles Corner, Gerüchte, Inside-Jokes, alles automatisch aus den Folgen-Transkripten.</p>
        <div class="hero-cta">
          <a class="btn btn-primary" href="#/startup-ideen">${ideen.count || 0} Startup-Ideen ansehen →</a>
          <a class="btn" href="#/chat">AI-Chat</a>
        </div>
      </div>
    </section>

    <section class="stats">
      <a class="stat" href="#/folgen"><div class="stat-num">${eps.count || 0}</div><div class="stat-label">Folgen</div></a>
      <a class="stat" href="#/startup-ideen"><div class="stat-num">${ideen.count || 0}</div><div class="stat-label">Startup-Ideen</div></a>
      <a class="stat" href="#/kalles-corner"><div class="stat-num">${corner.count || 0}</div><div class="stat-label">Kalles Corner</div></a>
      <a class="stat" href="#/geruechte"><div class="stat-num">${ger.count || 0}</div><div class="stat-label">Gerüchte</div></a>
      <a class="stat" href="#/glossar"><div class="stat-num">${glo.count || 0}</div><div class="stat-label">Glossar</div></a>
    </section>

    ${topIdee ? `
    <section style="margin-top:32px">
      <h2 class="section-title">🏆 Best-bewertete Startup-Idee</h2>
      <a class="card card-highlight" href="#/folge/${topIdee.folge}">
        <div style="display:flex;justify-content:space-between;align-items:start;gap:12px">
          <div>
            <span class="tag tag-accent">Folge #${topIdee.folge}</span>
            <h3 style="margin-top:8px">${esc(topIdee.idee)}</h3>
            <div class="desc">${esc(topIdee.beschreibung)}</div>
          </div>
          <span class="score score-high score-large">${topIdee.punkte}<small>/${topIdee.max_punkte || 24}</small></span>
        </div>
      </a>
    </section>` : ''}

    <section style="margin-top:32px">
      <h2 class="section-title">Rubriken</h2>
      <p class="section-sub">Alles, was wiederkehrt — automatisch aus den Transkripten.</p>
      <div class="card-grid" id="rubrikenGrid"></div>
    </section>
  `;

  const rubriken = [
    { href: '#/folgen', title: 'Folgen-Archiv', desc: 'Alle Folgen mit Themen und Highlights.', tag: 'Archiv', emoji: '📅' },
    { href: '#/startup-ideen', title: 'Startup-Idee der Woche', desc: 'Fynns Brainstorms mit Punkten von Nisse.', tag: 'Highlight', emoji: '💡' },
    { href: '#/kalles-corner', title: 'Kalles Corner', desc: 'Beiträge und Anekdoten von Kalle.', tag: 'Rubrik', emoji: '🪑' },
    { href: '#/geruechte', title: 'Gerücht der Woche', desc: 'Klatsch und Insiderwissen.', tag: 'Rubrik', emoji: '🤫' },
    { href: '#/erfindungen', title: 'Erfindungen', desc: 'Absurde Produktideen.', tag: 'Lexikon', emoji: '🔧' },
    { href: '#/glossar', title: 'Glossar & Inside-Jokes', desc: 'Running gags und Slang.', tag: 'Lexikon', emoji: '📖' },
    { href: '#/zitate', title: 'Zitate', desc: 'Die besten Sätze aller Folgen.', tag: 'Best-of', emoji: '💬' },
    { href: '#/personen', title: 'Erwähnte Personen', desc: 'Wer alles vorkam.', tag: 'Index', emoji: '👥' },
    { href: '#/chat', title: 'AI-Chat', desc: 'Frag das Wiki direkt — powered by Workers AI.', tag: 'Live', emoji: '🤖' },
  ];
  const grid = document.getElementById('rubrikenGrid');
  for (const r of rubriken) {
    grid.appendChild(el(`<a class="card" href="${r.href}">
      <span class="tag tag-accent">${r.tag}</span>
      <h3>${r.emoji} ${r.title}</h3>
      <div class="desc">${r.desc}</div>
    </a>`));
  }
}

// ---------- Folgen ----------
async function renderFolgen() {
  const data = await getData('episodes');
  const items = data.items || [];
  app.innerHTML = `
    <h1 class="section-title">Folgen-Archiv</h1>
    <p class="section-sub">${items.length} Folgen erfasst.</p>
    ${items.length === 0 ? emptyState('Folgen') : ''}
  `;
  if (items.length === 0) return;

  const grid = el('<div class="card-grid"></div>');
  for (const ep of items) {
    grid.appendChild(el(`<a class="card" href="#/folge/${ep.folge}">
      <span class="tag tag-accent">Folge #${ep.folge}</span>
      <h3>${esc(ep.titel)}</h3>
      <div class="meta">${fmtDate(ep.datum)} ${ep.laufzeit ? '· ' + esc(ep.laufzeit) : ''}</div>
      <div class="desc">${esc(ep.kurzbeschreibung || '')}</div>
      <div style="margin-top:10px">${(ep.themen || []).slice(0, 4).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>
    </a>`));
  }
  app.appendChild(grid);
}

// ---------- Folge Detail ----------
async function renderFolgeDetail(folge) {
  const [eps, ideen, corner, ger, fact, zit, erf] = await Promise.all([
    getData('episodes'), getData('startup-ideen'), getData('kalles-corner'),
    getData('geruechte'), getData('fun-facts'), getData('zitate'), getData('erfindungen'),
  ]);
  const ep = (eps.items || []).find((e) => e.folge === folge);
  if (!ep) {
    app.innerHTML = `<h1 class="section-title">Folge ${folge} nicht gefunden</h1><p><a href="#/folgen">← Zurück zum Archiv</a></p>`;
    return;
  }

  const idee = (ideen.items || []).find((i) => i.folge === folge);
  const kc = (corner.items || []).find((i) => i.folge === folge);
  const gr = (ger.items || []).find((i) => i.folge === folge);
  const facts = (fact.items || []).filter((i) => i.folge === folge);
  const zitate = (zit.items || []).filter((i) => i.folge === folge);
  const erfindungen = (erf.items || []).filter((i) => i.folge === folge);

  app.innerHTML = `
    <p><a href="#/folgen">← Folgen-Archiv</a></p>
    <header style="margin:16px 0 24px">
      <span class="tag tag-accent">Folge #${ep.folge}</span>
      <h1 style="margin:8px 0; font-size:clamp(1.8rem,4vw,2.5rem); letter-spacing:-0.02em">${esc(ep.titel)}</h1>
      <div class="meta">${fmtDate(ep.datum)} ${ep.laufzeit ? '· ' + esc(ep.laufzeit) : ''}</div>
      <p style="margin-top:12px">${esc(ep.kurzbeschreibung || '')}</p>
      <div style="margin-top:12px">${(ep.themen || []).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>
    </header>
  `;

  if (idee) {
    app.appendChild(el(`<section class="detail-block">
      <h2>💡 Startup-Idee der Woche</h2>
      <div class="card card-highlight">
        <div style="display:flex;justify-content:space-between;align-items:start;gap:12px;flex-wrap:wrap">
          <div style="flex:1;min-width:200px">
            <h3>${esc(idee.idee)}</h3>
            <div class="desc">${esc(idee.beschreibung)}</div>
            ${idee.begruendung ? `<div class="meta" style="margin-top:8px"><strong>Nisse:</strong> ${esc(idee.begruendung)}</div>` : ''}
          </div>
          ${idee.punkte != null ? `<span class="score ${scoreClass(idee.punkte, idee.max_punkte || 24)} score-large">${idee.punkte}<small>/${idee.max_punkte || 24}</small></span>` : ''}
        </div>
      </div>
    </section>`));
  }

  if (kc) {
    app.appendChild(el(`<section class="detail-block">
      <h2>🪑 Kalles Corner</h2>
      <div class="card"><h3>${esc(kc.titel)}</h3><div class="desc">${esc(kc.inhalt)}</div></div>
    </section>`));
  }

  if (gr) {
    app.appendChild(el(`<section class="detail-block">
      <h2>🤫 Gerücht der Woche</h2>
      <div class="card">${gr.ueber ? `<h3>${esc(gr.ueber)}</h3>` : ''}<div class="desc">${esc(gr.inhalt)}</div></div>
    </section>`));
  }

  if (erfindungen.length) {
    const erfHtml = erfindungen.map((e) => `<div class="card"><h3>${esc(e.name)}</h3><div class="desc">${esc(e.beschreibung)}</div></div>`).join('');
    app.appendChild(el(`<section class="detail-block">
      <h2>🔧 Erfindungen</h2>
      <div class="card-grid">${erfHtml}</div>
    </section>`));
  }

  if (zitate.length) {
    const zHtml = zitate.map((z) => `<blockquote class="quote">„${esc(z.text)}"${z.kontext ? `<cite>— ${esc(z.kontext)}</cite>` : ''}</blockquote>`).join('');
    app.appendChild(el(`<section class="detail-block">
      <h2>💬 Zitate</h2>
      ${zHtml}
    </section>`));
  }

  if (facts.length) {
    app.appendChild(el(`<section class="detail-block">
      <h2>🤓 Fun Facts</h2>
      <ul class="bulletlist">${facts.map((f) => `<li>${esc(f.text)}</li>`).join('')}</ul>
    </section>`));
  }

  app.appendChild(el(`<section class="detail-block">
    <a class="btn" href="/transcripts/folge-${String(folge).padStart(2, '0')}.txt" target="_blank" rel="noopener">Volles Transkript öffnen ↗</a>
  </section>`));
}

// ---------- Startup-Ideen ----------
async function renderStartupIdeen() {
  const data = await getData('startup-ideen');
  const items = data.items || [];

  // Sort buttons
  const sortBy = new URLSearchParams(location.hash.split('?')[1] || '').get('sort') || 'folge';
  let sorted = [...items];
  if (sortBy === 'punkte') sorted.sort((a, b) => (b.punkte ?? -1) - (a.punkte ?? -1));
  else sorted.sort((a, b) => (b.folge || 0) - (a.folge || 0));

  app.innerHTML = `
    <h1 class="section-title">💡 Startup-Idee der Woche</h1>
    <p class="section-sub">Fynns Brainstorms — bewertet von Nisse auf einer Skala bis ${items[0]?.max_punkte || 24}. ${items.length} Ideen.</p>
    <div class="filter-bar">
      <a class="${sortBy === 'folge' ? 'active' : ''}" href="#/startup-ideen?sort=folge">Nach Folge</a>
      <a class="${sortBy === 'punkte' ? 'active' : ''}" href="#/startup-ideen?sort=punkte">Nach Punkten</a>
    </div>
    ${items.length === 0 ? emptyState('Startup-Ideen') : ''}
  `;
  if (items.length === 0) return;

  const tbl = el(`<div class="table-wrap"><table>
    <thead><tr><th>Folge</th><th>Idee</th><th>Beschreibung</th><th>Punkte</th></tr></thead>
    <tbody></tbody></table></div>`);
  const tb = tbl.querySelector('tbody');
  for (const i of sorted) {
    const max = i.max_punkte || 24;
    tb.appendChild(el(`<tr>
      <td><a href="#/folge/${i.folge}"><strong>#${i.folge}</strong></a></td>
      <td><strong>${esc(i.idee)}</strong></td>
      <td>${esc(i.beschreibung)}</td>
      <td><span class="score ${scoreClass(i.punkte, max)}">${i.punkte ?? '–'}<small>/${max}</small></span></td>
    </tr>`));
  }
  app.appendChild(tbl);
}

// ---------- Kalles Corner ----------
async function renderKallesCorner() {
  const data = await getData('kalles-corner');
  const items = data.items || [];
  app.innerHTML = `
    <h1 class="section-title">🪑 Kalles Corner</h1>
    <p class="section-sub">Alle Beiträge aus Kalles Corner — die kurze Anekdote pro Folge.</p>
    ${items.length === 0 ? emptyState('Kalles-Corner', 'Kalles Corner taucht erst ab Folge 37 regelmäßig auf.') : ''}
  `;
  if (items.length === 0) return;

  const grid = el('<div class="card-grid"></div>');
  for (const i of items) {
    grid.appendChild(el(`<a class="card" href="#/folge/${i.folge}">
      <span class="tag tag-accent">Folge #${i.folge}</span>
      <h3>${esc(i.titel)}</h3>
      <div class="meta">${fmtDate(i.datum)}</div>
      <div class="desc">${esc(i.inhalt)}</div>
    </a>`));
  }
  app.appendChild(grid);
}

// ---------- Gerüchte ----------
async function renderGeruechte() {
  const data = await getData('geruechte');
  const items = data.items || [];
  app.innerHTML = `
    <h1 class="section-title">🤫 Gerücht der Woche</h1>
    <p class="section-sub">Klatsch, Tratsch und (vermeintliches) Insiderwissen.</p>
    ${items.length === 0 ? emptyState('Gerüchte') : ''}
  `;
  if (items.length === 0) return;

  const grid = el('<div class="card-grid"></div>');
  for (const g of items) {
    grid.appendChild(el(`<a class="card" href="#/folge/${g.folge}">
      <span class="tag tag-accent">Folge #${g.folge}</span>
      <h3>${esc(g.ueber || 'Gerücht')}</h3>
      <div class="meta">${fmtDate(g.datum)}</div>
      <div class="desc">${esc(g.inhalt)}</div>
    </a>`));
  }
  app.appendChild(grid);
}

// ---------- Erfindungen ----------
async function renderErfindungen() {
  const data = await getData('erfindungen');
  const items = data.items || [];
  app.innerHTML = `
    <h1 class="section-title">🔧 Erfindungen, die keiner braucht</h1>
    <p class="section-sub">Absurde Produktideen — manchmal mehrere pro Folge.</p>
    ${items.length === 0 ? emptyState('Erfindungen') : ''}
  `;
  if (items.length === 0) return;

  const grid = el('<div class="card-grid"></div>');
  for (const e of items) {
    grid.appendChild(el(`<a class="card" href="#/folge/${e.folge}">
      <span class="tag tag-accent">Folge #${e.folge}</span>
      <h3>${esc(e.name)}</h3>
      <div class="desc">${esc(e.beschreibung)}</div>
    </a>`));
  }
  app.appendChild(grid);
}

// ---------- Glossar ----------
async function renderGlossar() {
  const data = await getData('glossar');
  const items = data.items || [];
  app.innerHTML = `
    <h1 class="section-title">📖 Glossar & Inside-Jokes</h1>
    <p class="section-sub">Wiederkehrende Begriffe, Slang, running gags.</p>
    ${items.length === 0 ? emptyState('Glossar') : ''}
  `;
  if (items.length === 0) return;

  const tbl = el(`<div class="table-wrap"><table>
    <thead><tr><th>Begriff</th><th>Bedeutung</th><th>Erste Folge</th></tr></thead>
    <tbody></tbody></table></div>`);
  const tb = tbl.querySelector('tbody');
  for (const g of items) {
    tb.appendChild(el(`<tr>
      <td><strong>${esc(g.begriff)}</strong></td>
      <td>${esc(g.bedeutung)}</td>
      <td>${g.folge ? `<a href="#/folge/${g.folge}">#${g.folge}</a>` : ''}</td>
    </tr>`));
  }
  app.appendChild(tbl);
}

// ---------- Zitate ----------
async function renderZitate() {
  const data = await getData('zitate');
  const items = data.items || [];
  app.innerHTML = `
    <h1 class="section-title">💬 Zitate</h1>
    <p class="section-sub">Die besten Sätze aus dem Podcast.</p>
    ${items.length === 0 ? emptyState('Zitate') : ''}
  `;
  if (items.length === 0) return;

  const list = el('<div class="quote-grid"></div>');
  for (const z of items) {
    list.appendChild(el(`<blockquote class="quote">
      „${esc(z.text)}"
      <cite>— <a href="#/folge/${z.folge}">Folge #${z.folge}</a>${z.kontext ? ` · ${esc(z.kontext)}` : ''}</cite>
    </blockquote>`));
  }
  app.appendChild(list);
}

// ---------- Personen ----------
async function renderPersonen() {
  const data = await getData('gaeste');
  const all = data.items || [];
  const showAll = (new URLSearchParams(location.hash.split('?')[1] || '')).get('all') === '1';
  const items = showAll ? all : all.filter((p) => (p.folgen || []).length >= 2);

  app.innerHTML = `
    <h1 class="section-title">👥 Erwähnte Personen</h1>
    <p class="section-sub">Wer alles im Podcast erwähnt wurde — sortiert nach Häufigkeit. ${items.length}/${all.length} angezeigt.</p>
    <div class="filter-bar">
      <a class="${!showAll ? 'active' : ''}" href="#/personen">Mehrfach genannt</a>
      <a class="${showAll ? 'active' : ''}" href="#/personen?all=1">Alle (${all.length})</a>
    </div>
    ${items.length === 0 ? emptyState('Personen') : ''}
  `;
  if (items.length === 0) return;

  const tbl = el(`<div class="table-wrap"><table>
    <thead><tr><th>Person</th><th>Erwähnt in</th><th>#</th></tr></thead>
    <tbody></tbody></table></div>`);
  const tb = tbl.querySelector('tbody');
  for (const p of items) {
    const folgen = (p.folgen || []).map((f) => `<a href="#/folge/${f}">#${f}</a>`).join(', ');
    tb.appendChild(el(`<tr>
      <td><strong>${esc(p.name)}</strong></td>
      <td>${folgen}</td>
      <td><span class="tag tag-accent">${p.folgen.length}</span></td>
    </tr>`));
  }
  app.appendChild(tbl);
}

// ---------- Chat ----------
async function renderChat() {
  app.innerHTML = `
    <h1 class="section-title">🤖 Chat</h1>
    <p class="section-sub">Frag das Wiki — läuft auf Cloudflare Workers AI (Llama 3.1).</p>
    <div class="chat">
      <div class="chat-log" id="chatLog">
        <div class="msg system">Tipp: Frag z.B. „Was war Fynns dümmste Startup-Idee?", „Was passiert in Kalles Corner?" oder „Welche Promis kamen am häufigsten vor?"</div>
      </div>
      <form class="chat-input" id="chatForm">
        <input id="chatInput" type="text" placeholder="Schreib was..." autocomplete="off" />
        <button class="btn btn-primary" type="submit">Senden</button>
      </form>
    </div>
  `;
  const log = document.getElementById('chatLog');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const history = [];

  function addMsg(role, content) {
    const m = el(`<div class="msg ${role}"></div>`);
    m.textContent = content;
    log.appendChild(m);
    log.scrollTop = log.scrollHeight;
    return m;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    addMsg('user', text);
    history.push({ role: 'user', content: text });
    const pending = addMsg('assistant', '…');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });
      const data = await res.json();
      if (data.reply) {
        pending.textContent = data.reply;
        history.push({ role: 'assistant', content: data.reply });
      } else {
        pending.textContent = data.error || 'Keine Antwort.';
      }
    } catch (err) {
      pending.textContent = 'Fehler: ' + err.message;
    }
  });
}

router();
