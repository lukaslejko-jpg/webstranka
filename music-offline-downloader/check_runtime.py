"""Build-time dependency check. It does not make source/download requests."""

from importlib.metadata import version
import re
import subprocess

for package, expected in {"fastapi": "0.142.2", "uvicorn": "0.54.0", "yt-dlp": "2026.8.19",
                          "yt-dlp-ejs": "0.8.0"}.items():
    actual = version(package)
    assert actual == expected, f"Expected {package} {expected}; found {actual}"
    print(f"{package}: {actual}")

for executable in ("ffmpeg", "ffprobe"):
    check = subprocess.run([executable, "-version"], check=True, capture_output=True, text=True, timeout=10)
    print(check.stdout.splitlines()[0])
node = subprocess.run(["node", "--version"], check=True, capture_output=True, text=True, timeout=10).stdout.strip()
assert re.fullmatch(r"v\d+\.\d+\.\d+", node) and int(node[1:].split(".")[0]) >= 22, "Node >=22 required"
print(f"Node: {node}")
