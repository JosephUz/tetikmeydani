@echo off
rem Tetik Meydani: yerel sunucuyu baslatir ve tarayicida acar (http://127.0.0.1:5210).
cd /d "%~dp0"
if not exist node_modules call npm install
node server.mjs --open
