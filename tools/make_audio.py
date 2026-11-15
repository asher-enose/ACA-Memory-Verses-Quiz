#!/usr/bin/env python3
"""Make the audio files the Memorize screen plays instead of the phone's own voice.

    pip install --user edge-tts
    python3 tools/make_audio.py 1-190        # every verse, every language
    python3 tools/make_audio.py 1-5 20 31-36 # or just some
    python3 tools/make_audio.py 1-5 --force  # make them again, replacing the files

For each verse number N and each language it writes, under assets/audio/<lang>/:
    vNNN.mp3   the verse text
    rNNN.mp3   its reference, e.g. "Genesis 1, 26"
    pAAA-BBB.mp3  a passage reference said as one sentence, e.g. "Genesis 1, 26 to 28",
               for verses AAA to BBB: one for every stretch of verses that follow on
               from each other in a chapter (about 720 per language for all 190 verses)
    nNNN.mp3   a bare verse number, e.g. "28", for every verse that can end a passage
    to.mp3     the joining word ("to" / "முதல்"), and end.mp3 where the language needs a
               closing word ("வரை")

The app plays pAAA-BBB for a passage reference. Where that file is missing it falls back
to stitching rNNN + to + nNNN (+ end), which leaves a small gap between the pieces,
so "Genesis 1, 26" "to" "28" still covers any range.

Then it rewrites js/audio.js, the list of what exists, from the files on disk, and changes
the ?v= value in index.html so browsers fetch the new list. The app plays a file when it
is listed and falls back to the phone's voice when it is not.

The voices are Microsoft's online neural voices (through the edge-tts package), so this
needs internet and sends the verse text to that service. Files that already exist are
skipped unless --force is given, so a run that stops can be continued by running the same
command again. To redo one clip, delete it and run again.
"""
import asyncio
import json
import re
import sys
import time
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
VOICES = {'en': 'en-IN-NeerjaNeural', 'ta': 'ta-IN-PallaviNeural', 'te': 'te-IN-ShrutiNeural'}
# The words around a passage's last verse number: "... to 28" / "... முதல் 28 வரை".
# Keep in step with STR.span in js/app.js.
JOIN = {'en': {'to': 'to'}, 'ta': {'to': 'முதல்', 'end': 'வரை'}, 'te': {'to': 'నుండి', 'end': 'వరకు'}}
# A whole passage reference as one sentence: first reference, last verse number.
SPAN = {'en': '%s to %s', 'ta': '%s முதல் %s வரை', 'te': '%s నుండి %s వరకు'}
REF =re.compile(r'^(.*?)\s+(\d+):(\d+)([a-z]?)$')
TRIES = 3
done = 0


def load_verses():
    """{lang: [(ref, text), ...]} from js/verses.js, in verse-number order."""
    src = (ROOT / 'js' / 'verses.js').read_text(encoding='utf-8')
    out = {}
    for lang, name in (('en', 'EN'), ('ta', 'TA'), ('te', 'TE')):
        block = re.search(r'const %s = `\n(.*?)\n`;' % name, src, re.S).group(1)
        out[lang] = [tuple(line.split('|', 1)) for line in block.split('\n')]
    return out


def spoken(ref):
    return re.sub(r'(\d+):(\d+)', r'\1, \2', ref)  # "1:26" is read as a clock time by some voices


def follows(prev_ref, ref):
    a, b = REF.match(prev_ref), REF.match(ref)
    return bool(a and b and a.group(1) == b.group(1) and a.group(2) == b.group(2)
                and int(b.group(3)) == int(a.group(3)) + 1)


def parse_numbers(args, total):
    nums = set()
    for a in args:
        lo, _, hi = a.partition('-')
        lo, hi = int(lo), int(hi or lo)
        if not 1 <= lo <= hi <= total:
            sys.exit('Verse numbers must be between 1 and %d: %s' % (total, a))
        nums.update(range(lo, hi + 1))
    return sorted(nums)


