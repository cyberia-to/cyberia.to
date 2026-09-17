#!/bin/bash
# one-time install on cyberproxy as user cyber: clone, docroot, cron. idempotent.
#   wget raw.githubusercontent.com/cyberia-to/cyberia.to/main/host/setup.sh
#   bash setup.sh
umask 022
set -u
REPO=https://github.com/cyberia-to/cyberia.to.git
CLONE=/home/cyber/cyberia-to-site
SYNC=/home/cyber/cyberia-to-sync.sh
DOCROOT=/var/www/html/cyberia.to
DOCROOT_FILE=/home/cyber/cyberia-to-docroot
WWW=/var/www/html

# heal what the first version of this script did on 2026-09-17:
# it rsynced with -a into /var/www/html, which made that directory 0700 and
# dropped two 0600 files there. give nginx its access back and remove the strays.
chmod 755 "$WWW" 2>/dev/null || true
for f in index.html atlas.shrugged.set.mp3; do
  if [ -f "$WWW/$f" ] && [ -f "$CLONE/$f" ] && cmp -s "$WWW/$f" "$CLONE/$f"; then
    rm -f "$WWW/$f" && echo "removed stray $WWW/$f"
  fi
done

if [ ! -d "$CLONE/.git" ]; then
  git clone --depth 1 -b main "$REPO" "$CLONE" || exit 1
fi
chmod 755 "$CLONE"
# always bring the clone to the tip before copying anything out of it
git -C "$CLONE" fetch origin main --quiet && git -C "$CLONE" reset --hard origin/main --quiet || exit 1
echo "clone at $(git -C "$CLONE" rev-parse --short HEAD)"

if [ ! -d "$DOCROOT" ]; then
  echo "no $DOCROOT on this host; the vhost for cyberia.to must point there"
  exit 1
fi
if [ ! -w "$DOCROOT" ]; then
  echo "$DOCROOT is not writable by $(whoami). run: sudo chown -R cyber $DOCROOT   then re-run"
  exit 1
fi
echo "$DOCROOT" > "$DOCROOT_FILE"
echo "docroot $DOCROOT"

cp "$CLONE/host/sync.sh" "$SYNC"
chmod 755 "$SYNC"

TMP=$(mktemp)
crontab -l 2>/dev/null | grep -v cyberia-to-sync > "$TMP"
echo "* * * * * $SYNC >/dev/null 2>&1" >> "$TMP"
crontab "$TMP"
rm -f "$TMP"
rm -f /home/cyber/s.sh /home/cyber/setup.sh

"$SYNC"
chmod 644 "$DOCROOT/index.html" "$DOCROOT/atlas.shrugged.set.mp3"

echo "--- crontab ---"
crontab -l
echo "--- docroot ---"
ls -la "$DOCROOT"
if crontab -l 2>/dev/null | grep -q cyberia-to-sync && [ -f "$DOCROOT/atlas.shrugged.set.mp3" ] && [ "$(stat -c %a "$WWW")" = "755" ] && [ "$(stat -c %a "$DOCROOT/index.html")" = "644" ] && grep -q rltp "$SYNC"; then
  echo "SETUP OK"
else
  echo "SETUP FAILED"
  exit 1
fi
