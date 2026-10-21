"""Go-live runner: index config, DA upload, bulk preview + publish, verification.

Credentials are injected by the environment (no tokens in this script).
Usage: python3 docs/migration/go-live.py <step> [<step> ...]
Steps: check | config | upload [--force] [--dry-run] | preview [--uploaded] | publish [--uploaded] | verify
Upload only overwrites files this script created and nobody changed since (see guard()).
Package: run docs/migration/build-da-package.py first (writes /tmp/da-upload).
"""
import hashlib
import json
import os
import subprocess
import sys
import time

ORG, SITE, REF = 'cscrewvala', 'ww-eds-ew', 'main'
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PKG = '/tmp/da-upload'
STATE = os.path.join(ROOT, 'docs/migration/da-upload-state.json')
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


def sha(data):
    return hashlib.sha256(data.encode() if isinstance(data, str) else data).hexdigest()


def load_state():
    return json.load(open(STATE)) if os.path.exists(STATE) else {}


def da_read(key):
    """Current DA source for a key ('au/en/x.html', 'images/a.png', 'redirects.json') as bytes."""
    out = subprocess.run(['curl', '-s', '-w', '\n%{http_code}', f'{DA}/{key}'], capture_output=True, timeout=300)
    body, _, code = out.stdout.rpartition(b'\n')
    return int(code), body


def guard(key, da_key, local_sha, state, force):
    """Decide whether to upload one file. Returns 'upload', 'same', 'edited', 'foreign' or 'error'.

    da-upload-state.json records the hash of what this script last uploaded per key. A file
    already in DA is only overwritten if this script created it and nobody changed it since:
      - same    DA already has exactly this content (adopted into the state)
      - edited  we uploaded it, but it changed in DA since (an author edit)
      - foreign it exists in DA but this script never uploaded it (author-created)
      - error   DA did not answer 200/404 - never upload blind
    --force overrides edited/foreign, not error.
    """
    code, current = da_read(da_key)
    if code == 404:
        return 'upload'
    if code != 200:
        return 'error'
    if sha(current) == local_sha:
        return 'same'
    if force:
        return 'upload'
    if key not in state:
        return 'foreign'
    return 'edited' if sha(current) != state[key] else 'upload'


def step_upload():
    """Upload docs, media and sheets; never overwrite what this script did not put there.

    State keys: docs as 'au/en/x' (no extension, as before), media and sheets with their
    extension ('images/a.png', 'redirects.json'). Pass --force to overwrite edited/foreign
    files, --dry-run to only report what would happen.
    """
    m = manifest()
    state = load_state()
    force = '--force' in sys.argv
    dry = '--dry-run' in sys.argv
    files = [(p, f'{p}.html', f'{PKG}/docs/{p}.html', 'text/html') for p in m['docs']]
    files += [(p, p, f'{PKG}/media/{p}', 'image/svg+xml' if p.endswith('.svg') else 'application/octet-stream')
              for p in m['media']]
    files += [(f'{s}.json', f'{s}.json', f'{PKG}/{s}.json', 'application/json') for s in m['sheets']]
    result = {'upload': [], 'same': [], 'edited': [], 'foreign': [], 'error': []}
    failures = []
    for key, da_key, f, mime in files:
        local_sha = sha(open(f, 'rb').read())
        verdict = guard(key, da_key, local_sha, state, force)
        result[verdict].append(key)
        if verdict == 'same':
            state[key] = local_sha
        if verdict != 'upload' or dry:
            continue
        code, _ = curl('-X', 'POST', '-F', f'data=@{f};type={mime}', f'{DA}/{da_key}')
        if code >= 300:
            failures.append((key, code))
        else:
            state[key] = local_sha
    if not dry:
        json.dump(state, open(STATE, 'w'), indent=1, sort_keys=True)
        # what this run uploaded, for `preview --uploaded` / `publish --uploaded`
        done = [k for k in result['upload'] if k not in {f for f, _ in failures}]
        json.dump(done, open(f'{PKG}/uploaded.json', 'w'), indent=1)
    label = 'would upload' if dry else 'uploaded'
    print(f"{label} {len(result['upload']) - len(failures)}, unchanged {len(result['same'])}")
    if result['edited']:
        print(f"skipped {len(result['edited'])} edited in DA since our last upload:", result['edited'])
    if result['foreign']:
        print(f"skipped {len(result['foreign'])} that exist in DA but were not created by this script:",
              result['foreign'])
    if result['error']:
        print(f"skipped {len(result['error'])} where DA did not answer 200/404:", result['error'])
    if failures:
        print('failed:', failures[:10])
    if failures or result['error']:
        sys.exit(1)


def bulk(action):
    """Bulk preview/publish the package; --uploaded limits it to what the last upload wrote, so
    documents skipped by the guard (author edits in DA) are not previewed or published."""
    if '--uploaded' in sys.argv:
        keys = json.load(open(f'{PKG}/uploaded.json'))
        m = manifest()
        paths = web_paths({'docs': [k for k in keys if k in set(m['docs'])],
                           'media': [k for k in keys if k in set(m['media'])],
                           'sheets': [k[:-5] for k in keys if k.endswith('.json')]})
        if not paths:
            print(action, 'nothing uploaded')
            return
    else:
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
    for s in [a for a in sys.argv[1:] if not a.startswith('--')]:
        print(f'== {s}')
        STEPS[s]()