async def say(text, voice, path, force):
    """Write one clip. Returns 1 if a file was made, 0 if it was already there."""
    global done
    if path.exists() and not force:
        return 0
    for attempt in range(1, TRIES + 1):
        try:
            await edge_tts.Communicate(text, voice).save(str(path))
            if path.stat().st_size >= 1000:
                break
            raise RuntimeError('empty file')
        except Exception as err:  # network hiccup: wait a little and try again
            path.unlink(missing_ok=True)
            if attempt == TRIES:
                sys.exit('Could not make %s (%s). Run the same command again to continue.' % (path.name, err))
            await asyncio.sleep(2 * attempt)
    done += 1
    if done % 20 == 0:
        print('  %d clips made...' % done, flush=True)
    return 1


async def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    force = '--force' in sys.argv
    verses = load_verses()
    if not args:
        sys.exit(__doc__)
    wanted = parse_numbers(args, len(verses['en']))
    made = 0

    for lang, voice in VOICES.items():
        folder = ROOT / 'assets' / 'audio' / lang
        folder.mkdir(parents=True, exist_ok=True)
        for old in folder.glob('r*-*.mp3'):  # one-clip-per-range files from the first trial
            old.unlink()
        refs = [r for r, _ in verses[lang]]
        print('%s (%s)' % (lang, voice), flush=True)

        for word, text in JOIN[lang].items():
            made += await say(text, voice, folder / (word + '.mp3'), force)
        for n in wanted:
            ref, text = verses[lang][n - 1]
            made += await say(text, voice, folder / ('v%03d.mp3' % n), force)
            made += await say(spoken(ref), voice, folder / ('r%03d.mp3' % n), force)
            if n > 1 and follows(refs[n - 2], ref):  # this verse can be the last of a passage
                number = int(REF.match(ref).group(3))
                made += await say(str(number), voice, folder / ('n%03d.mp3' % number), force)

        # every stretch of chosen verses that follow on, as one sentence: "Genesis 1, 26 to 28"
        chosen = set(wanted)
        for a in wanted:
            b = a + 1
            while b in chosen and follows(refs[b - 2], refs[b - 1]):
                last = REF.match(refs[b - 1])
                text = SPAN[lang] % (spoken(refs[a - 1]), last.group(3) + last.group(4))
                made += await say(text, voice, folder / ('p%03d-%03d.mp3' % (a, b)), force)
                b += 1

    # the manifest lists what is on disk, so deleting a file and re-running keeps it honest
    manifest = {}
    for lang in VOICES:
        folder = ROOT / 'assets' / 'audio' / lang
        numbered = lambda kind: sorted(int(p.stem[1:]) for p in folder.glob(kind + '[0-9][0-9][0-9].mp3'))
        spans = sorted((int(p.stem[1:4]), int(p.stem[5:8]))
                       for p in folder.glob('p[0-9][0-9][0-9]-[0-9][0-9][0-9].mp3'))
        manifest[lang] = {
            'verses': numbered('v'), 'refs': numbered('r'), 'nums': numbered('n'),
            'spans': ['%d-%d' % s for s in spans],
            'to': (folder / 'to.mp3').exists(), 'end': (folder / 'end.mp3').exists(),
        }
    (ROOT / 'js' / 'audio.js').write_text(
        '/* Written by tools/make_audio.py: what has an audio file in assets/audio/<lang>/.\n'
        '   verses = vNNN.mp3, refs = rNNN.mp3, nums = nNNN.mp3 (bare verse numbers),\n'
        '   spans = pAAA-BBB.mp3 (a passage reference, verses AAA to BBB), plus the\n'
        '   joining words to.mp3 / end.mp3. Anything not listed is read by the phone\'s own voice. */\n'
        'window.AUDIO = ' + json.dumps(manifest, separators=(',', ':')) + ';\n', encoding='utf-8')

    # a new ?v= makes browsers fetch the new list instead of a saved copy
    index = ROOT / 'index.html'
    html, count = re.subn(r'\?v=[0-9a-z]+"', '?v=%s"' % time.strftime('%Y%m%d%H%M'), index.read_text(encoding='utf-8'))
    if count:
        index.write_text(html, encoding='utf-8')

    print('Done: %d new clips. Verses with audio: %s' % (made, {k: len(v['verses']) for k, v in manifest.items()}))


asyncio.run(main())
