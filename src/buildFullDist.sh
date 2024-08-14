#!/usr/bin/env bash

set -e

npm run clean
npm run css:build
npm run site:mdbuild
node src/book-binding/buildBooks.js
mkdir -p _site/downloads
cp static/downloads/* _site/downloads/
ENVIRONMENT=production npm run site:build
