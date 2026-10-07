#!/usr/bin/env python3
"""Validate map data and references without changing the saved expedition."""
import argparse
import json
import math
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent


class DataError(ValueError):
    """Invalid map data with a human-readable location."""


def read_json(path):
    try:
        with Path(path).open(encoding="utf-8") as stream:
            return json.load(stream, parse_constant=lambda value: _fail("non-finite JSON number: " + value))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise DataError("cannot read {}: {}".format(path, exc)) from exc


def _fail(message):
    raise DataError(message)


def _require(condition, message):
    if not condition:
        _fail(message)


def _number(value):
    return (isinstance(value, int) and not isinstance(value, bool)) or (isinstance(value, float) and math.isfinite(value))


def _point(value):
    return isinstance(value, list) and len(value) == 2 and all(_number(v) for v in value)


def validate_state(state):
    _require(isinstance(state, dict), "state must be an object")
    for key, typ in (("meta", dict), ("status", dict), ("zones", dict),
                     ("rooms", dict), ("edges", list), ("path", list), ("events", list)):
        _require(isinstance(state.get(key), typ), "state.{} must be a {}".format(key, typ.__name__))
    rooms = state["rooms"]
    _require(bool(rooms), "state.rooms must not be empty")
    for rid, room in rooms.items():
        label = "room {!r}".format(rid)
        _require(isinstance(rid, str) and bool(rid), "room IDs must be nonempty strings")
        _require(isinstance(room, dict), label + " must be an object")
        _require(isinstance(room.get("name"), str) and bool(room["name"]), label + " needs a name")
        _require(isinstance(room.get("zone"), str) and room["zone"] in state["zones"], label + " has an unknown zone")
        _require(_point(room.get("pos")), label + " needs two finite position coordinates")
        _require(_number(room.get("order")) and room["order"] >= 0, label + " has an invalid order")
    _require(isinstance(state["status"].get("location"), str)
             and state["status"]["location"] in rooms, "status.location refers to an unknown room")
    for key in ("score", "maxScore", "moves", "deaths"):
        value = state["status"].get(key)
        _require(_number(value) and value >= 0, "status.{} must be nonnegative and finite".format(key))
    _require(state["status"]["score"] <= state["status"]["maxScore"], "score exceeds maxScore")
    for index, edge in enumerate(state["edges"]):
        label = "edge[{}]".format(index)
        _require(isinstance(edge, dict), label + " must be an object")
        for key in ("from", "to"):
            _require(isinstance(edge.get(key), str) and edge[key] in rooms, label + "." + key + " refers to an unknown room")
        for key in ("dir", "kind"):
            _require(isinstance(edge.get(key), str) and bool(edge[key].strip()), label + " needs " + key)
        if "back" in edge:
            _require(isinstance(edge["back"], str) and bool(edge["back"].strip()), label + ".back must be a direction")
        _require(_number(edge.get("order")) and edge["order"] >= 0, label + " has an invalid order")
    for index, rid in enumerate(state["path"]):
        _require(isinstance(rid, str) and rid in rooms, "path[{}] refers to an unknown room".format(index))
    # The path is an expedition summary; consecutive entries can skip rooms.
    previous_step = -1
    for index, event in enumerate(state["events"]):
        label = "event[{}]".format(index)
        _require(isinstance(event, dict), label + " must be an object")
        _require(isinstance(event.get("room"), str) and event["room"] in rooms, label + " refers to an unknown room")
        step = event.get("step")
        _require(isinstance(step, int) and not isinstance(step, bool) and step > previous_step,
                 label + " step must be an increasing integer")
        previous_step = step
        _require(isinstance(event.get("text"), str), label + " needs text")
    return state


def validate_layout(layout, state):
    _require(isinstance(layout, dict), "layout must be an object")
    _require(_number(layout.get("ground")), "layout.ground must be finite")
    for key in ("rooms", "routes"):
        _require(isinstance(layout.get(key), dict), "layout.{} must be an object".format(key))
    for rid, point in layout["rooms"].items():
        _require(rid in state["rooms"], "layout room {!r} is unknown".format(rid))
        _require(_point(point), "layout room {!r} needs two finite coordinates".format(rid))
    edge_keys = {edge["from"] + ">" + edge["to"] for edge in state["edges"]}
    for key, points in layout["routes"].items():
        _require(key in edge_keys, "layout route {!r} has no matching edge".format(key))
        _require(isinstance(points, list) and bool(points) and all(_point(p) for p in points),
                 "layout route {!r} needs finite two-coordinate waypoints".format(key))
    return layout


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--state", type=Path, default=ROOT / "state.json")
    parser.add_argument("--layout", type=Path, default=ROOT / "layout.json")
    args = parser.parse_args(argv)
    try:
        state = validate_state(read_json(args.state))
        validate_layout(read_json(args.layout), state)
    except DataError as exc:
        parser.exit(1, "validate: error: {}\n".format(exc))
    print("valid: {} rooms, {} edges, {} events, {} path entries".format(
        len(state["rooms"]), len(state["edges"]), len(state["events"]), len(state["path"])))
    return 0


if __name__ == "__main__":
    sys.exit(main())
