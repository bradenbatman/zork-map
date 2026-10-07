"""Small helpers for checkpoint patches to state.json, so a checkpoint is a few lines instead of a new script.

    # Run from the project root.
    from tools.stlib import *
    S = load()
    status(S, score=188, moves=403, loc='living-room', inv=['brass lantern:on', 'brown sack'])
    take(S, 'painting', 'gallery')            # item leaves the room
    bank(S, 'painting')                       # item appears in the trophy case
    drop(S, 'nasty knife', 'troll-room', 'weapon')
    event(S, 'score', 'living-room', 'Banked the painting.')
    save(S, build=True)
"""
import json, os, datetime, subprocess, sys

try:
    from .build import write_atomic
except ImportError:
    from build import write_atomic

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..'))
STATE = os.path.join(ROOT, 'state.json')


def load():
    with open(STATE, encoding='utf-8') as stream:
        return json.load(stream)


def save(S, build=True, step=None):
    S['meta']['updated'] = datetime.datetime.now().astimezone().isoformat(timespec='seconds')
    S['meta']['step'] = step if step is not None else max([e.get('step', 0) for e in S['events']] + [S['meta'].get('step', 0)])
    write_atomic(STATE, json.dumps(S, indent=1, ensure_ascii=False, allow_nan=False))
    if build:
        # Preserve stderr and fail visibly rather than reporting a failed rebuild as success.
        subprocess.run([sys.executable, os.path.join(HERE, 'build.py')], check=True)


def status(S, score=None, moves=None, loc=None, deaths=None, inv=None):
    st = S['status']
    if score is not None: st['score'] = score
    if moves is not None: st['moves'] = moves
    if deaths is not None: st['deaths'] = deaths
    if loc is not None: st['location'] = loc
    if inv is not None:
        st['inventory'] = [({'name': n.split(':', 1)[0], 'note': n.split(':', 1)[1]} if ':' in n else {'name': n}) for n in inv]


def _items(S, room):
    return S['rooms'][room].setdefault('items', [])


def drop(S, name, room, typ='item', note=None):
    _items(S, room).append({k: v for k, v in {'name': name, 'type': typ, 'note': note}.items() if v})


def take(S, name, room):
    r = _items(S, room)
    S['rooms'][room]['items'] = [i for i in r if name.lower() not in i['name'].lower()]


def bank(S, name):
    _items(S, 'living-room').append({'name': name, 'type': 'treasure', 'note': 'banked'})


def unbank(S, name):
    take(S, name, 'living-room')


def event(S, typ, room, text):
    step = max([e.get('step', 0) for e in S['events']] + [0]) + 1
    S['events'].append({'step': step, 'type': typ, 'room': room, 'text': text})


def puzzle(S, name, state, note):
    for p in S['puzzles']:
        if p['name'] == name:
            p['status'] = state; p['note'] = note; return
    S['puzzles'].append({'name': name, 'status': state, 'note': note})


def nxt(S, lines):
    S['next'] = list(lines)
