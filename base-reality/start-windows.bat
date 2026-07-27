@echo off
rem Base Reality launcher (Windows) - double-click to run.
rem Serves the app on http://localhost so install, clipboard and offline features all work.
cd /d "%~dp0"
set PORT=8020
echo Starting Base Reality...  ->  http://localhost:%PORT%/index.html
echo (Leave this window open while you use the app. Close it when you're done.)
start "" "http://localhost:%PORT%/index.html"

where python >nul 2>nul
if %errorlevel%==0 (
  python -m http.server %PORT%
  goto :eof
)
where py >nul 2>nul
if %errorlevel%==0 (
  py -m http.server %PORT%
  goto :eof
)

echo.
echo Python isn't installed, so the local server can't start.
echo You can still open index.html directly, but installing as an app and
echo offline mode need a local server. Install Python from https://python.org.
pause
