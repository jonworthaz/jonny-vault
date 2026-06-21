#!/bin/bash
# Idea Board launcher (macOS / Linux) — double-click to open the dashboard.
# The dashboard works by opening index.html directly, but serving it on
# http://localhost avoids any browser file:// quirks.
cd "$(dirname "$0")" || exit 1
PORT=8010
URL="http://localhost:$PORT/index.html"
echo "Opening Idea Board…  ->  $URL"
echo "(Leave this window open while you use it. Close it when you're done.)"

( sleep 1; (command -v open >/dev/null 2>&1 && open "$URL") || (command -v xdg-open >/dev/null 2>&1 && xdg-open "$URL") ) &

if command -v python3 >/dev/null 2>&1; then
  python3 -m http.server "$PORT"
elif command -v python >/dev/null 2>&1; then
  python -m http.server "$PORT"
else
  echo
  echo "Python isn't installed, so the local server can't start —"
  echo "but you can simply double-click index.html to open the dashboard."
  read -r -n 1 -p "Press any key to close…"
fi
