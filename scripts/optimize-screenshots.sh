#!/usr/bin/env bash
# Converts the original product screenshots (PNG) into the web formats used
# on the landing page: <name>.webp (max. 1600 px), <name>-800.webp and a
# <name>.jpg fallback in assets/screenshots/.
#
#   scripts/optimize-screenshots.sh [quellordner]
#       Default-Quellordner: ki-belegtrennung-briefing/
#       Erwartete Dateien: shot-login.png, shot-alle-dokumente.png,
#                          shot-stapel-detail.png, shot-belegassistent.png
#
#   scripts/optimize-screenshots.sh --single <datei.png> <zielname>
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/assets/screenshots"
mkdir -p "$OUT"

convert_one() { # src name
  local src="$1" name="$2"
  ffmpeg -hide_banner -loglevel error -y -i "$src" \
    -vf "scale='min(1600,iw)':-2:flags=lanczos" -c:v libwebp -quality 82 -compression_level 6 "$OUT/$name.webp"
  ffmpeg -hide_banner -loglevel error -y -i "$src" \
    -vf "scale='min(800,iw)':-2:flags=lanczos" -c:v libwebp -quality 80 -compression_level 6 "$OUT/$name-800.webp"
  ffmpeg -hide_banner -loglevel error -y -i "$src" \
    -vf "scale='min(1600,iw)':-2:flags=lanczos,format=yuvj420p" -q:v 4 "$OUT/$name.jpg"
  echo "  $name  <-  $(basename "$src")"
}

if [[ "${1:-}" == "--single" ]]; then
  convert_one "$2" "$3"
  exit 0
fi

SRC="${1:-$ROOT/ki-belegtrennung-briefing}"
declare -A MAP=(
  [shot-login.png]=login
  [shot-alle-dokumente.png]=alle-dokumente
  [shot-stapel-detail.png]=stapel-detail
  [shot-belegassistent.png]=belegassistent
)

missing=0
for file in "${!MAP[@]}"; do
  if [[ -f "$SRC/$file" ]]; then
    convert_one "$SRC/$file" "${MAP[$file]}"
  else
    echo "  fehlt: $SRC/$file" >&2
    missing=1
  fi
done
exit "$missing"
