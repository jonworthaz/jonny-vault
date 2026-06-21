@echo off
rem Claude Ideas launcher (Windows) - double-click to run.
rem Serves the parent folder so Claude Ideas can reach the sibling tools.
cd /d "%~dp0.."
set PORT=8020
echo Starting Claude Ideas...  ->  http://localhost:%PORT%/claude-ideas/index.html
echo (Leave this window open while you use it. Close it when you're done.)
start "" "http://localhost:%PORT%/claude-ideas/index.html"

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
echo Install Python from https://python.org, or use the hosted version.
pause
