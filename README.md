# cyberia.to

Source of https://cyberia.to — one static page, no build step. Public because
cyberproxy clones it without credentials; a push reaches the site within a minute.

- `index.html` — the page. Plays `atlas.shrugged.set.mp3` on open (browsers that block autoplay start it on the first tap or key) and loops while the visitor stays.
- `atlas.shrugged.set.mp3` — Atlas Shrugged, the set: eight Suno renders of one anthem joined into 27:09. IPFS particle `QmWPHsA3EPBwkLYGHXLmJpjhrcvmEGvjfw6mqaCuZ9qvQ9`, linked from the page as "download from cyb.ai". Built in `~/cyber/atlas.shrugged/set/`.
- `player.js` — the player as one embeddable file. Any site adds `<script src="https://cyberia.to/player.js" async></script>`; it mounts into `[data-cyberia-player]` when the page has one, otherwise adds a fixed bar at the bottom; `data-mode="fab" data-bottom="72"` on the script tag gives a round corner button that unfolds on hover or tap, for pages whose header and bottom edge are taken. Position and a deliberate pause persist per origin.
- `host/` — what runs on cyberproxy: `sync.sh` (cron, every minute, fetch + rsync into the nginx docroot) and `setup.sh` (one-time install). Not copied to the docroot.

Runbook: `cybernode/sites/cyberia.to/README.md`.
