# cyberia.to

Source of https://cyberia.to — one static page, no build step. Public because
cyberproxy clones it without credentials; a push to `main` reaches the site within a minute.

- `index.html` — the page: the anthem as one thin line on top, the flag and the name under it (the brand
  leads home), the thesis in the middle, nine tiles at the bottom. The full list of projects with their stages is
  the graph page `cyberia/projects`.
- `sky/` — the living solar system behind the page on a desk: the sun on the left, the earth on the right, the
  rest of the planets where they stand today. Hidden on a phone, which loads only `sky/main.js`; still for
  `prefers-reduced-motion`. Every body is a photograph or a map on a sphere: the sun is an SDO frame; the earth is
  turned to the current hour by sidereal time and split into day and night by where the sun stands; the moon keeps
  its near side to the earth; each planet is turned by its IAU pole and day, saturn with its rings and both shadows.
  The orbits are light, each brightest at its planet and fading along the way it has come; the catalogue stars are
  soft points of light, each breathing at its own pace. Native ES modules, imported one way only:
  - `facts.js` — the tables: JPL orbital elements, IAU poles and radii, the Yale bright stars, each with its source.
  - `astro.js` — the laws: positions and axes as pure functions of the Julian day; no clock, no page.
  - `look.js` — the taste: sizes, colours, glow, orbit blur, star glow, twinkle — every number the owner tunes.
  - `draw.js` — the 2d primitives. `scene.js` — the geometry of this screen and the camera.
  - `spheres.js` — a map on a lit ball. `bodies.js` — the sun, the earth, the moon, the planets.
  - `backdrop.js` — the stars, the milky way, the orbits as light, the belt, the meteors.
  - `main.js` — the canvas, the one clock, the frame loop; it imports the rest only on a desk.
  - `test.mjs` — `node sky/test.mjs`: the sun against the almanac, the moon against published new and full moons,
    the planets against the 2020 great conjunction and the 2025 mars opposition.
- `img/sun.jpg`, `img/earth.jpg`, `img/earth-night.jpg`, `img/planets.jpg` — the maps `sky/` loads on a desk
  only. NASA, public domain: SDO/AIA 304 Å of 2026-11-17 17:38 UT, Blue Marble 2002 with clouds, Black Marble
  2012, the LRO colour map of the moon. Solar System Scope, CC BY 4.0, made from NASA mission data: mercury,
  venus, mars, jupiter, saturn and its rings, uranus, neptune. `img/textures.py` builds the four files from
  the originals named in its header; a fresh SDO frame gives a fresh sun.
- `fonts/` — Play 400 and 700, latin, self-hosted; the page carries its stylesheet inline, so the first paint needs the html and two fonts and nothing else.
- `player.js` — the player as one embeddable file. Any site adds
  `<script src="https://cyberia.to/player.js" async></script>`; it mounts into `[data-cyberia-player]`
  when the page has one, otherwise adds a fixed bar at the bottom; `data-mode="fab" data-bottom="72"`
  on the script tag gives a round corner button that unfolds. It plays the set unless
  `data-src`/`data-name`/`data-dur`/`data-file`/`data-title`/`data-wave` on the script tag name another
  track; `data-track="anthem"` or `"set"` names one of the two tracks it carries (this page plays the anthem); any `<div data-cyberia-track …>` gets an inline player; one plays
  at a time; position and a deliberate pause persist per track per origin.
- `cyberia.calling.mp3` — Cyberia Calling, the anthem: one render, 3:23, by st_joy, 2026.
- `atlas.shrugged.set.mp3` — Atlas Shrugged, the set: eight Suno renders of the anthem joined into
  27:09. IPFS particle `QmWPHsA3EPBwkLYGHXLmJpjhrcvmEGvjfw6mqaCuZ9qvQ9`. Built in `~/cyber/atlas.shrugged/set/`.
- `img/flag.svg` — the flag, used as the icon and the logo; `img/card.html` → `img/card.png` — the social card, rendered from the html with a headless browser at 1200×630.
- `llms.txt`, `robots.txt`, `sitemap.xml` — the page for agents and crawlers: what cyberia is, the doors, the canon, the symbols; JSON-LD (Organization, WebSite, MusicRecording) sits in the head of `index.html`.
- `host/` — what runs on cyberproxy: `sync.sh` (cron, every minute, fetch + rsync into the nginx
  docroot) and `setup.sh` (one-time install). Not copied to the docroot.

Runbook: `cybernode/sites/cyberia.to/README.md`.
