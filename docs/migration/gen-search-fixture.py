"""Build a local query-index fixture for the search block from content/**/*.plain.html.

Usage: python3 docs/migration/gen-search-fixture.py [out.json]   (default /tmp/query-index.json)

Mimics the site-wide /query-index.json (EDS sheet JSON: total/offset/limit/data) with the columns
path, title, description, image, date, tags, template, robots, lastModified, content.
Values come from each page's Metadata block; title falls back to the first <h1>, image to the
first <img>, content is the first ~250 words of the page text (metadata blocks removed),
lastModified is the file mtime (unix seconds). nav/footer/nav-section fragments are included on
purpose so the block's exclusion logic can be exercised.

docs/ is in .hlxignore; never write the fixture into a served path. To use it in a browser,
intercept /query-index.json (e.g. Playwright page.route) or, on localhost only, copy it to the
git-ignored migration-work/ folder and open /au/en/search?q=...&index=/migration-work/query-index.json
"""
import json
import os
import re
import sys
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CONTENT = os.path.join(ROOT, 'content')
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/query-index.json'
WORDS = 250
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'}
SKIP_BLOCKS = {'metadata', 'section-metadata'}


class Page(HTMLParser):
    """Collects metadata rows, first h1, first img and body text (outside metadata blocks)."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []  # (tag, classes)
        self.skip_depth = None  # stack depth of a metadata / section-metadata block
        self.meta_depth = None
        self.meta_rows = []
        self.cell = None
        self.row = None
        self.text = []
        self.h1 = None
        self.in_h1 = False
        self.first_img = ''

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        classes = (a.get('class') or '').split()
        if tag == 'img' and not self.first_img and self.skip_depth is None:
            self.first_img = a.get('src', '')
        if tag == 'img' and self.meta_depth is not None and self.cell is not None:
            self.cell.append(a.get('src', ''))
        if tag in VOID:
            if tag == 'br':
                self.text.append(' ')
            return
        self.stack.append((tag, classes))
        depth = len(self.stack)
        if self.skip_depth is None and tag == 'div' and SKIP_BLOCKS & set(classes):
            self.skip_depth = depth
            if 'metadata' in classes:
                self.meta_depth = depth
        elif self.meta_depth is not None and tag == 'div':
            if depth == self.meta_depth + 1:
                self.row = []
            elif depth == self.meta_depth + 2:
                self.cell = []
        if tag == 'h1' and self.h1 is None and self.skip_depth is None:
            self.in_h1 = True
            self.h1 = ''
        if tag in ('p', 'div', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'td'):
            self.text.append(' ')

    def handle_endtag(self, tag):
        if tag in VOID or not self.stack:
            return
        depth = len(self.stack)
        if self.meta_depth is not None and tag == 'div':
            if depth == self.meta_depth + 2 and self.cell is not None:
                self.row.append(' '.join(''.join(self.cell).split()))
                self.cell = None
            elif depth == self.meta_depth + 1 and self.row is not None:
                if len(self.row) >= 2:
                    self.meta_rows.append((self.row[0].lower(), self.row[1]))
                self.row = None
        if tag == 'h1':
            self.in_h1 = False
        if self.skip_depth is not None and depth == self.skip_depth:
            self.skip_depth = None
            self.meta_depth = None
        self.stack.pop()

    def handle_data(self, data):
        if self.cell is not None:
            self.cell.append(data)
        if self.skip_depth is not None:
            return
        if self.in_h1:
            self.h1 += data
        self.text.append(data)


def row_for(file):
    rel = os.path.relpath(file, CONTENT)
    path = '/' + rel[:-len('.plain.html')]
    if path.endswith('/index'):
        path = path[:-len('index')] or '/'
    page = Page()
    page.feed(open(file, encoding='utf-8').read())
    meta = dict(page.meta_rows)
    tags = [t.strip() for t in meta.get('tags', '').split(',') if t.strip()]
    words = ' '.join(page.text).split()
    date = meta.get('date', '')
    return {
        'path': path,
        'title': meta.get('title') or ' '.join((page.h1 or '').split()),
        'description': meta.get('description', ''),
        'image': meta.get('image') or page.first_img,
        'date': date if re.match(r'^\d{4}-\d{2}-\d{2}$', date) else '',
        # the published index writes multi-value columns as a JSON array string
        'tags': json.dumps(tags) if tags else '',
        'template': meta.get('template', ''),
        'robots': meta.get('robots', ''),
        'lastModified': str(int(os.path.getmtime(file))),
        'content': ' '.join(words[:WORDS]),
    }


def main():
    files = []
    for base, _, names in os.walk(CONTENT, followlinks=True):
        files += [os.path.join(base, n) for n in names if n.endswith('.plain.html')]
    rows = sorted((row_for(f) for f in files), key=lambda r: r['path'])
    sheet = {
        'total': len(rows), 'offset': 0, 'limit': len(rows), 'data': rows,
        'columns': list(rows[0].keys()) if rows else [], ':type': 'sheet',
    }
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(sheet, f, ensure_ascii=False)
    print(f'wrote {OUT}: {len(rows)} rows')


main()
