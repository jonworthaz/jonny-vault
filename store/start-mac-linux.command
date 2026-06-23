#!/bin/bash
# Lumen Commerce launcher (macOS / Linux) — double-click to run.
# Serves the *parent* folder so the store and its admin both load cleanly.
# Storefront opens at /store/ ; admin lives at /store/admin/.
cd "$(dirname "$0")/.." || exit 1
PORT=8787
URL="http://localhost:$PORT/store/index.html"
echo "Starting your store…  ->  $URL"
echo "Admin is at          ->  http://localhost:$PORT/store/admin/"
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
