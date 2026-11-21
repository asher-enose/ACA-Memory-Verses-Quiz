#!/usr/bin/env python3
"""Make the audio files the Memorize screen plays instead of the phone's own voice.

    pip install --user edge-tts
    python3 tools/make_audio.py 1-190        # every verse, every language
    python3 tools/make_audio.py 1-5 20 31-36 # or just some
    python3 tools/make_audio.py 1-5 --force  # make them again, replacing the files
    python3 tools/make_audio.py 1-190 --language te  # Telugu only

For each verse number N and each voice it writes, under assets/audio/<folder>/ (en, en-us,
ta, te; en-us is the American English voice reading the same English verses):
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
import argparse
import asyncio
import json
import re
import sys
import time
from pathlib import Path
from uuid import uuid4

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
# Audio folder -> voice. A folder named "<lang>-<accent>" is a second voice for that
# language's text: "en-us" reads the English verses with an American voice.
VOICES = {'en': 'en-IN-NeerjaNeural', 'en-us': 'en-US-GuyNeural',
          'ta': 'ta-IN-PallaviNeural', 'te': 'te-IN-ShrutiNeural'}
# The words around a passage's last verse number: "... to 28" / "... முதல் 28 வரை".
# Keep in step with STR.span in js/app.js.
JOIN = {'en': {'to': 'to'}, 'ta': {'to': 'முதல்', 'end': 'வரை'}, 'te': {'to': 'నుండి', 'end': 'వరకు'}}
# A whole passage reference as one sentence: first reference, last verse number.
SPAN = {'en': '%s to %s', 'ta': '%s முதல் %s வரை', 'te': '%s నుండి %s వరకు'}
REF = re.compile(r'^(.*?)\s+(\d+):(\d+[a-z]?)(?:-(\d+[a-z]?))?$')
TRIES = 3
PARALLEL_CLIPS = 4
done = 0


def load_verses():
    """{lang: [(ref, text), ...]} from js/verses.js, in verse-number order."""
    src = (ROOT / 'js' / 'verses.js').read_text(encoding='utf-8')
    out = {}
    for lang, name in (('en', 'EN'), ('ta', 'TA'), ('te', 'TE')):
        block = re.search(r'const %s = `\n(.*?)\n`;' % name, src, re.S).group(1)
        out[lang] = [tuple(line.split('|', 1)) for line in block.split('\n')]
    return out


def spoken(ref, lang):
    match = REF.fullmatch(ref)
    if match and match[4]:
        return SPAN[lang] % (spoken_start(match), match[4])
    return re.sub(r'(\d+):(\d+)', r'\1, \2', ref)  # "1:26" is read as a clock time by some voices


def spoken_start(ref):
    return f'{ref[1]} {ref[2]}, {ref[3]}'


def verse_number(label):
    return int(label.rstrip('abcdefghijklmnopqrstuvwxyz'))


def follows(prev_ref, ref):
    a, b = REF.match(prev_ref), REF.match(ref)
    return bool(a and b and a.group(1) == b.group(1) and a.group(2) == b.group(2)
                and verse_number(b[3]) == verse_number(a[4] or a[3]) + 1)


def clips_for(verses, lang, wanted):
    refs = [ref for ref, _ in verses]
    clips = {word + '.mp3': text for word, text in JOIN[lang].items()}
    for n in wanted:
        ref, text = verses[n - 1]
        clips['v%03d.mp3' % n] = text
        clips['r%03d.mp3' % n] = spoken(ref, lang)
        if n > 1 and follows(refs[n - 2], ref):
            match = REF.fullmatch(ref)
            number = verse_number(match[4] or match[3])
            clips['n%03d.mp3' % number] = str(number)

    chosen = set(wanted)
    for a in wanted:
        b = a + 1
        while b in chosen and follows(refs[b - 2], refs[b - 1]):
            first = REF.fullmatch(refs[a - 1])
            last = REF.fullmatch(refs[b - 1])
            clips['p%03d-%03d.mp3' % (a, b)] = SPAN[lang] % (spoken_start(first), last[4] or last[3])
            b += 1
    return clips


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
    pending = path.with_suffix(f'.{uuid4().hex}.part')
    for attempt in range(1, TRIES + 1):
        try:
            await edge_tts.Communicate(text, voice).save(str(pending))
            if pending.stat().st_size >= 1000:
                pending.replace(path)
                break
            raise RuntimeError('empty file')
        except Exception as err:  # network hiccup: wait a little and try again
            if attempt == TRIES:
                raise RuntimeError(f'Could not make {path.name} ({err}). Run the same command again to continue.') from err
            await asyncio.sleep(2 * attempt)
        finally:
            pending.unlink(missing_ok=True)
    done += 1
    if done % 20 == 0:
        print('  %d clips made...' % done, flush=True)
    return 1


async def record_clips(clips, voice, folder, force, stale):
    limit = asyncio.Semaphore(PARALLEL_CLIPS)

    async def record(name, text):
        async with limit:
            await say(text, voice, folder / name, force or name in stale)
            stale.discard(name)

    tasks = [asyncio.create_task(record(name, text)) for name, text in clips.items()
             if force or name in stale or not (folder / name).exists()]
    try:
        await asyncio.gather(*tasks)
    finally:
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)


def write_manifest(path, stale):
    manifest = {}
    for lang in VOICES:
        folder = ROOT / 'assets' / 'audio' / lang
        outdated = stale.get(lang, set())
        numbered = lambda kind: sorted(int(p.stem[1:]) for p in folder.glob(kind + '[0-9][0-9][0-9].mp3')
                                       if p.name not in outdated)
        spans = sorted((int(p.stem[1:4]), int(p.stem[5:8]))
                       for p in folder.glob('p[0-9][0-9][0-9]-[0-9][0-9][0-9].mp3') if p.name not in outdated)
        manifest[lang] = {
            'verses': numbered('v'), 'refs': numbered('r'), 'nums': numbered('n'),
            'spans': ['%d-%d' % s for s in spans],
            'to': (folder / 'to.mp3').exists(), 'end': (folder / 'end.mp3').exists(),
        }
        if outdated:
            manifest[lang]['stale'] = sorted(outdated)
    path.write_text(
        '/* Written by tools/make_audio.py: what has an audio file in assets/audio/<lang>/.\n'
        '   verses = vNNN.mp3, refs = rNNN.mp3, nums = nNNN.mp3 (bare verse numbers),\n'
        '   spans = pAAA-BBB.mp3 (a passage reference, verses AAA to BBB), plus the\n'
        '   joining words to.mp3 / end.mp3. Anything not listed is read by the phone\'s own voice. */\n'
        'window.AUDIO = ' + json.dumps(manifest, separators=(',', ':')) + ';\n', encoding='utf-8')

    # a new ?v= makes browsers fetch the new list instead of a saved copy
    index = ROOT / 'index.html'
    html, count = re.subn(r'\?v=[0-9a-z]+"', '?v=%s"' % time.strftime('%Y%m%d%H%M%S'), index.read_text(encoding='utf-8'))
    if count:
        index.write_text(html, encoding='utf-8')
    return manifest


async def main():
    parser = argparse.ArgumentParser(description='Generate recordings for the Memorize player.')
    parser.add_argument('verses', nargs='+')
    parser.add_argument('--force', action='store_true')
    parser.add_argument('--language', choices=VOICES, help='generate audio for only this voice folder')
    args = parser.parse_args()
    verses = load_verses()
    wanted = parse_numbers(args.verses, len(verses['en']))
    path = ROOT / 'js' / 'audio.js'
    stale = {}
    if path.exists():
        previous = json.loads(path.read_text(encoding='utf-8').split('window.AUDIO = ', 1)[1].strip().removesuffix(';'))
        stale = {lang: set(info.get('stale', [])) for lang, info in previous.items()}

    try:
        for lang, voice in VOICES.items():
            if args.language and lang != args.language:
                continue
            folder = ROOT / 'assets' / 'audio' / lang
            folder.mkdir(parents=True, exist_ok=True)
            for old in folder.glob('r*-*.mp3'):  # one-clip-per-range files from the first trial
                old.unlink()
            text_lang = lang.split('-')[0]
            print('%s (%s)' % (lang, voice), flush=True)
            clips = clips_for(verses[text_lang], text_lang, wanted)
            await record_clips(clips, voice, folder, args.force, stale.setdefault(lang, set()))
    finally:
        manifest = write_manifest(path, stale)

    print('Done: %d new clips. Verses with audio: %s' % (done, {k: len(v['verses']) for k, v in manifest.items()}))


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except RuntimeError as err:
        sys.exit(str(err))
