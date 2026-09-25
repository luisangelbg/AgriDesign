/* AgriDesign — interface language (English / Spanish) and colour theme.

   The pages of this platform were written in English, so English is the
   original text and lives in the HTML itself. Spanish is added beside it as
   an attribute and swapped in when the reader asks for it:

     1. Text nodes carry the Spanish version in  data-es  (plain text) or
        data-es-html  (when the sentence contains <b>, <a>, sub/sup…).
        The English original is remembered the first time the page is
        translated, so switching back is exact and the HTML stays readable.
     2. Attributes that cannot hold a child node use  data-es-ph
        (placeholder) and  data-es-title  (title / aria-label).
     3. Anything written by JavaScript uses  T('English', 'Español')  and the
        module that drew it listens for the 'langchange' event to redraw.

   The starting language is the one the reader chose last time; otherwise
   Spanish when the browser is set to Spanish and English everywhere else.
   The theme follows the operating system until the reader picks one. */

(function () {
  const KEY_LANG = 'agridesign:lang', KEY_THEME = 'agridesign:theme';
  const read = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const write = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* private browsing */ } };

  function initialLang() {
    const saved = read(KEY_LANG);
    if (saved === 'es' || saved === 'en') return saved;
    const nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
    return /^es\b/i.test(nav) ? 'es' : 'en';
  }

  /* remember the English original the first time a node is translated */
  const ORIG = new WeakMap();
  function original(n, kind) {
    let o = ORIG.get(n);
    if (!o) { o = {}; ORIG.set(n, o); }
    if (!(kind in o)) {
      o[kind] = kind === 'html' ? n.innerHTML
        : kind === 'text' ? n.textContent
        : kind === 'ph' ? (n.getAttribute('placeholder') || '')
        : (n.getAttribute('title') || '');
    }
    return o[kind];
  }

  const I18N = {
    lang: initialLang(),

    set(lang) {
      if (lang !== 'es' && lang !== 'en') return;
      const changed = lang !== I18N.lang;
      I18N.lang = lang;
      write(KEY_LANG, lang);
      I18N.apply();
      if (changed) document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
    },

    /* put the active language into every marked node */
    apply(root) {
      const es = I18N.lang === 'es';
      document.documentElement.lang = I18N.lang;
      const scope = root || document;
      scope.querySelectorAll('[data-es]').forEach(n => {
        const en = original(n, 'text');
        n.textContent = es ? n.getAttribute('data-es') : en;
      });
      scope.querySelectorAll('[data-es-html]').forEach(n => {
        const en = original(n, 'html');
        n.innerHTML = es ? n.getAttribute('data-es-html') : en;
      });
      scope.querySelectorAll('[data-es-ph]').forEach(n => {
        const en = original(n, 'ph');
        n.setAttribute('placeholder', es ? n.getAttribute('data-es-ph') : en);
      });
      scope.querySelectorAll('[data-es-title]').forEach(n => {
        const en = original(n, 'title');
        const v = es ? n.getAttribute('data-es-title') : en;
        n.setAttribute('title', v);
        if (n.hasAttribute('aria-label')) n.setAttribute('aria-label', v);
      });
      const t = document.querySelector('title');
      if (t && t.dataset.es) document.title = es ? t.dataset.es : original(t, 'text');
      document.querySelectorAll('.lang-seg button').forEach(b => {
        b.classList.toggle('on', b.dataset.lang === I18N.lang);
        b.setAttribute('aria-pressed', b.dataset.lang === I18N.lang ? 'true' : 'false');
      });
    },

    /* number written the way the active language writes it */
    num(x, d) {
      if (!isFinite(x)) return '—';
      const s = d == null ? String(x) : Number(x).toFixed(d);
      return I18N.lang === 'es' ? s.replace('.', ',') : s;
    },
  };

  /* T('English', 'Español') → the active language. An object {en, es} also works. */
  function T(en, es) {
    if (en && typeof en === 'object' && !Array.isArray(en)) return I18N.lang === 'es' ? en.es : en.en;
    return I18N.lang === 'es' ? es : en;
  }

  /* ---------------- theme ---------------- */
  const Theme = {
    current() {
      const set = document.documentElement.getAttribute('data-theme');
      if (set === 'dark' || set === 'light') return set;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    },
    dark() { return Theme.current() === 'dark'; },
    set(mode) {
      if (mode === 'dark' || mode === 'light') {
        document.documentElement.setAttribute('data-theme', mode);
        write(KEY_THEME, mode);
      }
      paintButton();
      document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: Theme.current() } }));
    },
    toggle() { Theme.set(Theme.current() === 'dark' ? 'light' : 'dark'); },
  };

  function paintButton() {
    const b = document.getElementById('themeBtn');
    if (!b) return;
    const dark = Theme.dark();
    b.textContent = dark ? '☀' : '☾';
    const tip = dark ? T('Switch to light mode', 'Cambiar a modo claro')
                     : T('Switch to dark mode', 'Cambiar a modo oscuro');
    b.setAttribute('title', tip);
    b.setAttribute('aria-label', tip);
  }

  const savedTheme = read(KEY_THEME);
  if (savedTheme === 'dark' || savedTheme === 'light') document.documentElement.setAttribute('data-theme', savedTheme);
  document.documentElement.lang = I18N.lang;

  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onSys = () => {
      if (!document.documentElement.getAttribute('data-theme')) {
        paintButton();
        document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: Theme.current() } }));
      }
    };
    if (mq.addEventListener) mq.addEventListener('change', onSys);
    else if (mq.addListener) mq.addListener(onSys);
  }

  document.addEventListener('DOMContentLoaded', () => {
    I18N.apply();
    paintButton();
    document.querySelectorAll('.lang-seg button').forEach(b =>
      b.addEventListener('click', () => I18N.set(b.dataset.lang)));
    const tb = document.getElementById('themeBtn');
    if (tb) tb.addEventListener('click', () => Theme.toggle());
  });
  document.addEventListener('langchange', paintButton);

  window.I18N = I18N;
  window.T = T;
  window.Theme = Theme;
})();
