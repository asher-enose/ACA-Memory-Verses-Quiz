/* Group events and the leaderboard are stored in a Google Sheet through an
   Apps Script web app. Paste its URL here (setup steps are in README.md).
   Practice mode works without it. */
window.CONFIG = {
  API_URL: 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE',
};

/* POST as text/plain on purpose: application/json would trigger a CORS
   preflight, which Apps Script web apps cannot answer. */
window.Api = {
  ready() {
    return !!CONFIG.API_URL && CONFIG.API_URL.indexOf('PASTE_YOUR') !== 0;
  },
  async call(action, payload) {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ action }, payload || {})),
    });
    if (!res.ok) throw new Error('Network error (' + res.status + ')');
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Request failed');
    return data.result;
  },
};
