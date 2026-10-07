#!/bin/sh
# Bundle the 3D view, then rebuild the page. Needs `npm ci` once in this folder.
# The Python build is local-only by default; ZORK_LIVE_COPY opts into a second copy.
set -e
cd "$(dirname "$0")"
npm run --silent bundle
python3 ../tools/build.py
