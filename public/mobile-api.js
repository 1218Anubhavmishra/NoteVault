(function () {
  const API_BASE = 'https://api.voicevault.xyz';
  const host = (location.hostname || '').toLowerCase();
  const isPackagedApp =
    location.protocol === 'capacitor:' ||
    (location.protocol === 'https:' && (host === 'localhost' || host === '127.0.0.1')) ||
    window.VV_FORCE_API_BASE === true;

  if (!isPackagedApp) return;

  window.VV_API_BASE = API_BASE;
  document.documentElement.classList.add('vv-native-app');

  const origFetch = window.fetch.bind(window);
  window.fetch = function patchedMobileFetch(input, init = {}) {
    let url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input ?? '');
    const localApiPrefix = location.origin + '/api/';
    let rewritten = '';
    if (url.startsWith('/api/')) rewritten = API_BASE + url;
    else if (url.startsWith(localApiPrefix)) rewritten = API_BASE + url.slice(location.origin.length);
    if (rewritten) {
      input = input instanceof Request ? new Request(rewritten, input) : rewritten;
    }
    const nextInit =
      typeof init === 'object' && init
        ? { credentials: init.credentials ?? 'include', ...init }
        : { credentials: 'include' };
    return origFetch(input, nextInit);
  };
})();
