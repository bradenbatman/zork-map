"""Portable build, CLI, state, reference-integrity, and routing regression tests.

No Node, network, browser, game service, or write to the source checkpoint is used.
"""
import collections
import contextlib
import copy
import hashlib
from html.parser import HTMLParser
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

from tools import build, route, stlib, validate

ROOT = Path(__file__).resolve().parent.parent
STATE_SHA256 = "aac1b291540f59c8a5267135db8a15b852bf9d520e683075d7e3e145b978f279"  # Public candidate: account resumption notes excluded.


def specimen():
    return {
        "meta": {"title": "Fixture", "step": 1},
        "status": {"location": "a", "score": 0, "maxScore": 350, "moves": 0, "deaths": 0},
        "zones": {"outside": {"label": "Outside"}},
        "rooms": {
            rid: {"name": rid.upper(), "zone": "outside", "pos": [index, 0], "order": index + 1}
            for index, rid in enumerate("abc")
        },
        "edges": [{"from": "a", "to": "b", "dir": "E", "back": "W", "kind": "walk", "order": 1}],
        "path": ["a", "b"],
        "events": [{"step": 1, "room": "a", "text": "Started"}],
        "resume": {"howto": ["private resume instructions"]},
    }


def edge(a, b, direction="E", kind="walk", back=None):
    result = {"from": a, "to": b, "dir": direction, "kind": kind, "order": 1}
    if back is not None:
        result["back"] = back
    return result


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_state = False
        self.state_parts = []
        self.tags = collections.Counter()
        self.comments = []
        self.external = []

    def handle_starttag(self, tag, attrs):
        self.tags[tag] += 1
        attrs = dict(attrs)
        if tag == "script" and attrs.get("id") == "state":
            self.in_state = True
        if tag in ("script", "img", "iframe", "link"):
            source = attrs.get("src", attrs.get("href", ""))
            if source.startswith(("http:", "https:", "//")):
                self.external.append(source)

    def handle_endtag(self, tag):
        if tag == "script":
            self.in_state = False

    def handle_data(self, data):
        if self.in_state:
            self.state_parts.append(data)

    def handle_comment(self, data):
        self.comments.append(data)

    def state(self):
        return json.loads("".join(self.state_parts))


class BuildTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name) / "project with spaces"
        self.root.mkdir()
        (self.root / "art").mkdir()
        (self.root / "js").mkdir()
        self.state = specimen()
        self.write_state()
        self.write("layout.json", json.dumps({"ground": 2.55, "rooms": {"a": [0, 1]}, "routes": {"a>b": [[0, 1]]}}))
        self.write("template.html", '<title>Fixture</title>\n<!--__WORLD_SCRIPTS__-->\n<script id="state" type="application/json">__STATE_JSON__</script>')
        self.write("THIRD_PARTY_NOTICES.md", "Third-party license\nCopyright Fixture\nPermission is granted.\n")
        self.write("art/a.txt", "  o  \n /|\\ \n / \\ \n")
        for name in build.SCRIPTS:
            self.write("js/" + name, "// " + name + "\nwindow.fixture = true;")

    def write(self, name, content):
        (self.root / name).write_text(content, encoding="utf-8")

    def write_state(self):
        self.write("state.json", json.dumps(self.state))

    def page(self):
        html, state = build.render(self.root)
        parser = PageParser()
        parser.feed(html)
        return html, state, parser

    def test_build_embeds_all_assets_and_has_one_document(self):
        html, state, parser = self.page()
        self.assertTrue(html.startswith("<!doctype html>"))
        for tag in ("html", "head", "body", "title"):
            self.assertEqual(parser.tags[tag], 1)
        self.assertEqual(parser.state(), state)
        self.assertEqual(state["rooms"]["a"]["art"], ["  o  ", " /|\\ ", " / \\ "])
        self.assertEqual(state["layout"]["ground"], 2.55)
        for name in build.SCRIPTS:
            self.assertIn("// " + name, html)
        self.assertIn("Copyright Fixture", html)
        self.assertNotIn(build.STATE_MARKER, html)
        self.assertNotIn(build.WORLD_MARKER, html)

    def test_build_is_deterministic_and_preserves_source(self):
        before = (self.root / "state.json").read_bytes()
        output, _ = build.build(self.root)
        first = output.read_bytes()
        build.build(self.root)
        self.assertEqual(first, output.read_bytes())
        self.assertEqual(before, (self.root / "state.json").read_bytes())
        self.assertEqual(output, self.root / "out" / "map.html")

    def test_resume_is_excluded_from_page_only(self):
        html, state, parser = self.page()
        self.assertNotIn("resume", state)
        self.assertNotIn("private resume instructions", html)
        self.assertIn("resume", json.loads((self.root / "state.json").read_text()))

    def test_json_cannot_terminate_script_or_create_element(self):
        value = '</ScRiPt><img src=x onerror=alert(1)> snowman ☃ __STATE_JSON__'
        self.state["rooms"]["a"]["note"] = value
        self.write_state()
        html, state, parser = self.page()
        self.assertEqual(parser.state()["rooms"]["a"]["note"], value)
        self.assertEqual(parser.tags["img"], 0)
        self.assertNotIn('</ScRiPt>', html)

    def test_script_closer_and_replacement_markers_are_escaped_safely(self):
        self.write("js/pixel.js", 'var label="</ScRiPt> __STATE_JSON__";')
        html, _, parser = self.page()
        self.assertIn(r'<\/ScRiPt> __STATE_JSON__', html)
        self.assertEqual(parser.state()["status"]["location"], "a")

    def test_notice_comment_cannot_end_early(self):
        self.write("THIRD_PARTY_NOTICES.md", "License --> <script>evil()</script> <!-- tail")
        html, _, parser = self.page()
        self.assertEqual(parser.tags["script"], 2)
        self.assertTrue(any("License - -> <script>evil()</script> <!- - tail" in comment for comment in parser.comments))

    def test_each_missing_required_script_fails_before_output(self):
        for name in build.SCRIPTS:
            with self.subTest(name=name):
                path = self.root / "js" / name
                original = path.read_text()
                path.unlink()
                with self.assertRaisesRegex(build.BuildError, name.replace(".", r"\.")):
                    build.build(self.root)
                self.assertFalse((self.root / "out").exists())
                path.write_text(original)

    def test_missing_required_assets_are_explicit(self):
        for name in ("state.json", "layout.json", "template.html", "THIRD_PARTY_NOTICES.md"):
            with self.subTest(name=name):
                path = self.root / name
                data = path.read_bytes()
                path.unlink()
                with self.assertRaisesRegex((build.BuildError, validate.DataError), name.replace(".", r"\.")):
                    build.render(self.root)
                path.write_bytes(data)

    def test_missing_art_directory_is_explicit(self):
        shutil.rmtree(self.root / "art")
        with self.assertRaisesRegex(build.BuildError, "art directory"):
            build.render(self.root)

    def test_empty_script_is_rejected(self):
        self.write("js/props.js", " \n")
        with self.assertRaisesRegex(build.BuildError, "empty"):
            build.render(self.root)

    def test_orphan_art_is_rejected(self):
        self.write("art/unknown.txt", "art")
        with self.assertRaisesRegex(build.BuildError, "unknown room"):
            build.render(self.root)

    def test_both_placeholders_are_required_once(self):
        template = (self.root / "template.html").read_text()
        for marker in (build.STATE_MARKER, build.WORLD_MARKER):
            for replacement in ("", marker + marker):
                with self.subTest(marker=marker, replacement=replacement):
                    self.write("template.html", template.replace(marker, replacement))
                    with self.assertRaisesRegex(build.BuildError, "exactly one"):
                        build.render(self.root)

    def test_title_is_required_once(self):
        template = (self.root / "template.html").read_text()
        for replacement in ("", "<title>A</title><title>B</title>"):
            self.write("template.html", template.replace("<title>Fixture</title>", replacement))
            with self.assertRaisesRegex(build.BuildError, "title"):
                build.render(self.root)

    def test_invalid_json_does_not_replace_previous_output(self):
        output, _ = build.build(self.root)
        before = output.read_bytes()
        self.write("state.json", "{invalid")
        with self.assertRaises(validate.DataError):
            build.build(self.root)
        self.assertEqual(output.read_bytes(), before)

    def test_explicit_live_copy_and_output_path(self):
        output = self.root / "custom" / "different.html"
        live = self.root / "live folder" / "map.html"
        result, _ = build.build(self.root, output=output, live_copy=live)
        self.assertEqual(result, output)
        self.assertEqual(output.read_bytes(), live.read_bytes())
        self.assertFalse((self.root / "out").exists())

    def test_live_copy_may_be_output_itself(self):
        path = self.root / "out" / "map.html"
        build.build(self.root, output=path, live_copy=path)
        self.assertTrue(path.is_file())

    def test_no_mac_path_or_implicit_live_copy(self):
        with mock.patch.dict(os.environ, {}, clear=True), mock.patch.object(build, "build") as call:
            call.return_value = (Path("map.html"), self.state)
            with contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(build.main([]), 0)
            self.assertIsNone(call.call_args.kwargs["live_copy"])
        self.assertNotIn("/Users/", Path(build.__file__).read_text())

    def test_environment_and_cli_live_copy_precedence(self):
        cases = [
            ({"ZORK_LIVE_COPY": "env.html"}, [], "env.html"),
            ({"ZORK_LIVE_COPY": "env.html"}, ["--live-copy", "cli.html"], Path("cli.html")),
            ({"ZORK_LIVE_COPY": "env.html", "ZORK_NO_LIVE": "1"}, [], None),
            ({"ZORK_LIVE_COPY": "env.html"}, ["--no-live"], None),
            ({"ZORK_NO_LIVE": "1"}, ["--live-copy", "cli.html"], None),
        ]
        for env, args, expected in cases:
            with self.subTest(env=env, args=args), mock.patch.dict(os.environ, env, clear=True), mock.patch.object(build, "build") as call:
                call.return_value = (Path("map.html"), self.state)
                with contextlib.redirect_stdout(io.StringIO()):
                    build.main(args)
                self.assertEqual(call.call_args.kwargs["live_copy"], expected)

    def test_failed_atomic_replace_keeps_old_file_and_cleans_temp(self):
        path = self.root / "output.html"
        path.write_text("old")
        with mock.patch.object(build.os, "replace", side_effect=OSError("simulated failure")):
            with self.assertRaises(OSError):
                build.write_atomic(path, "new")
        self.assertEqual(path.read_text(), "old")
        self.assertEqual(list(self.root.glob(".zork-*")), [])

    def test_cli_build_failure_is_concise_and_nonzero(self):
        with mock.patch.object(build, "build", side_effect=build.BuildError("missing asset")):
            with contextlib.redirect_stderr(io.StringIO()) as stderr, self.assertRaises(SystemExit) as caught:
                build.main(["--no-live"])
        self.assertEqual(caught.exception.code, 1)
        self.assertEqual(stderr.getvalue(), "build: error: missing asset\n")


