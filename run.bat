@echo off
cd /d "%~dp0"
set PORT=%1
if "%PORT%"=="" set PORT=8899
where python >nul 2>nul
if %ERRORLEVEL%==0 (
  start "" http://127.0.0.1:%PORT%/
  python tools\serve.py %PORT%
) else (
  start "" http://127.0.0.1:%PORT%/
  node tools\serve.js %PORT%
)
