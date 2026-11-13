/* Question generator. No DOM here, so it can be tested with plain node.
   Every call picks new random verses, blanks, splits and distractors. */
(function (root) {
  'use strict';

  /* Practice rounds use Math.random. A group event passes a seed, so every
     player's browser generates exactly the same questions. */
  let random = Math.random;
  function seeded(seed) {
    let a = seed >>> 0; // mulberry32
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = (n) => Math.floor(random() * n);
  const pick = (a) => a[rand(a.length)];
  const shuffle = (a) => {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = rand(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // \p{M} keeps Tamil vowel signs attached to the word
  const EDGE = /^[^\p{L}\p{N}\p{M}]+|[^\p{L}\p{N}\p{M}]+$/gu;
  const core = (w) => w.replace(EDGE, '');
  const words = (t) => t.trim().split(/\s+/);

  const STOP = new Set(
    ('the and that with for you your shall will not but are was were his him her they them their ' +
      'this from have has had who whom which when then than into unto upon also there here what ' +
      'does did been being those these thou thee thy our out all any nor yet its').split(' ')
  );

  function goodWord(w, lang) {
    const c = core(w);
    if (!c || /\d/.test(c)) return false;
    if (lang === 'en') return c.length >= 4 && !STOP.has(c.toLowerCase());
    return [...c].length >= 4;
  }

  const MIN_WORDS = { fill: 3, complete: 6, order: 4 };
  const eligible = (type, v) => words(v.text).length >= (MIN_WORDS[type] || 1);

  /* Other verses to use as wrong answers: mostly close neighbours (harder),
     topped up from anywhere. */
  function distractorVerses(v, all, k, ok) {
    const idx = v.n - 1;
    const fine = (o) => o !== v && o.text !== v.text && (!ok || ok(o));
    const near = shuffle(all.filter((o) => Math.abs(o.n - 1 - idx) <= 7 && fine(o))).slice(0, k - 1);
    const rest = shuffle(all.filter((o) => fine(o) && !near.includes(o)));
    return near.concat(rest).slice(0, k);
  }

  function choices(correct, wrong) {
    const options = shuffle([correct, ...wrong]);
    return { options, answer: options.indexOf(correct) };
  }

  function makeFill(v, all, lang) {
    const ws = words(v.text);
    let cand = ws.map((w, i) => i).filter((i) => i > 0 && goodWord(ws[i], lang));
    if (!cand.length) cand = ws.map((w, i) => i).filter((i) => core(ws[i]));
    const i = pick(cand);
    const ans = core(ws[i]);
    const at = ws[i].indexOf(ans);
    const own = new Set(ws.map((w) => core(w).toLowerCase()));
    const isCap = (s) => s[0] !== s[0].toLowerCase();
    const wrong = [];
    for (let tries = 0; wrong.length < 3 && tries < 600; tries++) {
      const w = core(pick(words(pick(all).text)));
      if (!goodWord(w, lang) || own.has(w.toLowerCase())) continue;
      if (wrong.some((x) => x.toLowerCase() === w.toLowerCase())) continue;
      if (tries < 300 && isCap(w) !== isCap(ans)) continue;
      wrong.push(w);
    }
    return {
      type: 'fill', v,
      before: ws.slice(0, i).join(' '),
      pre: ws[i].slice(0, at),
      post: ws[i].slice(at + ans.length),
      after: ws.slice(i + 1).join(' '),
      ...choices(ans, wrong),
    };
  }

  function makeRef(v, all) {
    return { type: 'ref', v, ...choices(v.ref, distractorVerses(v, all, 3).map((o) => o.ref)) };
  }

  function makeVerse(v, all) {
    return { type: 'verse', v, ...choices(v.text, distractorVerses(v, all, 3).map((o) => o.text)) };
  }

  function makeComplete(v, all) {
    const ws = words(v.text);
    const frac = 0.4 + random() * 0.2;
    const cut = Math.min(ws.length - 2, Math.max(2, Math.round(ws.length * frac)));
    const tail = ws.slice(cut).join(' ');
    const seen = new Set([tail]);
    const wrong = [];
    for (const o of distractorVerses(v, all, 12, (o) => words(o.text).length >= 4)) {
      const ow = words(o.text);
      const t = ow.slice(Math.min(ow.length - 2, Math.max(1, Math.round(ow.length * frac)))).join(' ');
      if (seen.has(t)) continue;
      seen.add(t);
      wrong.push(t);
      if (wrong.length === 3) break;
    }
    return { type: 'complete', v, start: ws.slice(0, cut).join(' '), ...choices(tail, wrong) };
  }

  function makeOrder(v) {
    const ws = words(v.text);
    let from = 0, len = ws.length;
    if (ws.length > 8) {
      len = 6 + rand(2);
      from = rand(ws.length - len + 1);
    }
    const answer = ws.slice(from, from + len);
    let chips = shuffle(answer);
    for (let t = 0; t < 10 && chips.join(' ') === answer.join(' '); t++) chips = shuffle(answer);
    return {
      type: 'order', v, answer, chips,
      before: ws.slice(0, from).join(' '),
      after: ws.slice(from + len).join(' '),
    };
  }

  const MAKERS = {
    fill: makeFill,
    ref: makeRef,
    verse: makeVerse,
    complete: makeComplete,
    order: makeOrder,
    flash: (v) => ({ type: 'flash', v }),
  };
  const TYPES = Object.keys(MAKERS);

  /* all: verses of one language; from/to: verse numbers (inclusive).
     seed: optional integer; the same seed always gives the same questions. */
  function buildSession(all, from, to, count, types, lang, seed, others) {
    random = seed == null ? Math.random : seeded(seed);
    try {
      return build(all, from, to, count, types, lang, seed, others || []);
    } finally {
      random = Math.random;
    }
  }

  /* others: the same verses in the other languages. A group event passes them
     so that the choice of verses and game types never depends on which language
     a player picked: every player gets the same verse and the same game at each
     step, whatever language they read it in. */
  function build(all, from, to, count, types, lang, seed, others) {
    const fits = (t, v) => eligible(t, v) && others.every((list) => eligible(t, list[v.n - 1]));
    const plan = random; // decides verse order and game types only
    const range = all.filter((v) => v.n >= from && v.n <= to);
    types = types.filter((t) => MAKERS[t]);
    if (!range.length || !types.length) return [];
    // leave out verses too short for every chosen game; if that leaves nothing, use them anyway
    const usable = range.filter((v) => types.some((t) => fits(t, v)));
    const pool = usable.length ? usable : range;
    const used = new Set();
    const tally = {};
    const out = [];
    let bag = [], last = null;
    while (out.length < count) {
      if (!bag.length) {
        bag = shuffle(pool);
        const end = bag.length - 1;
        if (end > 0 && bag[end] === last) [bag[0], bag[end]] = [bag[end], bag[0]];
      }
      const v = (last = bag.pop());
      // least-used game type first, so a mix stays balanced
      const order = shuffle(types).sort((a, b) => (tally[a] || 0) - (tally[b] || 0));
      const type =
        order.find((t) => fits(t, v) && !used.has(v.n + t)) ||
        order.find((t) => fits(t, v)) ||
        order[0]; // never a game type that was not chosen
      used.add(v.n + type);
      tally[type] = (tally[type] || 0) + 1;
      // each question draws from its own stream: how much randomness one language's
      // wording uses must not shift what comes next
      if (seed != null) random = seeded((seed + Math.imul(out.length + 1, 0x9e3779b1)) >>> 0);
      out.push(MAKERS[type](v, all, lang));
      random = plan;
    }
    return out;
  }

  root.Engine = { buildSession, TYPES, shuffle };
})(typeof window !== 'undefined' ? window : globalThis);
