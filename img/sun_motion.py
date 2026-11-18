"""The sun in motion: SDO's last 48 hours at 304 Å, in the palette of the page, looped without a seam.
Needs pillow, numpy and ffmpeg on the PATH.

    python3 sun_motion.py <latest_1024_0304.mp4> <out_dir>

source  https://sdo.gsfc.nasa.gov/assets/img/latest/mpeg/latest_1024_0304.mp4 — NASA/SDO and the AIA, EVE and
        HMI science teams: one frame about every ten minutes over the last two days.

Writes sun-motion.mp4 (H.264, framed like sun.jpg: the limb at 0.8 of half the frame) and sun-motion.json:
the frame rate, the moments the recording spans, and for every frame the mean brightness of the disc relative
to the whole run — the light the page's glow follows. The last LOOP frames are blended into the first, so the
end runs on into the start.
"""
import json
import os
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image

SRC, OUT = sys.argv[1:3]
SIZE = 640
LOOP = 24
HALF, FADE, GAMMA = 1.25, (1.04, 1.19), 0.62
STOPS = np.array([0.0, 0.10, 0.30, 0.52, 0.76, 1.0])
COLORS = np.array([[0, 0, 0], [96, 10, 0], [226, 52, 0], [255, 122, 8], [255, 204, 60], [255, 250, 226]], np.float32)


def limb(s):
    """centre and radius of the disc: where each ray falls to half the disc's level, a circle through them"""
    n = s.shape[0]
    c0, pts = n / 2.0, []
    for ang in np.linspace(0, 2 * np.pi, 720, endpoint=False):
        rr = np.arange(int(n * 0.35), int(n * 0.45))
        xs = np.clip((c0 + rr * np.cos(ang)).astype(int), 0, n - 1)
        ys = np.clip((c0 + rr * np.sin(ang)).astype(int), 0, n - 1)
        p = np.convolve(s[ys, xs], np.ones(5) / 5, mode='same')
        below = np.where(p[20:] < np.median(p[3:20]) * 0.5)[0]
        if len(below):
            r = rr[20 + below[0]]
            pts.append((c0 + r * np.cos(ang), c0 + r * np.sin(ang)))
    pts = np.array(pts)
    for _ in range(4):
        m = np.c_[2 * pts[:, 0], 2 * pts[:, 1], np.ones(len(pts))]
        sol = np.linalg.lstsq(m, (pts ** 2).sum(axis=1), rcond=None)[0]
        cx, cy = sol[0], sol[1]
        rad = np.sqrt(sol[2] + cx * cx + cy * cy)
        res = np.hypot(pts[:, 0] - cx, pts[:, 1] - cy) - rad
        pts = pts[np.abs(res) < max(1.0, 1.5 * res.std())]
    return cx, cy, rad


def main():
    tmp = tempfile.mkdtemp(prefix='sun-motion-')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', SRC, os.path.join(tmp, 'f%04d.png')], check=True)
    names = sorted(f for f in os.listdir(tmp) if f.startswith('f'))
    first = np.asarray(Image.open(os.path.join(tmp, names[0])).convert('RGB')).astype(np.float32)
    n = first.shape[0]
    band = int(n * 0.955)                      # the timestamp burned into the bottom: the corona mirrored over it
    cx, cy, rad = limb(first.sum(axis=2) / 765.0)
    print('limb: centre %.1f %.1f, radius %.1f px, %d frames' % (cx, cy, rad, len(names)))
    yy, xx = np.mgrid[0:n, 0:n]
    d = np.hypot(xx - cx, yy - cy) / rad
    t = np.clip((FADE[1] - d) / (FADE[1] - FADE[0]), 0, 1)
    fade = (t * t * (3 - 2 * t))[..., None]
    disc = d < 0.95
    half = int(round(rad * HALF))
    x0, y0 = int(round(cx)) - half, int(round(cy)) - half
    frames, light = [], []
    for name in names:
        a = np.asarray(Image.open(os.path.join(tmp, name)).convert('RGB')).astype(np.float32)
        a[band:] = a[2 * band - n:band][::-1][:n - band]
        s = a.sum(axis=2) / 765.0
        light.append(float(s[disc].mean()))
        v = np.clip(s, 0, 1) ** GAMMA
        g = np.stack([np.interp(v, STOPS, COLORS[:, k]) for k in range(3)], axis=2) * fade
        frame = np.zeros((2 * half, 2 * half, 3), np.float32)
        sx0, sy0, sx1, sy1 = max(0, x0), max(0, y0), min(n, x0 + 2 * half), min(n, y0 + 2 * half)
        frame[sy0 - y0:sy1 - y0, sx0 - x0:sx1 - x0] = g[sy0:sy1, sx0:sx1]
        frames.append(np.asarray(Image.fromarray(np.clip(frame, 0, 255).astype(np.uint8)).resize((SIZE, SIZE), Image.LANCZOS)).astype(np.float32))
    # the seam: the last LOOP frames fade into the first LOOP, and the run starts after them
    N = len(frames)
    out, lit = [], []
    for i in range(LOOP, N):
        f, l = frames[i], light[i]
        if i >= N - LOOP:
            w = (i - (N - LOOP) + 1) / (LOOP + 1)
            j = i - (N - LOOP)
            f = f * (1 - w) + frames[j] * w
            l = l * (1 - w) + light[j] * w
        out.append(f)
        lit.append(l)
    for i, f in enumerate(out):
        Image.fromarray(np.clip(f, 0, 255).astype(np.uint8)).save(os.path.join(tmp, 'o%04d.png' % i))
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', '20', '-i', os.path.join(tmp, 'o%04d.png'),
                    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '27', '-preset', 'slow', '-movflags', '+faststart',
                    '-an', os.path.join(OUT, 'sun-motion.mp4')], check=True)
    mean = sum(lit) / len(lit)
    probe = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format_tags=creation_time', '-of', 'default=nw=1:nk=1', SRC],
                           capture_output=True, text=True).stdout.strip()
    json.dump({'fps': 20, 'frames': len(out), 'source': 'NASA/SDO AIA 304, latest 48 hours', 'made': probe or None,
               'light': [round(x / mean, 4) for x in lit]}, open(os.path.join(OUT, 'sun-motion.json'), 'w'))
    print('wrote', len(out), 'frames; light from %.3f to %.3f of the mean' % (min(lit) / mean, max(lit) / mean))


main()