class ValidationTests(unittest.TestCase):
    def test_valid_fixture(self):
        state = specimen()
        self.assertIs(validate.validate_state(state), state)

    def test_invalid_state_shapes(self):
        for state in (None, [], {}, {"rooms": {}}):
            with self.subTest(state=state), self.assertRaises(validate.DataError):
                validate.validate_state(state)

    def test_invalid_references_and_fields(self):
        cases = [
            (lambda s: s["rooms"]["a"].update(zone="missing"), "zone"),
            (lambda s: s["rooms"]["a"].update(pos=[0, float("inf")]), "position"),
            (lambda s: s["rooms"]["a"].update(order=-1), "order"),
            (lambda s: s["rooms"].update(a=None), "object"),
            (lambda s: s["status"].update(location="missing"), "location"),
            (lambda s: s["status"].update(score=351), "maxScore"),
            (lambda s: s["status"].update(moves=-1), "moves"),
            (lambda s: s["edges"][0].update(to="missing"), "unknown room"),
            (lambda s: s["edges"][0].update(dir=""), "dir"),
            (lambda s: s["edges"][0].update(back=False), "direction"),
            (lambda s: s["edges"][0].update(kind=None), "kind"),
            (lambda s: s["path"].append("missing"), "path"),
            (lambda s: s["events"][0].update(room="missing"), "event"),
            (lambda s: s["events"].append(dict(s["events"][0])), "increasing"),
            (lambda s: s["events"][0].update(text=None), "text"),
        ]
        for change, message in cases:
            state = specimen()
            change(state)
            with self.subTest(message=message), self.assertRaisesRegex(validate.DataError, message):
                validate.validate_state(state)

    def test_invalid_layout(self):
        valid = {"ground": 0, "rooms": {"a": [0, 1]}, "routes": {"a>b": [[0, 1]]}}
        cases = [
            lambda layout: layout.update(ground=float("nan")),
            lambda layout: layout["rooms"].update(missing=[0, 1]),
            lambda layout: layout["rooms"].update(a=[True, 1]),
            lambda layout: layout["routes"].update({"a>c": [[0, 1]]}),
            lambda layout: layout["routes"].update({"a>b": []}),
            lambda layout: layout["routes"].update({"a>b": [[0, None]]}),
        ]
        validate.validate_layout(valid, specimen())
        for change in cases:
            layout = copy.deepcopy(valid)
            change(layout)
            with self.subTest(layout=layout), self.assertRaises(validate.DataError):
                validate.validate_layout(layout, specimen())

    def test_json_nonfinite_and_invalid_encoding_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "bad.json"
            for content in (b'{"value":NaN}', b'{"value":Infinity}', b'\xff', b'{oops'):
                path.write_bytes(content)
                with self.subTest(content=content), self.assertRaises(validate.DataError):
                    validate.read_json(path)


