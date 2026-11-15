/**
 * Memory Verses quiz — group events + leaderboard backend (Google Apps Script).
 *
 * Setup (one time):
 *   1. Create a blank Google Sheet (sheets.new).
 *   2. Extensions > Apps Script, delete the default code, paste this whole file, save.
 *   3. Deploy > New deployment > type "Web app". Execute as: Me. Who has access: Anyone.
 *      Approve the permissions prompt (it is your own script on your own sheet).
 *   4. Copy the Web app URL into js/config.js as CONFIG.API_URL.
 *
 * The "Events", "Results" and "Stats" tabs are created automatically on first use.
 * The questions themselves are not stored here: each event has a random seed,
 * and every player's browser builds the same questions from it.
 */

var SHEETS = {
  Events: ['EventId', 'Title', 'Lang', 'From', 'To', 'Count', 'Types', 'Seed', 'CreatedAt'],
  Results: ['EventId', 'Name', 'Token', 'Score', 'Total', 'TimeMs', 'JoinedAt', 'SubmittedAt'],
  Stats: ['Key', 'Value'] // one row: QuizzesCompleted = practice rounds + event quizzes finished
};
var TOTAL_VERSES = 190;
var MAX_QUESTIONS = 50;
var EVENT_TYPES = ['fill', 'ref', 'verse', 'complete', 'order']; // flash card is self-marked, so not allowed
var MAX_TIME_MS = 24 * 60 * 60 * 1000;

// ---- HTTP entry points ---------------------------------------------------

/* Run this once from the Apps Script editor (choose "setup", press Run) to
   create the tabs and headers straight away. Opening the web app URL does the same. */
function setup() {
  Object.keys(SHEETS).forEach(function (name) { sheet(name); });
}

