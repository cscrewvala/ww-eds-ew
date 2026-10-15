#!/usr/bin/env bash
# Regenerate, bundle and run the import for one or more templates.
# Usage: migration-work/run-import.sh <template> [<template> ...]
set -euo pipefail
cd "$(dirname "$0")/../.."
D=/home/node/.excat-marketplaces/excat-marketplace/excat/skills/excat-content-import/scripts
[ -d /excat-marketplace/excat/skills/excat-content-import/scripts ] && D=/excat-marketplace/excat/skills/excat-content-import/scripts
for t in "$@"; do
  python3 docs/migration/gen-import-script.py "$t"
  "$D/aem-import-bundle.sh" --importjs "tools/importer/import-$t.js" > /dev/null
  node "$D/run-bulk-import.js" --import-script "tools/importer/import-$t.bundle.js" \
    --urls "tools/importer/urls-$t.txt" --force > "/tmp/import-$t.log" 2>&1 || true
  echo "$t: $(grep -E 'Bulk Import\] Completed' "/tmp/import-$t.log" || echo 'FAILED (see log)')"
done
