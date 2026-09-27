#!/usr/bin/env bash
# Renders favicon PNGs and the Open Graph image with headless Chrome + ffmpeg.
#   tools/render-images.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CHROME="${CHROME:-$(command -v google-chrome || command -v chromium || command -v chromium-browser)}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

shot() { # url width height out.png
  rm -f "$4"
  # headless Chrome sometimes keeps running after writing the file, hence the timeout
  timeout 15 "$CHROME" --headless=new --no-sandbox --user-data-dir="$TMP/profile" \
    --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --default-background-color=00000000 \
    --window-size="$2,$3" --screenshot="$4" "$1" >/dev/null 2>&1 || true
  [[ -s "$4" ]] || { echo "Rendern fehlgeschlagen: $1" >&2; exit 1; }
}

IMG="$ROOT/assets/img"

cat > "$TMP/icon.html" <<EOF
<!doctype html><html><body style="margin:0;background:transparent">
<img src="file://$IMG/favicon.svg" style="display:block;width:100vw;height:100vh">
</body></html>
EOF
for size in 32 180 192 512; do
  shot "file://$TMP/icon.html" "$size" "$size" "$TMP/icon-$size.png"
done
cp "$TMP/icon-180.png" "$IMG/apple-touch-icon.png"
cp "$TMP/icon-192.png" "$IMG/icon-192.png"
cp "$TMP/icon-512.png" "$IMG/icon-512.png"
cp "$TMP/icon-32.png" "$IMG/favicon-32.png"
ffmpeg -hide_banner -loglevel error -y -i "$TMP/icon-32.png" "$ROOT/favicon.ico"

shot "file://$ROOT/tools/og-image.html" 1200 630 "$TMP/og.png"
ffmpeg -hide_banner -loglevel error -y -i "$TMP/og.png" -q:v 3 "$IMG/og-image.jpg"

echo "Bilder erzeugt."
