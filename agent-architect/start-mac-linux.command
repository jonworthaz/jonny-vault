#!/bin/bash
# Architect launcher (macOS / Linux) — double-click to run.
# Serves the tool on http://localhost so clipboard / downloads work reliably.
cd "$(dirname "$0")" || exit 1
PORT=8011
URL="http://localhost:$PORT/index.html"
echo "Starting Architect…  ->  $URL"
echo "(Leave this window open while you use the tool. Close it when you're done.)"

# open the browser a moment after the server starts
( sleep 1; (command -v open >/dev/null 2>&1 && open "$URL") || (command -v xdg-open >/dev/null 2>&1 && xdg-open "$URL") ) &

if command -v python3 >/dev/null 2>&1; then
  python3 -m http.server "$PORT"
elif command -v python >/dev/null 2>&1; then
  python -m http.server "$PORT"
else
  echo
  echo "Python isn't installed, so the local server can't start."
  echo "You can still use the tool by opening index.html directly."
  echo "Install Python from https://python.org if you'd prefer the local server."
  read -r -n 1 -p "Press any key to close…"
fi
