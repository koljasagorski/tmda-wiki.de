// Tiny SPA mit History-API-Routing (SEO-freundlich, keine Hash-URLs)

const app = document.getElementById('app');
const nav = document.getElementById('primaryNav');
const themeToggle = document.getElementById('themeToggle');

// Markiert: JS aktiv → erlaubt CSS, Reveal-Elemente vorab zu verstecken (kein FOUC ohne JS).
document.documentElement.classList.add('js');

// Scroll-Reveal: blendet [data-reveal]-Elemente beim Eintritt ein.
// Respektiert prefers-reduced-motion (dann sofort sichtbar, kein Observer).
const _prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
function revealInit(root = document) {
  const targets = root.querySelectorAll('[data-reveal]:not(.in)');
  if (_prefersReducedMotion || !('IntersectionObserver' in window)) {
    targets.forEach((t) => t.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries, obs) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); }
    }
  }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
  targets.forEach((t) => io.observe(t));
}

// Backward-Compat: alte #/-Bookmarks auf Path-URLs redirecten
if (location.hash.startsWith('#/')) {
  const redirect = location.hash.slice(1) + location.search;
  history.replaceState({}, '', redirect);
}

// ---------- Theme ----------
// Initiales Setzen passiert per Inline-Script im <head>, um Flash-of-Wrong-Theme
// zu vermeiden. Hier nur: Toggle + Live-Reaktion auf OS-Wechsel (solange kein
// manueller Override in localStorage steht).
themeToggle?.addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', cur);
  localStorage.setItem('tmda-theme', cur);
});
const _osThemeQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
_osThemeQuery?.addEventListener?.('change', (e) => {
  if (localStorage.getItem('tmda-theme')) return;
  document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
});

// ---------- Mobile-Navi (Offcanvas-Drawer) ----------
const navToggle = document.getElementById('navToggle');
const navBackdrop = document.getElementById('navBackdrop');
const mqNavMobile = window.matchMedia('(max-width: 720px)');

function setNav(open) {
  document.body.classList.toggle('nav-open', open);
  navToggle?.setAttribute('aria-expanded', open ? 'true' : 'false');
}
function closeNav() { setNav(false); }

navToggle?.addEventListener('click', () => {
  setNav(!document.body.classList.contains('nav-open'));
});
navBackdrop?.addEventListener('click', closeNav);
// Klick auf einen Link im Drawer schließt ihn
nav?.addEventListener('click', (e) => {
  if (mqNavMobile.matches && e.target.closest('a')) closeNav();
});

// „Mehr"-Gruppe im Drawer flach auslegen (auf Mobile immer geöffnet);
// das Desktop-Dropdown bleibt unverändert.
function syncNavMore() {
  const more = document.getElementById('navMore');
  if (more && mqNavMobile.matches) more.open = true;
}
mqNavMobile.addEventListener('change', () => { closeNav(); syncNavMore(); });
syncNavMore();

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

// URL-Slug aus einem Namen (Umlaute → ae/oe/ue, Rest kebab-case)
function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'erfindung';
}
// Erfindungen deterministisch um eindeutige Slugs ergänzen (Kollisionen → -folge / -index)
function withErfindungSlugs(items) {
  const taken = new Set();
  return (items || []).map((e, i) => {
    const base = slugify(e.name);
    let slug = base;
    if (taken.has(slug)) slug = `${base}-${e.folge}`;
    if (taken.has(slug)) slug = `${base}-${e.folge}-${i}`;
    taken.add(slug);
    return { ...e, slug };
  });
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
  '/stats': renderStats,
  '/quiz': renderQuiz,
  '/bingo': renderBingo,
  '/timeline': renderTimeline,
};

function setActive(path) {
  closeNav(); // Drawer bei jeder Navigation schließen (No-op auf Desktop)
  // Detail-Routen markieren ihre Übersicht (z.B. /erfindung/x → /erfindungen)
  let activeHref = path;
  if (path.startsWith('/erfindung/')) activeHref = '/erfindungen';
  for (const a of nav.querySelectorAll('a')) {
    const href = (a.getAttribute('href') || '').split('?')[0];
    a.classList.toggle('active', href === activeHref);
  }
  // „Mehr"-Dropdown: Gruppe markieren wenn ein Kind aktiv ist, und nach
  // erfolgter Navigation wieder schließen.
  const more = document.getElementById('navMore');
  if (more) {
    const childActive = !!more.querySelector('.nav-more-panel a.active');
    more.classList.toggle('has-active', childActive);
    // Auf Mobile bleibt „Mehr" im Drawer flach ausgeklappt.
    if (!mqNavMobile.matches) more.open = false;
  }
}

// Dropdown schließen bei Klick außerhalb oder Escape (nur Desktop-Dropdown)
document.addEventListener('click', (e) => {
  if (mqNavMobile.matches) return;
  const more = document.getElementById('navMore');
  if (more && more.open && !more.contains(e.target)) more.open = false;
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (document.body.classList.contains('nav-open')) { closeNav(); return; }
  const more = document.getElementById('navMore');
  if (more && !mqNavMobile.matches) more.open = false;
});

function navigate(path) {
  if (path === location.pathname + location.search) return;
  history.pushState({}, '', path);
  router();
}

// Pfade die NICHT durch den SPA-Router laufen sollen, der Browser navigiert
// hierhin direkt (eigene HTML-Files, statische Assets, API).
const NON_SPA_PREFIXES = ['/startup/', '/transcripts/', '/api/', '/data/'];

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
  // Datei mit Endung (.txt, .png, .xml, .jpg, ...) → echte Browser-Navigation
  const pathOnly = href.split('?')[0].split('#')[0];
  if (/\.[a-zA-Z0-9]+$/.test(pathOnly)) return;
  // Worker-handled / Eigen-HTML-Routen → echte Browser-Navigation
  if (NON_SPA_PREFIXES.some((p) => pathOnly.startsWith(p))) return;
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
  if (path.startsWith('/erfindung/')) {
    const slug = decodeURIComponent(path.split('/erfindung/')[1] || '');
    return renderErfindungDetail(slug);
  }
  const view = views[path] || renderHome;
  await view(param);
  window.scrollTo({ top: 0, behavior: 'instant' });
}
window.addEventListener('popstate', router);

