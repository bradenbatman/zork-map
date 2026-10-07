#!/usr/bin/env python3
"""Build a self-contained map page with Python's standard library.

The default writes only out/map.html. An additional live copy is opt-in via
--live-copy PATH or ZORK_LIVE_COPY. ZORK_NO_LIVE remains a compatibility override.
Importing this module never reads, writes, or builds the project.
"""
import argparse
import json
import os
from pathlib import Path
import re
import sys
import tempfile

try:
    from .validate import DataError, read_json, validate_state, validate_layout
except ImportError:  # Direct invocation: python3 tools/build.py
    from validate import DataError, read_json, validate_state, validate_layout

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = ("pixel.js", "props.js", "world.js", "world3d.bundle.js")
WORLD_MARKER = "<!--__WORLD_SCRIPTS__-->"
STATE_MARKER = "__STATE_JSON__"


class BuildError(ValueError):
    """An input cannot be used to build a complete map."""


def read_required(path):
    try:
        text = Path(path).read_text(encoding="utf-8")
    except (OSError, UnicodeError) as exc:
        raise BuildError("cannot read required asset {}: {}".format(path, exc)) from exc
    if not text.strip():
        raise BuildError("required asset is empty: {}".format(path))
    return text


def render(root=ROOT):
    """Return (HTML, embedded state), without modifying any source files."""
    root = Path(root)
    state = read_json(root / "state.json")
    validate_state(state)
    # Local resumption instructions are private operational context, not part
    # of the standalone map. The source checkpoint remains untouched.
    state.pop("resume", None)
    template = read_required(root / "template.html")
    for marker in (WORLD_MARKER, STATE_MARKER):
        if template.count(marker) != 1:
            raise BuildError("template.html must contain exactly one {} marker".format(marker))
    titles = list(re.finditer(r"<title\b[^>]*>.*?</title\s*>", template, re.I | re.S))
    if len(titles) != 1:
        raise BuildError("template.html must contain exactly one <title> element")

    art_dir = root / "art"
    if not art_dir.is_dir():
        raise BuildError("missing required art directory: {}".format(art_dir))
    for path in sorted(art_dir.glob("*.txt")):
        if path.stem not in state["rooms"]:
            raise BuildError("art file refers to unknown room: {}".format(path.name))
        state["rooms"][path.stem]["art"] = read_required(path).rstrip("\n").split("\n")

    layout = read_json(root / "layout.json")
    validate_layout(layout, state)
    state["layout"] = layout
    notices = read_required(root / "THIRD_PARTY_NOTICES.md")

    # The committed 3D bundle keeps the Python build independent of Node/npm.
    scripts = "\n".join(
        re.sub(r"</script", lambda match: "<\\/" + match.group(0)[2:],
               read_required(root / "js" / name), flags=re.I)
        for name in SCRIPTS
    ) + "\n"
    # Escape '<' so mixed-case HTML closing tags cannot end application/json.
    # json.loads restores the exact original strings.
    blob = json.dumps(state, ensure_ascii=False, indent=1, allow_nan=False).replace("<", "\\u003c")
    title = titles[0].group(0)
    body = template[:titles[0].start()] + template[titles[0].end():]
    replacements = {WORLD_MARKER: "<script>\n" + scripts + "</script>", STATE_MARKER: blob}
    # One pass avoids interpreting marker-like text inside data or JavaScript.
    body = re.sub("|".join(re.escape(key) for key in replacements),
                  lambda match: replacements[match.group(0)], body)
    attribution = "<!--\nTHIRD_PARTY_NOTICES.md\n" + notices.replace("--", "- -") + "\n-->\n"
    page = (
        '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        + title + '\n<style>[hidden]{display:none!important}</style>\n</head>\n<body>\n'
        + attribution + body + '\n</body>\n</html>\n'
    )
    return page, state


def write_atomic(path, text):
    """Avoid leaving a truncated page if a write fails or build is interrupted."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", newline="\n",
                                         dir=path.parent, prefix=".zork-", delete=False) as stream:
            temporary = Path(stream.name)
            stream.write(text)
        os.replace(temporary, path)
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink()


def build(root=ROOT, output=None, live_copy=None):
    page, state = render(root)
    output = Path(output) if output is not None else Path(root) / "out" / "map.html"
    write_atomic(output, page)
    if live_copy is not None and Path(live_copy).resolve() != output.resolve():
        write_atomic(live_copy, page)
    return output, state


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, help="output HTML path (default: project out/map.html)")
    parser.add_argument("--live-copy", type=Path,
                        help="also write to this path; default is ZORK_LIVE_COPY, otherwise disabled")
    parser.add_argument("--no-live", action="store_true", help="disable any optional live copy")
    args = parser.parse_args(argv)
    live_copy = args.live_copy or os.environ.get("ZORK_LIVE_COPY") or None
    if args.no_live or os.environ.get("ZORK_NO_LIVE"):
        live_copy = None
    try:
        output, state = build(output=args.output, live_copy=live_copy)
    except (BuildError, DataError, OSError, ValueError) as exc:
        parser.exit(1, "build: error: {}\n".format(exc))
    print("built {} - {} rooms, {} edges, {} scenes{}".format(
        output, len(state["rooms"]), len(state["edges"]),
        sum(bool(room.get("art")) for room in state["rooms"].values()),
        "; live copy: {}".format(live_copy) if live_copy else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
