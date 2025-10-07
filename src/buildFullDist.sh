#!/usr/bin/env bash

set -e

cd "$(dirname "$0")"
cd ..

rm -rf pubs/web/static/downloads/*
FULL_MD=1 deno task build
deno run --allow-write --allow-run --allow-read src/book-binding/buildBooks.ts
PRODUCTION_MODE=1 FULL_MD=1 deno task build
