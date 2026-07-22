#!/bin/bash
# Base Reality launcher (macOS / Linux) — double-click to run.
# Serves the app on http://localhost so install, clipboard and offline features all work.
cd "$(dirname "$0")" || exit 1
PORT=8020
URL="http://localhost:$PORT/index.html"
echo "Starting Base Reality…  ->  $URL"
echo "(Leave this window open while you use the app. Close it when you're done.)"

( sleep 1; (command -v open >/dev/null 2>&1 && open "$URL") || (command -v xdg-open >/dev/null 2>&1 && xdg-open "$URL") ) &

if command -v python3 >/dev/null 2>&1; then
  python3 -m http.server "$PORT"
elif command -v python >/dev/null 2>&1; then
  python -m http.server "$PORT"
else
  echo
  echo "Python isn't installed, so the local server can't start."
  echo "You can still open index.html directly, but installing as an app and"
  echo "offline mode need a local server. Install Python from https://python.org."
  read -r -n 1 -p "Press any key to close…"
fi
