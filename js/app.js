/* Screens
     practice:  setup -> game -> results
     group:     setup -> created (share link)
                #e=ID      join (enter name) -> game -> results + leaderboard
                #board=ID  leaderboard only
   Rendering is plain innerHTML; one delegated click handler reads data-act. */
(() => {
  'use strict';

  const DATA = window.VERSE_DATA;
  const Engine = window.Engine;
  const Api = window.Api;
  const MAXQ = 50;
  const TOTAL = DATA.en.length;
  const STORE = 'memoryVerses2026';
  const EVENT_TYPES = Engine.TYPES.filter((t) => t !== 'flash'); // flash card is self-marked
  const BOARD_REFRESH_MS = 20000;

  const $ = (sel) => document.querySelector(sel);
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clock = (ms) => {
    const sec = Math.round(ms / 1000);
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  };
  const store = {
    get(key, fallback) {
      try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage blocked */ }
    },
  };

  const STR = {
    en: {
      church: 'ACA Avadi Ministry',
      title: 'Memory Verses 2026',
      tagline: 'Quiz & games',
      sub: 'Pick your verses, choose how many questions, and practise. Every round is different.',
      from: 'From verse',
      to: 'To verse',
      inRange: (n) => (n === 1 ? '1 verse selected' : `${n} verses selected`),
      count: 'Number of questions',
      games: 'Game types',
      all: 'Select all',
      needType: 'Choose at least one game type.',
      start: 'Start practice',
      quit: '← Quit',
      question: (i, n) => `Question ${i} of ${n}`,
      score: 'Score',
      next: 'Next',
      finish: 'See results',
      check: 'Check',
      clear: 'Clear',
      tapWords: 'Tap the words below in the right order',
      correct: 'Correct!',
      wrong: 'Not quite',
      show: 'Show verse',
      knew: 'I knew it',
      notYet: 'Still learning',
      results: 'Your result',
      great: 'Well done!',
      good: 'Good work, keep going',
      keep: 'Keep practising',
      again: 'Play again',
      change: 'Change settings',
      review: 'Review',
      // group events
      group: 'Group quiz',
      groupSub: 'Create an event from the settings above and share its link. Everyone who opens it gets the same questions, in English or Tamil as they choose, and their scores go on one leaderboard.',
      flashNote: 'Flash card is self-marked, so it is left out of group events.',
      needEventType: 'Tick at least one game type other than Flash card.',
      notConfigured: 'Group events need a one-time Google Sheet setup. See README.md.',
      eventName: 'Event name',
      eventNameEg: 'e.g. Sunday School Quiz',
      create: 'Create event',
      working: 'Please wait…',
      failed: 'Something went wrong. Check your connection and try again.',
      created: 'Event created',
      shareHint: 'Share this link with your group',
      shareText: (t) => `Join the memory verse quiz “${t}”:`,
      invite: 'Send this quiz to others',
      copy: 'Copy link',
      copied: 'Copied!',
      share: 'Share',
      openQuiz: 'Open quiz',
      myEvents: 'Events created on this device',
      quiz: 'Quiz',
      board: 'Leaderboard',
      home: 'Practice',
      summary: (n, a, b) => `${n} questions · ${a} – ${b}`,
      myResult: 'My result',
      doneNote: 'You have completed this quiz. Each person can take it once.',
      language: 'Language',
      yourName: 'Your name',
      join: 'Start quiz',
      resumeAs: (name) => `Continue as ${name}`,
      nameTaken: 'That name is already used in this event. Add an initial or surname.',
      rule: 'Ranked by score, then by fastest time. The clock starts when you press Start.',
      name: 'Name',
      time: 'Time',
      nobody: 'No one has finished yet.',
      playing: (n) => (n === 1 ? '1 person still playing' : `${n} people still playing`),
      refresh: 'Refresh',
      you: 'you',
      sending: 'Sending your score…',
      sendFail: 'Your score could not be sent. Check your connection.',
      retry: 'Try again',
      completed: 'Quizzes completed',
      loading: 'Loading…',
      notFound: 'This event link is not valid.',
      loadFail: 'The event could not be loaded. Check your connection.',
      // memorize assistant
      memorize: 'Memorize',
      memoTag: 'Listen & repeat',
      memoSub: 'Choose the verses and how many times each one is read aloud. Verses that follow on from each other can be read together as one passage. Say it along with the voice.',
      repeat: 'Times to repeat each verse or passage',
      span: (a, b) => `${a} to ${b}`, // Genesis 1:26 to 28
      inPassages: (n) => (n === 1 ? 'read as 1 part' : `read as ${n} parts`),
      speed: 'Reading speed',
      rates: { slow: 'Slow', normal: 'Normal', fast: 'Fast' },
      groupVerses: 'Read verses that follow on as one passage',
      refMode: 'Read the reference',
      refModes: { all: 'Every time', first: 'First time only', off: 'Off' },
      listen: 'Start listening',
      pause: 'Pause',
      resume: 'Resume',
      stop: 'Stop',
      prevVerse: '← Previous',
      nextVerse: 'Next →',
      memoAt: (i, n, r, m) => `Part ${i} of ${n} · Time ${r} of ${m}`,
      memoDone: 'All done! Listen again, or stop and pick new verses.',
      listenAgain: 'Listen again',
      voiceFile: 'Recorded voice',
      voiceDevice: 'Phone’s voice',
      noSpeech: 'This browser cannot read aloud. Try Chrome, Edge or Safari.',
      noVoice: 'No English voice was found on this device, so it may read silently or wrongly.',
      types: {
        fill: ['Missing word', 'Pick the word that fills the blank'],
        ref: ['Where is it?', 'Pick the reference for the verse'],
        verse: ['Find the verse', 'Pick the verse for the reference'],
        complete: ['Finish the verse', 'Pick how the verse ends'],
        order: ['Word order', 'Put the scrambled words in order'],
        flash: ['Flash card', 'Say it from memory, then check yourself'],
      },
      ask: {
        fill: 'Which word is missing?',
        ref: 'Where is this verse found?',
        verse: 'Which verse is this?',
        complete: 'How does this verse end?',
        order: 'Put the words in the right order',
        flash: 'Say this verse from memory',
      },
    },
    ta: {
      church: 'ACA ஆவடி ஊழியம்',
      title: 'மனப்பாட வசனங்கள் 2026',
      tagline: 'வினாடி வினா & விளையாட்டுகள்',
      sub: 'வசனங்களையும் கேள்விகளின் எண்ணிக்கையையும் தேர்ந்தெடுத்துப் பயிற்சி செய்யுங்கள். ஒவ்வொரு முறையும் கேள்விகள் மாறும்.',
      from: 'எந்த வசனத்திலிருந்து',
      to: 'எந்த வசனம் வரை',
      inRange: (n) => `${n} வசனங்கள் தேர்ந்தெடுக்கப்பட்டன`,
      count: 'கேள்விகளின் எண்ணிக்கை',
      games: 'விளையாட்டு வகைகள்',
      all: 'அனைத்தும்',
      needType: 'குறைந்தது ஒரு விளையாட்டு வகையைத் தேர்ந்தெடுங்கள்.',
      start: 'பயிற்சியைத் தொடங்கு',
      quit: '← வெளியேறு',
      question: (i, n) => `கேள்வி ${i} / ${n}`,
      score: 'மதிப்பெண்',
      next: 'அடுத்தது',
      finish: 'முடிவுகளைப் பார்',
      check: 'சரிபார்',
      clear: 'அழி',
      tapWords: 'கீழே உள்ள சொற்களைச் சரியான வரிசையில் தொடுங்கள்',
      correct: 'சரி!',
      wrong: 'தவறு',
      show: 'வசனத்தைக் காட்டு',
      knew: 'எனக்குத் தெரிந்தது',
      notYet: 'இன்னும் படிக்க வேண்டும்',
      results: 'உங்கள் முடிவு',
      great: 'மிக அருமை!',
      good: 'நன்று, தொடர்ந்து முயலுங்கள்',
      keep: 'தொடர்ந்து பயிற்சி செய்யுங்கள்',
      again: 'மீண்டும் விளையாடு',
      change: 'அமைப்புகளை மாற்று',
      review: 'மீள்பார்வை',
      group: 'குழு வினாடி வினா',
      groupSub: 'மேலே உள்ள அமைப்புகளைக் கொண்டு ஒரு நிகழ்வை உருவாக்கி, அதன் இணைப்பைப் பகிருங்கள். இணைப்பைத் திறக்கும் அனைவருக்கும் ஒரே கேள்விகள் (ஆங்கிலம் அல்லது தமிழ், அவரவர் விருப்பப்படி); அனைவரின் மதிப்பெண்களும் ஒரே தரவரிசைப் பட்டியலில் வரும்.',
      flashNote: 'நினைவு அட்டை சுய மதிப்பீடு என்பதால் குழு நிகழ்வுகளில் சேர்க்கப்படாது.',
      needEventType: 'நினைவு அட்டை தவிர குறைந்தது ஒரு விளையாட்டு வகையைத் தேர்ந்தெடுங்கள்.',
      notConfigured: 'குழு நிகழ்வுகளுக்கு ஒருமுறை Google Sheet அமைப்பு தேவை. README.md பார்க்கவும்.',
      eventName: 'நிகழ்வின் பெயர்',
      eventNameEg: 'எ.கா. ஞாயிறு பள்ளி வினாடி வினா',
      create: 'நிகழ்வை உருவாக்கு',
      working: 'காத்திருக்கவும்…',
      failed: 'ஏதோ தவறு ஏற்பட்டது. இணைய இணைப்பைச் சரிபார்த்து மீண்டும் முயலுங்கள்.',
      created: 'நிகழ்வு உருவாக்கப்பட்டது',
      shareHint: 'இந்த இணைப்பை உங்கள் குழுவுடன் பகிருங்கள்',
      shareText: (t) => `“${t}” மனப்பாட வசன வினாடி வினாவில் சேருங்கள்:`,
      invite: 'இந்த வினாடி வினாவை மற்றவர்களுக்கு அனுப்புங்கள்',
      copy: 'இணைப்பை நகலெடு',
      copied: 'நகலெடுக்கப்பட்டது!',
      share: 'பகிர்',
      openQuiz: 'வினாடி வினாவைத் திற',
      myEvents: 'இந்தச் சாதனத்தில் உருவாக்கிய நிகழ்வுகள்',
      quiz: 'வினாடி வினா',
      board: 'தரவரிசைப் பட்டியல்',
      home: 'பயிற்சி',
      summary: (n, a, b) => `${n} கேள்விகள் · ${a} – ${b}`,
      myResult: 'என் முடிவு',
      doneNote: 'நீங்கள் இந்த வினாடி வினாவை முடித்துவிட்டீர்கள். ஒருவர் ஒருமுறை மட்டுமே பங்கேற்கலாம்.',
      language: 'மொழி',
      yourName: 'உங்கள் பெயர்',
      join: 'தொடங்கு',
      resumeAs: (name) => `${name} ஆகத் தொடரவும்`,
      nameTaken: 'இந்தப் பெயர் இந்த நிகழ்வில் ஏற்கனவே பயன்படுத்தப்பட்டுள்ளது. முதலெழுத்தையோ குடும்பப் பெயரையோ சேர்க்கவும்.',
      rule: 'மதிப்பெண், பின்னர் குறைந்த நேரம் அடிப்படையில் தரவரிசை. தொடங்கு என்பதை அழுத்தியதும் நேரம் தொடங்கும்.',
      name: 'பெயர்',
      time: 'நேரம்',
      nobody: 'இதுவரை யாரும் முடிக்கவில்லை.',
      playing: (n) => `${n} பேர் இன்னும் விளையாடுகிறார்கள்`,
      refresh: 'புதுப்பி',
      you: 'நீங்கள்',
      sending: 'உங்கள் மதிப்பெண் அனுப்பப்படுகிறது…',
      sendFail: 'உங்கள் மதிப்பெண்ணை அனுப்ப முடியவில்லை. இணைய இணைப்பைச் சரிபார்க்கவும்.',
      retry: 'மீண்டும் முயல்',
      completed: 'முடிக்கப்பட்ட வினாடி வினாக்கள்',
      loading: 'ஏற்றப்படுகிறது…',
      notFound: 'இந்த நிகழ்வு இணைப்பு செல்லுபடியாகாது.',
      loadFail: 'நிகழ்வை ஏற்ற முடியவில்லை. இணைய இணைப்பைச் சரிபார்க்கவும்.',
      memorize: 'மனப்பாடம்',
      memoTag: 'கேட்டுத் திரும்பச் சொல்லுங்கள்',
      memoSub: 'வசனங்களையும், ஒவ்வொன்றும் எத்தனை முறை வாசிக்கப்பட வேண்டும் என்பதையும் தேர்ந்தெடுங்கள். தொடர்ச்சியாக வரும் வசனங்களை ஒரே பகுதியாகச் சேர்த்து வாசிக்கலாம். குரலுடன் சேர்ந்து சொல்லுங்கள்.',
      repeat: 'ஒவ்வொரு வசனமும் அல்லது பகுதியும் எத்தனை முறை',
      span: (a, b) => `${a} முதல் ${b} வரை`,
      inPassages: (n) => `${n} பகுதிகளாக வாசிக்கப்படும்`,
      speed: 'வாசிக்கும் வேகம்',
      rates: { slow: 'மெதுவாக', normal: 'சாதாரணம்', fast: 'வேகமாக' },
      groupVerses: 'தொடர்ச்சியான வசனங்களை ஒரே பகுதியாக வாசிக்கவும்',
      refMode: 'வசன முகவரியை வாசிக்க',
      refModes: { all: 'ஒவ்வொரு முறையும்', first: 'முதல் முறை மட்டும்', off: 'வேண்டாம்' },
      listen: 'கேட்கத் தொடங்கு',
      pause: 'இடைநிறுத்து',
      resume: 'தொடர்',
      stop: 'நிறுத்து',
      prevVerse: '← முந்தையது',
      nextVerse: 'அடுத்தது →',
      memoAt: (i, n, r, m) => `பகுதி ${i} / ${n} · ${r} / ${m} முறை`,
      memoDone: 'முடிந்தது! மீண்டும் கேளுங்கள், அல்லது நிறுத்திப் புதிய வசனங்களைத் தேர்ந்தெடுங்கள்.',
      listenAgain: 'மீண்டும் கேள்',
      voiceFile: 'பதிவு செய்யப்பட்ட குரல்',
      voiceDevice: 'சாதனத்தின் குரல்',
      noSpeech: 'இந்த உலாவியால் சத்தமாக வாசிக்க முடியாது. Chrome, Edge அல்லது Safari-ஐப் பயன்படுத்துங்கள்.',
      // always shown on the Tamil memorize screen: a missing Tamil voice cannot be detected reliably
      voiceHelp: {
        title: 'தமிழ் கேட்கவில்லையா? எண்கள் மட்டும் கேட்கிறதா?',
        intro: 'அப்படியானால் உங்கள் சாதனத்தில் தமிழ்க் குரல் இல்லை. ஒருமுறை இதைச் செய்யுங்கள்:',
        steps: [
          'Android: Settings › System › Languages & input › Text-to-speech output › “Speech Services by Google” அருகிலுள்ள ⚙ › Install voice data › தமிழ். பிறகு இந்தப் பக்கத்தை மீண்டும் திறக்கவும்.',
          'Windows கணினி: Chrome-க்குப் பதிலாக Edge உலாவியைப் பயன்படுத்துங்கள்.',
          'iPhone: Settings › Accessibility › Spoken Content › Voices › Tamil என்பதில் ஒரு குரலைப் பதிவிறக்கவும்.',
        ],
      },
      types: {
        fill: ['விடுபட்ட சொல்', 'விடுபட்ட சொல்லைத் தேர்ந்தெடுங்கள்'],
        ref: ['வசனம் எங்கே?', 'வசனத்திற்குரிய முகவரியைத் தேர்ந்தெடுங்கள்'],
        verse: ['வசனத்தைக் கண்டுபிடி', 'முகவரிக்குரிய வசனத்தைத் தேர்ந்தெடுங்கள்'],
        complete: ['வசனத்தை முடி', 'வசனத்தின் மீதிப் பகுதியைத் தேர்ந்தெடுங்கள்'],
        order: ['சொல் வரிசை', 'கலைந்த சொற்களை வரிசைப்படுத்துங்கள்'],
        flash: ['நினைவு அட்டை', 'மனப்பாடமாகச் சொல்லி, நீங்களே சரிபாருங்கள்'],
      },
      ask: {
        fill: 'விடுபட்ட சொல் எது?',
        ref: 'இந்த வசனம் எங்கே உள்ளது?',
        verse: 'இது எந்த வசனம்?',
        complete: 'இந்த வசனம் எப்படி முடிகிறது?',
        order: 'சொற்களைச் சரியான வரிசையில் அடுக்குங்கள்',
        flash: 'இந்த வசனத்தை மனப்பாடமாகச் சொல்லுங்கள்',
      },
    },
  };

  /* ---- State ------------------------------------------------------------ */
  const MAX_REPEAT = 20;
  const RATES = { slow: 0.75, normal: 1, fast: 1.25 };
  const REF_MODES = ['all', 'first', 'off']; // read the reference: every repetition, the first only, never
  const settings = {
    lang: 'en', from: 1, to: TOTAL, count: 10, types: ['fill', 'complete', 'order'],
    repeat: 3, rate: 'normal', refMode: 'all', group: true, // memorize assistant
  };
  {
    const saved = store.get(STORE, {});
    const int = (x, lo, hi, d) => (Number.isInteger(x) && x >= lo && x <= hi ? x : d);
    if (saved.lang === 'en' || saved.lang === 'ta') settings.lang = saved.lang;
    settings.from = int(saved.from, 1, TOTAL, 1);
    settings.to = int(saved.to, settings.from, TOTAL, TOTAL);
    settings.count = int(saved.count, 1, MAXQ, 10);
    settings.repeat = int(saved.repeat, 1, MAX_REPEAT, 3);
    if (saved.rate in RATES) settings.rate = saved.rate;
    if (typeof saved.group === 'boolean') settings.group = saved.group;
    if (REF_MODES.includes(saved.refMode)) settings.refMode = saved.refMode;
    else if (saved.sayRef === false) settings.refMode = 'off'; // setting saved by the older on/off tick box
    if (Array.isArray(saved.types)) {
      const types = Engine.TYPES.filter((t) => saved.types.includes(t));
      if (types.length) settings.types = types;
    }
  }
  const save = () => store.set(STORE, settings);

  let view = 'setup';  // setup | memo | created | loading | error | join | game | results | board
  let game = null;     // { qs, i, score }
  let event = null;    // the group event being viewed: { id, title, lang, from, to, count, types, seed }
  let board = null;    // { rows: [{ name, score, timeMs }], playing }
  let player = null;   // this device's entry in the event: { name, token, start, answers, done, score, timeMs, sent, event }
  let notice = '';     // error text for the current form
  let busy = false;    // a request is in flight
  let sendState = '';  // '' | sending | failed
  let errorText = '';
  let completed = null; // quizzes finished by everyone (practice + events); null until loaded
  let joinLang = '';    // language picked on the join screen, before the player record exists
  let routeSeq = 0;     // counts navigations, so a slow load can tell it has been overtaken
  let booted = false;  // false during the first paint, so the page does not jump past the logo

  // An event is always played in the language it was created in.
  // In an event each player reads in the language they picked when joining.
  const eventLang = () => (player && player.lang) || joinLang || event.lang;
  const lang = () => (event && view !== 'setup' && view !== 'created' ? eventLang() : settings.lang);
  const L = () => STR[lang()];
  const playerKey = (id) => `${STORE}:event:${id}`;
  const savePlayer = () => store.set(playerKey(event.id), player);
  const eventUrl = (id, kind) => `${location.origin}${location.pathname}#${kind || 'e'}=${id}`;

  /* The home-page counter. Failures are silent: it is only a nice-to-have. */
  async function countQuizzes(action) {
    if (!Api.ready()) return;
    try {
      completed = (await Api.call(action)).completed;
      if (view === 'setup') $('#hero').innerHTML = heroHtml();
    } catch (e) { /* leave the last known number */ }
  }

  /* Group quizzes created on this device. Kept on the device only, on purpose:
     each device has its own list and nothing is shared between them. */
  function eventsListHtml() {
    const s = L();
    const list = store.get(`${STORE}:created`, []);
    if (!list.length) return '';
    return `<div class="field"><span>${esc(s.myEvents)}</span>
      <ul class="rows">${list.map((m) => `
        <li class="row-head"><strong>${esc(m.title)}</strong>
          <span class="row-links"><a href="#e=${esc(m.id)}">${esc(s.quiz)}</a><a href="#board=${esc(m.id)}">${esc(s.board)}</a></span>
        </li>`).join('')}</ul>
    </div>`;
  }

  /* ---- Setup screen ----------------------------------------------------- */
  function setupHtml() {
    const s = L();
    const all = DATA[settings.lang];
    const opts = (sel) =>
      all.map((v) => `<option value="${v.n}"${v.n === sel ? ' selected' : ''}>${v.n}. ${esc(v.ref)}</option>`).join('');
    const types = Engine.TYPES.map((t) => `
      <label class="type">
        <input type="checkbox" name="type" value="${t}"${settings.types.includes(t) ? ' checked' : ''}>
        <span><strong>${esc(s.types[t][0])}</strong><small>${esc(s.types[t][1])}</small></span>
      </label>`).join('');
    return `<div class="narrow stack">
    <form class="card stack" id="setup">
      <div class="field">
        <div class="field-pair">
          <label class="field"><span>${esc(s.from)}</span><select name="from">${opts(settings.from)}</select></label>
          <label class="field"><span>${esc(s.to)}</span><select name="to">${opts(settings.to)}</select></label>
        </div>
        <small id="in-range"></small>
      </div>
      <label class="field">
        <span class="count-label">${esc(s.count)} <output id="count-out">${settings.count}</output></span>
        <input type="range" name="count" min="1" max="${MAXQ}" step="1" value="${settings.count}">
        <span class="range-ends"><span>1</span><span>${MAXQ}</span></span>
      </label>
      <fieldset class="field">
        <legend>${esc(s.games)} <button type="button" class="link-button" data-act="all">${esc(s.all)}</button></legend>
        <div class="type-grid">${types}</div>
        <small id="need-type" hidden>${esc(s.needType)}</small>
      </fieldset>
      <div class="button-row end"><button class="button primary" id="start">${esc(s.start)}</button></div>
    </form>
    <form class="card stack" id="event-form">
      <div class="field"><h2>${esc(s.group)}</h2><p>${esc(s.groupSub)}</p><small>${esc(s.flashNote)}</small></div>
      ${Api.ready() ? '' : `<div class="flash flash-info">${esc(s.notConfigured)}</div>`}
      <label class="field"><span>${esc(s.eventName)}</span>
        <input type="text" name="title" maxlength="60" required placeholder="${esc(s.eventNameEg)}" autocomplete="off"></label>
      ${notice ? `<div class="flash flash-error" role="alert">${esc(notice)}</div>` : ''}
      <div class="button-row end"><button class="button" id="create"${busy || !Api.ready() ? ' disabled' : ''}>${esc(busy ? s.working : s.create)}</button></div>
      ${eventsListHtml()}
    </form></div>`;
  }

  function syncSetup() {
    $('#in-range').textContent = L().inRange(settings.to - settings.from + 1);
    $('#count-out').textContent = settings.count;
    const none = settings.types.length === 0;
    $('#need-type').hidden = !none;
    $('#start').disabled = none;
  }

  function onSetupInput(e) {
    const form = e.target.closest ? e.target.closest('form') : null;
    if (!form || (form.id !== 'setup' && form.id !== 'memo-form')) return;
    const name = e.target.name;
    if (name === 'from' || name === 'to') {
      settings[name] = Number(e.target.value);
      // keep the range valid by dragging the other end along
      if (settings.from > settings.to) {
        const other = name === 'from' ? 'to' : 'from';
        settings[other] = settings[name];
        form.elements[other].value = settings[name];
      }
    } else if (name === 'count') {
      settings.count = Math.min(MAXQ, Math.max(1, Number(e.target.value) || 1));
    } else if (name === 'type') {
      const on = [...form.querySelectorAll('input[name="type"]:checked')].map((el) => el.value);
      settings.types = Engine.TYPES.filter((t) => on.includes(t));
    } else if (name === 'repeat') {
      settings.repeat = Math.min(MAX_REPEAT, Math.max(1, Number(e.target.value) || 1));
    } else if (name === 'rate') {
      if (e.target.value in RATES) settings.rate = e.target.value;
    } else if (name === 'group') {
      settings.group = e.target.checked;
    } else if (name === 'refMode') {
      if (REF_MODES.includes(e.target.value)) settings.refMode = e.target.value;
    }
    save();
    if (form.id === 'setup') syncSetup();
    else syncMemo();
  }

  /* ---- Memorize assistant ----------------------------------------------
     Reads the range aloud one passage at a time, each `repeat` times, then
     moves on. A passage is a run of verses that follow on from each other in
     the same chapter (Genesis 1:26, 27, 28); a verse on its own is a passage
     of one. Uses the browser's own speech (Web Speech API), so nothing is
     downloaded. */
  const synth = window.speechSynthesis || null;
  let memo = null;      // { list (passages), reps, i, r, k (verse being read, -1 = reference), paused, done, token }; null while choosing settings
  let memoTimer = 0;
  let memoUtter = null; // keeps the utterance alive: Chrome can lose the end event of a collected one
  let wakeLock = null;

  function pickVoice(code) {
    if (!synth) return null;
    const voices = synth.getVoices();
    const tag = (v) => v.lang.replace('_', '-').toLowerCase();
    const want = code === 'ta' ? ['ta-in', 'ta'] : ['en-in', 'en-gb', 'en-us', 'en'];
    for (const w of want) {
      const v = voices.find((x) => tag(x) === w || (w.length === 2 && tag(x).startsWith(`${w}-`)));
      if (v) return v;
    }
    return null;
  }

  /* "Isaiah 40:6b" -> { book, chapter, verse: 6, label: "6b" } */
  function parseRef(ref) {
    const m = /^(.*?)\s+(\d+):(\d+)([a-z]?)$/.exec(ref);
    return m ? { book: m[1], chapter: Number(m[2]), verse: Number(m[3]), label: m[3] + m[4] } : null;
  }

  /* The chosen range as passages: { ref, verses, labels }. With grouping on, verses that
     follow on from each other share a passage; with it off, every verse is its own. */
  function memoParts() {
    const list = DATA[settings.lang].slice(settings.from - 1, settings.to);
    return settings.group ? passages(list, settings.lang) : list.map((v) => ({ ref: v.ref, verses: [v], labels: [''] }));
  }

  function passages(list, code) {
    const out = [];
    let prev = null;
    list.forEach((v) => {
      const at = parseRef(v.ref);
      const follows = at && prev && at.book === prev.book && at.chapter === prev.chapter && at.verse === prev.verse + 1;
      if (follows) {
        const p = out[out.length - 1];
        p.verses.push(v);
        p.labels.push(at.label);
        p.ref = STR[code].span(p.verses[0].ref, at.label);
      } else {
        out.push({ ref: v.ref, verses: [v], labels: [at ? at.label : ''] });
      }
      prev = at;
    });
    return out;
  }

  /* Short pieces, cut at punctuation: Chrome stops speaking part way through a long utterance. */
  function speechChunks(text) {
    const parts = text.match(/[^.;:!?,]+[.;:!?,”’"']*\s*/g) || [text];
    const out = [];
    let cur = '';
    parts.forEach((p) => {
      if (cur && (cur + p).length > 160) {
        out.push(cur.trim());
        cur = '';
      }
      cur += p;
    });
    if (cur.trim()) out.push(cur.trim());
    return out;
  }

  /* Keep the screen on while it is reading; ignored where unsupported. */
  async function keepAwake(on) {
    try {
      if (on && !wakeLock && navigator.wakeLock) {
        const lock = await navigator.wakeLock.request('screen');
        lock.addEventListener('release', () => { if (wakeLock === lock) wakeLock = null; });
        wakeLock = lock;
      } else if (!on && wakeLock) {
        const lock = wakeLock;
        wakeLock = null;
        await lock.release();
      }
    } catch (e) { /* not allowed right now */ }
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && memo && !memo.paused && !memo.done) keepAwake(true); // the lock is dropped when the tab is hidden
  });

  /* Silence whatever is being read. Bumping the token makes its callbacks do nothing. */
  function memoHalt() {
    if (memo) memo.token++;
    clearTimeout(memoTimer);
    if (synth) synth.cancel();
    memoAudio.pause();
  }

  /* Pre-made audio (tools/make_audio.py). A verse or reference listed in js/audio.js is
     played from its file, which sounds the same on every device; anything else is read
     by the phone's own voice. */
  const AUDIO = window.AUDIO || {};
  const memoAudio = new Audio(); // one element for every clip: once a tap has started it, iPhones let it play the rest
  let audioUnlocked = false;
  const SILENCE = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
  const pad3 = (n) => String(n).padStart(3, '0');
  const has = (kind, key) => !!(AUDIO[settings.lang] && AUDIO[settings.lang][kind].includes(key));
  const clip = (name) => `assets/audio/${settings.lang}/${name}.mp3`;
  const verseSrc = (v) => (has('verses', v.n) ? clip(`v${pad3(v.n)}`) : '');
  /* The clips that make up a reference, or [] if any is missing. One verse: its own clip.
     A passage is stitched: first reference + "to" + last verse number (+ closing word),
     e.g. "Genesis 1, 26" "to" "28", so no clip is needed per range. */
  function refSrc(p) {
    const list = AUDIO[settings.lang];
    const first = p.verses[0].n;
    if (!has('refs', first)) return [];
    if (p.verses.length === 1) return [clip(`r${pad3(first)}`)];
    const last = parseInt(p.labels[p.labels.length - 1], 10);
    if (!list.to || !has('nums', last)) return [];
    return [clip(`r${pad3(first)}`), clip('to'), clip(`n${pad3(last)}`)].concat(list.end ? [clip('end')] : []);
  }
  const anyAudio = () => !!(AUDIO[settings.lang] && AUDIO[settings.lang].verses.length);

  function memoClose() {
    memoHalt();
    memo = null;
    keepAwake(false);
  }

  function memoStart() {
    if (!synth && !anyAudio()) return;
    memoHalt();
    memo = {
      list: memoParts(),
      reps: settings.repeat, i: 0, r: 0, k: -1, paused: false, done: false, token: 0,
    };
    keepAwake(true);
    render(true);
    memoPlay();
  }

  /* Show which verse of the passage is being read, without redrawing the screen. */
  function memoMark() {
    document.querySelectorAll('.memo-verse .verse').forEach((el) => {
      const now = Number(el.dataset.k) === memo.k && memo.list[memo.i].verses.length > 1;
      el.classList.toggle('now', now);
      if (now) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }

  /* Say on the player which voice is reading, without redrawing the screen. */
  function memoVoice(fromFile) {
    memo.fromFile = fromFile;
    const el = $('#memo-voice');
    if (el) el.textContent = fromFile ? L().voiceFile : L().voiceDevice;
  }

  /* Read the current passage once, then count the repetition and carry on.
     fromVerse: where to pick up after a pause (0 = from the top, with the reference). */
  function memoPlay(fromVerse) {
    const token = ++memo.token;
    const p = memo.list[memo.i];
    const start = Math.max(0, fromVerse || 0);
    const sayRef = start === 0 && (settings.refMode === 'all' || (settings.refMode === 'first' && memo.r === 0));
    // Each line is one thing to play: { k, src } for an audio file (with `texts` to fall
    // back on), or { k, text } for the phone's voice. k = verse index, -1 for the reference.
    // A reference may be several files in a row (see refSrc).
    const spoken = (texts, k) => texts.map((text) => ({ text, k }));
    const add = (src, texts, k) => (src ? lines.push({ src, texts, k, rest: 0 }) : lines.push(...spoken(texts, k)));
    const lines = [];
    if (sayRef) {
      const refText = [p.ref.replace(/(\d+):(\d+)/, '$1, $2')]; // "1:26" is read as a clock time by some voices
      const pieces = refSrc(p);
      // `rest` = pieces of this reference still to come: if one fails, the phone's voice
      // reads the whole reference once and those are dropped
      if (pieces.length) pieces.forEach((src, j) => lines.push({ src, texts: refText, k: -1, rest: pieces.length - 1 - j }));
      else lines.push(...spoken(refText, -1));
    }
    p.verses.slice(start).forEach((v, j) => add(verseSrc(v), speechChunks(v.text), start + j));
    const voice = pickVoice(settings.lang);
    let n = 0;
    const step = () => {
      if (!memo || memo.token !== token) return;
      if (n >= lines.length) {
        memoTimer = setTimeout(() => memoAdvance(token), memo.r + 1 < memo.reps ? 800 : 1600);
        return;
      }
      const line = lines[n++];
      if (line.k !== memo.k) {
        memo.k = line.k;
        memoMark();
      }
      if (line.src) {
        // a file that will not load or play is read by the phone's voice instead
        let failed = false;
        const fallBack = () => {
          if (failed || !memo || memo.token !== token) return;
          failed = true;
          lines.splice(n, line.rest, ...spoken(line.texts, line.k));
          step();
        };
        memoVoice(true);
        memoAudio.onended = step;
        memoAudio.onerror = fallBack;
        memoAudio.src = line.src;
        memoAudio.defaultPlaybackRate = memoAudio.playbackRate = RATES[settings.rate]; // setting src resets the speed
        const started = memoAudio.play();
        if (started) started.then(() => { audioUnlocked = true; }, fallBack);
        return;
      }
      if (!synth) return void (memoTimer = setTimeout(step, 0)); // nothing can read this line here
      memoVoice(false);
      const u = new SpeechSynthesisUtterance(line.text);
      u.lang = voice ? voice.lang : settings.lang === 'ta' ? 'ta-IN' : 'en-IN';
      if (voice) u.voice = voice;
      u.rate = RATES[settings.rate];
      u.onend = step;
      u.onerror = step;
      memoUtter = u;
      synth.speak(u);
    };
    // Still inside the tap here. If a file comes later but the first line is spoken, start
    // the audio element now with a moment of silence, or iPhones refuse the file later.
    if (!audioUnlocked && !lines[0].src && anyAudio()) {
      memoAudio.onended = memoAudio.onerror = null;
      memoAudio.src = SILENCE;
      const started = memoAudio.play();
      if (started) started.then(() => { audioUnlocked = true; }, () => {});
    }
    if (synth && (synth.speaking || synth.pending)) {
      synth.cancel();
      memoTimer = setTimeout(step, 80); // Chrome can drop a speak() made straight after cancel()
    } else {
      step(); // straight from the tap: iPhones refuse speech that starts from a timer
    }
  }

  function memoAdvance(token) {
    if (!memo || memo.token !== token) return;
    memo.r++;
    memo.k = -1;
    if (memo.r >= memo.reps) {
      if (memo.i === memo.list.length - 1) {
        memo.done = true;
        keepAwake(false);
        return render();
      }
      memo.r = 0;
      memo.i++;
    }
    render();
    memoPlay();
  }

  function memoJump(by) {
    memoHalt();
    memo.i = Math.min(memo.list.length - 1, Math.max(0, memo.i + by));
    memo.r = 0;
    memo.k = -1;
    memo.done = false;
    render();
    if (!memo.paused) {
      keepAwake(true);
      memoPlay();
    }
  }

  function syncMemo() {
    $('#in-range').textContent = `${L().inRange(settings.to - settings.from + 1)}, ${L().inPassages(memoParts().length)}`;
    $('#repeat-out').textContent = settings.repeat;
  }

  function memoHtml() {
    const s = L();
    if (memo) {
      const p = memo.list[memo.i];
      const n = memo.list.length;
      const many = p.verses.length > 1;
      const first = p.verses[0].n;
      const verses = p.verses.map((v, j) =>
        `<p class="verse${many && j === memo.k ? ' now' : ''}" data-k="${j}">${many ? `<sup>${esc(p.labels[j])}</sup> ` : ''}${esc(v.text)}</p>`).join('');
      const doneReps = memo.done ? memo.reps : memo.r;
      const dots = Array.from({ length: memo.reps }, (x, j) =>
        `<i class="${j < doneReps ? 'on' : j === doneReps && !memo.paused ? 'now' : ''}"></i>`).join('');
      const total = n * memo.reps;
      const at = memo.i * memo.reps + doneReps;
      const buttons = memo.done
        ? `<button type="button" class="button primary" data-act="memoAgain">${esc(s.listenAgain)}</button>`
        : memo.paused
          ? `<button type="button" class="button primary" data-act="memoResume">${esc(s.resume)}</button>`
          : `<button type="button" class="button primary" data-act="memoPause">${esc(s.pause)}</button>`;
      return `<div class="narrow stack">
        <div class="card stack">
          <div class="field">
            <span class="count-label">${esc(s.memoAt(memo.i + 1, n, Math.min(doneReps + 1, memo.reps), memo.reps))}
              <small class="badge badge-voice" id="memo-voice">${memo.fromFile == null ? '' : esc(memo.fromFile ? s.voiceFile : s.voiceDevice)}</small></span>
            <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${at}">
              <i style="width:${(at / total) * 100}%"></i></div>
          </div>
          <div class="stack memo-verse">
            <h2 class="ref">${many ? `${first}–${first + p.verses.length - 1}` : first}. ${esc(p.ref)}</h2>
            ${verses}
            <div class="reps" aria-hidden="true">${dots}</div>
          </div>
          ${memo.done ? `<div class="flash flash-ok" role="status">${esc(s.memoDone)}</div>` : ''}
          <div class="button-row">
            ${buttons}
            <button type="button" class="button" data-act="memoPrev"${memo.i === 0 ? ' disabled' : ''}>${esc(s.prevVerse)}</button>
            <button type="button" class="button" data-act="memoNext"${memo.i === n - 1 ? ' disabled' : ''}>${esc(s.nextVerse)}</button>
            <button type="button" class="button ghost" data-act="memoStop">${esc(s.stop)}</button>
          </div>
        </div></div>`;
    }
    const all = DATA[settings.lang];
    const opts = (sel) =>
      all.map((v) => `<option value="${v.n}"${v.n === sel ? ' selected' : ''}>${v.n}. ${esc(v.ref)}</option>`).join('');
    const rates = Object.keys(RATES).map((r) =>
      `<option value="${r}"${settings.rate === r ? ' selected' : ''}>${esc(s.rates[r])}</option>`).join('');
    // an empty list only means the voices have not loaded yet
    const noVoice = synth && synth.getVoices().length > 0 && !pickVoice(settings.lang);
    const warn = !synth ? s.noSpeech : noVoice && s.noVoice ? s.noVoice : '';
    const help = synth && s.voiceHelp ? `<div class="flash flash-info">
        <p><strong>${esc(s.voiceHelp.title)}</strong></p><p>${esc(s.voiceHelp.intro)}</p>
        <ul class="bullets">${s.voiceHelp.steps.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>` : '';
    return `<div class="narrow stack">
    <form class="card stack" id="memo-form">
      <div class="field">
        <div class="field-pair">
          <label class="field"><span>${esc(s.from)}</span><select name="from">${opts(settings.from)}</select></label>
          <label class="field"><span>${esc(s.to)}</span><select name="to">${opts(settings.to)}</select></label>
        </div>
        <small id="in-range"></small>
      </div>
      <label class="field">
        <span class="count-label">${esc(s.repeat)} <output id="repeat-out">${settings.repeat}</output></span>
        <input type="range" name="repeat" min="1" max="${MAX_REPEAT}" step="1" value="${settings.repeat}">
        <span class="range-ends"><span>1</span><span>${MAX_REPEAT}</span></span>
      </label>
      <label class="field"><span>${esc(s.speed)}</span><select name="rate">${rates}</select></label>
      <label class="check"><input type="checkbox" name="group"${settings.group ? ' checked' : ''}> <span>${esc(s.groupVerses)}</span></label>
      <label class="field"><span>${esc(s.refMode)}</span><select name="refMode">${REF_MODES.map((m) =>
        `<option value="${m}"${settings.refMode === m ? ' selected' : ''}>${esc(s.refModes[m])}</option>`).join('')}</select></label>
      ${warn ? `<div class="flash flash-info" role="status">${esc(warn)}</div>` : ''}
      <div class="button-row end"><button class="button primary"${synth || anyAudio() ? '' : ' disabled'}>${esc(s.listen)}</button></div>
    </form>${help}</div>`;
  }
  // voices arrive late in Chrome; refresh the "no voice" note once they are known
  if (synth && synth.addEventListener) {
    synth.addEventListener('voiceschanged', () => { if (view === 'memo' && !memo) render(); });
  }

  /* ---- Group events ----------------------------------------------------- */
  async function createEvent(title) {
    const types = settings.types.filter((t) => EVENT_TYPES.includes(t));
    const keepTitle = () => { $('#event-form').elements.title.value = title; }; // render() rebuilds the form
    if (!types.length) {
      notice = L().needEventType;
      render();
      return keepTitle();
    }
    busy = true;
    notice = '';
    render();
    keepTitle();
    try {
      const res = await Api.call('createEvent', {
        title, lang: settings.lang, from: settings.from, to: settings.to, count: settings.count, types,
      });
      event = res.event;
      const mine = store.get(`${STORE}:created`, []);
      mine.unshift({ id: event.id, title: event.title });
      store.set(`${STORE}:created`, mine.slice(0, 20));
      view = 'created';
    } catch (e) {
      notice = L().failed;
    }
    busy = false;
    render(view === 'created');
    if (view === 'setup') keepTitle();
  }

  /* The event's quiz link with copy / share / WhatsApp. Shown when an event is created,
     and again on its leaderboard and result pages so it can be sent on later. */
  function shareHtml(heading, primary) {
    const s = L();
    const url = eventUrl(event.id);
    const text = `${s.shareText(event.title)} ${url}`;
    return `<div class="card stack">
        <div class="field"><span>${esc(heading)}</span>
          <input type="text" id="link" readonly value="${esc(url)}" onfocus="this.select()"></div>
        <div class="button-row">
          <button type="button" class="button${primary ? ' primary' : ''}" data-act="copy">${esc(s.copy)}</button>
          ${navigator.share ? `<button type="button" class="button" data-act="share">${esc(s.share)}</button>` : ''}
          <a class="button" href="https://wa.me/?text=${encodeURIComponent(text)}" target="_blank" rel="noopener">WhatsApp</a>
        </div>
        <p>${esc(eventSummary())}</p>
      </div>`;
  }

  function createdHtml() {
    const s = L();
    return `<div class="narrow stack">
      ${shareHtml(s.shareHint, true)}
      <div class="button-row">
        <a class="button ghost" href="#e=${esc(event.id)}">${esc(s.openQuiz)}</a>
        <a class="button ghost" href="#board=${esc(event.id)}">${esc(s.board)}</a>
      </div>
    </div>`;
  }

  function eventSummary() {
    const all = DATA[lang()];
    return L().summary(event.count, all[event.from - 1].ref, all[event.to - 1].ref);
  }

  /* Hash routes: #e=ID opens the quiz, #board=ID the leaderboard. */
  async function route() {
    const m = /^#(e|board)=([a-z0-9]+)$/i.exec(location.hash);
    game = null;
    notice = '';
    sendState = '';
    memoClose(); // leaving the memorize screen stops the voice
    if (!m) {
      routeSeq++;
      event = board = player = null;
      view = location.hash === '#memorize' ? 'memo' : 'setup';
      render(true);
      if (view === 'setup') countQuizzes('stats');
      return;
    }
    const id = m[2];
    const ticket = ++routeSeq;
    if (!event || event.id !== id || !board) {
      event = board = player = null;
      view = 'loading';
      render();
      try {
        if (!Api.ready()) throw new Error('not configured');
        const res = await Api.call('getEvent', { id });
        if (ticket !== routeSeq) return; // a newer tap has taken over
        event = res.event;
        board = res.board;
      } catch (e) {
        if (ticket !== routeSeq) return;
        // offline: a player who already joined can still carry on from the copy kept on this device
        const kept = store.get(playerKey(id), null);
        if (e.message !== 'EVENT_NOT_FOUND' && kept && kept.event) {
          event = kept.event;
          board = { rows: [], playing: 0 };
        } else {
          errorText = e.message === 'EVENT_NOT_FOUND' ? STR[settings.lang].notFound : STR[settings.lang].loadFail;
          view = 'error';
          return render();
        }
      }
    }
    player = store.get(playerKey(id), null);
    joinLang = '';
    // someone who has finished only ever sees their result, never the quiz again
    view = m[1] === 'board' ? 'board' : player && player.done ? 'results' : 'join';
    render(true);
    if (player && player.done && !player.sent) sendScore();
  }

  function joinHtml() {
    const s = L();
    const resume = player && !player.done;
    return `<div class="narrow stack">
      <form class="card stack" id="join-form">
        <div class="field"><p><strong>${esc(eventSummary())}</strong></p><small>${esc(s.rule)}</small></div>
        ${resume ? '' : `<div class="field"><span>${esc(s.language)}</span>
          <div class="seg">${[['en', 'English'], ['ta', 'தமிழ்']].map(([code, label]) =>
            `<button type="button" data-act="joinLang" data-lang="${code}" lang="${code}" aria-pressed="${eventLang() === code}">${label}</button>`).join('')}</div>
        </div>
        <label class="field"><span>${esc(s.yourName)}</span>
          <input type="text" name="name" maxlength="40" required autocomplete="name"></label>`}
        ${notice ? `<div class="flash flash-error" role="alert">${esc(notice)}</div>` : ''}
        <div class="button-row end">
          <button class="button primary"${busy ? ' disabled' : ''}>${esc(busy ? s.working : resume ? s.resumeAs(player.name) : s.join)}</button>
        </div>
      </form>
    </div>`;
  }

  /* This device's secret for one event, made once and kept. A join that has to be
     retried sends the same key, so the server hands back the entry it already saved. */
  function joinKey(id) {
    const at = `${STORE}:key:${id}`;
    let key = store.get(at, '');
    if (!key) {
      key = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
      store.set(at, key);
    }
    return key;
  }

  async function joinEvent(name) {
    busy = true;
    notice = '';
    render();
    $('#join-form').elements.name.value = name;
    try {
      const res = await Api.call('join', { id: event.id, name, key: joinKey(event.id) });
      player = { name: res.name, token: res.token, lang: eventLang(), start: Date.now(), answers: [], done: false, sent: false, event };
      savePlayer();
    } catch (e) {
      notice = e.message === 'NAME_TAKEN' ? L().nameTaken : L().failed;
    }
    busy = false;
    if (notice) {
      render();
      $('#join-form').elements.name.value = name;
      return;
    }
    playEvent();
  }

  /* Rebuild the event's questions from its seed and carry on after the last
     answered one, so a page refresh cannot be used to retry a question. */
  function eventQuestions() {
    const code = eventLang();
    const others = Object.keys(DATA).filter((c) => c !== code).map((c) => DATA[c]);
    const qs = Engine.buildSession(DATA[code], event.from, event.to, event.count, event.types, code, event.seed, others);
    qs.forEach((q, i) => {
      if (q.type === 'order') q.placed = [];
      if (i < player.answers.length) {
        q.done = true;
        q.correct = player.answers[i];
      }
    });
    return qs;
  }

  function playEvent() {
    const qs = eventQuestions();
    game = { qs, i: Math.min(player.answers.length, qs.length - 1), score: player.answers.filter(Boolean).length };
    if (player.answers.length >= qs.length) return finishEvent();
    view = 'game';
    render(true);
  }

  function finishEvent() {
    if (!player.done) {
      player.done = true;
      player.score = game.score;
      player.timeMs = Date.now() - player.start;
      savePlayer();
    }
    view = 'results';
    render(true);
    sendScore();
  }

  async function sendScore() {
    if (sendState === 'sending') return;
    sendState = 'sending';
    render();
    const id = event.id;
    try {
      const res = await Api.call('submit', { id, token: player.token, score: player.score, timeMs: player.timeMs });
      if (!event || event.id !== id) return;
      board = res;
      player.sent = true;
      savePlayer();
      sendState = '';
    } catch (e) {
      if (!event || event.id !== id) return;
      sendState = 'failed';
    }
    render();
  }

  async function refreshBoard() {
    if (!event) return;
    const id = event.id;
    try {
      const res = await Api.call('board', { id });
      if (!event || event.id !== id) return;
      board = res;
      if (view === 'board') render();
    } catch (e) { /* keep showing the last list */ }
  }
  setInterval(() => {
    if (view === 'board' && !document.hidden) refreshBoard();
  }, BOARD_REFRESH_MS);

  function boardHtml() {
    const s = L();
    const me = player && player.done && player.sent ? player.name : null;
    const rows = board.rows.map((r, i) => `
      <tr${r.name === me ? ' class="me"' : ''}>
        <td class="num">${i + 1}</td>
        <td>${esc(r.name)}${r.name === me ? ` <span class="badge badge-ok">${esc(s.you)}</span>` : ''}</td>
        <td class="num"><strong>${r.score}</strong> / ${event.count}</td>
        <td class="num">${clock(r.timeMs)}</td>
      </tr>`).join('');
    return `<div class="card stack">
      <div class="row-head"><h2>${esc(s.board)}</h2>
        <button type="button" class="link-button" data-act="refresh">${esc(s.refresh)}</button></div>
      ${board.rows.length ? `<table class="board">
        <thead><tr><th class="num">#</th><th>${esc(s.name)}</th><th class="num">${esc(s.score)}</th><th class="num">${esc(s.time)}</th></tr></thead>
        <tbody>${rows}</tbody></table>` : `<p>${esc(s.nobody)}</p>`}
      ${board.playing ? `<small>${esc(s.playing(board.playing))}</small>` : ''}
    </div>`;
  }

  /* ---- Game screen ------------------------------------------------------ */
  function startPractice() {
    if (!settings.types.length) return;
    const qs = Engine.buildSession(DATA[settings.lang], settings.from, settings.to, settings.count, settings.types, settings.lang);
    qs.forEach((q) => { if (q.type === 'order') q.placed = []; }); // chip indexes, in tapped order
    game = { qs, i: 0, score: 0 };
    view = 'game';
    render(true);
  }

  function finish(q, correct) {
    q.done = true;
    q.correct = correct;
    if (correct) game.score++;
    if (event) {
      player.answers[game.i] = correct;
      savePlayer();
    }
    render();
  }

  function optionsHtml(q, short) {
    const items = q.options.map((o, i) => {
      let cls = 'option';
      if (q.done && i === q.answer) cls += ' correct';
      else if (q.done && i === q.picked) cls += ' wrong';
      return `<button type="button" class="${cls}" data-act="pick" data-i="${i}"${q.done ? ' disabled' : ''}>
        <span class="key">${'ABCD'[i]}</span><span>${esc(o)}</span></button>`;
    }).join('');
    return `<div class="options${short ? ' short' : ''}">${items}</div>`;
  }

  const BODY = {
    fill(q) {
      const word = q.done ? esc(q.options[q.answer]) : '&nbsp;';
      const cls = q.done ? ' ok' : ''; // once answered it always shows the right word
      return `<p class="verse">${esc(q.before)} ${esc(q.pre)}<span class="blank${cls}">${word}</span>${esc(q.post)} ${esc(q.after)}</p>
        ${optionsHtml(q, true)}`;
    },
    ref: (q) => `<p class="verse">${esc(q.v.text)}</p>${optionsHtml(q, true)}`,
    verse: (q) => `<h2 class="ref">${esc(q.v.ref)}</h2>${optionsHtml(q)}`,
    complete: (q) => `<p class="verse">${esc(q.start)} …</p>${optionsHtml(q)}`,
    order(q) {
      const s = L();
      const chip = (i, act) =>
        `<button type="button" class="chip" data-act="${act}" data-i="${i}"${q.done ? ' disabled' : ''}>${esc(q.chips[i])}</button>`;
      const placed = q.placed.map((i) => chip(i, 'unplace')).join('');
      const bank = q.chips.map((w, i) => (q.placed.includes(i) ? '' : chip(i, 'place'))).join('');
      const cls = q.done ? (q.correct ? ' ok' : ' no') : '';
      const full = q.placed.length === q.chips.length;
      return `<div class="verse">
          ${q.before ? `<span class="dim">${esc(q.before)}</span>` : ''}
          <div class="tray${cls}">${placed || `<span class="tray-hint">${esc(s.tapWords)}</span>`}</div>
          ${q.after ? `<span class="dim">${esc(q.after)}</span>` : ''}
        </div>
        ${q.done ? '' : `<div class="bank">${bank}</div>
        <div class="button-row end">
          <button type="button" class="button ghost" data-act="clear"${q.placed.length ? '' : ' disabled'}>${esc(s.clear)}</button>
          <button type="button" class="button primary" data-act="check"${full ? '' : ' disabled'}>${esc(s.check)}</button>
        </div>`}`;
    },
    flash(q) {
      const s = L();
      if (!q.revealed) {
        return `<h2 class="ref">${esc(q.v.ref)}</h2>
          <div class="button-row"><button type="button" class="button primary" data-act="reveal">${esc(s.show)}</button></div>`;
      }
      return `<h2 class="ref">${esc(q.v.ref)}</h2><p class="verse">${esc(q.v.text)}</p>
        ${q.done ? '' : `<div class="button-row">
          <button type="button" class="button primary" data-act="grade" data-ok="1">${esc(s.knew)}</button>
          <button type="button" class="button danger" data-act="grade" data-ok="0">${esc(s.notYet)}</button>
        </div>`}`;
    },
  };

  function gameHtml() {
    const s = L();
    const q = game.qs[game.i];
    const last = game.i === game.qs.length - 1;
    const feedback = !q.done ? '' : `
      <div class="flash ${q.correct ? 'flash-ok' : 'flash-error'}" role="status">
        <h2>${esc(q.correct ? s.correct : s.wrong)}</h2>
        ${q.type === 'flash' ? '' : `<p><strong>${esc(q.v.ref)}</strong> — ${esc(q.v.text)}</p>`}
      </div>
      <div class="button-row end next-bar"><button type="button" class="button primary" id="next" data-act="next">${esc(last ? s.finish : s.next)}</button></div>`;
    return `<div class="narrow stack">
      <div class="card stack"><p class="eyebrow">${esc(s.ask[q.type])}</p>${BODY[q.type](q)}</div>
      ${feedback}
    </div>`;
  }

  /* ---- Results screen --------------------------------------------------- */
  function reviewHtml(qs) {
    const s = L();
    const rows = qs.map((q) => `
      <li>
        <div class="row-head">
          <span class="badge ${q.correct ? 'badge-ok' : 'badge-no'}">${q.correct ? '✓' : '✗'}</span>
          <strong>${esc(q.v.ref)}</strong>
          <small>${esc(s.types[q.type][0])}</small>
        </div>
        <p>${esc(q.v.text)}</p>
      </li>`).join('');
    return `<div class="card"><h2>${esc(s.review)}</h2><ul class="rows">${rows}</ul></div>`;
  }

  function resultsHtml() {
    const s = L();
    if (!event) {
      return `<div class="narrow stack">
        <div class="button-row">
          <button type="button" class="button primary" data-act="again">${esc(s.again)}</button>
          <button type="button" class="button ghost" data-act="home">${esc(s.change)}</button>
        </div>
        ${reviewHtml(game.qs)}
      </div>`;
    }
    const status =
      sendState === 'sending' ? `<div class="flash flash-info" role="status">${esc(s.sending)}</div>` :
      sendState === 'failed' ? `<div class="flash flash-error" role="alert"><p>${esc(s.sendFail)}</p>
        <div class="button-row"><button type="button" class="button" data-act="resend">${esc(s.retry)}</button></div></div>` : '';
    // The Quiz tab of someone who has finished: their own result and answers. The table of
    // everyone's scores lives on the Leaderboard tab only, so the two tabs never look alike.
    // Entries saved before players could pick a language have no `lang`; their questions
    // came from the older generator and cannot be rebuilt, so no review for those.
    const qs = game ? game.qs : player.lang ? eventQuestions() : null;
    return `<div class="narrow stack">${status}
      <div class="flash flash-ok" role="status"><p>${esc(s.doneNote)}</p></div>
      <div class="button-row"><a class="button primary" href="#board=${esc(event.id)}">${esc(s.board)}</a></div>
      ${shareHtml(s.invite)}
      ${qs ? reviewHtml(qs) : ''}</div>`;
  }

  /* ---- Banner + menu bar ------------------------------------------------ */
  function heroHtml() {
    const s = L();
    const title = (eyebrow, h1, extra) => `<p class="eyebrow">${esc(eyebrow)}</p>
      <div class="hero-row"><div class="hero-text"><h1>${esc(h1)}</h1>${extra || ''}</div></div>`;
    if (view === 'game') {
      const q = game.qs[game.i];
      const done = game.i + (q.done ? 1 : 0);
      return `<p class="eyebrow">${esc(s.question(game.i + 1, game.qs.length))}</p>
        <div class="hero-row">
          <div class="hero-text"><h1>${esc(s.types[q.type][0])}</h1></div>
          <span class="score-pill">${esc(s.score)} <b>${game.score}</b></span>
        </div>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${game.qs.length}" aria-valuenow="${done}">
          <i style="width:${(done / game.qs.length) * 100}%"></i></div>`;
    }
    if (view === 'results') {
      const n = event ? event.count : game.qs.length;
      const score = event ? player.score : game.score;
      const pct = Math.round((score / n) * 100);
      const msg = pct >= 90 ? s.great : pct >= 60 ? s.good : s.keep;
      return `<p class="eyebrow">${esc(event ? `${event.title} · ${player.name}` : s.results)}</p>
        <div class="hero-row">
          <div class="hero-text">
            <p class="big-score">${score}<span> / ${n}</span></p>
            <p class="script">${esc(msg)}</p>
          </div>
          <span class="score-pill"><b>${event ? clock(player.timeMs) : `${pct}%`}</b></span>
        </div>`;
    }
    if (view === 'created') return title(s.created, event.title);
    if (view === 'join') return title(s.group, event.title);
    if (view === 'board') return title(s.board, event.title, `<p class="hero-sub">${esc(eventSummary())}</p>`);
    if (view === 'memo') {
      return title(s.church, s.memorize, `<p class="script">${esc(s.memoTag)}</p><p class="hero-sub">${esc(s.memoSub)}</p>`);
    }
    if (view === 'loading') return title(s.church, s.loading);
    if (view === 'error') return title(s.church, s.title);
    return `<p class="eyebrow">${esc(s.church)}</p>
      <div class="hero-row">
        <div class="hero-text"><h1>${esc(s.title)}</h1><p class="script">${esc(s.tagline)}</p><p class="hero-sub">${esc(s.sub)}</p></div>
        ${completed == null ? '' : `<span class="score-pill">${esc(s.completed)} <b>${completed}</b></span>`}
      </div>`;
  }

  function navHtml() {
    const s = L();
    const link = (href, label, current) => `<li><a href="${href}"${current ? ' aria-current="page"' : ''}>${esc(label)}</a></li>`;
    if (view === 'game') {
      return event ? link(`#board=${event.id}`, s.quit) : `<li><button type="button" data-act="home">${esc(s.quit)}</button></li>`;
    }
    const home = `<li><button type="button" data-act="exit">${esc(s.home)}</button></li>`;
    if (view === 'join' || view === 'board' || (view === 'results' && event)) {
      return link(`#e=${event.id}`, player && player.done ? s.myResult : s.quiz, view !== 'board') + link(`#board=${event.id}`, s.board, view === 'board') + home;
    }
    if (view === 'loading' || view === 'error' || view === 'created') return home;
    const item = (code, label) =>
      `<li><button type="button" data-act="lang" data-lang="${code}" lang="${code}"${settings.lang === code ? ' aria-current="true"' : ''}>${label}</button></li>`;
    const tabs = `<li><button type="button" data-act="exit"${view === 'memo' ? '' : ' aria-current="page"'}>${esc(s.home)}</button></li>`
      + link('#memorize', s.memorize, view === 'memo');
    return tabs + item('en', 'English') + item('ta', 'தமிழ்');
  }

  const MAIN = {
    setup: setupHtml,
    memo: memoHtml,
    created: createdHtml,
    join: joinHtml,
    game: gameHtml,
    results: resultsHtml,
    board: () => `<div class="narrow stack">${boardHtml()}
      ${player ? '' : `<div class="button-row end"><a class="button primary" href="#e=${esc(event.id)}">${esc(L().openQuiz)}</a></div>`}
      ${shareHtml(L().invite)}</div>`,
    loading: () => '',
    error: () => `<div class="narrow"><div class="flash flash-error" role="alert">${esc(errorText)}</div></div>`,
  };

  function render(toTop) {
    document.documentElement.lang = lang();
    document.title = `${event && view !== 'setup' ? event.title : view === 'memo' ? L().memorize : L().title} · ${L().church}`;
    $('#nav').innerHTML = navHtml();
    $('#hero').innerHTML = heroHtml();
    $('#main').innerHTML = MAIN[view]();
    if (view === 'setup') syncSetup();
    if (view === 'memo' && !memo) syncMemo();
    if (toTop && booted) document.querySelector('.navbar').scrollIntoView();
    const next = $('#next');
    if (next) next.focus({ preventScroll: true }); // Enter moves on, but the page must not jump when an answer is picked
  }

  /* ---- Events ----------------------------------------------------------- */
  const ACTIONS = {
    lang(el) {
      settings.lang = el.dataset.lang;
      save();
      memoClose(); // the verses being read are in the other language
      if (view === 'results') view = 'setup'; // the finished round is in the other language
      render();
    },
    all() {
      settings.types = Engine.TYPES.slice();
      save();
      render();
    },
    home() {
      view = 'setup';
      game = null;
      render(true);
    },
    exit() {
      // leave the event; setting an already-empty hash would not fire hashchange
      if (location.hash.length > 1) location.hash = '';
      else route();
    },
    joinLang(el) {
      const name = $('#join-form').elements.name.value; // render() rebuilds the form
      joinLang = el.dataset.lang;
      render();
      $('#join-form').elements.name.value = name;
    },
    again: startPractice,
    memoAgain: memoStart,
    memoPause() {
      memoHalt();
      memo.paused = true;
      keepAwake(false);
      render();
    },
    memoResume() {
      // picks up at the start of the verse that was interrupted
      memo.paused = false;
      keepAwake(true);
      render();
      memoPlay(memo.k);
    },
    memoPrev() { memoJump(-1); },
    memoNext() { memoJump(1); },
    memoStop() {
      memoClose();
      render(true);
    },
    async copy(el) {
      const input = $('#link');
      try {
        await navigator.clipboard.writeText(input.value);
      } catch (e) {
        input.select();
        document.execCommand('copy');
      }
      el.textContent = L().copied;
    },
    share() {
      navigator.share({ title: event.title, text: L().shareText(event.title), url: eventUrl(event.id) }).catch(() => {});
    },
    refresh: refreshBoard,
    resend: sendScore,
    pick(el, q) {
      if (q.done) return;
      q.picked = Number(el.dataset.i);
      finish(q, q.picked === q.answer);
    },
    place(el, q) {
      q.placed.push(Number(el.dataset.i));
      render();
    },
    unplace(el, q) {
      q.placed = q.placed.filter((i) => i !== Number(el.dataset.i));
      render();
    },
    clear(el, q) {
      q.placed = [];
      render();
    },
    check(el, q) {
      // compare the words, not chip positions: a repeated word may go in either slot
      finish(q, q.placed.map((i) => q.chips[i]).join(' ') === q.answer.join(' '));
    },
    reveal(el, q) {
      q.revealed = true;
      render();
    },
    grade(el, q) {
      finish(q, el.dataset.ok === '1');
    },
    next() {
      if (game.i < game.qs.length - 1) {
        game.i++;
        return render(true);
      }
      if (event) return finishEvent();
      view = 'results';
      render(true);
      countQuizzes('practiceDone');
    },
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    ACTIONS[el.dataset.act](el, game && game.qs[game.i]);
  });
  document.addEventListener('input', onSetupInput);
  document.addEventListener('change', onSetupInput);
  document.addEventListener('submit', (e) => {
    e.preventDefault();
    if (busy) return;
    const form = e.target;
    if (form.id === 'setup') startPractice();
    else if (form.id === 'memo-form') memoStart();
    else if (form.id === 'event-form') createEvent(form.elements.title.value.trim());
    else if (form.id === 'join-form') (player && !player.done ? playEvent() : joinEvent(form.elements.name.value.trim()));
  });
  // 1-4 or A-D answers a multiple-choice question
  document.addEventListener('keydown', (e) => {
    if (view !== 'game' || e.ctrlKey || e.metaKey || e.altKey) return;
    const q = game.qs[game.i];
    if (!q.options || q.done) return;
    const i = '1234'.indexOf(e.key) >= 0 ? '1234'.indexOf(e.key) : 'abcd'.indexOf(e.key.toLowerCase());
    if (i >= 0 && i < q.options.length) {
      q.picked = i;
      finish(q, i === q.answer);
    }
  });
  window.addEventListener('hashchange', route);

  route().then(() => { booted = true; });
})();
