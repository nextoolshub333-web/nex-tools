/**
 * NEX Email Popup - Cross-Site Lead Capture
 * Phase G - Sprint 2026-04-25 NEX First Dollar
 *
 * Behavior:
 *   - Triggers on exit-intent OR after 60 seconds on page (whichever first)
 *   - Shows once per session (sessionStorage gate)
 *   - Suppressed for 30 days after dismiss/submit (localStorage gate)
 *   - Suppressed entirely on the /angel-numbers/ landing (it has its own form)
 *   - POSTs to existing /api/subscribe endpoint (Brevo list 3, template 1)
 *   - Injects its own CSS, no external stylesheet needed
 *
 * Lead magnet: Free Angel Numbers Starter Kit PDF (Brevo welcome email handles delivery).
 */

(function () {
  'use strict';

  // ============================================================
  // Config
  // ============================================================
  var CONFIG = {
    delaySeconds: 60,
    suppressDays: 30,
    storageKeyShown: 'nex_popup_shown_session',
    storageKeySuppress: 'nex_popup_suppress_until',
    apiEndpoint: '/api/subscribe',
    suppressedPaths: [
      '/angel-numbers/',
      '/angel-numbers'
    ]
  };

  // ============================================================
  // Suppress checks
  // ============================================================
  function isSuppressedPath() {
    var path = window.location.pathname;
    for (var i = 0; i < CONFIG.suppressedPaths.length; i++) {
      if (path === CONFIG.suppressedPaths[i] || path.indexOf(CONFIG.suppressedPaths[i]) === 0) {
        return true;
      }
    }
    return false;
  }

  function isSessionShown() {
    try {
      return sessionStorage.getItem(CONFIG.storageKeyShown) === '1';
    } catch (e) {
      return false;
    }
  }

  function markSessionShown() {
    try { sessionStorage.setItem(CONFIG.storageKeyShown, '1'); } catch (e) {}
  }

  function isSuppressedLongTerm() {
    try {
      var until = parseInt(localStorage.getItem(CONFIG.storageKeySuppress) || '0', 10);
      return until > Date.now();
    } catch (e) {
      return false;
    }
  }

  function suppressLongTerm() {
    try {
      var until = Date.now() + CONFIG.suppressDays * 24 * 60 * 60 * 1000;
      localStorage.setItem(CONFIG.storageKeySuppress, String(until));
    } catch (e) {}
  }

  // ============================================================
  // Style injection
  // ============================================================
  var STYLES = [
    '.nex-popup-overlay {',
    '  position: fixed; inset: 0;',
    '  background: rgba(5, 5, 7, 0.78);',
    '  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);',
    '  z-index: 9998;',
    '  display: none; align-items: center; justify-content: center;',
    '  padding: 1rem;',
    '  opacity: 0; transition: opacity 0.25s ease;',
    '}',
    '.nex-popup-overlay.is-open { display: flex; opacity: 1; }',
    '.nex-popup {',
    '  position: relative;',
    '  background: linear-gradient(135deg, #08080C 0%, #0F0D15 50%, #08080C 100%);',
    '  border: 1px solid rgba(255,215,0,0.28);',
    '  border-radius: 16px;',
    '  width: 100%; max-width: 460px;',
    '  padding: 2.25rem 1.75rem 1.75rem;',
    '  z-index: 9999;',
    '  box-shadow: 0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,215,0,0.05);',
    '  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;',
    '  color: #FFFFFF;',
    '  transform: translateY(12px) scale(0.98);',
    '  transition: transform 0.28s ease;',
    '  overflow: hidden;',
    '}',
    '.nex-popup-overlay.is-open .nex-popup { transform: translateY(0) scale(1); }',
    '.nex-popup::before {',
    '  content: ""; position: absolute; inset: 0; pointer-events: none;',
    '  background: radial-gradient(1.5px 1.5px at 22% 28%, rgba(255,215,0,0.32), transparent 60%),',
    '              radial-gradient(1px 1px at 70% 18%, rgba(255,255,255,0.22), transparent 60%),',
    '              radial-gradient(1.5px 1.5px at 82% 75%, rgba(255,215,0,0.22), transparent 60%);',
    '  opacity: 0.85;',
    '}',
    '.nex-popup__inner { position: relative; z-index: 2; }',
    '.nex-popup__close {',
    '  position: absolute; top: 0.75rem; right: 0.85rem;',
    '  background: transparent; border: 0;',
    '  color: rgba(255,255,255,0.55);',
    '  font-size: 1.6rem; line-height: 1;',
    '  cursor: pointer; padding: 0.4rem 0.6rem;',
    '  border-radius: 6px;',
    '  transition: color 0.18s, background 0.18s;',
    '}',
    '.nex-popup__close:hover, .nex-popup__close:focus {',
    '  color: #FFD700; background: rgba(255,215,0,0.08);',
    '}',
    '.nex-popup__eyebrow {',
    '  display: inline-block;',
    '  font-size: 0.72rem; font-weight: 600; letter-spacing: 0.14em;',
    '  text-transform: uppercase; color: #FFD700;',
    '  background: rgba(255,215,0,0.08);',
    '  border: 1px solid rgba(255,215,0,0.25);',
    '  padding: 0.35rem 0.8rem; border-radius: 999px;',
    '  margin-bottom: 1.1rem;',
    '}',
    '.nex-popup__headline {',
    '  font-family: "Poppins", "Inter", sans-serif;',
    '  font-weight: 800; font-size: 1.55rem; line-height: 1.22;',
    '  margin: 0 0 0.6rem; color: #FFFFFF; letter-spacing: -0.01em;',
    '}',
    '.nex-popup__body {',
    '  font-size: 0.98rem; line-height: 1.55;',
    '  color: rgba(255,255,255,0.78); margin: 0 0 1.25rem;',
    '}',
    '.nex-popup__form {',
    '  display: flex; flex-direction: column; gap: 0.65rem;',
    '}',
    '.nex-popup__input {',
    '  background: rgba(255,255,255,0.04);',
    '  border: 1px solid rgba(255,255,255,0.14);',
    '  border-radius: 10px;',
    '  padding: 0.85rem 1rem;',
    '  font-family: inherit; font-size: 1rem;',
    '  color: #FFFFFF;',
    '  transition: border-color 0.18s, background 0.18s;',
    '  width: 100%;',
    '}',
    '.nex-popup__input::placeholder { color: rgba(255,255,255,0.42); }',
    '.nex-popup__input:focus {',
    '  outline: none;',
    '  border-color: rgba(255,215,0,0.5);',
    '  background: rgba(255,255,255,0.06);',
    '}',
    '.nex-popup__submit {',
    '  font-family: "Poppins", "Inter", sans-serif;',
    '  font-weight: 700; font-size: 1rem;',
    '  background: #FFD700; color: #08080C;',
    '  border: 2px solid #FFD700;',
    '  padding: 0.95rem 1.25rem;',
    '  border-radius: 10px;',
    '  cursor: pointer;',
    '  transition: transform 0.18s ease, background 0.18s, box-shadow 0.18s;',
    '  width: 100%;',
    '}',
    '.nex-popup__submit:hover, .nex-popup__submit:focus {',
    '  background: #FFECB3; border-color: #FFECB3;',
    '  transform: translateY(-1px);',
    '  box-shadow: 0 8px 24px rgba(255,215,0,0.22);',
    '}',
    '.nex-popup__submit[disabled] {',
    '  opacity: 0.6; cursor: wait; transform: none;',
    '}',
    '.nex-popup__privacy {',
    '  font-size: 0.78rem; line-height: 1.5;',
    '  color: rgba(255,255,255,0.5);',
    '  margin: 0.85rem 0 0; text-align: center;',
    '}',
    '.nex-popup__error {',
    '  font-size: 0.85rem; color: #FF6B6B;',
    '  margin-top: 0.5rem; text-align: center;',
    '  display: none;',
    '}',
    '.nex-popup__error.is-visible { display: block; }',
    '.nex-popup__success {',
    '  text-align: center; padding: 1rem 0;',
    '}',
    '.nex-popup__success-icon {',
    '  width: 56px; height: 56px; margin: 0 auto 1rem;',
    '  border-radius: 50%; background: rgba(40,167,69,0.12);',
    '  display: flex; align-items: center; justify-content: center;',
    '  border: 2px solid rgba(40,167,69,0.4);',
    '  color: #28A745; font-size: 1.6rem; font-weight: 700;',
    '  font-family: "Poppins", sans-serif;',
    '}',
    '.nex-popup__success-msg {',
    '  font-size: 1.05rem; color: #FFFFFF;',
    '  margin: 0 0 0.6rem;',
    '}',
    '.nex-popup__success-sub {',
    '  font-size: 0.9rem; color: rgba(255,255,255,0.65);',
    '  margin: 0;',
    '}',
    '@media (max-width: 480px) {',
    '  .nex-popup { padding: 1.85rem 1.25rem 1.4rem; max-width: calc(100vw - 2rem); }',
    '  .nex-popup__headline { font-size: 1.35rem; }',
    '  .nex-popup__body { font-size: 0.92rem; }',
    '}'
  ].join('\n');

  function injectStyles() {
    if (document.getElementById('nex-popup-styles')) return;
    var style = document.createElement('style');
    style.id = 'nex-popup-styles';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  // ============================================================
  // DOM build
  // ============================================================
  function buildPopup() {
    var slug = window.location.pathname.replace(/^\/+|\/+$/g, '').replace(/\//g, '-') || 'home';

    var overlay = document.createElement('div');
    overlay.className = 'nex-popup-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'nex-popup-title');

    overlay.innerHTML = [
      '<div class="nex-popup">',
      '  <div class="nex-popup__inner">',
      '    <button type="button" class="nex-popup__close" aria-label="Close" data-nex-close>&times;</button>',
      '    <span class="nex-popup__eyebrow">Free Starter Kit</span>',
      '    <h2 class="nex-popup__headline" id="nex-popup-title">Wait. Take the free starter kit before you go.</h2>',
      '    <p class="nex-popup__body">9 most common angel numbers, decoded. PDF download, instant.</p>',
      '    <form class="nex-popup__form" data-nex-form novalidate>',
      '      <input type="email" class="nex-popup__input" name="email" placeholder="your@email.com" required autocomplete="email">',
      '      <button type="submit" class="nex-popup__submit" data-nex-submit>Send Me The Kit</button>',
      '      <div class="nex-popup__error" data-nex-error role="alert"></div>',
      '    </form>',
      '    <p class="nex-popup__privacy">We email the PDF and weekly insights. Unsubscribe anytime.</p>',
      '    <div class="nex-popup__success" data-nex-success style="display:none">',
      '      <div class="nex-popup__success-icon">&#10003;</div>',
      '      <p class="nex-popup__success-msg">Check your inbox.</p>',
      '      <p class="nex-popup__success-sub">The PDF is on its way. Watch for "Nex Tools" in the from line.</p>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('\n');

    overlay.dataset.pageSlug = slug;
    return overlay;
  }

  // ============================================================
  // Show / hide
  // ============================================================
  var overlayEl = null;
  var triggered = false;

  function showPopup() {
    if (triggered) return;
    if (!overlayEl) return;
    triggered = true;
    markSessionShown();

    document.body.appendChild(overlayEl);
    var openFn = function () {
      overlayEl.classList.add('is-open');
      var input = overlayEl.querySelector('.nex-popup__input');
      if (input) {
        try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); }
      }
    };
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(openFn);
      setTimeout(openFn, 50);
    } else {
      setTimeout(openFn, 16);
    }
  }

  function hidePopup(reason) {
    if (!overlayEl) return;
    overlayEl.classList.remove('is-open');
    setTimeout(function () {
      if (overlayEl && overlayEl.parentNode) {
        overlayEl.parentNode.removeChild(overlayEl);
      }
    }, 280);
    if (reason === 'dismiss' || reason === 'submit') {
      suppressLongTerm();
    }
  }

  // ============================================================
  // Form submit -> Brevo
  // ============================================================
  function submitEmail(form) {
    var emailInput = form.querySelector('input[name="email"]');
    var submitBtn = form.querySelector('[data-nex-submit]');
    var errorEl = form.querySelector('[data-nex-error]');
    var successEl = overlayEl.querySelector('[data-nex-success]');
    var slug = overlayEl.dataset.pageSlug || 'unknown';

    var email = (emailInput.value || '').trim().toLowerCase();
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    errorEl.classList.remove('is-visible');
    errorEl.textContent = '';

    if (!emailRegex.test(email)) {
      errorEl.textContent = 'Enter a valid email address.';
      errorEl.classList.add('is-visible');
      emailInput.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    fetch(CONFIG.apiEndpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: email,
        source: 'popup-' + slug
      })
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { status: res.status, data: data };
        });
      })
      .then(function (result) {
        if (result.status === 200 && result.data && result.data.ok) {
          form.style.display = 'none';
          successEl.style.display = 'block';
          suppressLongTerm();
          setTimeout(function () { hidePopup('submit'); }, 4500);
        } else {
          var msg = (result.data && result.data.error === 'invalid_email')
            ? 'That email looks off. Try again.'
            : 'Something went wrong. Try again in a moment.';
          errorEl.textContent = msg;
          errorEl.classList.add('is-visible');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send Me The Kit';
        }
      })
      .catch(function () {
        errorEl.textContent = 'Network hiccup. Try again.';
        errorEl.classList.add('is-visible');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Me The Kit';
      });
  }

  // ============================================================
  // Triggers (exit-intent + 60s timer)
  // ============================================================
  function setupTriggers() {
    var fired = false;

    var timer = setTimeout(function () {
      if (!fired) { fired = true; showPopup(); }
    }, CONFIG.delaySeconds * 1000);

    function exitHandler(e) {
      if (fired) return;
      if (e.clientY <= 0 || e.relatedTarget === null) {
        fired = true;
        clearTimeout(timer);
        showPopup();
        document.removeEventListener('mouseout', exitHandler);
      }
    }
    document.addEventListener('mouseout', exitHandler);
  }

  // ============================================================
  // Wire interactions
  // ============================================================
  function wireOverlay() {
    overlayEl.addEventListener('click', function (e) {
      if (e.target === overlayEl) hidePopup('dismiss');
    });

    var closeBtn = overlayEl.querySelector('[data-nex-close]');
    if (closeBtn) closeBtn.addEventListener('click', function () { hidePopup('dismiss'); });

    var form = overlayEl.querySelector('[data-nex-form]');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        submitEmail(form);
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlayEl.classList.contains('is-open')) {
        hidePopup('dismiss');
      }
    });
  }

  // ============================================================
  // Init
  // ============================================================
  function init() {
    if (isSuppressedPath()) return;
    if (isSessionShown()) return;
    if (isSuppressedLongTerm()) return;

    injectStyles();
    overlayEl = buildPopup();
    wireOverlay();
    setupTriggers();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
