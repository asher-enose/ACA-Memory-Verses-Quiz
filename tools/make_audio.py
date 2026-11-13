#!/usr/bin/env python3
"""Make the audio files the Memorize screen plays instead of the phone's own voice.

    pip install --user edge-tts
    python3 tools/make_audio.py 1-5          # verses 1 to 5, both languages
    python3 tools/make_audio.py 1-5 20 31-36 # several ranges
    python3 tools/make_audio.py 1-5 --force  # make them again, replacing the files

For each verse number N and each language it writes, under assets/audio/<lang>/:
    vNNN.mp3        the verse text
    rNNN.mp3        its reference, e.g. "Genesis 1, 26"
    rAAA-BBB.mp3    a passage reference, e.g. "Genesis 1, 26 to 28", for every run of
                    verses that follow on from each other and all have audio

Then it rewrites js/audio.js, the list of what exists, from the files on disk. The app
plays a file when it is listed there and falls back to the phone's voice when it is not.

The voices are Microsoft's online neural voices (through the edge-tts package), so this
needs internet and sends the verse text to that service. Files that already exist are
left alone unless --force is given.
"""
import asyncio
import json
import re
import sys
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
VOICES = {'en': 'en-IN-NeerjaNeural', 'ta': 'ta-IN-PallaviNeural'}
SPAN = {'en': '{a} to {b}', 'ta': '{a} முதல் {b} வரை'}  # same wording as STR.span in js/app.js
REF = re.compile(r'^(.*?)\s+(\d+):(\d+)([a-z]?)$')


def load_verses():
    """{lang: [(ref, text), ...]} from js/verses.js, in verse-number order."""
    src = (ROOT / 'js' / 'verses.js').read_text(encoding='utf-8')
    out = {}
    for lang, name in (('en', 'EN'), ('ta', 'TA')):
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
    if path.exists() and not force:
        return False
    await edge_tts.Communicate(text, voice).save(str(path))
    if path.stat().st_size < 1000:
        sys.exit('The speech service returned an empty file for %s' % path.name)
    return True


async def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    force = '--force' in sys.argv
    verses = load_verses()
    total = len(verses['en'])
    if not args:
        sys.exit(__doc__)
    wanted = parse_numbers(args, total)
    made = 0

    for lang, voice in VOICES.items():
        folder = ROOT / 'assets' / 'audio' / lang
        folder.mkdir(parents=True, exist_ok=True)
        refs = [r for r, _ in verses[lang]]

        for n in wanted:
            ref, text = verses[lang][n - 1]
            made += await say(text, voice, folder / ('v%03d.mp3' % n), force)
            made += await say(spoken(ref), voice, folder / ('r%03d.mp3' % n), force)

        # passage references: every stretch of 2+ consecutive verses that all have audio
        have = sorted(int(p.stem[1:]) for p in folder.glob('v[0-9][0-9][0-9].mp3'))
        for first in have:
            last = first
            while last + 1 in have and follows(refs[last - 1], refs[last]):
                last += 1
                label = ''.join(REF.match(refs[last - 1]).group(3, 4))
                text = spoken(SPAN[lang].format(a=refs[first - 1], b=label))
                made += await say(text, voice, folder / ('r%03d-%03d.mp3' % (first, last)), force)

    # the manifest lists what is on disk, so deleting a file and re-running keeps it honest
    manifest = {}
    for lang in VOICES:
        folder = ROOT / 'assets' / 'audio' / lang
        manifest[lang] = {
            'verses': sorted(int(p.stem[1:]) for p in folder.glob('v[0-9][0-9][0-9].mp3')),
            'refs': sorted(
                ('-'.join(str(int(x)) for x in p.stem[1:].split('-')) for p in folder.glob('r*.mp3')),
                key=lambda s: [int(x) for x in s.split('-')]),
        }
    (ROOT / 'js' / 'audio.js').write_text(
        '/* Written by tools/make_audio.py: the verses and references that have an audio file\n'
        '   in assets/audio/<lang>/. Anything not listed is read with the phone\'s own voice. */\n'
        'window.AUDIO = ' + json.dumps(manifest, separators=(',', ':')) + ';\n', encoding='utf-8')
    print('made %d new files; manifest: %s' % (made, {k: len(v['verses']) for k, v in manifest.items()}))


asyncio.run(main())
