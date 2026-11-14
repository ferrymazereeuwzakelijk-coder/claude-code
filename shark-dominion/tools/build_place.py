#!/usr/bin/env python3
"""Build SharkDominion.rbxlx without Rojo.

Mirrors default.project.json: src/shared -> ReplicatedStorage.Shared,
src/server -> ServerScriptService.Server (Script), src/client ->
StarterPlayer.StarterPlayerScripts.Client (LocalScript), plus the service
properties the project file sets.

Usage: python3 tools/build_place.py [output.rbxlx]
"""

import pathlib
import sys
from xml.sax.saxutils import escape

ROOT = pathlib.Path(__file__).resolve().parent.parent
_ref = 0


def ref():
    global _ref
    _ref += 1
    return f"RBX{_ref:08X}"


def prop_string(name, value):
    return f'<string name="{name}">{escape(value)}</string>'


def source(text):
    if "]]>" in text:
        raise ValueError("source contains ']]>'")
    return f'<ProtectedString name="Source"><![CDATA[{text}]]></ProtectedString>'


def item(cls, name, props="", children=""):
    return (
        f'<Item class="{cls}" referent="{ref()}"><Properties>{prop_string("Name", name)}{props}'
        f"</Properties>{children}</Item>"
    )


def script_class(path: pathlib.Path):
    n = path.name
    if n.endswith(".server.luau"):
        return "Script", n[: -len(".server.luau")]
    if n.endswith(".client.luau"):
        return "LocalScript", n[: -len(".client.luau")]
    return "ModuleScript", n[: -len(".luau")]


def build_dir(path: pathlib.Path, name: str):
    """A directory becomes a Folder, or a script if it has an init file."""
    init = None
    for candidate in ("init.server.luau", "init.client.luau", "init.luau"):
        if (path / candidate).exists():
            init = path / candidate
    children = []
    for child in sorted(path.iterdir()):
        if child == init:
            continue
        if child.is_dir():
            children.append(build_dir(child, child.name))
        elif child.suffix == ".luau":
            cls, cname = script_class(child)
            children.append(item(cls, cname, source(child.read_text(encoding="utf-8"))))
    if init:
        cls, _ = script_class(init)
        return item(cls, name, source(init.read_text(encoding="utf-8")), "".join(children))
    return item("Folder", name, "", "".join(children))


def main():
    out = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "SharkDominion.rbxlx")
    src = ROOT / "src"
    services = [
        item("Workspace", "Workspace", '<bool name="StreamingEnabled">true</bool>'),
        item("Players", "Players", '<bool name="CharacterAutoLoads">false</bool>'),
        item("Lighting", "Lighting", '<token name="Technology">4</token>'),  # Future
        item("ReplicatedStorage", "ReplicatedStorage", "", build_dir(src / "shared", "Shared")),
        item("ServerScriptService", "ServerScriptService", "", build_dir(src / "server", "Server")),
        item(
            "StarterPlayer",
            "StarterPlayer",
            '<bool name="EnableMouseLockOption">false</bool><float name="CameraMaxZoomDistance">80</float>',
            item("StarterPlayerScripts", "StarterPlayerScripts", "", build_dir(src / "client", "Client")),
        ),
    ]
    xml = '<roblox version="4">' + "".join(services) + "</roblox>"
    out.write_text(xml, encoding="utf-8")
    print(f"Wrote {out} ({len(xml)} bytes)")


if __name__ == "__main__":
    main()
