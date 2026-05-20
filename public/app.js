// Tiny SPA mit History-API-Routing (SEO-freundlich, keine Hash-URLs)

const app = document.getElementById('app');
const nav = document.getElementById('primaryNav');
const themeToggle = document.getElementById('themeToggle');

// Backward-Compat: alte #/-Bookmarks auf Path-URLs redirecten
if (location.hash.startsWith('#/')) {
  const redirect = location.hash.slice(1) + location.search;
  history.replaceState({}, '', redirect);
}

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
  '/hosts': renderHosts,
  '/chat': renderChat,
  '/transkripte-gesucht': renderTranskripteGesucht,
};

function setActive(path) {
  for (const a of nav.querySelectorAll('a')) {
    const href = (a.getAttribute('href') || '').split('?')[0];
    a.classList.toggle('active', href === path);
  }
}

function navigate(path) {
  if (path === location.pathname + location.search) return;
  history.pushState({}, '', path);
  router();
}

// Intercept clicks on internal links and route via pushState
document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest('a');
  if (!a) return;
  const href = a.getAttribute('href');
  if (!href) return;
  if (a.target === '_blank' || a.hasAttribute('download')) return;
  if (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) return;
  if (!href.startsWith('/')) return;
  e.preventDefault();
  navigate(href);
});

