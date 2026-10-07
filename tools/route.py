#!/usr/bin/env python3
"""Find the shortest recorded map route between room IDs.

Locked edges are excluded; one-way and boat edges are never reversed. Only
explicit back directions are traversable in reverse. This is a map guide, not
a game solver: equipment, puzzle prerequisites, boat actions, and assumed
connections still need to be checked against the room notes and ROUTE.md.
"""
import argparse
import collections
import difflib
from pathlib import Path
import sys

try:
    from .validate import DataError, read_json, validate_state
except ImportError:
    from validate import DataError, read_json, validate_state

ROOT = Path(__file__).resolve().parent.parent


def build_adjacency(state):
    adjacency = collections.defaultdict(list)
    for edge in state["edges"]:
        if edge["kind"] == "locked":
            continue
        adjacency[edge["from"]].append((edge["to"], edge["dir"], edge["kind"]))
        if edge.get("back") and edge["kind"] not in ("oneway", "boat"):
            adjacency[edge["to"]].append((edge["from"], edge["back"], edge["kind"]))
    return adjacency


def bfs(start, goal, state=None):
    """Return [(direction, kind), ...], [] for same room, or None if unreachable."""
    if state is None:
        state = validate_state(read_json(ROOT / "state.json"))
    for rid in (start, goal):
        if rid not in state["rooms"]:
            suggestions = difflib.get_close_matches(rid, state["rooms"], n=3)
            hint = "; did you mean {}?".format(", ".join(suggestions)) if suggestions else "; use --list to see room IDs"
            raise ValueError("unknown room {!r}{}".format(rid, hint))
    adjacency = build_adjacency(state)
    queue = collections.deque([start])
    previous = {start: None}
    while queue:
        current = queue.popleft()
        if current == goal:
            break
        for neighbor, direction, kind in adjacency.get(current, ()):
            if neighbor not in previous:
                previous[neighbor] = (current, direction, kind)
                queue.append(neighbor)
    if goal not in previous:
        return None
    result = []
    current = goal
    while previous[current] is not None:
        parent, direction, kind = previous[current]
        result.append((direction, kind))
        current = parent
    return result[::-1]


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("start", nargs="?", metavar="FROM", help="origin room ID")
    parser.add_argument("goal", nargs="?", metavar="TO", help="destination room ID")
    parser.add_argument("--list", action="store_true", help="list valid room IDs and names")
    parser.add_argument("--state", type=Path, default=ROOT / "state.json", help="alternate state.json")
    args = parser.parse_args(argv)
    if args.list and (args.start or args.goal):
        parser.error("--list cannot be combined with FROM or TO")
    if not args.list and (args.start is None or args.goal is None):
        parser.error("provide both FROM and TO, or use --list")
    try:
        state = validate_state(read_json(args.state))
        if args.list:
            for rid, room in sorted(state["rooms"].items()):
                print("{}\t{}".format(rid, room["name"]))
            return 0
        result = bfs(args.start, args.goal, state)
    except (DataError, ValueError) as exc:
        parser.error(str(exc))
    if result is None:
        print("no recorded route from {} to {}".format(args.start, args.goal))
        return 1
    if not result:
        print("already at {}   # 0 moves".format(args.goal))
    else:
        print("{}   # {} move{}{}".format(
            ". ".join(direction.lower() for direction, kind in result), len(result), "" if len(result) == 1 else "s",
            "; special edges: " + ", ".join(kind for direction, kind in result if kind != "walk")
            if any(kind != "walk" for direction, kind in result) else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
