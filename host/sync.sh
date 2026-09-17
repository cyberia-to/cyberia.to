#!/bin/bash
# sync the cyberia.to page from the public repo into the nginx docroot.
# runs from cron on cyberproxy as user cyber, once a minute.
umask 022
CLONE=/home/cyber/cyberia-to-site
DOCROOT_FILE=/home/cyber/cyberia-to-docroot

[ -f "$DOCROOT_FILE" ] || exit 1
DOCROOT=$(cat "$DOCROOT_FILE")
[ -d "$DOCROOT" ] || exit 1
cd "$CLONE" || exit 1

# a network blip is not an error worth mailing about; the next minute retries
if git fetch origin main --quiet; then
  git reset --hard origin/main --quiet || exit 1
fi

# -rlt, not -a: never carry the clone's modes or owner onto the docroot.
# --chmod fixes what nginx needs. no --delete: the docroot may hold other files.
rsync -rlt --chmod=D755,F644 --exclude=.git --exclude=host --exclude=README.md "$CLONE/" "$DOCROOT/"
