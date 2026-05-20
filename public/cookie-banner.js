// Ironischer Cookie-Banner — erscheint einmal pro Browser (localStorage-Flag).
// Wir speichern wirklich keine Tracking-Cookies, nur Theme + Chat-Counter
// in localStorage. Der Banner ist mehr Witz als Compliance-Notwendigkeit.

(function () {
  const KEY = 'tmda-cookie-acknowledged';
  if (localStorage.getItem(KEY)) return;

  // 1.5 Sek warten, damit die Seite erstmal lädt
  setTimeout(() => {
    const banner = document.createElement('div');
    banner.className = 'cookie-banner';
    banner.id = 'cookieBanner';
    banner.innerHTML = `
      <div class="cookie-image">
        <img src="/cookies.png" alt="Cookies?"
             onerror="this.style.display='none';this.parentElement.querySelector('.cookie-fallback').hidden=false;" />
        <div class="cookie-fallback" hidden>🍟<br/><span style="font-size:0.5em;opacity:0.5">platzhalter</span></div>
      </div>
      <div class="cookie-content">
        <h3>🍪 Du willst was über Cookies hören?</h3>
        <p><strong>Wir tracken nichts.</strong> Wirklich. Keine Werbe-Cookies, kein Google Analytics, keine Pixel.
        Wenn du auf „Akzeptieren" klickst, wirst du <em>im Chat</em> nicht süchtig nach Fanta Gnu — versprochen.</p>
        <details class="cookie-details">
          <summary>Was wir wirklich speichern (für die Nerds)</summary>
          <ul>
            <li><code>tmda-theme</code> — Dark/Light-Mode</li>
            <li><code>tmda-chat-questions-session</code> — Counter für Chat-Donation-Hint (pro Tab)</li>
            <li><code>tmda-donate-shown-session</code> — Flag, ob Donation-Callout im Chat gezeigt wurde</li>
            <li><code>tmda-tuesday-shown</code>, <code>tmda-night-shown</code> — Easter-Egg-Show-Flags</li>
            <li>Cloudflare Turnstile-Cookie (nur wenn aktiviert) — Bot-Schutz</li>
          </ul>
          <p class="meta">Alles bleibt in deinem Browser. Kein Server-Side-Tracking. Versprochen wie Kalle Schwensen einen Bargeld-Koffer übergibt.</p>
        </details>
        <div class="cookie-actions">
          <button class="btn btn-primary" data-cookie-accept>Akzeptieren (passiert eh nix)</button>
          <button class="btn" data-cookie-decline>Ablehnen (auch egal)</button>
        </div>
      </div>
      <button class="cookie-close" aria-label="Schließen" data-cookie-close>×</button>
    `;
    document.body.appendChild(banner);
    requestAnimationFrame(() => banner.classList.add('show'));

    const dismiss = (mode) => {
      localStorage.setItem(KEY, mode);
      banner.classList.remove('show');
      setTimeout(() => banner.remove(), 400);
    };
    banner.querySelector('[data-cookie-accept]').addEventListener('click', () => dismiss('accepted'));
    banner.querySelector('[data-cookie-decline]').addEventListener('click', () => dismiss('declined'));
    banner.querySelector('[data-cookie-close]').addEventListener('click', () => dismiss('closed'));
  }, 1500);
})();
