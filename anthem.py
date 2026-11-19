"""The anthem the page plays: Atlas Shrugged I three times, then the rest of the set as its tail.
Needs numpy and ffmpeg on the PATH.

    python3 anthem.py <0.atlas.shrugged.mp3> <atlas.shrugged.set.flac> <out_dir>

0.atlas.shrugged.mp3 is the first track of the set (the same Suno render as cyberia.calling.mp3); the set's
lossless master opens with that same track at +0.3 dB, then runs on through its other seven. Two more passes of
the first track go in front of the set. Each pass joins the next the way the set joins I to II: the next
track's pads enter under the fading tail at -6 dB and rise to full, its drums land 1.8 s after the last sound.

Writes cyberia.anthem.mp3 (48 kHz, 192 kbit/s CBR so a seek lands where it is asked, chapters inside) and
prints the length and the waveform string for player.js.
"""
import os
import subprocess
import sys
import tempfile

import numpy as np

ONE, SET, OUT = sys.argv[1:4]
SR = 48000
GAIN = 10 ** (0.3 / 20)        # the set's gain for track 1 (plan.json gain_db "0")
A_TIME = 205.0                 # where the next pass reaches full level, in the time of the pass before
ANCHOR = 12.975                # the drums' entry in track 1: the next pass is at full level from here
PRE_DB = -6.0                  # the next pass's pads enter this much below full
PASSES = 3
WAVE = 600
DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz'
TITLES = ['Atlas Shrugged I', 'Atlas Shrugged II', 'Atlas Shrugged III', 'Cyberia Calling 2.0 I',
          'Cyberia Calling 2.0 II', 'Rebuild Eden I', 'Rebuild Eden II', 'Atlas Shrugged IV']
SET_CUES = [205.0, 394.04, 600.24, 795.64, 1099.95, 1267.07, 1436.33]   # atlas.shrugged.set.cue, tracks 2-8


def decode(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ar', str(SR), '-ac', '2', '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2)


def lag(a, s):
    """samples by which the set's copy of track 1 trails the decoded track (decoders pad differently)"""
    x, y = a[SR * 30:SR * 40].mean(1), s[SR * 29:SR * 41].mean(1)
    n = 1 << int(np.ceil(np.log2(len(x) + len(y))))
    c = np.fft.irfft(np.fft.rfft(y, n) * np.conj(np.fft.rfft(x, n)), n)
    return int(np.argmax(c[:len(y)])) - SR


def main():
    one, whole = decode(ONE), decode(SET)
    d = lag(one, whole)
    seg = slice(SR * 20, SR * 180)
    resid = whole[SR * 20 + d:SR * 180 + d] - GAIN * one[seg]
    match = 10 * np.log10((resid ** 2).mean() / (whole[SR * 20 + d:SR * 180 + d] ** 2).mean())
    print('set opens with track 1 %+d samples late, residual %.0f dB' % (d, match))
    assert match < -60, 'the set does not open with this track at +0.3 dB'

    step = A_TIME - ANCHOR
    rise = np.linspace(10 ** (PRE_DB / 20), 1.0, int(ANCHOR * SR)).astype(np.float32)
    starts = [round(k * step * SR) for k in range(PASSES)]
    out = np.zeros((starts[-1] - d + len(whole), 2), np.float32)
    for k in range(PASSES - 1):
        y = one * GAIN
        if k:
            y = y.copy(); y[:len(rise)] *= rise[:, None]
        out[starts[k]:starts[k] + len(y)] += y
    tail = whole.copy()
    tail[d:d + len(rise)] *= rise[:, None]
    out[starts[-1] - d:] += tail
    peak = float(np.abs(out).max())
    print('length %.2f s, peak %.2f dBFS' % (len(out) / SR, 20 * np.log10(peak)))
    assert peak < 1.0

    env = np.abs(out).max(1)
    edges = np.linspace(0, len(env), WAVE + 1).astype(int)
    lv = np.array([env[edges[i]:edges[i + 1]].max() for i in range(WAVE)])
    lv = np.clip(lv / lv.max(), 0, 1)
    wave = ''.join(DIGITS[int(round(v * 35))] for v in lv)

    tmp = tempfile.mkdtemp(prefix='anthem-')
    pcm = os.path.join(tmp, 'anthem.f32')
    out.tofile(pcm)
    marks = [s / SR for s in starts] + [(starts[-1] - d) / SR + t for t in SET_CUES]
    names = TITLES[:1] * PASSES + TITLES[1:]
    meta = os.path.join(tmp, 'meta.txt')
    with open(meta, 'w') as f:
        f.write(';FFMETADATA1\ntitle=Cyberia Calling — Anthem\nartist=st_joy\n')
        ends = marks[1:] + [len(out) / SR]
        for t0, t1, name in zip(marks, ends, names):
            f.write('[CHAPTER]\nTIMEBASE=1/1000\nSTART=%d\nEND=%d\ntitle=%s\n' % (t0 * 1000, t1 * 1000, name))
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', pcm,
                    '-i', meta, '-map_metadata', '1', '-map_chapters', '1', '-c:a', 'libmp3lame', '-b:a', '192k',
                    '-id3v2_version', '3', os.path.join(OUT, 'cyberia.anthem.mp3')], check=True)
    for t, name in zip(marks, names):
        print('%02d:%05.2f  %s' % (t // 60, t % 60, name))
    print('wave', wave)


main()
