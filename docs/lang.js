// Shared language switcher: ?lang=he|en|ru, else the browser language, else English.
(function () {
  const LANGS = ['he', 'en', 'ru'];
  const fromUrl = new URLSearchParams(location.search).get('lang');
  const fromBrowser = (navigator.language || 'en').slice(0, 2).replace('iw', 'he');
  let lang = LANGS.includes(fromUrl) ? fromUrl : LANGS.includes(fromBrowser) ? fromBrowser : 'en';

  function apply(next) {
    lang = next;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-lang]').forEach((el) => (el.hidden = el.dataset.lang !== lang));
    document.querySelectorAll('.langs button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.set === lang)));
    document.querySelectorAll('a[data-keep-lang]').forEach((a) => {
      const u = new URL(a.getAttribute('href'), location.href);
      u.searchParams.set('lang', lang);
      a.href = u.pathname.split('/').pop() + u.search;
    });
    window.dispatchEvent(new CustomEvent('langchange', { detail: lang }));
  }

  window.veyraLang = () => lang;
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.langs button').forEach((b) => b.addEventListener('click', () => apply(b.dataset.set)));
    apply(lang);
  });
})();
