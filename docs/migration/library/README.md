# da.live library builders

Regenerate the block and template library documents for da.live (`/library/` in DA).

    npm install --prefix /tmp/libtools jsdom@24          # dependency (path used by the scripts)
    python3 docs/migration/build-da-package.py           # DA-format documents in /tmp/da-upload/docs
    node docs/migration/library/build-library.cjs "$PWD" /tmp/da-upload/docs /tmp/da-library
    node docs/migration/library/build-templates.cjs /tmp/da-upload/docs /tmp/da-library

Output in `/tmp/da-library/library/`: `blocks/<block>.html` (one real example per visual variant +
`library-metadata` description), `blocks.json` (tabs `blocks`: name/path, `options`: section styles
and page metadata values from the Universal Editor models), `templates/<template>.html` (structure
of a representative page with placeholder text) and `templates.json`.
Upload to `https://admin.da.live/source/cscrewvala/ww-eds-ew/library/...` (preview, don't publish).
Site config (library, data, prepare tabs): `docs/migration/da-site-config.json`.
