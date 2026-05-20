// 🥚 Easter Eggs — alle scope-isoliert, fail-silent.
//
// Übersicht:
//   Logo 2× klick                        → Starfield (Folge 47)
//   Tipp "kalle"                          → Schwensen-Quote
//   Tipp "papst"                          → Maya-2033-Countdown (Folge 1)
//   Tipp "fanta"                          → Ziegen-Regen (Folge 1)
//   Tipp "flutschi" / Konami              → Flutschi-Modus (Folge 42)
//   Tipp "crazy"                          → Pele-Beckenbauer (Folge 37)
//   Tipp "thelen"                         → Karsten ist Gemüse + 🥕-Regen
//   Tipp "tabletten" / "matrjoschka"      → Pillen-Matrjoschka (Folge 32)
//   Tipp "marsalek"                       → Wanted-Poster (Folge 31)
//   Tipp "hartz4"                         → 🐛 Cursor-Trail (Folge 26)
//   Tipp "iris"                           → Werbungs-Blitz (Folge 41)
//   Tipp "windrad"                        → Hologramm (Folge 44)
//   Tipp "bosse"                          → Album-Cover (Folge 42)
//   Tipp "lindemann"                      → Krisen-PR-Quote
//   Tipp "aaron"                          → Palmen-Regen (Folge 3)
//   6 Seiten besucht                      → Hielscher-Karte (Hotel Matze)
//   3× Klick Score-Badge                  → Konfetti
//   5× Klick Stat-Counter                 → Achievement
//   Maus in alle 4 Ecken                  → Cornerologe
//   Long-Press Chat-FAB                   → Kalle Direct Line
//   Triple-Click Footer-Titel             → Credits
//   Dienstag                              → Folgentag-Banner
//   3am–7am                               → Nacht-Toast
//   Tab unfocused                         → TMDA-Titel-Rotation
//   ?-Taste                               → Help-Overlay aller Eggs
//   Browser-Konsole                       → Branded-Greeting