// ---------- Home ----------
async function renderHome() {
  const [eps, ideen, corner, ger, glo, pages] = await Promise.all([
    getData('episodes'), getData('startup-ideen'), getData('kalles-corner'),
    getData('geruechte'), getData('glossar'),
    fetch('/data/startup-pages.json').then((r) => r.json()).catch(() => ({ items: [] })),
  ]);

  // Startup-Idee der Woche = die Idee aus der neuesten Folge.
  const ideeDerWoche = (ideen.items || [])
    .slice()
    .sort((a, b) => (b.folge || 0) - (a.folge || 0))[0];
  // Custom-Produktseite zur Idee finden (slug-Match wie in /startup-ideen)
  const iwIdee = (ideeDerWoche?.idee || '').toLowerCase();
  const iwPage = ideeDerWoche
    ? (pages.items || []).find((p) => p.folge === ideeDerWoche.folge && iwIdee.includes((p.ideeMatch || '').toLowerCase()))
    : null;
  const iwMax = ideeDerWoche?.max_punkte || 24;
  const iwLink = iwPage ? `/startup/${iwPage.slug}` : (ideeDerWoche ? `/folge/${ideeDerWoche.folge}` : '/startup-ideen');
  const latestFolge = (eps.items || []).reduce((m, e) => Math.max(m, e.folge || 0), 0) || ideeDerWoche?.folge || 0;

  // Marquee-Gruppe (voller Show-Name als Marken-Band), zweimal ausgegeben für nahtlosen Loop.
  const marqueeGroup = `
    <span class="home-marquee-item">Teenager mit deutschem Akzent</span>
    <span class="home-marquee-item dim">Fynn Kliemann</span>
    <span class="home-marquee-item">Nisse Ingwersen</span>
    <span class="home-marquee-item dim">Neue Folge jeden Dienstag</span>`;

  // Wiki-Bento: kuratierter Sektion-Navigator (genau so viele Zellen wie Inhalt).
  const bentoCells = [
    { href: '/kalles-corner', emoji: '🛒', num: corner.count, label: 'Kalles Corner', meta: 'Produkte & Empfehlungen' },
    { href: '/geruechte', emoji: '🕵️', num: ger.count, label: 'Gerüchte', meta: 'Gerücht der Woche' },
    { href: '/glossar', emoji: '📖', num: glo.count, label: 'Glossar', meta: 'Inside-Jokes erklärt' },
    { href: '/quiz', emoji: '🧠', label: 'Quiz', meta: 'Wie gut kennst du TMDA?' },
    { href: '/stats', emoji: '📊', label: 'Statistik', meta: 'Zahlen, Charts, Heatmaps' },
    { href: '/timeline', emoji: '⏳', label: 'Timeline', meta: 'Alle Highlights chronologisch' },
  ].map((c, i) => `
    <a class="bento-cell" href="${c.href}" data-reveal style="--reveal-delay:${(i + 2) * 60}ms">
      <span class="bento-emoji">${c.emoji}</span>
      <div>
        ${c.num != null ? `<div class="bento-num">${c.num || 0}</div>` : ''}
        <div class="bento-label">${c.label}</div>
        <div class="bento-meta">${c.meta}</div>
      </div>
      <span class="bento-go">Ansehen →</span>
    </a>`).join('');

  app.innerHTML = `
    <div class="home-marquee" aria-hidden="true">
      <div class="home-marquee-track">${marqueeGroup}${marqueeGroup}</div>
    </div>

    <section class="home-hero">
      <div class="home-hero-copy">
        <h1 class="home-hero-title">Das inoffizielle <span class="tmda-word">TMDA</span> Wiki.</h1>
        <p class="home-hero-sub">Alles aus dem Podcast „Teenager mit deutschem Akzent" mit <strong>Fynn Kliemann</strong> und <strong>Nisse Ingwersen</strong>.</p>
        <div class="home-hero-cta">
          <a class="btn btn-primary" href="/startup-ideen">${ideen.count || 0} Startup-Ideen →</a>
          <a class="btn" href="/chat">AI-Chat fragen</a>
        </div>
      </div>
      <aside id="latestVideo" class="home-hero-aside is-loading">
        <div class="latest-video-head">
          <span class="tag tag-accent">🎬 Aktuelle Folge</span>
          <a href="https://www.youtube.com/playlist?list=PLMftwspHv5RgVDn9rePz3EuLlTJfrC9Hd" target="_blank" rel="noopener" class="meta">Playlist ↗</a>
        </div>
        <div class="yt-embed" id="latestVideoEmbed">Aktuelle Folge lädt …</div>
        <div class="meta" id="latestVideoMeta"></div>
      </aside>
    </section>

    ${ideeDerWoche ? `
    <section class="idee-woche" data-reveal>
      <div class="idee-woche-head">
        <span class="idee-woche-kicker">💡 Startup-Idee der Woche</span>
        <span class="meta">Folge #${ideeDerWoche.folge}${ideeDerWoche.datum ? ' · ' + fmtDate(ideeDerWoche.datum) : ''}</span>
      </div>
      <a class="idee-woche-card" href="${iwLink}">
        <div class="idee-woche-body">
          <h2 class="idee-woche-title">${esc(ideeDerWoche.idee)}</h2>
          <p class="idee-woche-desc">${esc(ideeDerWoche.beschreibung)}</p>
          ${ideeDerWoche.begruendung ? `<p class="idee-woche-nisse"><strong>Nisses Urteil:</strong> ${esc(ideeDerWoche.begruendung)}</p>` : ''}
          <span class="idee-woche-go">${iwPage ? 'Zur Produkt-Seite' : 'Zur Folge'} →</span>
        </div>
        ${ideeDerWoche.punkte != null ? `<div class="idee-woche-score-wrap"><span class="score ${scoreClass(ideeDerWoche.punkte, iwMax)} score-large idee-woche-score">${ideeDerWoche.punkte}<small>/${iwMax}</small></span></div>` : ''}
      </a>
    </section>` : ''}

    <section class="wiki-bento-head" data-reveal>
      <h2>Stöber durchs Wiki</h2>
      <p>Jede Rubrik wird automatisch aus den Folgen-Transkripten gepflegt.</p>
    </section>
    <section class="wiki-bento">
      <a class="bento-cell is-tall is-tinted" href="/folgen" data-reveal style="--reveal-delay:0ms">
        <span class="bento-emoji">📺</span>
        <div>
          <div class="bento-num">${eps.count || 0}</div>
          <div class="bento-label">Folgen</div>
          <div class="bento-meta">Komplettes Archiv${latestFolge ? ` · zuletzt #${latestFolge}` : ''}</div>
        </div>
        <span class="bento-go">Zum Archiv →</span>
      </a>
      <a class="bento-cell is-tall is-feature" href="/startup-ideen" data-reveal style="--reveal-delay:60ms">
        <span class="bento-emoji">💡</span>
        <div>
          <div class="bento-num">${ideen.count || 0}</div>
          <div class="bento-label">Startup-Ideen</div>
          <div class="bento-meta">Mit Nisse-Punkten bewertet</div>
        </div>
        <span class="bento-go">Alle Ideen →</span>
      </a>
      ${bentoCells}
    </section>

    <section class="podcast-links home-podcast" data-reveal>
      <h2 class="podcast-links-title">🎧 Hör den Podcast</h2>
      <div class="podcast-links-row">
        <a class="podcast-link spotify" href="https://open.spotify.com/show/1U68QUHMUz360Ft1NCK9Ur" target="_blank" rel="noopener" aria-label="TMDA auf Spotify hören">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.5 17.3c-.2.4-.7.5-1 .3-2.7-1.6-6-2-10-1.1-.4.1-.8-.2-.9-.6-.1-.4.2-.8.6-.9 4.3-1 8-.6 10.9 1.2.4.2.5.6.4.9zm1.5-3.3c-.3.4-.8.6-1.2.4-3.1-1.9-7.8-2.5-11.5-1.3-.5.1-1-.1-1.1-.6-.1-.5.1-1 .6-1.1 4.2-1.3 9.4-.7 12.9 1.5.4.2.5.7.3 1.1zm.1-3.4C15.4 8.5 8.9 8.3 5.3 9.4c-.6.2-1.2-.2-1.4-.7-.2-.6.2-1.2.7-1.4 4.2-1.3 11.4-1 15.6 1.5.5.3.7 1 .4 1.5-.3.6-1 .7-1.5.4z"/></svg>
          <span>Spotify</span>
        </a>
        <a class="podcast-link apple" href="https://podcasts.apple.com/de/podcast/teenager-mit-deutschem-akzent-tmda/id1825080928" target="_blank" rel="noopener" aria-label="TMDA auf Apple Podcasts hören">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm0 4.5a3.5 3.5 0 0 1 3.5 3.5v4a3.5 3.5 0 1 1-7 0V8A3.5 3.5 0 0 1 12 4.5zm-6 8h2a4 4 0 0 0 8 0h2a6 6 0 0 1-5 5.9V21h-2v-2.6a6 6 0 0 1-5-5.9z"/></svg>
          <span>Apple Podcasts</span>
        </a>
        <a class="podcast-link youtube" href="https://www.youtube.com/@tmda-podcast" target="_blank" rel="noopener" aria-label="TMDA auf YouTube">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M23.5 6.5c-.3-1-1-1.8-2-2C19.5 4 12 4 12 4s-7.5 0-9.5.5c-1 .3-1.8 1-2 2C0 8.5 0 12 0 12s0 3.5.5 5.5c.3 1 1 1.8 2 2C4.5 20 12 20 12 20s7.5 0 9.5-.5c1-.3 1.8-1 2-2 .5-2 .5-5.5.5-5.5s0-3.5-.5-5.5zM9.5 15.5v-7L16 12l-6.5 3.5z"/></svg>
          <span>YouTube</span>
        </a>
        <a class="podcast-link generic" href="https://www.podcast.de/podcast/3624277/teenager-mit-deutschem-akzent-tmda" target="_blank" rel="noopener" aria-label="TMDA auf podcast.de">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12a10 10 0 1 0 10-10"/><path d="M5.6 12a6.4 6.4 0 1 0 6.4-6.4"/><circle cx="12" cy="12" r="2.4" fill="currentColor"/></svg>
          <span>podcast.de</span>
        </a>
      </div>
    </section>

  `;

  // Scroll-Reveal aktivieren + Latest-Video asynchron nachladen.
  revealInit(app);
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
    if (!data.ok || !data.videos?.length) {
      // Kein Video verfügbar → Platzhalter bleibt, kein toter Embed.
      embed.textContent = 'Aktuelle Folge auf YouTube ansehen ↗';
      return;
    }
    const v = data.videos[0];
    embed.innerHTML = `<iframe loading="lazy"
      src="https://www.youtube-nocookie.com/embed/${esc(v.id)}?rel=0"
      title="${esc(v.title)}"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen></iframe>`;
    meta.textContent = `${v.title}${v.published ? ' · ' + fmtDate(v.published.slice(0, 10)) : ''}`;
    section.classList.remove('is-loading'); // Schwarzer Embed-Hintergrund statt Lade-Tönung
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
let _ytCache = null;
async function getYouTubeVideos() {
  if (_ytCache) return _ytCache;
  try {
    const r = await fetch('/api/latest-video');
    const data = await r.json();
    _ytCache = data.ok ? (data.videos || []) : [];
  } catch { _ytCache = []; }
  return _ytCache;
}
function findVideoForFolge(videos, folge) {
  // Match "#NN" oder " NN " im Titel, TMDA-Titel sind Format "TMDA #47 ..."
  const num = String(folge);
  for (const v of videos) {
    const t = v.title || '';
    if (new RegExp(`(?:^|[^0-9])#?\\s*${num}(?![0-9])`).test(t)) return v;
  }
  return null;
}

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

  // Prev/Next folge (sortiert nach folge-Nummer)
  const sortedEps = [...(eps.items || [])].sort((a, b) => (a.folge || 0) - (b.folge || 0));
  const idx = sortedEps.findIndex((e) => e.folge === folge);
  const prevEp = idx > 0 ? sortedEps[idx - 1] : null;
  const nextEp = idx >= 0 && idx < sortedEps.length - 1 ? sortedEps[idx + 1] : null;

  const idee = (ideen.items || []).find((i) => i.folge === folge);
  const kc = (corner.items || []).find((i) => i.folge === folge);
  const gr = (ger.items || []).find((i) => i.folge === folge);
  const facts = (fact.items || []).filter((i) => i.folge === folge);
  const zitate = (zit.items || []).filter((i) => i.folge === folge);
  const erfindungen = (erf.items || []).filter((i) => i.folge === folge);

  const navHtml = (pos) => `<nav class="folge-nav folge-nav-${pos}">
    ${prevEp ? `<a class="folge-nav-btn prev" href="/folge/${prevEp.folge}"><span class="dir">← Vorherige</span><span class="title">#${prevEp.folge} · ${esc(prevEp.titel || '')}</span></a>` : '<span></span>'}
    ${nextEp ? `<a class="folge-nav-btn next" href="/folge/${nextEp.folge}"><span class="dir">Nächste →</span><span class="title">#${nextEp.folge} · ${esc(nextEp.titel || '')}</span></a>` : '<span></span>'}
  </nav>`;

  app.innerHTML = `
    <p style="margin-bottom:16px"><a href="/folgen">← Folgen-Archiv</a></p>
    ${navHtml('top')}
    <header class="folge-head">
      <span class="tag tag-accent">Folge #${ep.folge}</span>
      <h1 class="folge-title">${esc(ep.titel)}</h1>
      <div class="meta">${fmtDate(ep.datum)} ${ep.laufzeit ? '· ' + esc(ep.laufzeit) : ''}</div>
      <p class="folge-desc">${esc(ep.kurzbeschreibung || '')}</p>
      <div class="folge-themen">${(ep.themen || []).map((t) => `<span class="tag tag-theme">${esc(t)}</span>`).join('')}</div>
    </header>
    <section class="detail-block" id="folgeVideoSlot" hidden>
      <h2>🎬 Auf YouTube</h2>
      <div class="yt-embed" id="folgeVideoEmbed"></div>
    </section>
  `;

  // YouTube-Embed asynchron suchen
  (async () => {
    const videos = await getYouTubeVideos();
    const v = findVideoForFolge(videos, folge);
    if (!v) return;
    const slot = document.getElementById('folgeVideoSlot');
    const embed = document.getElementById('folgeVideoEmbed');
    if (!slot || !embed) return;
    embed.innerHTML = `<iframe loading="lazy"
      src="https://www.youtube-nocookie.com/embed/${esc(v.id)}?rel=0"
      title="${esc(v.title)}"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen></iframe>`;
    slot.hidden = false;
  })();

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
    const zHtml = zitate.map((z) => `<blockquote class="quote">„${esc(z.text)}"${z.kontext ? `<cite>${esc(z.kontext)}</cite>` : ''}</blockquote>`).join('');
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

  // Bottom prev/next nav
  app.appendChild(el(navHtml('bottom')));
}