async function router() {
  const path = location.pathname.replace(/\/+$/, '') || '/';
  const param = location.search.replace(/^\?/, '');
  setActive(path);
  app.innerHTML = '<div class="skeleton" style="width:60%;height:32px;margin-bottom:16px"></div><div class="skeleton" style="width:90%;margin-bottom:8px"></div><div class="skeleton" style="width:80%"></div>';

  if (path.startsWith('/folge/')) {
    const num = Number(path.split('/folge/')[1]);
    return renderFolgeDetail(num);
  }
  const view = views[path] || renderHome;
  await view(param);
  window.scrollTo({ top: 0, behavior: 'instant' });
}
window.addEventListener('popstate', router);

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
    <section class="home-top">
      <div class="hero">
        <div>
          <h1>Das inoffizielle <span class="accent">TMDA</span> Wiki.</h1>
          <p>Alles aus dem Podcast „Teenager mit deutschem Akzent" mit <strong>Fynn Kliemann</strong> und <strong>Nisse Ingwersen</strong> — Startup-Ideen mit Punkten, Kalles Corner, Gerüchte, Inside-Jokes, alles automatisch aus den Folgen-Transkripten.</p>
          <div class="hero-cta">
            <a class="btn btn-primary" href="/startup-ideen">${ideen.count || 0} Startup-Ideen ansehen →</a>
            <a class="btn" href="/chat">AI-Chat</a>
          </div>
        </div>
      </div>
      <aside id="latestVideo" class="latest-video-aside" hidden>
        <div class="latest-video-head">
          <span class="tag tag-accent">🎬 Aktuelle Folge</span>
          <a href="https://www.youtube.com/playlist?list=PLMftwspHv5RgVDn9rePz3EuLlTJfrC9Hd" target="_blank" rel="noopener" class="meta">Playlist ↗</a>
        </div>
        <div class="yt-embed" id="latestVideoEmbed"></div>
        <div class="meta" id="latestVideoMeta"></div>
      </aside>
    </section>

    <section class="stats">
      <a class="stat" href="/folgen"><div class="stat-num">${eps.count || 0}</div><div class="stat-label">Folgen</div></a>
      <a class="stat" href="/startup-ideen"><div class="stat-num">${ideen.count || 0}</div><div class="stat-label">Startup-Ideen</div></a>
      <a class="stat" href="/kalles-corner"><div class="stat-num">${corner.count || 0}</div><div class="stat-label">Kalles Corner</div></a>
      <a class="stat" href="/geruechte"><div class="stat-num">${ger.count || 0}</div><div class="stat-label">Gerüchte</div></a>
      <a class="stat" href="/glossar"><div class="stat-num">${glo.count || 0}</div><div class="stat-label">Glossar</div></a>
    </section>

    ${topIdee ? `
    <section class="home-highlight">
      <h2 class="section-title">🏆 Best-bewertete Startup-Idee</h2>
      <a class="card card-highlight highlight-card" href="/folge/${topIdee.folge}">
        <div class="highlight-body">
          <span class="tag tag-accent">Folge #${topIdee.folge}</span>
          <h3 class="highlight-title">${esc(topIdee.idee)}</h3>
          <div class="desc">${esc(topIdee.beschreibung)}</div>
        </div>
        <span class="score score-high score-large highlight-score">${topIdee.punkte}<small>/${topIdee.max_punkte || 24}</small></span>
      </a>
    </section>` : ''}

    <section style="margin-top:32px">
      <h2 class="section-title">Rubriken</h2>
      <p class="section-sub">Alles, was wiederkehrt — automatisch aus den Transkripten.</p>
      <div class="card-grid" id="rubrikenGrid"></div>
    </section>
  `;

  const rubriken = [
    { href: '/folgen', title: 'Folgen-Archiv', desc: 'Alle Folgen mit Themen und Highlights.', tag: 'Archiv', emoji: '📅' },
    { href: '/startup-ideen', title: 'Startup-Idee der Woche', desc: 'Fynns Brainstorms mit Punkten von Nisse.', tag: 'Highlight', emoji: '💡' },
    { href: '/kalles-corner', title: 'Kalles Corner', desc: 'Beiträge und Anekdoten von Kalle.', tag: 'Rubrik', emoji: '🪑' },
    { href: '/geruechte', title: 'Gerücht der Woche', desc: 'Klatsch und Insiderwissen.', tag: 'Rubrik', emoji: '🤫' },
    { href: '/erfindungen', title: 'Erfindungen', desc: 'Absurde Produktideen.', tag: 'Lexikon', emoji: '🔧' },
    { href: '/glossar', title: 'Glossar & Inside-Jokes', desc: 'Running gags und Slang.', tag: 'Lexikon', emoji: '📖' },
    { href: '/zitate', title: 'Zitate', desc: 'Die besten Sätze aller Folgen.', tag: 'Best-of', emoji: '💬' },
    { href: '/personen', title: 'Erwähnte Personen', desc: 'Wer alles vorkam.', tag: 'Index', emoji: '👥' },
    { href: '/hosts', title: 'Hosts & Cast', desc: 'Fynn, Nisse und Kalle — Bio, Projekte, Social.', tag: 'Profile', emoji: '🎙️' },
    { href: '/chat', title: 'AI-Chat', desc: 'Frag das Wiki direkt — powered by Workers AI.', tag: 'Live', emoji: '🤖' },
    { href: '/transkripte-gesucht', title: 'Transkripte gesucht', desc: 'Du kannst Audio nach Sprecher zuordnen? Meld dich!', tag: 'Mithelfen', emoji: '🎤' },
  ];
  const grid = document.getElementById('rubrikenGrid');
  for (const r of rubriken) {
    grid.appendChild(el(`<a class="card" href="${r.href}">
      <span class="tag tag-accent">${r.tag}</span>
      <h3>${r.emoji} ${r.title}</h3>
      <div class="desc">${r.desc}</div>
    </a>`));
  }

  // Latest YouTube video — lädt asynchron, blendet sich ein wenn verfügbar
  loadLatestVideo();
}

async function loadLatestVideo() {
  const section = document.getElementById('latestVideo');
  const embed = document.getElementById('latestVideoEmbed');
  const meta = document.getElementById('latestVideoMeta');
  if (!section || !embed) return;
  try {
    const r = await fetch('/api/latest-video');
    const data = await r.json();
    if (!data.ok || !data.videos?.length) return;
    const v = data.videos[0];
    embed.innerHTML = `<iframe loading="lazy"
      src="https://www.youtube-nocookie.com/embed/${esc(v.id)}?rel=0"
      title="${esc(v.title)}"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen></iframe>`;
    meta.textContent = `${v.title}${v.published ? ' · ' + fmtDate(v.published.slice(0, 10)) : ''}`;
    section.hidden = false;
  } catch {}
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
    grid.appendChild(el(`<a class="card" href="/folge/${ep.folge}">
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
    app.innerHTML = `<h1 class="section-title">Folge ${folge} nicht gefunden</h1><p><a href="/folgen">← Zurück zum Archiv</a></p>`;
    return;
  }

  const idee = (ideen.items || []).find((i) => i.folge === folge);
  const kc = (corner.items || []).find((i) => i.folge === folge);
  const gr = (ger.items || []).find((i) => i.folge === folge);
  const facts = (fact.items || []).filter((i) => i.folge === folge);
  const zitate = (zit.items || []).filter((i) => i.folge === folge);
  const erfindungen = (erf.items || []).filter((i) => i.folge === folge);

  app.innerHTML = `
    <p><a href="/folgen">← Folgen-Archiv</a></p>
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
      <div class="card card-highlight highlight-card">
        <div class="highlight-body">
          <h3 class="highlight-title">${esc(idee.idee)}</h3>
          <div class="desc">${esc(idee.beschreibung)}</div>
          ${idee.begruendung ? `<div class="meta highlight-meta"><strong>Nisse:</strong> ${esc(idee.begruendung)}</div>` : ''}
        </div>
        ${idee.punkte != null ? `<span class="score ${scoreClass(idee.punkte, idee.max_punkte || 24)} score-large highlight-score">${idee.punkte}<small>/${idee.max_punkte || 24}</small></span>` : ''}
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
  const sortBy = new URLSearchParams(location.search).get('sort') || 'folge';
  let sorted = [...items];
  if (sortBy === 'punkte') sorted.sort((a, b) => (b.punkte ?? -1) - (a.punkte ?? -1));
  else sorted.sort((a, b) => (b.folge || 0) - (a.folge || 0));

  app.innerHTML = `
    <h1 class="section-title">💡 Startup-Idee der Woche</h1>
    <p class="section-sub">Fynns Brainstorms — bewertet von Nisse auf einer Skala bis ${items[0]?.max_punkte || 24}. ${items.length} Ideen.</p>
    <div class="filter-bar">
      <a class="${sortBy === 'folge' ? 'active' : ''}" href="/startup-ideen?sort=folge">Nach Folge</a>
      <a class="${sortBy === 'punkte' ? 'active' : ''}" href="/startup-ideen?sort=punkte">Nach Punkten</a>
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
      <td><a href="/folge/${i.folge}"><strong>#${i.folge}</strong></a></td>
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
    grid.appendChild(el(`<a class="card" href="/folge/${i.folge}">
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
    grid.appendChild(el(`<a class="card" href="/folge/${g.folge}">
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
    grid.appendChild(el(`<a class="card" href="/folge/${e.folge}">
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
      <td>${g.folge ? `<a href="/folge/${g.folge}">#${g.folge}</a>` : ''}</td>
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
      <cite>— <a href="/folge/${z.folge}">Folge #${z.folge}</a>${z.kontext ? ` · ${esc(z.kontext)}` : ''}</cite>
    </blockquote>`));
  }
  app.appendChild(list);
}

// ---------- Personen ----------
async function renderPersonen() {
  const data = await getData('gaeste');
  const all = data.items || [];
  const showAll = (new URLSearchParams(location.search)).get('all') === '1';
  const items = showAll ? all : all.filter((p) => (p.folgen || []).length >= 2);

  app.innerHTML = `
    <h1 class="section-title">👥 Erwähnte Personen</h1>
    <p class="section-sub">Wer alles im Podcast erwähnt wurde — sortiert nach Häufigkeit. ${items.length}/${all.length} angezeigt.</p>
    <div class="filter-bar">
      <a class="${!showAll ? 'active' : ''}" href="/personen">Mehrfach genannt</a>
      <a class="${showAll ? 'active' : ''}" href="/personen?all=1">Alle (${all.length})</a>
    </div>
    ${items.length === 0 ? emptyState('Personen') : ''}
  `;
  if (items.length === 0) return;

  const tbl = el(`<div class="table-wrap"><table>
    <thead><tr><th>Person</th><th>Erwähnt in</th><th>#</th></tr></thead>
    <tbody></tbody></table></div>`);
  const tb = tbl.querySelector('tbody');
  for (const p of items) {
    const folgen = (p.folgen || []).map((f) => `<a href="/folge/${f}">#${f}</a>`).join(', ');
    tb.appendChild(el(`<tr>
      <td><strong>${esc(p.name)}</strong></td>
      <td>${folgen}</td>
      <td><span class="tag tag-accent">${p.folgen.length}</span></td>
    </tr>`));
  }
  app.appendChild(tbl);
}

// ---------- Hosts ----------
async function renderHosts() {
  const data = await getData('hosts');
  const items = data.items || [];
  app.innerHTML = `
    <h1 class="section-title">🎙️ Hosts & Cast</h1>
    <p class="section-sub">Wer hinter dem Mikrofon sitzt — und wer den Mythos „Kalles Corner" trägt.</p>
    ${items.length === 0 ? emptyState('Hosts') : ''}
  `;
  if (items.length === 0) return;

  const wrap = el('<div class="host-grid"></div>');
  for (const h of items) {
    const initials = (h.name || '?').split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
    const projekte = (h.projekte || []).map((p) => `
      <li>
        <a href="${esc(p.url)}" target="_blank" rel="noopener"><strong>${esc(p.name)}</strong></a>
        ${p.beschreibung ? ` — <span class="meta">${esc(p.beschreibung)}</span>` : ''}
      </li>`).join('');
    const social = (h.social || []).map((s) => `
      <a class="social-chip" href="${esc(s.url)}" target="_blank" rel="noopener">
        ${esc(s.platform)} <span class="meta">${esc(s.handle)}</span>
      </a>`).join('');

    wrap.appendChild(el(`<article class="host-card">
      <header class="host-head">
        <div class="host-avatar">${esc(initials)}</div>
        <div>
          <h2>${esc(h.name)}</h2>
          <div class="host-role">${esc(h.rolle)}</div>
          ${h.geboren ? `<div class="meta">Geboren: ${esc(h.geboren)}${h.geburtsort ? ' · ' + esc(h.geburtsort) : ''}</div>` : (h.geburtsort ? `<div class="meta">${esc(h.geburtsort)}</div>` : '')}
        </div>
      </header>
      <p class="host-bio">${esc(h.bio)}</p>
      ${projekte ? `<section><h3 class="host-section-title">Projekte</h3><ul class="host-list">${projekte}</ul></section>` : ''}
      ${social ? `<section><h3 class="host-section-title">Social & Web</h3><div class="social-chips">${social}</div></section>` : ''}
    </article>`));
  }
  app.appendChild(wrap);
}

// ---------- Transkripte gesucht ----------
function renderTranskripteGesucht() {
  app.innerHTML = `
    <h1 class="section-title">🎤 Transkripte mit Sprecher-Zuordnung gesucht</h1>
    <p class="section-sub">Du kannst Audio nach Sprecher zuordnen? Wir suchen Hilfe.</p>

    <article class="card" style="padding:24px;line-height:1.6">
      <p>Aktuell sind alle Transkripte hier <strong>YouTube-Auto-Captions</strong> ohne Sprecher-Labels. Das macht das Wiki, den Chat und die Suche weniger präzise — und Rubriken wie „Kalles Corner" lassen sich nur über Heuristiken erkennen.</p>
      <p>Wir suchen Menschen, die helfen können, die Folgen mit eindeutiger Sprecher-Zuordnung (<strong>Fynn / Nisse / Kalle / Gast</strong>) zu transkribieren — entweder per Tool (z.B. WhisperX, pyannote, AssemblyAI mit Speaker Diarization) oder von Hand.</p>
      <h3 style="margin-top:20px">Was wir brauchen</h3>
      <ul class="host-list" style="margin-bottom:16px">
        <li>Klares Sprecher-Label pro Zeile (z.B. <code>Fynn:</code>, <code>Nisse:</code>)</li>
        <li>Format Markdown oder Plain Text — Hauptsache lesbar</li>
        <li>Folgen-Nummer im Dateinamen (<code>folge-XX.md</code>)</li>
      </ul>
      <h3>Was du davon hast</h3>
      <ul class="host-list" style="margin-bottom:20px">
        <li>Credits auf der Wiki-Hosts-Seite (falls gewünscht)</li>
        <li>Mein ewig dankbares Danke 🙏</li>
        <li>Ein Hobby-Fan-Projekt, das endlich „richtig" wird</li>
      </ul>
      <a class="btn btn-primary" href="mailto:tmda@sagorski.org?subject=Sprecher-Transkripte%20helfen&body=Hi%20Kolja%2C%0A%0Aich%20w%C3%BCrde%20gerne%20bei%20den%20Transkripten%20mit%20Sprecher-Zuordnung%20helfen.%0A%0A">
        ✉️ Schreib uns an tmda@sagorski.org
      </a>
    </article>
  `;
}

// ---------- Chat (refactored: shared zwischen Seite und Modal) ----------
const DONATION_THRESHOLD = 3;
// Counter + shown-Flag beide pro Session — Donation triggert dann
// zuverlässig bei der 3. Frage einer frischen Browser-Session
const QUESTION_COUNT_KEY = 'tmda-chat-questions-session';
const DONATION_SHOWN_KEY = 'tmda-donate-shown-session';

// Easter-Egg-Hints, die nach jeder AI-Antwort kommen
const EASTER_HINTS = [
  '🛸 Tipp: Klick das TMDA-Logo oben links zweimal hintereinander.',
  '🪑 Tipp: Tipp irgendwo auf der Seite „kalle" (außerhalb von Inputs).',
  '⏳ Tipp: Probier mal „papst" zu tippen.',
  '🐐 Tipp: Geheimwort der Folge 1 — „fanta".',
  '🥶 Tipp: Konami-Code (↑ ↑ ↓ ↓ ← → ← → B A) macht was Eisiges.',
  '❄️ Tipp: Tipp „flutschi" und beobachte die Seite.',
  '🎙️ Tipp: Triple-Click auf das fette „TMDA Wiki" im Footer.',
  '🤓 Tipp: Öffne mal die Browser-Konsole (F12 / Cmd+Opt+J).',
];
function pickEasterHint() {
  return EASTER_HINTS[Math.floor(Math.random() * EASTER_HINTS.length)];
}

let chatConfig = null;
async function getChatConfig() {
  if (chatConfig) return chatConfig;
  try {
    const r = await fetch('/api/config');
    chatConfig = await r.json();
  } catch {
    chatConfig = { turnstileSiteKey: '', turnstileInterval: 6 };
  }
  // Backwards-compat: alte threshold-Property
  chatConfig.turnstileInterval = chatConfig.turnstileInterval || chatConfig.turnstileThreshold || 6;
  return chatConfig;
}

function setupChat(container, opts = {}) {
  container.innerHTML = `
    <div class="chat ${opts.compact ? 'chat-compact' : ''}">
      <div class="chat-log" data-chat-log>
        <div class="msg system">Tipp: Frag z.B. „Was war Fynns dümmste Startup-Idee?", „Was passiert in Kalles Corner?" oder „Welche Promis kamen am häufigsten vor?"</div>
      </div>
      <div class="chat-turnstile" data-chat-turnstile hidden></div>
      <form class="chat-input" data-chat-form>
        <input data-chat-input type="text" placeholder="Schreib was..." autocomplete="off" />
        <button class="btn btn-primary" type="submit">Senden</button>
      </form>
    </div>
  `;
  const log = container.querySelector('[data-chat-log]');
  const form = container.querySelector('[data-chat-form]');
  const input = container.querySelector('[data-chat-input]');
  const tsBox = container.querySelector('[data-chat-turnstile]');
  const history = [];
  let turnstileToken = null;
  let turnstileWidgetId = null;

  function addMsg(role, content) {
    const m = el(`<div class="msg ${role}"></div>`);
    m.textContent = content;
    log.appendChild(m);
    log.scrollTop = log.scrollHeight;
    return m;
  }

  function showDonationCallout() {
    const callout = el(`<div class="donate-callout">
      <h3>Hey — kleines Wort in eigener Sache 🙏</h3>
      <p>Das hier ist ein <strong>Hobby-Fan-Projekt</strong>, kein offizielles TMDA-Angebot. Jede Chat-Anfrage kostet ein paar Cent Cloudflare-AI-Gebühren — auf Dauer summiert sich das.</p>
      <p>Wenn dir das Wiki Spaß macht, freu ich mich über einen kleinen Beitrag:</p>
      <a class="donate-btn" href="https://www.paypal.com/paypalme/koljasagorski" target="_blank" rel="noopener">
        <strong>PayPal:</strong> paypal@koljasagorski.de
      </a>
      <p class="meta">Danke! Frag ruhig weiter — die Antworten kommen wie gewohnt.</p>
    </div>`);
    log.appendChild(callout);
    log.scrollTop = log.scrollHeight;
  }

  async function ensureTurnstileScript() {
    if (window.turnstile) return;
    await new Promise((resolve) => {
      const i = setInterval(() => {
        if (window.turnstile) { clearInterval(i); resolve(); }
      }, 100);
      setTimeout(() => { clearInterval(i); resolve(); }, 5000);
    });
  }

  async function showTurnstileChallenge(siteKey) {
    await ensureTurnstileScript();
    if (!window.turnstile) return null;
    tsBox.hidden = false;
    tsBox.innerHTML = '<div class="msg system">Kurz beweisen, dass du kein Bot bist 🤖❌</div><div data-ts-widget></div>';
    const widgetTarget = tsBox.querySelector('[data-ts-widget]');
    return new Promise((resolve) => {
      turnstileWidgetId = window.turnstile.render(widgetTarget, {
        sitekey: siteKey,
        theme: 'auto',
        callback: (token) => {
          turnstileToken = token;
          // Kurzes ✅-Feedback, dann Overlay weg
          const msg = tsBox.querySelector('.msg');
          if (msg) msg.textContent = '✅ Danke!';
          setTimeout(() => {
            tsBox.hidden = true;
            tsBox.innerHTML = '';
            if (turnstileWidgetId != null && window.turnstile) {
              try { window.turnstile.remove(turnstileWidgetId); } catch {}
              turnstileWidgetId = null;
            }
          }, 400);
          resolve(token);
        },
        'error-callback': () => resolve(null),
      });
    });
  }

  async function send(text) {
    addMsg('user', text);
    history.push({ role: 'user', content: text });
    const pending = addMsg('assistant', '…');

    const cfg = await getChatConfig();
    const count = Number(sessionStorage.getItem(QUESTION_COUNT_KEY) || '0') + 1;
    const interval = cfg.turnstileInterval || 6;
    // Turnstile-Tokens sind Single-Use → nur alle N Fragen challengen
    const needsTurnstile = !!cfg.turnstileSiteKey && count > 0 && count % interval === 0;

    if (needsTurnstile) {
      const t = await showTurnstileChallenge(cfg.turnstileSiteKey);
      if (!t) {
        pending.textContent = 'Konnte CAPTCHA nicht laden. Versuch es nochmal.';
        return;
      }
    } else {
      // Außerhalb des Challenge-Intervalls keinen alten Token mitschicken
      turnstileToken = null;
    }

    async function postChat(extraToken) {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          turnstileToken: extraToken ?? turnstileToken,
          userQuestionCount: count,
        }),
      });
      return { res, data: await res.json() };
    }

    try {
      let { res, data } = await postChat();
      if (res.status === 401 && data.error === 'turnstile-required') {
        // Token war ungültig/spent — frisches Token holen und retryen
        turnstileToken = null;
        pending.textContent = 'Kurz durch das Captcha — danach geht\'s weiter.';
        const t = await showTurnstileChallenge(cfg.turnstileSiteKey);
        if (t) {
          ({ res, data } = await postChat(t));
        }
      }
      if (data.reply) {
        pending.textContent = data.reply;
        history.push({ role: 'assistant', content: data.reply });
        tsBox.hidden = true;
        // Token nach Verbrauch verwerfen (Cloudflare Tokens sind single-use)
        turnstileToken = null;
        sessionStorage.setItem(QUESTION_COUNT_KEY, String(count));
        // Easter-Egg-Hint als kleine Bonus-Bubble unter der Antwort
        const hint = el('<div class="msg msg-hint"></div>');
        hint.textContent = pickEasterHint();
        log.appendChild(hint);
        log.scrollTop = log.scrollHeight;
        if (count >= DONATION_THRESHOLD && !sessionStorage.getItem(DONATION_SHOWN_KEY)) {
          sessionStorage.setItem(DONATION_SHOWN_KEY, '1');
          showDonationCallout();
        }
      } else if (!pending.textContent.includes('Captcha')) {
        pending.textContent = data.error || 'Keine Antwort.';
      }
    } catch (err) {
      pending.textContent = 'Fehler: ' + err.message;
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    send(text);
  });
}

