@echo off
rem Lumen Commerce launcher (Windows) - double-click to run.
rem Serves the parent folder so the store and its admin both load cleanly.
cd /d "%~dp0.."
set PORT=8787
echo Starting your store...  ->  http://localhost:%PORT%/store/
echo Admin is at           ->  http://localhost:%PORT%/store/admin/
echo (Leave this window open while you use it. Close it when you're done.)
start "" "http://localhost:%PORT%/store/index.html"

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
echo Install Python from https://python.org (tick "Add to PATH"), or use the hosted version.
pause