// ---------- Startup-Ideen ----------
async function renderStartupIdeen() {
  const [data, pages] = await Promise.all([
    getData('startup-ideen'),
    fetch('/data/startup-pages.json').then((r) => r.json()).catch(() => ({ items: [] })),
  ]);
  const items = data.items || [];
  const pageMap = new Map();
  for (const p of pages.items || []) {
    const key = `${p.folge}|${(p.ideeMatch || '').toLowerCase()}`;
    pageMap.set(key, p);
  }
  function findPage(item) {
    if (!item) return null;
    const idee = (item.idee || '').toLowerCase();
    for (const p of pages.items || []) {
      if (p.folge === item.folge && idee.includes((p.ideeMatch || '').toLowerCase())) return p;
    }
    return null;
  }

  // Sort buttons
  const sortBy = new URLSearchParams(location.search).get('sort') || 'folge';
  let sorted = [...items];
  if (sortBy === 'punkte') sorted.sort((a, b) => (b.punkte ?? -1) - (a.punkte ?? -1));
  else sorted.sort((a, b) => (b.folge || 0) - (a.folge || 0));

  app.innerHTML = `
    <h1 class="section-title">💡 Startup-Idee der Woche</h1>
    <p class="section-sub">Fynns Brainstorms, bewertet von Nisse auf einer Skala bis ${items[0]?.max_punkte || 24}. ${items.length} Ideen. Klick auf eine fett markierte Idee öffnet die fiktive Produkt-Seite.</p>
    <div class="filter-bar">
      <a class="${sortBy === 'folge' ? 'active' : ''}" href="/startup-ideen?sort=folge">Nach Folge</a>
      <a class="${sortBy === 'punkte' ? 'active' : ''}" href="/startup-ideen?sort=punkte">Nach Punkten</a>
    </div>
    ${items.length === 0 ? emptyState('Startup-Ideen') : ''}
  `;
  if (items.length === 0) return;

  const tbl = el(`<div class="table-wrap ideen-table"><table>
    <thead><tr><th>Folge</th><th>Idee</th><th>Beschreibung</th><th>Punkte</th></tr></thead>
    <tbody></tbody></table></div>`);
  const tb = tbl.querySelector('tbody');
  for (const i of sorted) {
    const max = i.max_punkte || 24;
    const page = findPage(i);
    const ideeCell = page
      ? `<a class="startup-link" href="/startup/${esc(page.slug)}"><strong>${esc(i.idee)}</strong> <span class="startup-link-arrow">↗</span></a>`
      : `<strong>${esc(i.idee)}</strong>`;
    tb.appendChild(el(`<tr>
      <td><a href="/folge/${i.folge}">#${i.folge}</a></td>
      <td>${ideeCell}</td>
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
    <p class="section-sub">Alle Beiträge aus Kalles Corner, die kurze Anekdote pro Folge.</p>
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
    <p class="section-sub">Absurde Produktideen, manchmal mehrere pro Folge.</p>
    ${items.length === 0 ? emptyState('Erfindungen') : ''}
  `;
  if (items.length === 0) return;

  const grid = el('<div class="card-grid"></div>');
  for (const e of withErfindungSlugs(items)) {
    grid.appendChild(el(`<a class="card" href="/erfindung/${esc(e.slug)}">
      <span class="tag tag-accent">Folge #${e.folge}</span>
      <h3>${esc(e.name)} <span class="startup-link-arrow">↗</span></h3>
      <div class="desc">${esc(e.beschreibung)}</div>
    </a>`));
  }
  app.appendChild(grid);
}

// ---------- Erfindung Detail ----------
async function renderErfindungDetail(slug) {
  const [erf, eps] = await Promise.all([getData('erfindungen'), getData('episodes')]);
  const items = withErfindungSlugs(erf.items || []);
  const idx = items.findIndex((e) => e.slug === slug);
  if (idx < 0) {
    app.innerHTML = `<p style="margin-bottom:16px"><a href="/erfindungen">← Alle Erfindungen</a></p>
      <h1 class="section-title">🔧 Erfindung nicht gefunden</h1>
      <p class="section-sub">Diese Erfindung gibt es (noch) nicht im Wiki.</p>`;
    return;
  }
  const e = items[idx];
  const ep = (eps.items || []).find((x) => x.folge === e.folge);
  const prev = idx > 0 ? items[idx - 1] : null;
  const next = idx < items.length - 1 ? items[idx + 1] : null;
  const related = items.filter((x) => x.folge === e.folge && x.slug !== e.slug);

  app.innerHTML = `
    <p style="margin-bottom:16px"><a href="/erfindungen">← Erfindungen</a></p>
    <header class="folge-head">
      <span class="tag tag-accent">🔧 Erfindung · Folge #${e.folge}</span>
      <h1 class="folge-title">${esc(e.name)}</h1>
      ${ep ? `<div class="meta">${esc(ep.titel || '')}${ep.datum ? ' · ' + fmtDate(ep.datum) : ''}</div>` : ''}
    </header>
    <section class="detail-block">
      <div class="card card-highlight">
        <div class="desc" style="font-size:1.05rem">${esc(e.beschreibung)}</div>
      </div>
    </section>
    <section class="detail-block">
      <div class="hero-cta">
        <a class="btn" href="/folge/${e.folge}">Zur Folge #${e.folge} →</a>
        <a class="btn" href="/transcripts/folge-${String(e.folge).padStart(2, '0')}.txt" target="_blank" rel="noopener">Transkript öffnen ↗</a>
      </div>
    </section>
    ${related.length ? `<section class="detail-block">
      <h2>🔧 Mehr aus Folge #${e.folge}</h2>
      <div class="card-grid">${related.map((r) => `<a class="card" href="/erfindung/${esc(r.slug)}">
        <h3>${esc(r.name)}</h3>
        <div class="desc">${esc(r.beschreibung)}</div>
      </a>`).join('')}</div>
    </section>` : ''}
    <nav class="folge-nav folge-nav-bottom">
      ${prev ? `<a class="folge-nav-btn prev" href="/erfindung/${esc(prev.slug)}"><span class="dir">← Vorherige</span><span class="title">${esc(prev.name)}</span></a>` : '<span></span>'}
      ${next ? `<a class="folge-nav-btn next" href="/erfindung/${esc(next.slug)}"><span class="dir">Nächste →</span><span class="title">${esc(next.name)}</span></a>` : '<span></span>'}
    </nav>
  `;
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
      <cite><a href="/folge/${z.folge}">Folge #${z.folge}</a>${z.kontext ? ` · ${esc(z.kontext)}` : ''}</cite>
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
    <p class="section-sub">Wer alles im Podcast erwähnt wurde, sortiert nach Häufigkeit. ${items.length}/${all.length} angezeigt.</p>
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
    <p class="section-sub">Wer hinter dem Mikrofon sitzt, und wer den Mythos „Kalles Corner" trägt.</p>
    ${items.length === 0 ? emptyState('Hosts') : ''}
  `;
  if (items.length === 0) return;

  const wrap = el('<div class="host-grid"></div>');
  for (const h of items) {
    const initials = (h.name || '?').split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
    const projekte = (h.projekte || []).map((p) => `
      <li>
        <a href="${esc(p.url)}" target="_blank" rel="noopener"><strong>${esc(p.name)}</strong></a>
        ${p.beschreibung ? `, <span class="meta">${esc(p.beschreibung)}</span>` : ''}
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
      <p>Aktuell sind alle Transkripte hier <strong>YouTube-Auto-Captions</strong> ohne Sprecher-Labels. Das macht das Wiki, den Chat und die Suche weniger präzise, und Rubriken wie „Kalles Corner" lassen sich nur über Heuristiken erkennen.</p>
      <p>Wir suchen Menschen, die helfen können, die Folgen mit eindeutiger Sprecher-Zuordnung (<strong>Fynn / Nisse / Kalle / Gast</strong>) zu transkribieren, entweder per Tool (z.B. WhisperX, pyannote, AssemblyAI mit Speaker Diarization) oder von Hand.</p>
      <h3 style="margin-top:20px">Was wir brauchen</h3>
      <ul class="host-list" style="margin-bottom:16px">
        <li>Klares Sprecher-Label pro Zeile (z.B. <code>Fynn:</code>, <code>Nisse:</code>)</li>
        <li>Format Markdown oder Plain Text, Hauptsache lesbar</li>
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

// ---------- 📊 Statistik-Dashboard ----------
async function renderStats() {
  const [eps, ideen, gaeste, geru, corner] = await Promise.all([
    getData('episodes'), getData('startup-ideen'), getData('gaeste'),
    getData('geruechte'), getData('kalles-corner'),
  ]);
  const epItems = eps.items || [];
  const ideenItems = (ideen.items || []).filter((i) => i.punkte != null);

  // Punkte über Folgen
  const byFolge = new Map();
  for (const i of ideenItems) byFolge.set(i.folge, i.punkte);
  const sortedFolgen = [...new Set([...epItems.map((e) => e.folge), ...ideenItems.map((i) => i.folge)])].sort((a, b) => a - b);
  const maxPkt = 24;

  // Punkte-Histogramm
  const histo = new Array(25).fill(0);
  for (const i of ideenItems) if (i.punkte >= 0 && i.punkte <= 24) histo[i.punkte]++;
  const maxHistoBar = Math.max(...histo, 1);

  // Top-Personen (Top 12)
  const topPersonen = (gaeste.items || []).slice(0, 12);
  const maxPersonen = Math.max(...topPersonen.map((p) => p.folgen.length), 1);

  // Laufzeit-Average
  const seconds = epItems.map((e) => {
    const m = (e.laufzeit || '').match(/(\d+):(\d{2}):(\d{2})|(\d+):(\d{2})/);
    if (!m) return 0;
    return m[1] ? +m[1] * 3600 + +m[2] * 60 + +m[3] : +m[4] * 60 + +m[5];
  }).filter((s) => s > 0);
  const avgSec = seconds.length ? Math.round(seconds.reduce((a, b) => a + b) / seconds.length) : 0;
  const totalSec = seconds.reduce((a, b) => a + b, 0);

  // Rubriken-Heatmap
  const cornerFolgen = new Set((corner.items || []).map((c) => c.folge));
  const geruchtFolgen = new Set((geru.items || []).map((g) => g.folge));

  app.innerHTML = `
    <h1 class="section-title">📊 Statistik-Dashboard</h1>
    <p class="section-sub">Daten über alle ${epItems.length} Folgen. Alles aus den Transkripten extrahiert.</p>

    <section class="stat-block">
      <h2>💡 Startup-Idee der Woche · Punkte über die Folgen</h2>
      <p class="meta">Skala 0–24. Punkte von Nisse pro Folge.</p>
      <div class="line-chart" id="lineChart"></div>
    </section>

    <section class="stat-block">
      <h2>📈 Punkte-Verteilung</h2>
      <p class="meta">Wie oft welcher Score vergeben wurde.</p>
      <div class="histo">
        ${histo.map((count, i) => `
          <div class="histo-col" title="${count} Ideen mit ${i}/24 Punkten">
            <div class="histo-bar" style="height:${(count / maxHistoBar) * 180}px">${count > 0 ? `<span>${count}</span>` : ''}</div>
            <div class="histo-label">${i}</div>
          </div>`).join('')}
      </div>
    </section>

    <section class="stat-block">
      <h2>👥 Top 12 erwähnte Personen</h2>
      <div class="bar-list">
        ${topPersonen.map((p) => `
          <div class="bar-row">
            <span class="bar-name">${esc(p.name)}</span>
            <div class="bar-track"><div class="bar-fill" style="width:${(p.folgen.length / maxPersonen) * 100}%"></div></div>
            <span class="bar-val">${p.folgen.length}×</span>
          </div>`).join('')}
      </div>
    </section>

    <section class="stat-block">
      <h2>🎙️ Laufzeit</h2>
      <div class="kpi-row">
        <div class="kpi"><div class="kpi-num">${Math.floor(avgSec / 60)} min</div><div class="kpi-lab">Durchschnitt</div></div>
        <div class="kpi"><div class="kpi-num">${Math.floor(totalSec / 3600)} h</div><div class="kpi-lab">Insgesamt</div></div>
        <div class="kpi"><div class="kpi-num">${epItems.length}</div><div class="kpi-lab">Folgen</div></div>
        <div class="kpi"><div class="kpi-num">${Math.floor(totalSec / 60 / epItems.length)} min</div><div class="kpi-lab">Avg in min</div></div>
      </div>
    </section>

    <section class="stat-block">
      <h2>🔍 Rubriken-Heatmap</h2>
      <p class="meta">Welche Folge hatte welche Rubrik?</p>
      <div class="heatmap">
        <div class="heat-row"><span class="heat-label">Startup-Idee</span>${sortedFolgen.map((f) => `<div class="heat-cell ${byFolge.has(f) ? 'on' : ''}" title="Folge ${f}"></div>`).join('')}</div>
        <div class="heat-row"><span class="heat-label">Kalles Corner</span>${sortedFolgen.map((f) => `<div class="heat-cell ${cornerFolgen.has(f) ? 'on kalle' : ''}" title="Folge ${f}"></div>`).join('')}</div>
        <div class="heat-row"><span class="heat-label">Gerücht der Woche</span>${sortedFolgen.map((f) => `<div class="heat-cell ${geruchtFolgen.has(f) ? 'on geru' : ''}" title="Folge ${f}"></div>`).join('')}</div>
      </div>
    </section>
  `;

  // Line Chart SVG mit Punkten
  const chart = document.getElementById('lineChart');
  const w = 800, h = 240, pad = 32;
  const xStep = (w - pad * 2) / Math.max(sortedFolgen.length - 1, 1);
  const yScale = (v) => h - pad - (v / maxPkt) * (h - pad * 2);
  const points = sortedFolgen.map((f, i) => ({ x: pad + i * xStep, y: byFolge.has(f) ? yScale(byFolge.get(f)) : null, folge: f, pkt: byFolge.get(f) }));
  const line = points.filter((p) => p.y !== null).map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  chart.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" width="100%" height="240" aria-label="Punkte-Trend">
      <g stroke="var(--border)" stroke-width="1">
        ${[0, 6, 12, 18, 24].map((v) => `<line x1="${pad}" y1="${yScale(v)}" x2="${w - pad}" y2="${yScale(v)}"/><text x="6" y="${yScale(v) + 4}" font-size="10" fill="var(--fg-muted)">${v}</text>`).join('')}
      </g>
      <path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      ${points.filter((p) => p.y !== null).map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="var(--accent)"><title>Folge ${p.folge}: ${p.pkt}/24</title></circle>`).join('')}
    </svg>
  `;
}

// ---------- 🧠 TMDA-Quiz ----------
async function renderQuiz() {
  const [ideen, zit, eps, gaeste] = await Promise.all([
    getData('startup-ideen'), getData('zitate'), getData('episodes'), getData('gaeste'),
  ]);
  app.innerHTML = `
    <h1 class="section-title">🧠 TMDA-Quiz</h1>
    <p class="section-sub">Wie gut kennst du den Podcast? 10 Fragen, 4 Optionen pro Frage. Score und Highscore werden lokal gespeichert.</p>
    <div id="quizArea"></div>
  `;
  const area = document.getElementById('quizArea');
  const ideenP = (ideen.items || []).filter((i) => i.punkte != null);
  const zitateP = (zit.items || []).filter((z) => z.text && z.text.length > 20 && z.text.length < 200);
  const epsP = eps.items || [];

  const HIGHSCORE_KEY = 'tmda-quiz-highscore';
  const highscore = Number(localStorage.getItem(HIGHSCORE_KEY) || '0');
  let questions = generateQuestions(10);
  let current = 0;
  let score = 0;
  let answered = false;

  function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }
  function pickN(arr, n) { return shuffle(arr).slice(0, n); }
  function generateQuestions(n) {
    const out = [];
    const types = ['quote', 'punkte', 'folge-titel'];
    while (out.length < n) {
      const t = types[Math.floor(Math.random() * types.length)];
      let q = null;
      if (t === 'quote' && zitateP.length >= 4) {
        const correct = zitateP[Math.floor(Math.random() * zitateP.length)];
        const wrongEps = shuffle(epsP.filter((e) => e.folge !== correct.folge)).slice(0, 3);
        if (wrongEps.length < 3) continue;
        q = {
          q: `Aus welcher Folge stammt das Zitat: „${correct.text}"?`,
          options: shuffle([{ label: `#${correct.folge} · ${(epsP.find((e) => e.folge === correct.folge) || {}).titel || ''}`, correct: true },
            ...wrongEps.map((e) => ({ label: `#${e.folge} · ${e.titel || ''}`, correct: false }))]),
        };
      } else if (t === 'punkte' && ideenP.length >= 4) {
        const correct = ideenP[Math.floor(Math.random() * ideenP.length)];
        const wrongPunkte = shuffle([1, 6, 9, 12, 14, 16, 18, 20, 22, 24].filter((p) => p !== correct.punkte)).slice(0, 3);
        q = {
          q: `Wie viele Punkte bekam „${correct.idee}" (Folge #${correct.folge})?`,
          options: shuffle([{ label: `${correct.punkte}/24`, correct: true },
            ...wrongPunkte.map((p) => ({ label: `${p}/24`, correct: false }))]),
        };
      } else if (t === 'folge-titel' && epsP.length >= 4) {
        const correct = epsP[Math.floor(Math.random() * epsP.length)];
        const wrongs = shuffle(epsP.filter((e) => e.folge !== correct.folge)).slice(0, 3);
        if (wrongs.length < 3) continue;
        q = {
          q: `Welche Folgennummer hat die Episode „${correct.titel}"?`,
          options: shuffle([{ label: `Folge #${correct.folge}`, correct: true },
            ...wrongs.map((e) => ({ label: `Folge #${e.folge}`, correct: false }))]),
        };
      }
      if (q) out.push(q);
    }
    return out;
  }

  function renderQuestion() {
    if (current >= questions.length) {
      const newHigh = Math.max(highscore, score);
      if (score > highscore) localStorage.setItem(HIGHSCORE_KEY, String(score));
      area.innerHTML = `
        <div class="quiz-result">
          <div class="quiz-score">${score}/${questions.length}</div>
          <p class="meta">${score === questions.length ? '🏆 Perfekt! Du bist Talahon-Level.' : score >= 7 ? '🛸 Stark!' : score >= 4 ? '👍 Solide.' : '🐐 Übung macht den Fanta Gnu.'}</p>
          <p>Highscore: <strong>${newHigh}/10</strong></p>
          <button class="btn btn-primary" id="quizRestart">Nochmal spielen</button>
        </div>
      `;
      document.getElementById('quizRestart').addEventListener('click', () => {
        questions = generateQuestions(10); current = 0; score = 0; answered = false; renderQuestion();
      });
      return;
    }
    const q = questions[current];
    answered = false;
    area.innerHTML = `
      <div class="quiz-progress">Frage ${current + 1} von ${questions.length} · Score ${score}</div>
      <div class="quiz-card">
        <h2 class="quiz-q">${esc(q.q)}</h2>
        <div class="quiz-options">
          ${q.options.map((o, i) => `<button class="quiz-opt" data-i="${i}" data-correct="${o.correct}">${esc(o.label)}</button>`).join('')}
        </div>
      </div>
    `;
    area.querySelectorAll('.quiz-opt').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        const correct = btn.dataset.correct === 'true';
        if (correct) { btn.classList.add('correct'); score++; }
        else btn.classList.add('wrong');
        area.querySelectorAll('.quiz-opt').forEach((b) => {
          if (b.dataset.correct === 'true') b.classList.add('correct');
          b.disabled = true;
        });
        setTimeout(() => { current++; renderQuestion(); }, 1200);
      });
    });
  }
  renderQuestion();
}

