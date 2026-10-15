"""Build the Document Authoring upload package from content/*.plain.html.

Writes /tmp/da-upload/ with:
  docs/<path>.html        DA documents (<body><header/><main>…</main><footer/></body>)
  media/images/*          local images referenced by nav/footer
  redirects.json          DA sheet built from docs/migration/redirects.tsv
  manifest.json           { docs: [...paths], media: [...], sheets: [...] }
Usage: python3 docs/migration/build-da-package.py
"""
import json
import os
import re
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CONTENT = os.path.join(ROOT, 'content')
OUT = '/tmp/da-upload'
ORG, SITE = 'cscrewvala', 'ww-eds-ew'
MEDIA_BASE = f'https://content.da.live/{ORG}/{SITE}'

shutil.rmtree(OUT, ignore_errors=True)
os.makedirs(f'{OUT}/docs')
manifest = {'docs': [], 'media': [], 'sheets': []}

for dirpath, _, files in os.walk(CONTENT, followlinks=True):
    for f in files:
        full = os.path.join(dirpath, f)
        rel = os.path.relpath(full, CONTENT)
        if f.endswith('.plain.html'):
            path = rel[:-len('.plain.html')]
            body = open(full, encoding='utf-8').read()
            # local images (nav/footer) -> absolute DA media URLs
            body = re.sub(r'src="(?:\./)?images/', f'src="{MEDIA_BASE}/images/', body)
            doc = f'<body><header></header><main>{body}</main><footer></footer></body>'
            dest = os.path.join(OUT, 'docs', path + '.html')
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            open(dest, 'w', encoding='utf-8').write(doc)
            manifest['docs'].append(path)
        elif rel.startswith('images' + os.sep):
            dest = os.path.join(OUT, 'media', rel)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            shutil.copy(full, dest)
            manifest['media'].append(rel)

rows = [line.rstrip('\n').split('\t') for line in open(os.path.join(ROOT, 'docs/migration/redirects.tsv'))][1:]
data = [{'Source': s, 'Destination': d} for s, d in rows if s and d]
sheet = {':type': 'sheet', ':colWidths': [400, 600], 'total': len(data), 'limit': len(data),
         'offset': 0, 'data': data}
json.dump(sheet, open(f'{OUT}/redirects.json', 'w'), indent=1)
manifest['sheets'].append('redirects')
manifest['docs'].sort()
json.dump(manifest, open(f'{OUT}/manifest.json', 'w'), indent=1)
print(len(manifest['docs']), 'docs;', len(manifest['media']), 'media;', len(data), 'redirects')
