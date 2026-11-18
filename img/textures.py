"""The maps sky.js draws the sun, the earth, the moon and the planets from. Needs pillow and numpy.

    python3 textures.py <src_dir> <out_dir>

src_dir holds the originals under the names they are served by:

latest_4096_0304.jpg            a 4096 px SDO/AIA 304 Å frame, NASA/SDO and the AIA, EVE and HMI science teams
                                https://sdo.gsfc.nasa.gov/assets/img/latest/latest_4096_0304.jpg
Land_ocean_ice_cloud_hires.jpg  Blue Marble 2002, land, ocean, ice and clouds, NASA Goddard / Reto Stöckli
                                https://commons.wikimedia.org/wiki/File:Land_ocean_ice_cloud_hires.jpg
The_earth_at_night.jpg          Black Marble 2012, NASA Earth Observatory / Suomi NPP
                                https://commons.wikimedia.org/wiki/File:The_earth_at_night.jpg
lroc_color_poles_1k.jpg         the LRO colour map of the CGI Moon Kit, NASA's Scientific Visualization Studio
                                https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_1k.jpg
Solarsystemscope_texture_2k_{mercury,venus_atmosphere,mars,jupiter,saturn,uranus,neptune}.jpg
Solarsystemscope_texture_2k_saturn_ring_alpha.png
                                Solar System Scope, CC BY 4.0, made from NASA mission data, colours a little
                                richer, gaps filled in: https://commons.wikimedia.org/wiki/File:<name>

Writes sun.jpg (1024 px, the limb at 0.8 of half the frame — SUN_FILL in sky.js), earth.jpg (2048 × 1024),
earth-night.jpg (1024 × 512) and planets.jpg: eight maps 512 × 256 one under another — mercury, venus, mars,
jupiter, saturn, uranus, neptune, moon — then saturn's rings from the inside out, 16 px of colour weighed by
opacity and 16 px of opacity. Every map is equirectangular with the prime meridian in the middle.
"""
import sys

import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
SRC, OUT = sys.argv[1:3]
SUN = SRC + '/latest_4096_0304.jpg'
DAY = SRC + '/Land_ocean_ice_cloud_hires.jpg'
NIGHT = SRC + '/The_earth_at_night.jpg'
MOON = SRC + '/lroc_color_poles_1k.jpg'
PLANET = SRC + '/Solarsystemscope_texture_2k_%s.jpg'
RINGS = SRC + '/Solarsystemscope_texture_2k_saturn_ring_alpha.png'
ATLAS = ['mercury', 'venus_atmosphere', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']

HALF = 1.25             # half the frame, in limb radii
FADE = (1.04, 1.19)     # the corona fades to black between these radii
GAMMA = 0.62
# the intensities of the frame through the palette of the page's sun: ember, orange, gold, white
STOPS = np.array([0.0, 0.10, 0.30, 0.52, 0.76, 1.0])
COLORS = np.array([[0, 0, 0], [96, 10, 0], [226, 52, 0], [255, 122, 8], [255, 204, 60], [255, 250, 226]], np.float32)


def sun():
    a = np.asarray(Image.open(SUN).convert('RGB')).astype(np.float32)
    n = a.shape[0]
    a[3930:, :2400] = a[165::-1, :2400]     # the timestamp in the corner: the corona mirrored from the top
    s = a.sum(axis=2) / 765.0               # the frame's colour table is monotonic in r + g + b

    # the limb: where each ray falls to half the disc's level; a circle through those points
    c0, pts = n / 2.0, []
    for ang in np.linspace(0, 2 * np.pi, 720, endpoint=False):
        rr = np.arange(1450, 1850)
        xs = np.clip((c0 + rr * np.cos(ang)).astype(int), 0, n - 1)
        ys = np.clip((c0 + rr * np.sin(ang)).astype(int), 0, n - 1)
        p = np.convolve(s[ys, xs], np.ones(9) / 9, mode='same')
        below = np.where(p[80:] < np.median(p[10:80]) * 0.5)[0]
        if len(below):
            r = rr[80 + below[0]]
            pts.append((c0 + r * np.cos(ang), c0 + r * np.sin(ang)))
    pts = np.array(pts)
    for _ in range(4):                      # least squares, prominences rejected
        m = np.c_[2 * pts[:, 0], 2 * pts[:, 1], np.ones(len(pts))]
        sol = np.linalg.lstsq(m, (pts ** 2).sum(axis=1), rcond=None)[0]
        cx, cy = sol[0], sol[1]
        rad = np.sqrt(sol[2] + cx * cx + cy * cy)
        res = np.hypot(pts[:, 0] - cx, pts[:, 1] - cy) - rad
        pts = pts[np.abs(res) < max(3.0, 1.5 * res.std())]
    print('sun: centre %.1f %.1f, limb radius %.1f px' % (cx, cy, rad))

    yy, xx = np.mgrid[0:n, 0:n]
    t = np.clip((FADE[1] - np.hypot(xx - cx, yy - cy) / rad) / (FADE[1] - FADE[0]), 0, 1)
    v = np.clip(s, 0, 1) ** GAMMA
    g = np.stack([np.interp(v, STOPS, COLORS[:, k]) for k in range(3)], axis=2) * (t * t * (3 - 2 * t))[..., None]

    half = int(round(rad * HALF))
    x0, y0 = int(round(cx)) - half, int(round(cy)) - half
    frame = np.zeros((2 * half, 2 * half, 3), np.float32)
    sx0, sy0, sx1, sy1 = max(0, x0), max(0, y0), min(n, x0 + 2 * half), min(n, y0 + 2 * half)
    frame[sy0 - y0:sy1 - y0, sx0 - x0:sx1 - x0] = g[sy0:sy1, sx0:sx1]
    out = Image.fromarray(np.clip(frame, 0, 255).astype(np.uint8)).resize((1024, 1024), Image.LANCZOS)
    out.save(OUT + '/sun.jpg', quality=84, optimize=True, progressive=True)


def earth():
    day = Image.open(DAY).convert('RGB').resize((2048, 1024), Image.LANCZOS)
    day.save(OUT + '/earth.jpg', quality=82, optimize=True, progressive=True)
    night = Image.open(NIGHT).convert('RGB').resize((1024, 512), Image.LANCZOS)
    night.save(OUT + '/earth-night.jpg', quality=84, optimize=True, progressive=True)


def planets():
    atlas = Image.new('RGB', (512, 256 * 8 + 32))
    for i, src in enumerate([PLANET % n for n in ATLAS] + [MOON]):
        atlas.paste(Image.open(src).convert('RGB').resize((512, 256), Image.LANCZOS), (0, 256 * i))
    r = np.asarray(Image.open(RINGS).convert('RGBA')).astype(np.float32).mean(axis=0)   # one radial profile
    r = r.reshape(512, r.shape[0] // 512, 4).mean(axis=1)
    band = np.zeros((32, 512, 3), np.float32)
    band[:16] = r[:, :3] * r[:, 3:4] / 255
    band[16:] = r[:, 3:4]
    atlas.paste(Image.fromarray(np.clip(band, 0, 255).astype(np.uint8)), (0, 256 * 8))
    atlas.save(OUT + '/planets.jpg', quality=86, optimize=True, progressive=True, subsampling=0)


sun()
earth()
planets()