// ---------- 🎲 TMDA-Bingo ----------
async function renderBingo() {
  const BINGO_POOL = [
    'Kalles Corner', '„Crazy crazy, gut gut"', 'Fynn redet über Steuern', 'Nisse über Therapie',
    'PLOP™', 'Trockener Flutschi', 'Talahon', 'Fanta Gnu', '24-Punkte-Idee',
    'Maya-Kalender', 'Bushido erwähnt', 'Elon Musk erwähnt', 'Til Lindemann erwähnt',
    'Kliemannsland-Story', 'Fynn überredet Nisse', 'Nisse sagt „du musst nicht…"',
    'Mucki Pinzner', 'Tomorrowland', 'Dubai-Reference', 'Hartz-4-Raupe',
    'Iris-Werbung', 'windradhologramm.de', 'Steuerquartett', 'oderso.cool',
    'Werbeblock', 'Folge geht > 1 Stunde', 'Fynn redet über Hunde', 'Goldener Retriever',
    'Casino-Story', 'Heimwerker-Story', 'Pizza-Reference', 'Carsten Maschmeyer',
    'Frank Thelen', 'Wikipedia gegoogelt', 'Nisse lacht 5 Sekunden lang',
    'Fynn erwähnt Tom Illbruck', 'Restaurant in Hamburg', 'Spotify-Daten',
  ];
  app.innerHTML = `
    <h1 class="section-title">🎲 TMDA-Bingo</h1>
    <p class="section-sub">Für die nächste Folge. Tap die Begriffe an, wenn du sie hörst. Bingo bei Reihe, Spalte oder Diagonale.</p>
    <div class="bingo-controls">
      <button class="btn btn-primary" id="bingoNew">Neue Karte ziehen</button>
      <span class="meta" id="bingoStatus">Drück Tap auf Begriffe, die du hörst.</span>
    </div>
    <div class="bingo-grid" id="bingoGrid"></div>
  `;
  const grid = document.getElementById('bingoGrid');
  const status = document.getElementById('bingoStatus');
  let cells = [];

  function newCard() {
    const picks = [...BINGO_POOL].sort(() => Math.random() - 0.5).slice(0, 25);
    picks[12] = '🎙️ FREE'; // mittlere Zelle ist free
    cells = picks.map((text, i) => ({ text, marked: i === 12 }));
    render();
  }
  function checkBingo() {
    const m = cells.map((c) => c.marked);
    const lines = [];
    for (let r = 0; r < 5; r++) lines.push([0, 1, 2, 3, 4].map((c) => r * 5 + c));
    for (let c = 0; c < 5; c++) lines.push([0, 1, 2, 3, 4].map((r) => r * 5 + c));
    lines.push([0, 6, 12, 18, 24]);
    lines.push([4, 8, 12, 16, 20]);
    const winners = new Set();
    for (const line of lines) if (line.every((i) => m[i])) line.forEach((i) => winners.add(i));
    return winners;
  }
  function render() {
    const winners = checkBingo();
    grid.innerHTML = cells.map((c, i) => `
      <button class="bingo-cell ${c.marked ? 'marked' : ''} ${winners.has(i) ? 'winning' : ''}" data-i="${i}">${esc(c.text)}</button>
    `).join('');
    grid.querySelectorAll('.bingo-cell').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = +btn.dataset.i;
        cells[i].marked = !cells[i].marked;
        render();
      });
    });
    status.textContent = winners.size ? `🎉 BINGO! ${winners.size} Felder in einer Reihe.` : `${cells.filter((c) => c.marked).length} / 25 markiert.`;
  }
  document.getElementById('bingoNew').addEventListener('click', newCard);
  newCard();
}

