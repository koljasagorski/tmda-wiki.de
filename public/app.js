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
async function getData(name) {
  try {
    const r = await fetch(`/api/data/${name}`);
    if (!r.ok) throw new Error('not ok');
    return await r.json();
  } catch {
    return { items: [], note: 'Daten nicht verfügbar' };
  }
}

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function scoreClass(s) {
  if (s == null) return '';
  if (s >= 7) return 'score-high';
  if (s <= 3) return 'score-low';
  return '';
}

function emptyState(rubrik, hint) {
  return `<div class="empty">
    <p><strong>Noch keine ${rubrik}-Daten.</strong></p>
    <p>${hint || `Lade Transkripte nach <code>transcripts/</code> hoch und führe <code>npm run extract</code> aus.`}</p>
  </div>`;
}

// ---------- Views ----------
const views = {
  '/': renderHome,
  '/folgen': renderFolgen,
  '/startup-ideen': renderStartupIdeen,
  '/kalles-corner': renderKallesCorner,
  '/geruechte': renderGeruechte,
  '/glossar': renderGlossar,
  '/chat': renderChat,
};

function setActive(hash) {
  for (const a of nav.querySelectorAll('a')) {
    a.classList.toggle('active', a.getAttribute('href') === hash);
  }
}

async function router() {
  const hash = location.hash.replace(/^#/, '') || '/';
  setActive('#' + hash);
  app.innerHTML = '<div class="skeleton" style="width:60%;height:32px;margin-bottom:16px"></div><div class="skeleton" style="width:90%;margin-bottom:8px"></div><div class="skeleton" style="width:80%"></div>';
  const view = views[hash] || renderHome;
  await view();
}
window.addEventListener('hashchange', router);

// ---------- Home ----------
async function renderHome() {
  app.innerHTML = `
    <section class="hero">
      <div>
        <h1>Das inoffizielle <span class="accent">TMDA</span> Wiki.</h1>
        <p>Alles aus dem Podcast „Teenager mit deutschem Akzent" mit <strong>Fynn Kliemann</strong> und <strong>Nisse Ingwersen</strong> — Startup-Ideen der Woche, Kalles Corner, Gerüchte, Inside-Jokes und mehr.</p>
        <div class="hero-cta">
          <a class="btn btn-primary" href="#/startup-ideen">Startup-Ideen ansehen →</a>
          <a class="btn" href="#/chat">AI-Chat öffnen</a>
        </div>
      </div>
    </section>

    <section>
      <h2 class="section-title">Rubriken</h2>
      <p class="section-sub">Alles, was wiederkehrt — automatisch aus den Folgen-Transkripten extrahiert.</p>
      <div class="card-grid" id="rubrikenGrid"></div>
    </section>
  `;

  const rubriken = [
    { href: '#/folgen', title: 'Folgen-Archiv', desc: 'Alle Folgen mit Datum, Laufzeit und Themen.', tag: 'Archiv' },
    { href: '#/startup-ideen', title: 'Startup-Idee der Woche', desc: 'Fynns wöchentliche Geschäftsidee inkl. Punkten.', tag: 'Highlight' },
    { href: '#/kalles-corner', title: 'Kalles Corner', desc: 'Beiträge und Geschichten von Kalle.', tag: 'Rubrik' },
    { href: '#/geruechte', title: 'Gerücht der Woche', desc: 'Klatsch, Tratsch und Insiderwissen.', tag: 'Rubrik' },
    { href: '#/glossar', title: 'Glossar & Inside-Jokes', desc: '„Talahons im Weltall", running gags, Vokabular.', tag: 'Lexikon' },
    { href: '#/chat', title: 'AI-Chat', desc: 'Frag das Wiki direkt — powered by Workers AI.', tag: 'Live' },
  ];
  const grid = document.getElementById('rubrikenGrid');
  for (const r of rubriken) {
    grid.appendChild(el(`<a class="card" href="${r.href}">
      <span class="tag tag-accent">${r.tag}</span>
      <h3>${r.title}</h3>
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

  const tbl = el(`<div class="table-wrap"><table>
    <thead><tr><th>#</th><th>Titel</th><th>Datum</th><th>Laufzeit</th><th>Themen</th></tr></thead>
    <tbody></tbody></table></div>`);
  const tb = tbl.querySelector('tbody');
  for (const ep of items) {
    tb.appendChild(el(`<tr>
      <td><strong>${ep.folge}</strong></td>
      <td>${ep.titel || ''}</td>
      <td>${ep.datum || ''}</td>
      <td>${ep.laufzeit || ''}</td>
      <td>${(ep.themen || []).map((t) => `<span class="tag">${t}</span>`).join('')}</td>
    </tr>`));
  }
  app.appendChild(tbl);
}

// ---------- Startup-Ideen ----------
async function renderStartupIdeen() {
  const data = await getData('startup-ideen');
  const items = data.items || [];
  app.innerHTML = `
    <h1 class="section-title">Startup-Idee der Woche</h1>
    <p class="section-sub">Fynns Brainstorms — bewertet von Nisse (0–10 Punkte).</p>
    ${items.length === 0 ? emptyState('Startup-Ideen') : ''}
  `;
  if (items.length === 0) return;

  const tbl = el(`<div class="table-wrap"><table>
    <thead><tr><th>Folge</th><th>Idee</th><th>Beschreibung</th><th>Punkte</th></tr></thead>
    <tbody></tbody></table></div>`);
  const tb = tbl.querySelector('tbody');
  for (const i of items) {
    tb.appendChild(el(`<tr>
      <td><strong>#${i.folge ?? '?'}</strong></td>
      <td>${i.idee || ''}</td>
      <td>${i.beschreibung || ''}</td>
      <td><span class="score ${scoreClass(i.punkte)}">${i.punkte ?? '–'}</span></td>
    </tr>`));
  }
  app.appendChild(tbl);
}

// ---------- Kalles Corner ----------
async function renderKallesCorner() {
  const data = await getData('kalles-corner');
  const items = data.items || [];
  app.innerHTML = `
    <h1 class="section-title">Kalles Corner</h1>
    <p class="section-sub">Alle Beiträge aus Kalles Corner — Folge für Folge.</p>
    ${items.length === 0 ? emptyState('Kalles-Corner') : ''}
  `;
  if (items.length === 0) return;

  const grid = el('<div class="card-grid"></div>');
  for (const i of items) {
    grid.appendChild(el(`<article class="card">
      <span class="tag tag-accent">Folge #${i.folge ?? '?'}</span>
      <h3>${i.titel || 'Kalles Corner'}</h3>
      <div class="meta">${i.datum || ''}</div>
      <div class="desc">${i.inhalt || ''}</div>
    </article>`));
  }
  app.appendChild(grid);
}

// ---------- Gerüchte ----------
async function renderGeruechte() {
  const data = await getData('geruechte');
  const items = data.items || [];
  app.innerHTML = `
    <h1 class="section-title">Gerücht der Woche</h1>
    <p class="section-sub">Klatsch, Tratsch und (vermeintliches) Insiderwissen.</p>
    ${items.length === 0 ? emptyState('Gerüchte') : ''}
  `;
  if (items.length === 0) return;

  const grid = el('<div class="card-grid"></div>');
  for (const g of items) {
    grid.appendChild(el(`<article class="card">
      <span class="tag tag-accent">Folge #${g.folge ?? '?'}</span>
      <h3>${g.titel || 'Gerücht'}</h3>
      <div class="meta">${g.datum || ''}</div>
      <div class="desc">${g.inhalt || ''}</div>
    </article>`));
  }
  app.appendChild(grid);
}

// ---------- Glossar ----------
async function renderGlossar() {
  const data = await getData('glossar');
  const items = data.items || [];
  app.innerHTML = `
    <h1 class="section-title">Glossar & Inside-Jokes</h1>
    <p class="section-sub">Wiederkehrende Begriffe, Phrasen und running gags.</p>
    ${items.length === 0 ? emptyState('Glossar') : ''}
  `;
  if (items.length === 0) return;

  const tbl = el(`<div class="table-wrap"><table>
    <thead><tr><th>Begriff</th><th>Bedeutung</th><th>Erste Erwähnung</th></tr></thead>
    <tbody></tbody></table></div>`);
  const tb = tbl.querySelector('tbody');
  for (const g of items) {
    tb.appendChild(el(`<tr>
      <td><strong>${g.begriff || ''}</strong></td>
      <td>${g.bedeutung || ''}</td>
      <td>${g.folge ? `#${g.folge}` : ''}</td>
    </tr>`));
  }
  app.appendChild(tbl);
}

// ---------- Chat ----------
async function renderChat() {
  app.innerHTML = `
    <h1 class="section-title">Chat</h1>
    <p class="section-sub">Frag das Wiki — läuft auf Cloudflare Workers AI (Llama 3.1).</p>
    <div class="chat">
      <div class="chat-log" id="chatLog">
        <div class="msg system">Tipp: Frag z.B. „Was war Fynns dümmste Startup-Idee?" oder „Was passiert in Kalles Corner?"</div>
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
