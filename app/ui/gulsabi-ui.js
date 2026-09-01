/* Gulsabi Android UI helpers — ripple/press feedback, modal bottom sheet,
   Material dialogs (replacing browser alert/confirm), light haptics, icons.
   Plain script (no modules) so every static page can use it: window.GUI. */
(function () {
  'use strict';
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Material icon paths (24dp) ---- */
  const ICONS = {
    home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
    watch: 'M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z',
    play: 'M21.58 16.09l-1.09-7.66A3.996 3.996 0 0 0 16.53 5H7.47C5.48 5 3.79 6.46 3.51 8.43l-1.09 7.66C2.2 17.63 3.39 19 4.94 19c.68 0 1.32-.27 1.8-.75L9 15h6l2.25 3.25c.48.48 1.13.75 1.81.75 1.55 0 2.74-1.37 2.52-2.91zM11 11H9v2H8v-2H6v-1h2V8h1v2h2v1zm4.5 1.5c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm2-3c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z',
    learn: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
    person: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
    back: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
    close: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
    playArrow: 'M8 5v14l11-7z',
    chevron: 'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
    star: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
    lock: 'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z',
    time: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z',
    help: 'M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z',
    refresh: 'M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z',
    check: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
    offline: 'M23.64 7c-.45-.34-4.93-4-11.64-4-1.5 0-2.89.19-4.15.48L18.18 13.8 23.64 7zm-6.6 8.22L3.27 1.44 2 2.72l2.05 2.06C1.91 5.76.59 6.82.36 7l11.63 14.49.01.01.01-.01 3.9-4.86 3.32 3.32 1.27-1.27-3.46-3.46z',
    settings: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z'
  };
  const icon = (name, cls) => '<svg viewBox="0 0 24 24" aria-hidden="true"' + (cls ? ' class="' + cls + '"' : '') + '><path d="' + (ICONS[name] || '') + '"/></svg>';

  /* ---- ripple on .g-press / .g-btn / .g-row / .g-nav-item ---- */
  document.addEventListener('pointerdown', function (e) {
    const el = e.target && e.target.closest && e.target.closest('.g-press, .g-btn, .g-row, .g-iconbtn');
    if (!el || reduced || el.disabled) return;
    const r = el.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 1.6;
    const dot = document.createElement('span');
    dot.className = 'g-ripple-dot';
    dot.style.cssText = 'width:' + size + 'px;height:' + size + 'px;left:' + (e.clientX - r.left - size / 2) + 'px;top:' + (e.clientY - r.top - size / 2) + 'px;';
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    if (getComputedStyle(el).overflow !== 'hidden') el.style.overflow = 'hidden';
    el.appendChild(dot);
    setTimeout(() => dot.remove(), 520);
  }, { passive: true });

  /* ---- light haptic (Android WebView supports navigator.vibrate) ---- */
  let lastTap = 0;
  function haptic(ms) {
    const now = Date.now(); if (now - lastTap < 250) return; lastTap = now;
    try { if (navigator.vibrate) navigator.vibrate(ms || 8); } catch (_) {}
  }

  /* ---- modal bottom sheet ---- */
  function sheet(el) {
    let scrim = el.previousElementSibling && el.previousElementSibling.classList.contains('g-sheet-scrim') ? el.previousElementSibling : null;
    if (!scrim) { scrim = document.createElement('div'); scrim.className = 'g-sheet-scrim'; el.parentNode.insertBefore(scrim, el); }
    const api = {
      open() { scrim.classList.add('is-open'); el.classList.add('is-open'); el.setAttribute('aria-hidden', 'false'); },
      close() { scrim.classList.remove('is-open'); el.classList.remove('is-open'); el.setAttribute('aria-hidden', 'true'); },
      get isOpen() { return el.classList.contains('is-open'); }
    };
    scrim.addEventListener('click', api.close);
    // swipe-down to dismiss (from the top handle area)
    let y0 = null;
    el.addEventListener('touchstart', (e) => { if (el.scrollTop <= 0) y0 = e.touches[0].clientY; }, { passive: true });
    el.addEventListener('touchmove', (e) => { if (y0 != null && e.touches[0].clientY - y0 > 80) { y0 = null; api.close(); } }, { passive: true });
    el.addEventListener('touchend', () => { y0 = null; });
    return api;
  }

  /* ---- dialogs: confirm / alert (Promise-based, replaces window.confirm/alert) ---- */
  let dlgRoot = null;
  function ensureDialog() {
    if (dlgRoot) return dlgRoot;
    dlgRoot = document.createElement('div');
    dlgRoot.className = 'g-dialog-scrim';
    dlgRoot.innerHTML = '<div class="g-dialog" role="dialog" aria-modal="true"><h2></h2><p></p><div class="g-dialog-actions"></div></div>';
    document.body.appendChild(dlgRoot);
    return dlgRoot;
  }
  function dialog(opts) {
    const root = ensureDialog();
    const box = root.firstElementChild;
    box.querySelector('h2').textContent = opts.title || '';
    box.querySelector('p').textContent = opts.message || '';
    const actions = box.querySelector('.g-dialog-actions');
    actions.innerHTML = '';
    return new Promise((resolve) => {
      const done = (v) => { root.classList.remove('is-open'); setTimeout(() => resolve(v), 180); };
      if (opts.cancel !== false) {
        const c = document.createElement('button'); c.className = 'g-btn g-btn--text'; c.textContent = opts.cancel || 'Cancel';
        c.addEventListener('click', () => done(false)); actions.appendChild(c);
      }
      const ok = document.createElement('button');
      ok.className = 'g-btn ' + (opts.danger ? 'g-btn--danger' : 'g-btn--filled');
      ok.textContent = opts.ok || 'OK'; ok.addEventListener('click', () => done(true)); actions.appendChild(ok);
      root.classList.add('is-open');
      setTimeout(() => ok.focus(), 50);
    });
  }
  const confirm = (message, opts) => dialog(Object.assign({ message }, opts || {}));
  const alert = (message, opts) => dialog(Object.assign({ message, cancel: false }, opts || {}));

  /* ---- status bar style (Capacitor SystemBars; no-op on the web) ---- */
  function statusBar(style) {
    try { const sb = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SystemBars; sb && sb.setStyle({ style: style }); } catch (_) {}
  }

  window.GUI = { icon, ICONS, haptic, sheet, dialog, confirm, alert, statusBar, reduced };
})();