// ---------- ⏳ Folgen-Timeline ----------
async function renderTimeline() {
  const [eps, ideen, corner] = await Promise.all([
    getData('episodes'), getData('startup-ideen'), getData('kalles-corner'),
  ]);
  const epItems = [...(eps.items || [])].sort((a, b) => (a.folge || 0) - (b.folge || 0));
  const ideenMap = new Map((ideen.items || []).map((i) => [i.folge, i]));
  const cornerMap = new Map((corner.items || []).map((c) => [c.folge, c]));

  app.innerHTML = `
    <h1 class="section-title">⏳ Folgen-Timeline</h1>
    <p class="section-sub">Chronik aller ${epItems.length} Folgen. Mit Punkten, Kalles-Corner-Markern und Highlights.</p>
    <div class="filter-bar">
      <a class="active" data-f="all" href="#">Alle</a>
      <a data-f="top" href="#">Nur Top-Punkte (≥ 20)</a>
      <a data-f="kalle" href="#">Mit Kalles Corner</a>
    </div>
    <div class="timeline" id="timeline"></div>
  `;
  const tl = document.getElementById('timeline');
  let filter = 'all';
  function renderItems() {
    const items = epItems.filter((ep) => {
      if (filter === 'all') return true;
      if (filter === 'top') return (ideenMap.get(ep.folge)?.punkte || 0) >= 20;
      if (filter === 'kalle') return cornerMap.has(ep.folge);
      return true;
    });
    tl.innerHTML = items.map((ep, idx) => {
      const idee = ideenMap.get(ep.folge);
      const kc = cornerMap.get(ep.folge);
      const side = idx % 2 === 0 ? 'left' : 'right';
      return `
        <a class="tl-item tl-${side}" href="/folge/${ep.folge}">
          <span class="tl-dot ${idee && idee.punkte >= 20 ? 'gold' : ''}"></span>
          <div class="tl-card">
            <div class="tl-folge">Folge #${ep.folge}${ep.datum ? ' · ' + fmtDate(ep.datum) : ''}</div>
            <div class="tl-title">${esc(ep.titel || '')}</div>
            <div class="tl-meta">
              ${idee ? `<span class="tl-tag tag-accent">💡 ${idee.punkte ?? '?'}/24 · ${esc((idee.idee || '').slice(0, 40))}</span>` : ''}
              ${kc ? `<span class="tl-tag tag-kalle">🪑 Kalle</span>` : ''}
            </div>
          </div>
        </a>
      `;
    }).join('') || `<div class="empty">Keine Folgen mit diesem Filter.</div>`;
  }
  app.querySelectorAll('.filter-bar a').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      filter = a.dataset.f;
      app.querySelectorAll('.filter-bar a').forEach((x) => x.classList.toggle('active', x === a));
      renderItems();
    });
  });
  renderItems();
}

