# cyberia.to

Source of https://cyberia.to — one static page, no build step.

- `index.html` — the page. Plays `atlas.shrugged.set.mp3` on open (browsers that block autoplay start it on the first tap or key), loops while the visitor stays.
- `atlas.shrugged.set.mp3` — Atlas Shrugged, the set: eight Suno renders of one anthem joined into 27:09. IPFS particle `QmWPHsA3EPBwkLYGHXLmJpjhrcvmEGvjfw6mqaCuZ9qvQ9`, linked from the page as "download from cyb.ai". Built in `~/cyber/atlas.shrugged/set/`.
- `CNAME` — for GitHub Pages, if the page moves there.

The live page (2026-09-07) was served by nginx on cyberproxy; this repo starts from that HTML verbatim plus the player.
