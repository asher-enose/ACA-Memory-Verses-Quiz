/* Group events and the leaderboard are stored in a Google Sheet through an
   Apps Script web app. Paste its URL here (setup steps are in README.md).
   Practice mode works without it. */
window.CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbxEw2dPHi746zwNg-WBkBA0nIfhySHrrjbFhCGhuuKYCIdkyFDPeCTx-Ittkzbj638v/exec',
};

/* POST as text/plain on purpose: application/json would trigger a CORS
   preflight, which Apps Script web apps cannot answer. */
window.Api = {
  ready() {
    return !!CONFIG.API_URL && CONFIG.API_URL.indexOf('PASTE_YOUR') !== 0;
  },
  async call(action, payload) {
    // give up after a while, so a stalled connection ends in an error instead of waiting for ever
    const stop = new AbortController();
    const timer = setTimeout(() => stop.abort(), CONFIG.TIMEOUT_MS || 45000);
    let res;
    try {
      res = await fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(Object.assign({ action }, payload || {})),
        signal: stop.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) throw new Error('Network error (' + res.status + ')');
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Request failed');
    return data.result;
  },
};