async function renderChat() {
  app.innerHTML = `
    <h1 class="section-title">🤖 Chat</h1>
    <p class="section-sub">Frag das Wiki — läuft auf Cloudflare Workers AI (Llama 3.1) mit Volltext-Kontext aus allen Folgen.</p>
    <div id="chatPageContainer"></div>
  `;
  setupChat(document.getElementById('chatPageContainer'));
}

// ---------- Floating Chat Modal ----------
let modalChatMounted = false;
function openChatModal() {
  const modal = document.getElementById('chatModal');
  const body = document.getElementById('chatModalBody');
  if (!modal || !body) return;
  if (!modalChatMounted) {
    setupChat(body, { compact: true });
    modalChatMounted = true;
  }
  modal.setAttribute('aria-hidden', 'false');
  modal.classList.add('open');
  const input = body.querySelector('[data-chat-input]');
  setTimeout(() => input?.focus(), 100);
}
function closeChatModal() {
  const modal = document.getElementById('chatModal');
  if (!modal) return;
  modal.setAttribute('aria-hidden', 'true');
  modal.classList.remove('open');
}
document.getElementById('chatFab')?.addEventListener('click', openChatModal);
document.querySelectorAll('[data-chat-close]').forEach((el) => el.addEventListener('click', closeChatModal));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeChatModal();
});

router();
