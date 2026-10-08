# cyberia.to

Source of https://cyberia.to — one static page, no build step. Public because
cyberproxy clones it without credentials; a push reaches the site within a minute.

- `index.html` — the front page: the flag and the name on top, the thesis in the middle, the anthem at the bottom. Plays `cyberia.calling.mp3` on open (browsers that block autoplay start it on the first tap or key) and loops while the visitor stays.
- `projects/index.html` — the projects and the set.
- `style.css` — the one stylesheet of both pages.
- `cyberia.calling.mp3` — Cyberia Calling, the anthem: one render, 3:23, by st_joy, 2026.
- `atlas.shrugged.set.mp3` — Atlas Shrugged, the set: eight Suno renders of one anthem joined into 27:09. IPFS particle `QmWPHsA3EPBwkLYGHXLmJpjhrcvmEGvjfw6mqaCuZ9qvQ9`, linked from the page as "download from cyb.ai". Built in `~/cyber/atlas.shrugged/set/`.
- `player.js` — the player as one embeddable file; plays the set unless `data-src`/`data-name`/`data-dur`/`data-file`/`data-wave` on the script tag name another track. Any site adds `<script src="https://cyberia.to/player.js" async></script>`; it mounts into `[data-cyberia-player]` when the page has one, otherwise adds a fixed bar at the bottom; `data-mode="fab" data-bottom="72"` on the script tag gives a round corner button that unfolds on hover or tap, for pages whose header and bottom edge are taken. Position and a deliberate pause persist per origin.
- `host/` — what runs on cyberproxy: `sync.sh` (cron, every minute, fetch + rsync into the nginx docroot) and `setup.sh` (one-time install). Not copied to the docroot.

Runbook: `cybernode/sites/cyberia.to/README.md`.
