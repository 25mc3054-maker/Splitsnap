@echo off
title SplitSnap Server
echo ==========================================
echo Starting SplitSnap with PayPal Sandbox...
echo ==========================================
echo.
echo Opening browser at http://localhost:3000 ...
timeout /t 2 /nobreak >nul
start http://localhost:3000
npm run dev
pause

