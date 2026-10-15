"""Go-live runner: index config, DA upload, bulk preview + publish, verification.

Credentials are injected by the environment (no tokens in this script).
Usage: python3 docs/migration/go-live.py <step> [<step> ...]
Steps: check | config | upload | preview | publish | verify
Package: run docs/migration/build-da-package.py first (writes /tmp/da-upload).
"""
import json
import os
import subprocess
import sys
import time

ORG, SITE, REF = 'cscrewvala', 'ww-eds-ew', 'main'
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PKG = '/tmp/da-upload'
DA = f'https://admin.da.live/source/{ORG}/{SITE}'
ADMIN = 'https://admin.hlx.page'
LIVE = f'https://{REF}--{SITE}--{ORG}.aem.live'


def curl(*args, expect_json=False):
    out = subprocess.run(['curl', '-s', '-w', '\n%{http_code}', *args], capture_output=True, text=True, timeout=300)
    body, _, code = out.stdout.rpartition('\n')
    if expect_json:
        try:
            return int(code), json.loads(body or '{}')
        except json.JSONDecodeError:
            return int(code), {'raw': body[:300]}
    return int(code), body


def manifest():
    return json.load(open(f'{PKG}/manifest.json'))


def web_paths(m):
    paths = ['/' if p == 'index' else f'/{p}' for p in m['docs']]
    paths += [f'/{p}' for p in m['media']]
    paths += [f'/{s}.json' for s in m['sheets']]
    return paths


def step_check():
    for url in [f'https://admin.da.live/list/{ORG}/{SITE}/', f'{ADMIN}/status/{ORG}/{SITE}/{REF}/']:
        code, _ = curl(url)
        print(f'{code} {url}')
        if code in (401, 403):
            sys.exit('Adobe credentials not available (opt-in off).')


def step_config():
    yaml = open(os.path.join(ROOT, 'docs/migration/query-index-config.yaml'), 'rb').read()
    url = f'{ADMIN}/config/{ORG}/sites/{SITE}/content/query.yaml'
    code, body = curl('-X', 'POST', '-H', 'Content-Type: text/yaml', '--data-binary', yaml.decode(), url)
    print('query.yaml', code, body[:200])
    if code >= 300:
        sys.exit(1)


def step_upload():
    m = manifest()
    failures = []
    for p in m['docs']:
        f = f'{PKG}/docs/{p}.html'
        code, _ = curl('-X', 'POST', '-F', f'data=@{f};type=text/html', f'{DA}/{p}.html')
        if code >= 300:
            failures.append((p, code))
    for p in m['media']:
        mime = 'image/svg+xml' if p.endswith('.svg') else 'application/octet-stream'
        code, _ = curl('-X', 'POST', '-F', f'data=@{PKG}/media/{p};type={mime}', f'{DA}/{p}')
        if code >= 300:
            failures.append((p, code))
    for s in m['sheets']:
        code, _ = curl('-X', 'POST', '-F', f'data=@{PKG}/{s}.json;type=application/json', f'{DA}/{s}.json')
        if code >= 300:
            failures.append((s, code))
    total = len(m['docs']) + len(m['media']) + len(m['sheets'])
    print(f'uploaded {total - len(failures)}/{total}', failures[:10])
    if failures:
        sys.exit(1)


def bulk(action):
    paths = web_paths(manifest())
    code, job = curl('-X', 'POST', '-H', 'Content-Type: application/json',
                     '--data-binary', json.dumps({'paths': paths, 'forceUpdate': True}),
                     f'{ADMIN}/{action}/{ORG}/{SITE}/{REF}/*', expect_json=True)
    print(action, 'job', code, json.dumps(job)[:300])
    if code >= 300:
        sys.exit(1)
    link = (job.get('links') or {}).get('self') or (job.get('job') or {}).get('links', {}).get('self')
    if not link:
        return
    for _ in range(120):
        time.sleep(10)
        code, st = curl(link, expect_json=True)
        state = st.get('state') or (st.get('job') or {}).get('state')
        progress = st.get('progress') or {}
        print(f'  {action}: {state} {progress}')
        if state in ('completed', 'stopped'):
            code, det = curl(f'{link}/details', expect_json=True)
            res = (det.get('data') or {}).get('resources') or []
            bad = [r for r in res if r.get('status', 200) >= 300]
            print(f'  {action}: {len(res) - len(bad)}/{len(res)} ok', [(r.get('path'), r.get('status')) for r in bad[:10]])
            return


def step_verify():
    checks = ['/', '/au/en/our-newsroom/media-releases', '/au/en/article-index.json', '/nav.plain.html',
              '/footer.plain.html', '/redirects.json', '/au/en/investors/nav-section.plain.html',
              '/au/en/our-impact/sustainability/our-stories/2026/2026-world-environment-day']
    for p in checks:
        code, body = curl(LIVE + p)
        extra = ''
        if p.endswith('article-index.json') and code == 200:
            extra = f"total={json.loads(body).get('total')}"
        print(f'{code} {LIVE}{p} {extra}')


STEPS = {'check': step_check, 'config': step_config, 'upload': step_upload,
         'preview': lambda: bulk('preview'), 'publish': lambda: bulk('live'), 'verify': step_verify}

if __name__ == '__main__':
    for s in sys.argv[1:]:
        print(f'== {s}')
        STEPS[s]()
