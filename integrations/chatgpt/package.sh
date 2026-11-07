#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
archive_dir=$(mktemp -d)
trap 'rm -rf "$archive_dir"' EXIT

zip -q "$archive_dir/drinks-fyi-chatgpt.zip" plugin.json mcp.json assets/icon.png
mkdir -p ../../dist
mv "$archive_dir/drinks-fyi-chatgpt.zip" ../../dist/drinks-fyi-chatgpt.zip
printf '%s\n' 'Created dist/drinks-fyi-chatgpt.zip'
