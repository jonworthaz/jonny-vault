@echo off
rem Architect launcher (Windows) - double-click to run.
rem Serves the tool on http://localhost so clipboard / downloads work reliably.
cd /d "%~dp0"
set PORT=8011
echo Starting Architect...  ->  http://localhost:%PORT%/index.html
echo (Leave this window open while you use the tool. Close it when you're done.)
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
echo You can still use the tool by opening index.html directly.
echo Install Python from https://python.org if you'd prefer the local server.
pause