// ---------- Chat (refactored: shared zwischen Seite und Modal) ----------
const DONATION_THRESHOLD = 3;
// Counter + shown-Flag beide pro Session, Donation triggert dann
// zuverlässig bei der 3. Frage einer frischen Browser-Session
const QUESTION_COUNT_KEY = 'tmda-chat-questions-session';
const DONATION_SHOWN_KEY = 'tmda-donate-shown-session';

// Easter-Egg-Hints, kommen nach jeder AI-Antwort.
// Wichtig: Hint sagt klar, dass es OUTSIDE der Chat-Box getriggert wird.
const EASTER_HINTS = [
  '🥚 Easter Egg (NICHT hier im Chat, auf der Wiki-Seite ausprobieren): Klick das TMDA-Logo oben links zweimal schnell.',
  '🥚 Easter Egg: Schließ den Chat, dann tipp auf der Wiki-Seite das Wort kalle (irgendwo, ohne Eingabefeld zu fokussieren).',
  '🥚 Easter Egg: Auf der Wiki-Seite (nicht im Chat) das Wort papst tippen, siehst du was?',
  '🥚 Easter Egg: Außerhalb des Chats das Wort fanta auf der Tastatur tippen.',
  '🥚 Easter Egg: Drück auf der Wiki-Seite den Konami-Code: ↑ ↑ ↓ ↓ ← → ← → B A',
  '🥚 Easter Egg: Tipp auf der Seite (Chat zu) das Wort flutschi, die Seite reagiert.',
  '🥚 Easter Egg: Scroll ans Footer-Ende und mach Triple-Click auf das fette „TMDA Wiki".',
  '🥚 Easter Egg: Öffne mal die Browser-Konsole (F12 oder Cmd+Opt+J), dort wartet was.',
  '🥚 Easter Egg: Tipp auf der Wiki-Seite das Wort crazy (Pele-Beckenbauer-Reference).',
  '🥚 Easter Egg: Tipp das Wort thelen außerhalb des Chats, pass auf, was vom Himmel fällt.',
  '🥚 Easter Egg: Tipp das Wort tabletten oder matrjoschka auf der Seite.',
  '🥚 Easter Egg: Tipp das Wort marsalek auf der Seite, kurz schauen, weg.',
  '🥚 Easter Egg: Tipp das Wort hartz4, und beweg dann die Maus.',
  '🥚 Easter Egg: Tipp das Wort iris auf der Seite, schließ kurz die Augen nicht.',
  '🥚 Easter Egg: Tipp das Wort windrad, Hologramm-Mode.',
  '🥚 Easter Egg: Tipp das Wort bosse auf der Seite (Folge 42).',
  '🥚 Easter Egg: Tipp das Wort lindemann, Krisen-PR-Quote.',
  '🥚 Easter Egg: Tipp das Wort aaron, Folge 3.',
  '🥚 Easter Egg: Tipp das Wort feierabend auf der Seite (Chat zu), Folge 51.',
  '🥚 Easter Egg: 3-mal hintereinander auf eine Score-Badge klicken (z.B. „22/24").',
  '🥚 Easter Egg: 5-mal eine Stat-Zahl auf der Startseite klicken (z.B. „45 Folgen").',
  '🥚 Easter Egg: Beweg den Mauszeiger nacheinander in alle 4 Bildschirmecken.',
  '🥚 Easter Egg: Halte den Chat-Button (unten rechts) länger als 1,5 Sekunden gedrückt.',
  '🥚 Easter Egg: Drück die ? -Taste auf der Seite (Chat geschlossen), Cheatsheet aller Eggs.',
  '🥚 Easter Egg: Wechsel kurz den Tab, der Titel oben verrät dir was.',
  '🥚 Easter Egg: Schau Dienstags oder zwischen 3 und 7 Uhr morgens vorbei.',
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
      <h3>Hey, kleines Wort in eigener Sache 🙏</h3>
      <p>Das hier ist ein <strong>Hobby-Fan-Projekt</strong>, kein offizielles TMDA-Angebot. Jede Chat-Anfrage kostet ein paar Cent Cloudflare-AI-Gebühren, auf Dauer summiert sich das.</p>
      <p>Wenn dir das Wiki Spaß macht, freu ich mich über einen kleinen Beitrag:</p>
      <a class="donate-btn" href="https://www.paypal.com/paypalme/gigalogi" target="_blank" rel="noopener">
        <strong>PayPal:</strong> paypal@koljasagorski.de
      </a>
      <p class="meta">Danke! Frag ruhig weiter, die Antworten kommen wie gewohnt.</p>
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
        // Token war ungültig/spent, frisches Token holen und retryen
        turnstileToken = null;
        pending.textContent = 'Kurz durch das Captcha, danach geht\'s weiter.';
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
    <p class="section-sub">Frag das Wiki, läuft auf Cloudflare Workers AI (Llama 3.1) mit Volltext-Kontext aus allen Folgen.</p>
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

// ---------- Globale Suche (Cmd+K / Ctrl+K) ----------
let searchIndex = null;
let searchOverlay = null;
let searchInput = null;
let searchResults = null;
let searchSelectedIdx = 0;

async function buildSearchIndex() {
  if (searchIndex) return searchIndex;
  const [eps, ideen, corner, ger, glo, erf, zit, hosts] = await Promise.all([
    getData('episodes'), getData('startup-ideen'), getData('kalles-corner'),
    getData('geruechte'), getData('glossar'), getData('erfindungen'),
    getData('zitate'), getData('hosts'),
  ]);
  const idx = [];
  for (const ep of eps.items || []) {
    idx.push({
      cat: 'Folge', icon: '📅',
      title: `#${ep.folge} · ${ep.titel || ''}`,
      sub: ep.kurzbeschreibung || (ep.themen || []).join(' · '),
      blob: `${ep.titel || ''} ${ep.kurzbeschreibung || ''} ${(ep.themen || []).join(' ')}`.toLowerCase(),
      href: `/folge/${ep.folge}`,
    });
  }
  for (const i of ideen.items || []) {
    idx.push({
      cat: 'Startup', icon: '💡',
      title: `#${i.folge} · ${i.idee || ''}`,
      sub: i.beschreibung || '',
      blob: `${i.idee || ''} ${i.beschreibung || ''}`.toLowerCase(),
      href: `/folge/${i.folge}`,
    });
  }
  for (const k of corner.items || []) {
    idx.push({
      cat: 'Kalle', icon: '🪑',
      title: `#${k.folge} · ${k.titel || 'Kalles Corner'}`,
      sub: k.inhalt || '',
      blob: `${k.titel || ''} ${k.inhalt || ''}`.toLowerCase(),
      href: `/folge/${k.folge}`,
    });
  }
  for (const g of ger.items || []) {
    idx.push({
      cat: 'Gerücht', icon: '🤫',
      title: `#${g.folge} · ${g.ueber || 'Gerücht'}`,
      sub: g.inhalt || '',
      blob: `${g.ueber || ''} ${g.inhalt || ''}`.toLowerCase(),
      href: `/folge/${g.folge}`,
    });
  }
  for (const g of glo.items || []) {
    idx.push({
      cat: 'Glossar', icon: '📖',
      title: g.begriff || '',
      sub: g.bedeutung || '',
      blob: `${g.begriff || ''} ${g.bedeutung || ''}`.toLowerCase(),
      href: g.folge ? `/folge/${g.folge}` : '/glossar',
    });
  }
  for (const e of erf.items || []) {
    idx.push({
      cat: 'Erfindung', icon: '🔧',
      title: e.name || '',
      sub: e.beschreibung || '',
      blob: `${e.name || ''} ${e.beschreibung || ''}`.toLowerCase(),
      href: `/folge/${e.folge}`,
    });
  }
  for (const z of zit.items || []) {
    idx.push({
      cat: 'Zitat', icon: '💬',
      title: `„${z.text || ''}"`,
      sub: z.kontext || `Folge #${z.folge}`,
      blob: `${z.text || ''} ${z.kontext || ''}`.toLowerCase(),
      href: `/folge/${z.folge}`,
    });
  }
  for (const h of hosts.items || []) {
    idx.push({
      cat: 'Hosts', icon: '🎙️',
      title: h.name || '',
      sub: h.rolle || '',
      blob: `${h.name || ''} ${h.rolle || ''} ${h.bio || ''}`.toLowerCase(),
      href: '/hosts',
    });
  }
  searchIndex = idx;
  return idx;
}

function runSearch(query) {
  if (!searchIndex) return [];
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/);
  const scored = [];
  for (const item of searchIndex) {
    let score = 0;
    let matched = true;
    for (const t of terms) {
      const pos = item.blob.indexOf(t);
      if (pos === -1) { matched = false; break; }
      if (item.title.toLowerCase().indexOf(t) === 0) score += 10;
      else if (item.title.toLowerCase().includes(t)) score += 6;
      else score += 1;
      score += Math.max(0, 3 - Math.floor(pos / 30));
    }
    if (matched) scored.push({ item, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, 30).map((r) => r.item);
}

function renderSearchResults(results, query) {
  if (!results.length) {
    if (!query) {
      searchResults.innerHTML = '<div class="search-hint">Tipp ein Wort: Folgen, Startups, Zitate, Glossar, alle Rubriken auf einmal.</div>';
    } else {
      searchResults.innerHTML = `<div class="search-hint">Nichts gefunden zu „${esc(query)}".</div>`;
    }
    return;
  }
  const groups = new Map();
  for (const r of results) {
    if (!groups.has(r.cat)) groups.set(r.cat, []);
    groups.get(r.cat).push(r);
  }
  const html = [];
  let i = 0;
  for (const [cat, items] of groups) {
    html.push(`<div class="search-group-h">${esc(cat)}</div>`);
    for (const item of items) {
      const idx = i++;
      html.push(`<a class="search-result" data-idx="${idx}" href="${esc(item.href)}">
        <span class="search-icon">${item.icon}</span>
        <span class="search-text">
          <span class="search-title">${esc(item.title)}</span>
          <span class="search-sub">${esc((item.sub || '').slice(0, 140))}</span>
        </span>
      </a>`);
    }
  }
  searchResults.innerHTML = html.join('');
  searchSelectedIdx = 0;
  updateSearchSelection();
}

function updateSearchSelection() {
  const items = searchResults.querySelectorAll('.search-result');
  items.forEach((el, i) => el.classList.toggle('selected', i === searchSelectedIdx));
  const sel = items[searchSelectedIdx];
  if (sel) sel.scrollIntoView({ block: 'nearest' });
}

async function openSearch() {
  if (!searchOverlay) {
    searchOverlay = el(`<div class="search-overlay" id="searchOverlay" hidden>
      <div class="search-backdrop"></div>
      <div class="search-modal">
        <div class="search-input-wrap">
          <span class="search-prefix">🔎</span>
          <input class="search-input" type="text" placeholder="Folgen, Startups, Zitate, Glossar … (ESC schließt)" autocomplete="off"/>
          <kbd class="search-esc">ESC</kbd>
        </div>
        <div class="search-results"></div>
      </div>
    </div>`);
    document.body.appendChild(searchOverlay);
    searchInput = searchOverlay.querySelector('.search-input');
    searchResults = searchOverlay.querySelector('.search-results');
    searchOverlay.querySelector('.search-backdrop').addEventListener('click', closeSearch);
    searchInput.addEventListener('input', () => {
      renderSearchResults(runSearch(searchInput.value), searchInput.value);
    });
    searchInput.addEventListener('keydown', (e) => {
      const items = searchResults.querySelectorAll('.search-result');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (items.length) searchSelectedIdx = (searchSelectedIdx + 1) % items.length;
        updateSearchSelection();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (items.length) searchSelectedIdx = (searchSelectedIdx - 1 + items.length) % items.length;
        updateSearchSelection();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const sel = items[searchSelectedIdx];
        if (sel) sel.click();
      } else if (e.key === 'Escape') {
        closeSearch();
      }
    });
    searchResults.addEventListener('click', (e) => {
      if (e.target.closest('.search-result')) setTimeout(closeSearch, 30);
    });
  }
  searchResults.innerHTML = '<div class="search-hint">Lade Index…</div>';
  searchOverlay.hidden = false;
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => searchOverlay.classList.add('open'));
  setTimeout(() => searchInput.focus(), 60);
  await buildSearchIndex();
  renderSearchResults(runSearch(searchInput.value), searchInput.value);
}

function closeSearch() {
  if (!searchOverlay) return;
  searchOverlay.classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(() => { searchOverlay.hidden = true; }, 200);
}

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    if (searchOverlay && !searchOverlay.hidden) closeSearch();
    else openSearch();
  }
});
document.getElementById('searchTrigger')?.addEventListener('click', () => openSearch());

router();
