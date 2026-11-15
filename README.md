# Memory Verses 2026 — quiz & games

A quiz for the 190 memory verses of Apostolic Christian Assembly, Avadi Ministry,
in English, Tamil and Telugu. It is a plain static site: no build step, no server.

## Using it

1. Pick the language (English / தமிழ் / తెలుగు) in the menu bar.
   With Tamil or Telugu chosen, **English menu** in the menu bar keeps the menus, buttons
   and messages in English and shows only the verses and references in that language.
   Press it again to have everything translated.
2. Choose the verse range (from verse – to verse).
3. Choose how many questions (1–50).
4. Tick the game types you want, then press Start.

Questions are generated fresh every round: the verses, the blanked word, the
split point, the scrambled words and the wrong answers are all picked at random.

| Game | What you do |
| --- | --- |
| Missing word | Pick the word that fills the blank |
| Where is it? | Pick the reference for the verse shown |
| Find the verse | Pick the verse for the reference shown |
| Finish the verse | Pick how the verse ends |
| Word order | Tap the scrambled words in the right order |
| Flash card | Say the verse from memory, reveal it, mark yourself |

## Memorize assistant

**Memorize** in the menu bar opens a listening screen:

1. Choose the verse range and how many times each verse or passage is repeated (1–20).
2. Optionally change the reading speed, and choose when the reference is read:
   every time, the first time only, or off.
3. Press **Start listening**.

Verses that follow on from each other in the same chapter are grouped into one
passage and the whole passage is repeated together: Genesis 1:26, 1:27 and 1:28
are read as "Genesis 1:26 to 28", that many times, before moving on. A verse on
its own is read by itself. The verse being read is highlighted.

Untick **Read verses that follow on as one passage** to have every verse read and
repeated on its own instead.

Tick **Mute the voice (show the verses only)** to read silently: the verses are shown
and highlighted at reading pace, with the same repeats, and nothing is played. The
player also has a **Mute voice / Unmute voice** button to switch while it is running.

Pause, Resume, Previous, Next and Stop are on the player. Resume picks up at the
start of the verse that was interrupted.

### Recorded voice (trial)

Some phones have no Tamil voice. So verses can instead be played from audio files, which
sound the same on every device. This is on trial for verses 1–5 in both languages; all
other verses are still read by the phone's own voice. The player shows "Recorded voice"
or "Phone's voice" so you can tell which you are hearing.

The files live in `assets/audio/<language>/` and are listed in `js/audio.js`. A passage
reference is one clip that says it as a single sentence ("Genesis 1, 26 to 28"), one for
every stretch of verses that follow on in a chapter (about 720 per language). Where that
clip is missing, the reference is stitched from small clips ("Genesis 1, 26" + "to" +
"28"), which leaves a small gap. To make the audio for every verse (needs internet; it sends the verse
text to Microsoft's online voices; takes roughly 15–25 minutes):

```
pip install --user edge-tts
python3 tools/make_audio.py 1-190
git add -A
git commit -m "Add recorded audio for all verses"
git push
```

If it stops part way, run the same command again; it carries on where it left off. To
redo a clip that sounds wrong, delete that file and run it again. The script also updates
the `?v=` value in `index.html` for you.

Where there is no file, it uses the voice built into the browser, in the language chosen in the menu bar,
so nothing is downloaded. A device with no Tamil or Telugu voice reads only the numbers there.

Telugu has no audio files until the script is run for it. The same command makes them: it
skips the English and Tamil files that already exist and adds `assets/audio/te/`.

## Group quiz (events + leaderboard)

On the home page, under the practice settings, there is a **Group quiz** card:

1. Set the verse range, number of questions and game types as usual.
2. Type an event name and press **Create event**. You get a link to share
   (copy, WhatsApp, or the phone's share sheet).
3. Each person opens the link, types their name and plays. Everyone in the event
   gets exactly the same questions in the same order.
4. Scores go on the event's leaderboard, ranked by score and then by fastest time.
   The leaderboard page refreshes itself every 20 seconds, so it can be left open
   on a screen.

Good to know:

- Each person picks English, Tamil or Telugu on the screen where they enter their name.
  Every language gets the same verses and the same game types in the same order.
- Flash card is self-marked, so it is not used in events.
- One go per name. A name already used in the event is refused, and a finished
  player who reopens the link sees their result, not the quiz.
- Refreshing the page mid-quiz continues from the next question; the clock keeps running.
- Events you created are listed on the home page of the device you created them on.
  Each device keeps its own list; it is not shared between devices.
- The quiz link can be copied again later from the event's Leaderboard or My result page.

### One-time setup for group quizzes

Scores have to be stored somewhere shared, and GitHub Pages cannot store anything.
So events and results are kept in a Google Sheet of yours, through a small Google
Apps Script (the same approach as the convention app). Practice mode needs none of this.

1. Create a new blank Google Sheet (sheets.new).
2. In it, open **Extensions > Apps Script**.
3. Delete the starter code and paste in all of [`apps-script/Code.gs`](apps-script/Code.gs). Save.
4. Click **Deploy > New deployment**, choose type **Web app**, set
   **Execute as: Me** and **Who has access: Anyone**, then **Deploy**.
   Approve the permissions prompt (it is your own script on your own sheet).
5. Copy the **Web app URL**.
6. Open [`js/config.js`](js/config.js) and replace
   `PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE` with that URL.

The sheet gets three tabs, **Events**, **Results** and **Stats**, created on first
use. You can read or export the results there.

**Stats** holds one number, `QuizzesCompleted`: every quiz finished by anyone,
practice rounds and event quizzes together (a quiz abandoned half way is not
counted). The same number is shown on the home page as "Quizzes completed".
Counting starts from when this setup is done. If you later change `Code.gs`, use
**Deploy > Manage deployments > Edit > New version** so the URL stays the same.

Scoring runs in each player's browser, so treat the leaderboard as friendly
competition, not as a secure exam.

## Run it locally

Open `index.html` in a browser, or serve the folder:

```
python3 -m http.server 8000
```

## Publishing a change

Phones keep a copy of the site's files. So that they pick up a new version at once,
`index.html` loads its six files with a `?v=...` on the end (for example
`js/app.js?v=20261113b`). Change that value on all six whenever you publish.

## Publish on GitHub Pages

1. Create a repository on GitHub and push this folder to the `main` branch.
2. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**.
3. Choose branch `main`, folder `/ (root)`, and save.
4. After a minute the site is live at `https://<your-username>.github.io/<repo-name>/`.

All paths are relative, so it works under the repository sub-path.

## Editing the verses

The verses live in `js/verses.js`, one per line as `reference|text`. Line N of the
English, Tamil and Telugu blocks must be the same verse. They were typed out from
the PDFs (which contain no usable selectable text), so correct any typo you spot there.

## Files

- `index.html` — page shell (logo, menu bar, banner, footer)
- `css/style.css` — styling, shared look with the church maintenance app
- `js/verses.js` — the verses
- `js/engine.js` — random question generator
- `js/app.js` — setup, game, results, event and leaderboard screens
- `js/config.js` — the Apps Script URL for group quizzes
- `apps-script/Code.gs` — Google Sheet backend for events and the leaderboard
- `js/audio.js` — list of verses that have an audio file (written by the script below)
- `tools/make_audio.py` — makes the audio files for the Memorize screen
- `assets/` — logo and fonts (Poppins, Oooh Baby, Noto Sans Tamil, Noto Sans Telugu; SIL Open Font License)
