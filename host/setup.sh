#!/bin/bash
# one-time install on cyberproxy as user cyber: clone, find the docroot, install the cron.
# idempotent: safe to re-run. fetch it with
#   curl -sLo s.sh raw.githubusercontent.com/cyberia-to/cyberia.to/main/host/setup.sh
#   bash s.sh
set -u
REPO=https://github.com/cyberia-to/cyberia.to.git
CLONE=/home/cyber/cyberia-to-site
SYNC=/home/cyber/cyberia-to-sync.sh
DOCROOT_FILE=/home/cyber/cyberia-to-docroot

if [ ! -d "$CLONE/.git" ]; then
  git clone --depth 1 -b main "$REPO" "$CLONE" || exit 1
fi

# docroot = root directive of the nginx server that answers for cyberia.to
if [ ! -f "$DOCROOT_FILE" ]; then
  CONF=$(grep -ls 'server_name.*cyberia\.to' /etc/nginx/sites-enabled/* /etc/nginx/conf.d/* 2>/dev/null | head -1)
  ROOT=$(sed -n 's/^[[:space:]]*root[[:space:]]\+\([^;]*\);.*/\1/p' "$CONF" 2>/dev/null | head -1)
  if [ -z "$ROOT" ]; then
    echo "docroot not found in nginx config; write it into $DOCROOT_FILE and re-run"
    exit 1
  fi
  echo "$ROOT" > "$DOCROOT_FILE"
fi
DOCROOT=$(cat "$DOCROOT_FILE")
echo "docroot $DOCROOT"
if [ ! -w "$DOCROOT" ]; then
  echo "docroot is not writable by $(whoami). run: sudo chown -R cyber $DOCROOT   then re-run"
  exit 1
fi

cp "$CLONE/host/sync.sh" "$SYNC"
chmod +x "$SYNC"

TMP=$(mktemp)
crontab -l 2>/dev/null | grep -v cyberia-to-sync > "$TMP"
echo "* * * * * $SYNC >/dev/null 2>&1" >> "$TMP"
crontab "$TMP"
rm -f "$TMP"
rm -f /home/cyber/s.sh

"$SYNC"

echo "--- crontab ---"
crontab -l
if crontab -l 2>/dev/null | grep -q cyberia-to-sync && [ -f "$DOCROOT/atlas.shrugged.set.mp3" ]; then
  echo "SETUP OK"
else
  echo "SETUP FAILED"
  exit 1
fi
