@echo off
rem Idea Board launcher (Windows) - double-click to open the dashboard.
rem The dashboard works by opening index.html directly, but serving it on
rem http://localhost avoids any browser file:// quirks.
cd /d "%~dp0"
set PORT=8010
echo Opening Idea Board...  ->  http://localhost:%PORT%/index.html
echo (Leave this window open while you use it. Close it when you're done.)
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
echo Python isn't installed, so the local server can't start -
echo but you can simply double-click index.html to open the dashboard.
pause
