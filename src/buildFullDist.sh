#!/usr/bin/env bash

set -e

cd "$(dirname "$0")"
cd ..

FULL_MD=1 deno task build
deno run -A src/book-binding/buildBooks.ts
rm -rf _site/downloads
cp -R static/downloads _site/downloads
PRODUCTION_MODE=1 deno task build

cd _site
dprint fmt --config=../resources/html-output-dprint.json
cd ..

