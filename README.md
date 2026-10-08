# cyberia.to

Source of https://cyberia.to — one static page, no build step. Public because
cyberproxy clones it without credentials; a push to `main` reaches the site within a minute.

- `index.html` — the page: the flag and the name on top (the brand leads home), the thesis in the
  middle, nine tiles and the anthem bar at the bottom. The full list of projects with their stages is
  the graph page `cyberia/constellation`.
- `style.css` — the stylesheet.
- `player.js` — the player as one embeddable file. Any site adds
  `<script src="https://cyberia.to/player.js" async></script>`; it mounts into `[data-cyberia-player]`
  when the page has one, otherwise adds a fixed bar at the bottom; `data-mode="fab" data-bottom="72"`
  on the script tag gives a round corner button that unfolds. It plays the set unless
  `data-src`/`data-name`/`data-dur`/`data-file`/`data-title`/`data-wave` on the script tag name another
  track (this page plays the anthem); any `<div data-cyberia-track …>` gets an inline player; one plays
  at a time; position and a deliberate pause persist per track per origin.
- `cyberia.calling.mp3` — Cyberia Calling, the anthem: one render, 3:23, by st_joy, 2026.
- `atlas.shrugged.set.mp3` — Atlas Shrugged, the set: eight Suno renders of the anthem joined into
  27:09. IPFS particle `QmWPHsA3EPBwkLYGHXLmJpjhrcvmEGvjfw6mqaCuZ9qvQ9`. Built in `~/cyber/atlas.shrugged/set/`.
- `img/cyb-eye.png` — the eye of cyb, the mark on its tile.
- `host/` — what runs on cyberproxy: `sync.sh` (cron, every minute, fetch + rsync into the nginx
  docroot) and `setup.sh` (one-time install). Not copied to the docroot.

Runbook: `cybernode/sites/cyberia.to/README.md`.
