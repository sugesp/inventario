#!/bin/sh
set -eu

BASE_HREF="${BASE_HREF:-/}"

case "$BASE_HREF" in
  "")
    BASE_HREF="/"
    ;;
  /*)
    ;;
  *)
    BASE_HREF="/$BASE_HREF"
    ;;
esac

case "$BASE_HREF" in
  */)
    ;;
  *)
    BASE_HREF="$BASE_HREF/"
    ;;
esac

sed -i "s|__BASE_HREF__|$BASE_HREF|g" /usr/share/nginx/html/index.html
sed -i "s|__BASE_HREF__|$BASE_HREF|g" /usr/share/nginx/html/manifest.json
