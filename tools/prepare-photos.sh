#!/usr/bin/env bash
# Runs automatically on GitHub each time the site is published (see
# .github/workflows/publish.yml). It only changes the copy of the photos
# used for the website. The originals in the "photos" folder stay as-is.
#   - converts iPhone HEIC photos to JPG
#   - shrinks large photos to at most 1600 pixels wide/tall
#   - fixes sideways photos and removes hidden data such as GPS location
set -uo pipefail
dir="${1:-photos}"
shopt -s nullglob nocaseglob globstar

for f in "$dir"/**/*.heic "$dir"/**/*.heif; do
  out="${f%.*}.jpg"
  # Don't overwrite a different photo that already has the same name.
  [ -e "$out" ] && out="${f%.*}-heic.jpg"
  echo "Converting $f"
  if heif-convert -q 90 "$f" "$out" >/dev/null; then
    # A file holding several pictures comes out as name-1.jpg, name-2.jpg...; keep the first.
    if [ ! -f "$out" ] && [ -f "${out%.jpg}-1.jpg" ]; then
      mv "${out%.jpg}-1.jpg" "$out"
      rm -f "${out%.jpg}"-[0-9]*.jpg
    fi
    rm "$f"
  else
    echo "  Warning: couldn't convert $f, skipping it"
  fi
done

for f in "$dir"/**/*.jpg "$dir"/**/*.jpeg "$dir"/**/*.png "$dir"/**/*.webp; do
  echo "Preparing $f"
  mogrify -auto-orient -resize '1600x1600>' -strip -quality 82 "$f" || echo "  Warning: couldn't shrink $f, using it as-is"
done
