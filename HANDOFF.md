# cyberia.to — getting the player live

The page on https://cyberia.to is served by nginx on cyberproxy
(167.235.28.94, `/var/www/html/…`). This machine has no SSH there.
Three ways to publish, pick one:

## A · rsync by an admin with SSH

```sh
rsync -avz --exclude=.git --exclude=HANDOFF.md --exclude=README.md \
  ~/cyber/cyberia.to/ cyberproxy:/var/www/html/cyberia.to/
```
Adjust the docroot to whatever the cyberia.to vhost uses
(`grep root /etc/nginx/sites-enabled/*cyberia.to*`).

## B · cron sync from a public repo, like cyberia.my

Push this folder to `github.com/cyberia-to/cyberia.to` and add the same
one-minute fetch + rsync cron that serves cyberia.my
(`cybernode/sites/cyberia.my/sync.sh`, docroot swapped). Needs one console
session on cyberproxy to install the cron.

## C · GitHub Pages

Push to `cyberia-to/cyberia.to`, enable Pages on `main`, `CNAME` is in the
repo. Then point DNS: `cyberia.to A` → 185.199.108.153 / 109 / 110 / 111
(and `www CNAME cyberia-to.github.io`). No server touched, mirrors what
cybervalley.io did.

## IPFS

The mp3 is particle `QmWPHsA3EPBwkLYGHXLmJpjhrcvmEGvjfw6mqaCuZ9qvQ9`
(CIDv0, default chunker, same as `ipfs add` on Io would give). The
"download from cyb.ai" link resolves once Io holds the bytes:

```sh
ssh io 'curl -sL https://cyberia.to/atlas.shrugged.set.mp3 | ipfs add -Q'   # prints the CID above
ssh io 'ipfs pin add QmWPHsA3EPBwkLYGHXLmJpjhrcvmEGvjfw6mqaCuZ9qvQ9'
```

On 2026-09-17 io.cybernode.ai and gateway.ipfs.cybernode.ai accepted TLS
but returned nothing for 60 s on `/api/v0/version` and `/ipfs/<cid>`;
cyb.ai uploads will fail until that is fixed.
