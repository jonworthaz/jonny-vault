#!/bin/bash
# Claude Home launcher (macOS / Linux) — double-click to run.
# Serves the *parent* folder so Claude Home can reach the sibling tools
# (workflow-builder, image-annotator). Opens at /claude-home/.
cd "$(dirname "$0")/.." || exit 1
PORT=8020
URL="http://localhost:$PORT/claude-home/index.html"
echo "Starting Claude Home…  ->  $URL"
echo "(Leave this window open while you use it. Close it when you're done.)"

( sleep 1; (command -v open >/dev/null 2>&1 && open "$URL") || (command -v xdg-open >/dev/null 2>&1 && xdg-open "$URL") ) &

if command -v python3 >/dev/null 2>&1; then
  python3 -m http.server "$PORT"
elif command -v python >/dev/null 2>&1; then
  python -m http.server "$PORT"
else
  echo
  echo "Python isn't installed, so the local server can't start."
  echo "Install Python from https://python.org, or use the hosted version."
  read -r -n 1 -p "Press any key to close…"
fi
