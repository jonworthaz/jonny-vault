@echo off
rem MarkUp launcher (Windows) - double-click to run.
rem Serves the tool on http://localhost so the "Copy image" button works.
cd /d "%~dp0"
set PORT=8000
echo Starting MarkUp...  ->  http://localhost:%PORT%/index.html
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
echo You can still use the tool by opening index.html directly - but the
echo Copy button may be blocked. Install Python from https://python.org to fix that.
pause