class RouteTests(unittest.TestCase):
    def state_with(self, edges):
        state = specimen()
        state["edges"] = edges
        return state

    def test_forward_and_explicit_reverse(self):
        state = specimen()
        self.assertEqual(route.bfs("a", "b", state), [("E", "walk")])
        self.assertEqual(route.bfs("b", "a", state), [("W", "walk")])

    def test_no_implied_reverse(self):
        state = self.state_with([edge("a", "b")])
        self.assertIsNone(route.bfs("b", "a", state))

    def test_locked_edges_never_traversed(self):
        state = self.state_with([edge("a", "b", kind="locked", back="W")])
        self.assertIsNone(route.bfs("a", "b", state))
        self.assertIsNone(route.bfs("b", "a", state))

    def test_boat_and_oneway_edges_are_forward_only_even_with_back(self):
        for kind in ("boat", "oneway"):
            with self.subTest(kind=kind):
                state = self.state_with([edge("a", "b", kind=kind, back="W")])
                self.assertEqual(route.bfs("a", "b", state), [("E", kind)])
                self.assertIsNone(route.bfs("b", "a", state))

    def test_shortest_route_in_cycle(self):
        state = self.state_with([edge("a", "b"), edge("b", "c"), edge("c", "a"), edge("a", "c", "N")])
        self.assertEqual(route.bfs("a", "c", state), [("N", "walk")])

    def test_disconnected_and_same_room(self):
        self.assertIsNone(route.bfs("a", "c", specimen()))
        self.assertEqual(route.bfs("a", "a", specimen()), [])

    def test_unknown_room_is_error_even_when_same(self):
        for start, goal in (("missing", "a"), ("a", "missing"), ("missing", "missing")):
            with self.subTest(start=start, goal=goal), self.assertRaisesRegex(ValueError, "unknown room"):
                route.bfs(start, goal, specimen())

    def test_cli_usage_help_list_and_unknown_room(self):
        for args, status, expected in (([], 2, "provide both"), (["a"], 2, "provide both"),
                                       (["--help"], 0, "shortest recorded"),
                                       (["--list"], 0, "living-room"),
                                       (["--list", "a"], 2, "cannot be combined"),
                                       (["living-rom", "kitchen"], 2, "did you mean living-room")):
            result = run_cli("route.py", *args)
            with self.subTest(args=args):
                self.assertEqual(result.returncode, status)
                self.assertIn(expected, result.stdout + result.stderr)
                self.assertNotIn("Traceback", result.stderr)

    def test_cli_valid_same_and_special_routes(self):
        for args, expected in ((["living-room", "kitchen"], "e   # 1 move"),
                               (["living-room", "living-room"], "# 0 moves"),
                               (["living-room", "cellar"], "special edges: oneway")):
            result = run_cli("route.py", *args)
            with self.subTest(args=args):
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertIn(expected, result.stdout)

    def test_cli_no_route_and_bad_state(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "state.json"
            path.write_text(json.dumps(specimen()))
            result = run_cli("route.py", "a", "c", "--state", str(path))
            self.assertEqual(result.returncode, 1)
            self.assertIn("no recorded route", result.stdout)
            path.write_text("oops")
            result = run_cli("route.py", "a", "c", "--state", str(path))
            self.assertEqual(result.returncode, 2)
            self.assertIn("cannot read", result.stderr)
            self.assertNotIn("Traceback", result.stderr)


class SourceIntegrityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.state = validate.read_json(ROOT / "state.json")

    def test_expedition_checkpoint_unchanged(self):
        self.assertEqual(hashlib.sha256((ROOT / "state.json").read_bytes()).hexdigest(), STATE_SHA256)
        self.assertEqual((len(self.state["rooms"]), len(self.state["edges"]), len(self.state["events"]), len(self.state["path"])), (86, 94, 73, 97))
        self.assertEqual({key: self.state["status"][key] for key in ("score", "maxScore", "moves", "deaths", "location")},
                         {"score": 350, "maxScore": 350, "moves": 624, "deaths": 0, "location": "living-room"})

    def test_all_room_edge_event_path_and_layout_references(self):
        validate.validate_state(self.state)
        validate.validate_layout(validate.read_json(ROOT / "layout.json"), self.state)
        for path in (ROOT / "art").glob("*.txt"):
            self.assertIn(path.stem, self.state["rooms"])
            self.assertTrue(path.read_text(encoding="utf-8").strip())
        self.assertEqual(len(list((ROOT / "art").glob("*.txt"))), 37)
        self.assertEqual(len({room["order"] for room in self.state["rooms"].values()}), 86)
        self.assertEqual([event["step"] for event in self.state["events"]], list(range(1, 74)))

    def test_real_build_embeds_valid_data_and_notices(self):
        first, state = build.render(ROOT)
        self.assertEqual(first, build.render(ROOT)[0])
        parser = PageParser()
        parser.feed(first)
        self.assertEqual(parser.state(), state)
        expected = copy.deepcopy(self.state)
        expected.pop("resume", None)
        actual = copy.deepcopy(state)
        actual.pop("layout")
        for room in actual["rooms"].values():
            room.pop("art", None)
        self.assertEqual(actual, expected)
        self.assertEqual(sum(bool(room.get("art")) for room in state["rooms"].values()), 37)
        notices = (ROOT / "THIRD_PARTY_NOTICES.md").read_text(encoding="utf-8").replace("--", "- -")
        self.assertTrue(any(notices in comment for comment in parser.comments))

    def test_all_room_pairs_match_independent_shortest_distances(self):
        # Independently calculate Floyd-Warshall distances for every pair, then
        # ensure each returned direction/kind sequence reaches its goal.
        rooms = list(self.state["rooms"])
        inf = float("inf")
        distances = {a: {b: (0 if a == b else inf) for b in rooms} for a in rooms}
        arcs = collections.defaultdict(list)
        for item in self.state["edges"]:
            if item["kind"] == "locked":
                continue
            a, b = item["from"], item["to"]
            distances[a][b] = min(distances[a][b], 1)
            arcs[a].append((b, item["dir"], item["kind"]))
            if item.get("back") and item["kind"] not in ("oneway", "boat"):
                distances[b][a] = min(distances[b][a], 1)
                arcs[b].append((a, item["back"], item["kind"]))
        for via in rooms:
            for a in rooms:
                for b in rooms:
                    distances[a][b] = min(distances[a][b], distances[a][via] + distances[via][b])
        for start in rooms:
            for goal in rooms:
                result = route.bfs(start, goal, self.state)
                with self.subTest(start=start, goal=goal):
                    if distances[start][goal] == inf:
                        self.assertIsNone(result)
                    else:
                        self.assertEqual(len(result), distances[start][goal])
                        reached = {start}
                        for direction, kind in result:
                            reached = {target for room in reached for target, d, k in arcs[room] if d == direction and k == kind}
                        self.assertIn(goal, reached)

    def test_standalone_has_no_external_resource_tags(self):
        parser = PageParser()
        parser.feed(build.render(ROOT)[0])
        self.assertEqual(parser.external, [])

    def test_cli_works_outside_project_and_with_spaces(self):
        with tempfile.TemporaryDirectory(prefix="zork test ") as directory:
            output = Path(directory) / "map output.html"
            result = run_cli("build.py", "--no-live", "--output", str(output), cwd=directory)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue(output.is_file())
            self.assertIn("86 rooms, 94 edges, 37 scenes", result.stdout)
            result = run_cli("validate.py", cwd=directory)
            self.assertEqual(result.returncode, 0, result.stderr)
            result = run_cli("route.py", "living-room", "kitchen", cwd=directory)
            self.assertEqual(result.returncode, 0, result.stderr)

    def test_import_has_no_build_or_state_read_side_effect(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            shutil.copytree(ROOT / "tools", root / "tools", ignore=shutil.ignore_patterns("__pycache__"))
            result = subprocess.run([sys.executable, "-c", "import tools.build, tools.route, tools.stlib"],
                                    cwd=root, capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertFalse((root / "out").exists())
            self.assertEqual(result.stdout, "")


class StateHelperTests(unittest.TestCase):
    def test_status_zero_values_and_colons_are_preserved(self):
        state = specimen()
        stlib.status(state, score=0, moves=0, deaths=0, loc="b", inv=["lantern:off:empty", "garlic"])
        self.assertEqual(state["status"]["inventory"], [{"name": "lantern", "note": "off:empty"}, {"name": "garlic"}])
        self.assertEqual(state["status"]["location"], "b")

    def test_inventory_event_and_puzzle_helpers(self):
        state = specimen()
        state["rooms"]["living-room"] = {}
        state["puzzles"] = []
        stlib.drop(state, "knife", "a", "weapon")
        stlib.take(state, "KNIFE", "a")
        self.assertEqual(state["rooms"]["a"]["items"], [])
        stlib.bank(state, "diamond")
        self.assertEqual(state["rooms"]["living-room"]["items"][0]["note"], "banked")
        stlib.unbank(state, "diamond")
        self.assertEqual(state["rooms"]["living-room"]["items"], [])
        stlib.event(state, "note", "a", "second")
        self.assertEqual(state["events"][-1]["step"], 2)
        stlib.puzzle(state, "Door", "locked", "first")
        stlib.puzzle(state, "Door", "solved", "second")
        self.assertEqual(state["puzzles"], [{"name": "Door", "status": "solved", "note": "second"}])
        stlib.nxt(state, ("one", "two"))
        self.assertEqual(state["next"], ["one", "two"])

    def test_save_uses_active_interpreter_and_propagates_build_failure(self):
        with tempfile.TemporaryDirectory() as directory, mock.patch.object(stlib, "STATE", str(Path(directory) / "state.json")):
            state = specimen()
            with mock.patch.object(stlib.subprocess, "run", side_effect=subprocess.CalledProcessError(1, "build")) as run:
                with self.assertRaises(subprocess.CalledProcessError):
                    stlib.save(state)
                self.assertEqual(run.call_args.args[0][0], sys.executable)
                self.assertTrue(run.call_args.kwargs["check"])
            self.assertEqual(stlib.load()["status"], state["status"])

    def test_save_no_build_and_explicit_zero_step(self):
        with tempfile.TemporaryDirectory() as directory, mock.patch.object(stlib, "STATE", str(Path(directory) / "state.json")):
            with mock.patch.object(stlib.subprocess, "run") as run:
                stlib.save(specimen(), build=False, step=0)
                run.assert_not_called()
            self.assertEqual(stlib.load()["meta"]["step"], 0)

    def test_invalid_json_save_does_not_truncate_checkpoint(self):
        with tempfile.TemporaryDirectory() as directory, mock.patch.object(stlib, "STATE", str(Path(directory) / "state.json")):
            stlib.save(specimen(), build=False)
            before = Path(stlib.STATE).read_bytes()
            state = specimen()
            state["invalid"] = float("nan")
            with self.assertRaises(ValueError):
                stlib.save(state, build=False)
            self.assertEqual(Path(stlib.STATE).read_bytes(), before)


def run_cli(tool, *args, cwd=None):
    env = dict(os.environ)
    env.pop("ZORK_LIVE_COPY", None)
    env["ZORK_NO_LIVE"] = "1"
    return subprocess.run([sys.executable, str(ROOT / "tools" / tool), *args], cwd=cwd,
                          env=env, capture_output=True, text=True, encoding="utf-8")


if __name__ == "__main__":
    unittest.main()