function doGet() {
  setup();
  return jsonOut({ ok: true, result: { status: 'Memory Verses quiz API is running' } });
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    return jsonOut({ ok: true, result: route(body.action, body) });
  } catch (err) {
    return jsonOut({ ok: false, error: err.message });
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function route(action, body) {
  switch (action) {
    case 'createEvent': return createEvent(body);
    case 'getEvent': return { event: findEvent(body.id), board: board(body.id) };
    case 'join': return join(body);
    case 'submit': return submit(body);
    case 'board': findEvent(body.id); return board(body.id);
    case 'stats': return { completed: readCompleted() };
    case 'practiceDone': return withLock(function () { return { completed: bumpCompleted() }; });
    default: throw new Error('Unknown action');
  }
}

// ---- Actions -------------------------------------------------------------

function createEvent(body) {
  var title = clean(body.title, 60);
  if (!title) throw new Error('Event name is required');
  var lang = ['ta', 'te'].indexOf(body.lang) >= 0 ? body.lang : 'en';
  var from = int(body.from, 1, TOTAL_VERSES, 'from');
  var to = int(body.to, from, TOTAL_VERSES, 'to');
  var count = int(body.count, 1, MAX_QUESTIONS, 'count');
  var types = EVENT_TYPES.filter(function (t) { return (body.types || []).indexOf(t) >= 0; });
  if (!types.length) throw new Error('Choose at least one game type');

  return withLock(function () {
    var taken = {};
    readRows('Events').forEach(function (r) { taken[r.EventId] = true; });
    var id;
    do { id = randomId(6); } while (taken[id]);
    var seed = Math.floor(Math.random() * 4294967296);
    addRow('Events', [id, title, lang, from, to, count, types.join(','), seed, new Date()]);
    return { event: { id: id, title: title, lang: lang, from: from, to: to, count: count, types: types, seed: seed } };
  });
}

/* Reserves the name for this event and hands back a private token; the token
   is what lets that player (and only that player) submit a score later. */
function join(body) {
  var event = findEvent(body.id);
  var name = clean(body.name, 40);
  if (!name) throw new Error('Name is required');
  // The browser sends its own secret key and it becomes the token. If the reply
  // to a join is lost, the retry carries the same key and gets the same entry back
  // instead of being told the name is taken.
  var key = /^[a-f0-9-]{32,36}$/.test(String(body.key || '')) ? String(body.key) : '';
  return withLock(function () {
    var lower = name.toLowerCase();
    var mine = null;
    var clash = false;
    readRows('Results').forEach(function (r) {
      if (String(r.EventId) !== event.id) return;
      if (key && String(r.Token) === key) mine = r;
      else if (String(r.Name).toLowerCase() === lower) clash = true;
    });
    if (mine) return { name: String(mine.Name), token: key };
    if (clash) throw new Error('NAME_TAKEN');
    var token = key || Utilities.getUuid();
    addRow('Results', [event.id, name, token, '', event.count, '', new Date(), '']);
    return { name: name, token: token };
  });
}

function submit(body) {
  var event = findEvent(body.id);
  var score = int(body.score, 0, event.count, 'score');
  var timeMs = Math.min(MAX_TIME_MS, Math.max(0, Math.round(Number(body.timeMs) || 0)));
  return withLock(function () {
    var sh = sheet('Results');
    var values = sh.getDataRange().getValues();
    for (var i = 1; i < values.length; i++) {
      if (String(values[i][0]) === event.id && String(values[i][2]) === body.token) {
        // first submission wins; a retry after a dropped connection changes nothing
        if (values[i][7] === '') {
          sh.getRange(i + 1, 4, 1, 3).setValues([[score, event.count, timeMs]]);
          sh.getRange(i + 1, 8, 1, 1).setValues([[new Date()]]);
          bumpCompleted();
        }
        return board(event.id);
      }
    }
    throw new Error('Player not found for this event');
  });
}

/* Finished players, best first: higher score, then faster time. */
function board(id) {
  var rows = [];
  var playing = 0;
  readRows('Results').forEach(function (r) {
    if (String(r.EventId) !== id) return;
    if (r.SubmittedAt === '') { playing++; return; }
    rows.push({ name: String(r.Name), score: Number(r.Score), timeMs: Number(r.TimeMs) });
  });
  rows.sort(function (a, b) { return b.score - a.score || a.timeMs - b.timeMs; });
  return { rows: rows, playing: playing };
}

/* Running total of finished quizzes, kept in the Stats tab (cell B2). */
function readCompleted() {
  var values = sheet('Stats').getDataRange().getValues();
  return values.length > 1 ? Number(values[1][1]) || 0 : 0;
}

/* Call only while holding the lock. */
function bumpCompleted() {
  var sh = sheet('Stats');
  var n = readCompleted() + 1;
  if (sh.getLastRow() < 2) sh.appendRow(['QuizzesCompleted', n]);
  else sh.getRange(2, 2, 1, 1).setValues([[n]]);
  return n;
}

// ---- Helpers -------------------------------------------------------------

function findEvent(id) {
  var rows = readRows('Events');
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (String(r.EventId) === id) {
      return {
        id: String(r.EventId), title: String(r.Title), lang: r.Lang,
        from: Number(r.From), to: Number(r.To), count: Number(r.Count),
        types: String(r.Types).split(','), seed: Number(r.Seed)
      };
    }
  }
  throw new Error('EVENT_NOT_FOUND');
}

function sheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.appendRow(SHEETS[name]);
    sh.setFrozenRows(1);
  }
  return sh;
}

/* Adds a row with its leading id/name cells set to plain text first. Without
   that the sheet turns number-like text into numbers: the name "007" becomes 7,
   and an all-digit event id stops matching its own link. Call while holding the lock. */
var TEXT_COLS = { Events: 2, Results: 3 };
function addRow(name, row) {
  var sh = sheet(name);
  var at = sh.getLastRow() + 1;
  if (at > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 200);
  sh.getRange(at, 1, 1, TEXT_COLS[name]).setNumberFormat('@');
  sh.getRange(at, 1, 1, row.length).setValues([row]);
}

function readRows(name) {
  var values = sheet(name).getDataRange().getValues();
  var head = values[0];
  return values.slice(1).map(function (row) {
    var o = {};
    head.forEach(function (h, i) { o[h] = row[i]; });
    return o;
  });
}

function withLock(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

/* Trim, collapse spaces, cap the length. Leading = + - @ are dropped so a
   name can never be read by the sheet as a formula. */
function clean(value, max) {
  return String(value == null ? '' : value)
    .replace(/\s+/g, ' ')
    .replace(/^[=+\-@\s]+/, '')
    .trim()
    .slice(0, max)
    .trim();
}

function int(value, min, max, label) {
  var n = Number(value);
  if (n !== Math.floor(n) || n < min || n > max) throw new Error('Invalid ' + label);
  return n;
}

function randomId(len) {
  var chars = 'abcdefghjkmnpqrstuvwxyz23456789'; // no look-alikes (0/o, 1/l/i)
  var out = '';
  for (var i = 0; i < len; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
}
