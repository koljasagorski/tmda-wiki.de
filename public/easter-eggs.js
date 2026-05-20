// 🥚 Easter Eggs — komplett optional, brechen nichts wenn sie failen.
// Aktive Easter Eggs:
//   1. Logo 7× klicken          → "Achievement unlocked: Talahons im Weltall"
//   2. Tippen "kalle"            → Kalles-Corner-Quote-Overlay
//   3. Tippen "papst"            → Maya-2033-Countdown-Toast (Folge 1)
//   4. Tippen "fanta"            → Goat-Emoji-Regen
//   5. Konami-Code (↑↑↓↓←→←→BA) → "Trockener Flutschi"-Modus (Tilt + Ice-Filter, 6s)
//   6. Triple-Click auf Footer-Repo-Link → Credits-Toast

(function () {
  // ---------- Toast Helper ----------
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

  // ---------- 1. Logo 2× klicken ----------
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

  // ---------- 2-4. Key-Sequence Tracker ----------
  let buffer = '';
  const TRIGGERS = {
    'kalle': () => toast('🪑 <strong>Kalle:</strong> „Ich habe dir mein Wort gegeben und hier ist der Koffer."', 5000),
    'papst': () => toast('⏳ Maya-Kalender sagt: <strong>2033 ist Schluss.</strong> Bleiben noch ' + (2033 - new Date().getFullYear()) + ' Jahre.', 5000),
    'fanta': () => goatRain(),
    'flutschi': () => trockenerFlutschiMode(),
  };

  document.addEventListener('keydown', (e) => {
    // Nicht in input/textarea triggern
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

  function goatRain() {
    toast('🐐 <strong>Fanta Gnu</strong> schmeckt nach Ziege.', 4000);
    for (let i = 0; i < 20; i++) {
      setTimeout(() => {
        const g = document.createElement('div');
        g.className = 'easter-goat';
        g.style.left = Math.random() * 100 + 'vw';
        g.textContent = '🐐';
        document.body.appendChild(g);
        setTimeout(() => g.remove(), 5000);
      }, i * 100);
    }
  }

  // ---------- 5. Konami-Code → Trockener Flutschi ----------
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
    toast('🥶 <strong>Trockener Flutschi in Moskau</strong> aktiviert.', 5000);
    setTimeout(() => document.body.classList.remove('flutschi-mode'), 6000);
  }

  // ---------- 6. Triple-Click auf Footer-Titel → Credits ----------
  // Bindet auf das <strong>-Element (kein Link), damit es nicht mit Navigation kollidiert
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

  // ---------- Konsolen-Easter-Egg für Devs ----------
  // eslint-disable-next-line no-console
  console.log(
    '%c TMDA Wiki ',
    'background:linear-gradient(135deg,#ff8a3d,#ffd60a);color:#0b0b0f;padding:6px 12px;border-radius:6px;font-weight:bold;font-size:14px',
    '\n„You must not become the most likely version of yourself." — Nisse\n\nTipp: probier mal die Konami-Sequenz, oder tipp „kalle", „papst" oder „fanta".'
  );
})();
