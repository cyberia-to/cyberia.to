# cyberia.to

Source of https://cyberia.to — one static page, no build step. Public because
cyberproxy clones it without credentials; a push reaches the site within a minute.

- `index.html` — the page: the flag and the name on top, the thesis in the middle, the tiles and the anthem at the bottom; the full list of projects is the graph page `cyberia/constellation`. Plays `cyberia.calling.mp3` on open (browsers that block autoplay start it on the first tap or key) and loops while the visitor stays.
- `style.css` — the stylesheet.
- `cyberia.calling.mp3` — Cyberia Calling, the anthem: one render, 3:23, by st_joy, 2026.
- `atlas.shrugged.set.mp3` — Atlas Shrugged, the set: eight Suno renders of one anthem joined into 27:09. IPFS particle `QmWPHsA3EPBwkLYGHXLmJpjhrcvmEGvjfw6mqaCuZ9qvQ9`, linked from the page as "download from cyb.ai". Built in `~/cyber/atlas.shrugged/set/`.
- `player.js` — the player as one embeddable file: the primary player (the bar, a slot or a fab) plays the set unless `data-src`/`data-name`/`data-dur`/`data-file`/`data-wave` on the script tag name another track; any `<div data-cyberia-track …>` on the page gets its own inline player; one plays at a time; position and pause persist per track.
- `host/` — what runs on cyberproxy: `sync.sh` (cron, every minute, fetch + rsync into the nginx docroot) and `setup.sh` (one-time install). Not copied to the docroot.

Runbook: `cybernode/sites/cyberia.to/README.md`.
