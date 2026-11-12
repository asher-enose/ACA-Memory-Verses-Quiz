# Memory Verses 2026 — quiz & games

A quiz for the 190 memory verses of Apostolic Christian Assembly, Avadi Ministry,
in English and Tamil. It is a plain static site: no build step, no server.

## Using it

1. Pick the language (English / தமிழ்) in the menu bar.
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

1. Choose the verse range and how many times each verse is repeated (1–20).
2. Optionally change the reading speed, or turn off reading the reference.
3. Press **Start listening**. Verse 1 is read that many times, then verse 2, and so on.

Pause, Resume, Previous verse, Next verse and Stop are on the player. Resume starts
the interrupted reading of the verse again from its beginning.

It uses the voice built into the browser, in the language chosen in the menu bar,
so nothing is downloaded. Tamil needs a Tamil voice on the device; the screen says
so when none is found (on Android: Settings › Text-to-speech › Google › Install voice data).

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

- An event is played in the language that was selected when it was created.
- Flash card is self-marked, so it is not used in events.
- One go per name. A name already used in the event is refused, and a finished
  player who reopens the link sees their result, not the quiz.
- Refreshing the page mid-quiz continues from the next question; the clock keeps running.
- Events you created are listed on the home page of the device you created them on.

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

## Publish on GitHub Pages

1. Create a repository on GitHub and push this folder to the `main` branch.
2. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**.
3. Choose branch `main`, folder `/ (root)`, and save.
4. After a minute the site is live at `https://<your-username>.github.io/<repo-name>/`.

All paths are relative, so it works under the repository sub-path.

## Editing the verses

The verses live in `js/verses.js`, one per line as `reference|text`. Line N of the
English block and line N of the Tamil block must be the same verse. They were
typed out from the two PDFs (which contain no selectable text), so correct any
typo you spot there.

## Files

- `index.html` — page shell (logo, menu bar, banner, footer)
- `css/style.css` — styling, shared look with the church maintenance app
- `js/verses.js` — the verses
- `js/engine.js` — random question generator
- `js/app.js` — setup, game, results, event and leaderboard screens
- `js/config.js` — the Apps Script URL for group quizzes
- `apps-script/Code.gs` — Google Sheet backend for events and the leaderboard
- `assets/` — logo and fonts (Poppins, Oooh Baby, Noto Sans Tamil; SIL Open Font License)