(function () {
  // =============== Helpers ===============
  function toast(html, ms = 4000) {
    const t = document.createElement('div');
    t.className = 'easter-toast';
    t.innerHTML = html;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.remove(), 400);
    }, ms);
  }

  function emojiRain(emoji, count = 20) {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const g = document.createElement('div');
        g.className = 'easter-goat';
        g.style.left = Math.random() * 100 + 'vw';
        g.textContent = emoji;
        document.body.appendChild(g);
        setTimeout(() => g.remove(), 5000);
      }, i * 80);
    }
  }

  function confettiBurst(originX, originY) {
    const colors = ['#ff8a3d', '#ffd60a', '#4ade80', '#60a5fa', '#f472b6', '#ffffff'];
    for (let i = 0; i < 35; i++) {
      const c = document.createElement('span');
      c.className = 'easter-confetti';
      c.style.left = originX + 'px';
      c.style.top = originY + 'px';
      c.style.setProperty('--dx', (Math.random() - 0.5) * 500 + 'px');
      c.style.setProperty('--dy', -(Math.random() * 250 + 120) + 'px');
      c.style.background = colors[Math.floor(Math.random() * colors.length)];
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 2200);
    }
  }

  // =============== 1. Logo 2× klicken ===============
  const logo = document.querySelector('.logo');
  let logoClicks = 0;
  let logoResetTimer = null;
  logo?.addEventListener('click', () => {
    logoClicks++;
    clearTimeout(logoResetTimer);
    logoResetTimer = setTimeout(() => { logoClicks = 0; }, 800);
    if (logoClicks === 2) {
      logoClicks = 0;
      toast('🛸 <strong>Achievement unlocked:</strong> Talahons im Weltall', 5000);
      starfield();
    }
  });

  function starfield() {
    const overlay = document.createElement('div');
    overlay.className = 'easter-starfield';
    for (let i = 0; i < 60; i++) {
      const s = document.createElement('span');
      s.style.left = Math.random() * 100 + '%';
      s.style.top = Math.random() * 100 + '%';
      s.style.animationDelay = Math.random() * 2 + 's';
      s.style.animationDuration = (3 + Math.random() * 3) + 's';
      s.textContent = ['✨', '⭐', '🪐', '🛸', '👽'][Math.floor(Math.random() * 5)];
      overlay.appendChild(s);
    }
    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), 7000);
  }

  // =============== Effekte für Tipp-Trigger ===============
  function pillMatrjoschka() {
    const wrap = document.createElement('div');
    wrap.className = 'easter-matrjoschka';
    const pills = ['💊', '🟠', '🟡', '🟢', '🔵', '🟣'];
    pills.forEach((p, i) => {
      const s = document.createElement('span');
      s.style.animationDelay = (i * 0.15) + 's';
      s.style.fontSize = (3 - i * 0.35) + 'rem';
      s.textContent = p;
      wrap.appendChild(s);
    });
    document.body.appendChild(wrap);
    setTimeout(() => wrap.remove(), 4500);
    toast('💊 <strong>Tabletten-Matrjoschka</strong> (Folge 32) — Pillen in Pillen in Pillen.', 4000);
  }

  function wantedPoster() {
    const wrap = document.createElement('div');
    wrap.className = 'easter-wanted';
    wrap.innerHTML = `
      <div class="easter-wanted-inner">
        <div class="wanted-header">★ WANTED ★</div>
        <div class="wanted-photo">👤</div>
        <div class="wanted-name">JAN MARSALEK</div>
        <div class="wanted-meta">Wirecard · last seen Russia<br>blinde Waisenkinder?</div>
      </div>
    `;
    document.body.appendChild(wrap);
    setTimeout(() => wrap.classList.add('show'));
    setTimeout(() => {
      wrap.classList.remove('show');
      setTimeout(() => wrap.remove(), 400);
    }, 4500);
  }

  let trailActive = false;
  function caterpillarTrail() {
    if (trailActive) return;
    trailActive = true;
    toast('🐛 <strong>Hartz-4-Raupe-Modus</strong> (Folge 26) — folgt dir 8 Sekunden lang.', 3000);
    const move = (e) => {
      const t = document.createElement('span');
      t.className = 'easter-trail';
      t.textContent = '🐛';
      t.style.left = e.clientX + 'px';
      t.style.top = e.clientY + 'px';
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 1200);
    };
    document.addEventListener('mousemove', move);
    setTimeout(() => {
      document.removeEventListener('mousemove', move);
      trailActive = false;
    }, 8000);
  }

  function irisFlash() {
    const overlay = document.createElement('div');
    overlay.className = 'easter-iris-flash';
    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), 1300);
    setTimeout(() => toast('👁️ <strong>Werbung in die IRIS gebrannt</strong> (Folge 41) — das letzte was du siehst.', 4000), 1100);
  }

  function windradHologramm() {
    const w = document.createElement('div');
    w.className = 'easter-windrad';
    w.textContent = '🌀';
    document.body.appendChild(w);
    setTimeout(() => w.remove(), 5000);
    toast('🌀 <strong>windradhologramm.de</strong> (Folge 44) — wenn die Letzte Generation klebt, holst du das Windrad weg.', 4500);
  }

  function bosseAlbumPopup() {
    const wrap = document.createElement('div');
    wrap.className = 'easter-album';
    wrap.innerHTML = `
      <div class="album-cover">
        <div class="album-title">Trockener Flutschi</div>
        <div class="album-subtitle">in Moskau</div>
        <div class="album-artist">— Bosse (fiktiv, Folge 42)</div>
      </div>
    `;
    document.body.appendChild(wrap);
    setTimeout(() => wrap.classList.add('show'));
    setTimeout(() => {
      wrap.classList.remove('show');
      setTimeout(() => wrap.remove(), 400);
    }, 4500);
  }

  // =============== Tipp-Sequence-Tracker ===============
  let buffer = '';
  const TRIGGERS = {
    'kalle':       () => toast('🪑 <strong>Kalle:</strong> „Ich habe dir mein Wort gegeben und hier ist der Koffer." (Folge 37)', 5000),
    'papst':       () => toast('⏳ Maya-Kalender sagt: <strong>2033 ist Schluss.</strong> Bleiben noch ' + (2033 - new Date().getFullYear()) + ' Jahre. (Folge 1)', 5000),
    'fanta':       () => { emojiRain('🐐', 22); toast('🐐 <strong>Fanta Gnu</strong> schmeckt nach Ziege. (Folge 1)', 4000); },
    'flutschi':    () => trockenerFlutschiMode(),
    'crazy':       () => toast('🤪 <strong>„crazy crazy, gut gut"</strong> — Pele über Beckenbauer (Folge 37)', 4500),
    'thelen':      () => { emojiRain('🥕', 25); toast('🥕 <strong>„Karsten ist Gemüse"</strong> — Frank Thelens fiktive HdL-Reaktion auf Carsten Maschmeyer (Folge 37)', 5000); },
    'matrjoschka': () => pillMatrjoschka(),
    'tabletten':   () => pillMatrjoschka(),
    'marsalek':    () => wantedPoster(),
    'hartz4':      () => caterpillarTrail(),
    'iris':        () => irisFlash(),
    'windrad':     () => windradHologramm(),
    'bosse':       () => bosseAlbumPopup(),
    'lindemann':   () => toast('🎤 <strong>„Ich erkenne an, dass euch etwas aufgefallen ist."</strong> — der Til-Lindemann-Krisen-PR-Move (Folge 37)', 5000),
    'aaron':       () => { emojiRain('🌴', 30); toast('🌴 <strong>Aaron Carter im Tropical Island</strong> (Folge 3)', 4000); },
  };

  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;
    if (e.key.length !== 1) {
      if (e.key === 'Escape') buffer = '';
      return;
    }
    buffer = (buffer + e.key.toLowerCase()).slice(-20);
    for (const [word, fn] of Object.entries(TRIGGERS)) {
      if (buffer.endsWith(word)) {
        buffer = '';
        try { fn(); } catch {}
        return;
      }
    }
  });

  // =============== Konami-Code ===============
  const konami = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let konamiIdx = 0;
  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === konami[konamiIdx].toLowerCase()) {
      konamiIdx++;
      if (konamiIdx === konami.length) {
        konamiIdx = 0;
        trockenerFlutschiMode();
      }
    } else {
      konamiIdx = e.key === konami[0] ? 1 : 0;
    }
  });

  function trockenerFlutschiMode() {
    document.body.classList.add('flutschi-mode');
    toast('🥶 <strong>Trockener Flutschi in Moskau</strong> aktiviert. (Folge 42)', 5000);
    setTimeout(() => document.body.classList.remove('flutschi-mode'), 6000);
  }

  // =============== Triple-Click auf Footer-Titel ===============
  const footerTitle = document.getElementById('footerTmdaTitle');
  let footerClicks = 0, footerClickTimer = null;
  footerTitle?.addEventListener('click', () => {
    footerClicks++;
    clearTimeout(footerClickTimer);
    footerClickTimer = setTimeout(() => { footerClicks = 0; }, 500);
    if (footerClicks === 3) {
      footerClicks = 0;
      toast('🎙️ Made with vibes by <strong>@koljasagorski</strong> & Claude Code. Powered by Cloudflare Workers AI + viel Kaffee.', 6000);
    }
  });
  if (footerTitle) footerTitle.style.cursor = 'default';

  // =============== Score-Badge: 3× Klick → Konfetti ===============
  document.addEventListener('click', (e) => {
    const score = e.target.closest('.score-large');
    if (!score) return;
    const now = Date.now();
    if (now - (score._lastClick || 0) > 600) score._clicks = 0;
    score._clicks = (score._clicks || 0) + 1;
    score._lastClick = now;
    if (score._clicks >= 3) {
      score._clicks = 0;
      const r = score.getBoundingClientRect();
      confettiBurst(r.left + r.width / 2, r.top + r.height / 2);
    }
  });

  // =============== Stat-Counter: 5× Klick → Achievement ===============
  document.addEventListener('click', (e) => {
    const stat = e.target.closest('.stat-num');
    if (!stat) return;
    const now = Date.now();
    if (now - (stat._lastClick || 0) > 1000) stat._clicks = 0;
    stat._clicks = (stat._clicks || 0) + 1;
    stat._lastClick = now;
    if (stat._clicks >= 5) {
      stat._clicks = 0;
      toast('📊 <strong>Achievement:</strong> Statistiker — du klickst Zahlen.', 4000);
    }
  });

  // =============== Cursor in alle 4 Ecken → Cornerologe ===============
  const corners = { tl: false, tr: false, bl: false, br: false };
  let cornerResetTimer = null;
  document.addEventListener('mousemove', (e) => {
    const x = e.clientX, y = e.clientY;
    const w = window.innerWidth, h = window.innerHeight;
    const m = 30;
    let touched = false;
    if (x < m && y < m) { corners.tl = true; touched = true; }
    else if (x > w - m && y < m) { corners.tr = true; touched = true; }
    else if (x < m && y > h - m) { corners.bl = true; touched = true; }
    else if (x > w - m && y > h - m) { corners.br = true; touched = true; }
    if (!touched) return;
    clearTimeout(cornerResetTimer);
    cornerResetTimer = setTimeout(() => {
      Object.keys(corners).forEach(k => corners[k] = false);
    }, 10000);
    if (Object.values(corners).every(v => v)) {
      Object.keys(corners).forEach(k => corners[k] = false);
      toast('🗺️ <strong>Achievement:</strong> Cornerologe — alle vier Bildschirmecken berührt.', 5000);
    }
  });

  // =============== Long-Press auf Chat-FAB → Kalle Direct Line ===============
  const fab = document.getElementById('chatFab');
  let fabTimer = null;
  const fabStart = () => {
    fabTimer = setTimeout(() => {
      toast('☎️ <strong>Kalle Direct Line</strong> — leider gerade in Hamburg unterwegs. Versuch\'s mit der normalen Wiki.', 5000);
    }, 1500);
  };
  const fabEnd = () => clearTimeout(fabTimer);
  fab?.addEventListener('mousedown', fabStart);
  fab?.addEventListener('mouseup', fabEnd);
  fab?.addEventListener('mouseleave', fabEnd);
  fab?.addEventListener('touchstart', fabStart, { passive: true });
  fab?.addEventListener('touchend', fabEnd);

  // =============== Dienstag-Banner ===============
  if (new Date().getDay() === 2 && !sessionStorage.getItem('tmda-tuesday-shown')) {
    sessionStorage.setItem('tmda-tuesday-shown', '1');
    setTimeout(() => {
      const banner = document.createElement('div');
      banner.className = 'tmda-tuesday-banner';
      banner.innerHTML = '📡 Heute ist Dienstag — Folgentag.';
      document.body.appendChild(banner);
      requestAnimationFrame(() => banner.classList.add('show'));
      setTimeout(() => {
        banner.classList.remove('show');
        setTimeout(() => banner.remove(), 500);
      }, 6000);
    }, 1500);
  }

  // =============== 3am–7am Nacht-Toast ===============
  const hour = new Date().getHours();
  if (hour >= 3 && hour < 7 && !sessionStorage.getItem('tmda-night-shown')) {
    sessionStorage.setItem('tmda-night-shown', '1');
    setTimeout(() => {
      toast('🌙 Spät noch wach? <strong>Mucki ist tot, ne.</strong> (Folge 38)', 5500);
    }, 3000);
  }

  // =============== Tab unfocused → Titel rotiert TMDA-Quotes ===============
  const TAB_QUOTES = [
    '🎙️ Komm zurück, du Talahon',
    '🪑 Kalle wartet',
    '🥶 Trockener Flutschi in Moskau',
    '⏳ 2033 ist nah',
    '🥕 Karsten ist Gemüse',
    '🐐 Fanta Gnu schmeckt nach Ziege',
  ];
  let titleInterval = null;
  const originalTitle = document.title;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      let i = 0;
      titleInterval = setInterval(() => {
        document.title = TAB_QUOTES[i % TAB_QUOTES.length];
        i++;
      }, 2200);
    } else {
      clearInterval(titleInterval);
      titleInterval = null;
      document.title = originalTitle;
    }
  });

  // =============== ?-Taste → Help-Overlay ===============
  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;
    if (e.key === '?') {
      e.preventDefault();
      const existing = document.getElementById('eggHelp');
      if (existing) { existing.remove(); return; }
      showHelpOverlay();
    }
  });

  function showHelpOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'eggHelp';
    overlay.className = 'egg-help-overlay';
    overlay.innerHTML = `
      <div class="egg-help-inner">
        <button class="egg-help-close" aria-label="Schließen">×</button>
        <h2>🥚 Easter-Egg-Cheatsheet</h2>
        <p class="meta">Alle versteckten Trigger im Wiki. (Drück <kbd>?</kbd> nochmal oder <kbd>Esc</kbd> zum Schließen.)</p>
        <div class="egg-help-grid">
          <ul>
            <li><kbd>Doppelklick Logo</kbd> → Talahons im Weltall</li>
            <li><kbd>kalle</kbd> → Schwensen-Quote</li>
            <li><kbd>papst</kbd> → Maya-2033-Countdown</li>
            <li><kbd>fanta</kbd> → Ziegen-Regen</li>
            <li><kbd>flutschi</kbd> / Konami → Flutschi-Modus</li>
            <li><kbd>crazy</kbd> → Pele-Beckenbauer</li>
            <li><kbd>thelen</kbd> → Karsten ist Gemüse</li>
            <li><kbd>tabletten</kbd> → Matrjoschka</li>
            <li><kbd>marsalek</kbd> → Wanted-Poster</li>
            <li><kbd>hartz4</kbd> → Raupe-Cursor</li>
            <li><kbd>iris</kbd> → Werbungs-Blitz</li>
            <li><kbd>windrad</kbd> → Hologramm</li>
            <li><kbd>bosse</kbd> → Album-Cover</li>
          </ul>
          <ul>
            <li><kbd>lindemann</kbd> → Krisen-PR-Quote</li>
            <li><kbd>aaron</kbd> → Palmen-Regen</li>
            <li><kbd>6 Seiten besucht</kbd> → Hielscher-Karte</li>
            <li><kbd>3× Klick Score-Badge</kbd> → Konfetti</li>
            <li><kbd>5× Klick Stat-Counter</kbd> → Achievement</li>
            <li><kbd>Maus alle 4 Ecken</kbd> → Cornerologe</li>
            <li><kbd>Long-Press Chat-FAB</kbd> → Kalle Direct Line</li>
            <li><kbd>3× Klick „TMDA Wiki" im Footer</kbd> → Credits</li>
            <li><kbd>Konsole öffnen</kbd> → Nisse-Quote</li>
            <li><kbd>Dienstag</kbd> → Folgentag-Banner</li>
            <li><kbd>3am–7am</kbd> → Nacht-Toast</li>
            <li><kbd>Tab unfocused</kbd> → Titel rotiert</li>
            <li><kbd>?</kbd> → diese Seite</li>
          </ul>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));
    const close = () => {
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 300);
    };
    overlay.querySelector('.egg-help-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    const onKey = (e) => {
      if (e.key === 'Escape' || e.key === '?') {
        close();
        document.removeEventListener('keydown', onKey);
      }
    };
    setTimeout(() => document.addEventListener('keydown', onKey), 50);
  }

  // =============== Hielscher-Karte (nach 6 besuchten Seiten) ===============
  // Inside-Joke: „den Hielscher ziehen" = in die Interviewer-Rolle wechseln,
  // nur Fragen stellen, nicht selbst Stellung beziehen. Bezug auf Matze
  // Hielscher (Hotel Matze). Card pop-up von unten-links nach 6 unique Routes.
  const HIELSCHER_VISITS_KEY = 'tmda-visits-session';
  const HIELSCHER_SHOWN_KEY = 'tmda-hielscher-shown-session';
  const HIELSCHER_THRESHOLD = 6;
  const HIELSCHER_URL = 'https://hotelmatze.de';

  // Test-Hooks:
  //   ?joker=reset → setzt Counter + Shown-Flag zurück, Karte kommt nach 6 weiteren Klicks
  //   ?joker=show  → zeigt die Karte sofort
  try {
    const hUrl = new URL(location.href);
    const joker = hUrl.searchParams.get('joker');
    if (joker === 'reset' || joker === 'show') {
      sessionStorage.removeItem(HIELSCHER_VISITS_KEY);
      sessionStorage.removeItem(HIELSCHER_SHOWN_KEY);
      hUrl.searchParams.delete('joker');
      history.replaceState(null, '', hUrl.pathname + (hUrl.search ? '?' + hUrl.searchParams : '') + hUrl.hash);
      if (joker === 'show') setTimeout(() => showHielscherCard(), 300);
    }
  } catch (e) { /* fail-silent */ }

  function trackHielscherVisit() {
    if (sessionStorage.getItem(HIELSCHER_SHOWN_KEY)) return;
    const path = location.pathname.replace(/\/+$/, '') || '/';
    let visited;
    try { visited = JSON.parse(sessionStorage.getItem(HIELSCHER_VISITS_KEY) || '[]'); }
    catch (e) { visited = []; }
    if (!visited.includes(path)) {
      visited.push(path);
      sessionStorage.setItem(HIELSCHER_VISITS_KEY, JSON.stringify(visited));
    }
    if (visited.length >= HIELSCHER_THRESHOLD) {
      sessionStorage.setItem(HIELSCHER_SHOWN_KEY, '1');
      showHielscherCard();
    }
  }

  function showHielscherCard() {
    if (document.getElementById('hielscherCard')) return;
    const card = document.createElement('div');
    card.id = 'hielscherCard';
    card.className = 'hielscher-card';
    card.innerHTML = `
      <button class="hielscher-close" aria-label="Schließen" type="button">×</button>
      <a class="hielscher-card-inner" href="${HIELSCHER_URL}" target="_blank" rel="noopener noreferrer">
        <div class="hielscher-corner hielscher-corner-tl"><span class="hielscher-rank">H</span><span class="hielscher-suit">♠</span></div>
        <div class="hielscher-corner hielscher-corner-br"><span class="hielscher-rank">H</span><span class="hielscher-suit">♠</span></div>
        <div class="hielscher-center">
          <div class="hielscher-label">JOKER</div>
          <h3>Willst du lieber den Hielscher ziehen?</h3>
          <p>Zuhören, nicken, nicht Stellung beziehen. Bei <strong>Hotel Matze</strong>.</p>
          <span class="hielscher-cta">→ Podcast öffnen</span>
        </div>
      </a>
    `;
    document.body.appendChild(card);
    requestAnimationFrame(() => card.classList.add('show'));
    const close = (e) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      card.classList.remove('show');
      setTimeout(() => card.remove(), 400);
    };
    card.querySelector('.hielscher-close').addEventListener('click', close);
    setTimeout(() => card.classList.contains('show') && close(), 14000);
  }

  // SPA-Navigation abfangen: pushState wird gepatcht + popstate gehört
  const _origPushState = history.pushState;
  history.pushState = function () {
    const ret = _origPushState.apply(this, arguments);
    trackHielscherVisit();
    return ret;
  };
  window.addEventListener('popstate', trackHielscherVisit);
  trackHielscherVisit();

  // =============== Konsolen-Greeting ===============
  console.log(
    '%c TMDA Wiki ',
    'background:linear-gradient(135deg,#ff8a3d,#ffd60a);color:#0b0b0f;padding:6px 12px;border-radius:6px;font-weight:bold;font-size:14px',
    '\n„You must not become the most likely version of yourself." — Nisse\n\nTipp: drück „?" für die komplette Easter-Egg-Liste.'
  );
})();
