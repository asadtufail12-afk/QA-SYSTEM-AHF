@echo off
echo Starting QA System...
echo.
echo Starting Backend (port 5000)...
start /B cmd /c "cd qa-system\server && node server.js"
timeout /t 2 /nobreak >nul
echo.
echo Starting Frontend (port 3000)...
start /B cmd /c "cd qa-system\client && npm run dev"
timeout /t 3 /nobreak >nul
echo.
echo QA System is running!
echo - Backend: http://localhost:5000
echo - Frontend: http://localhost:3000
echo.
echo Login credentials:
echo - Admin: admin / admin123
echo - Centers: center1-50 / center123
pause
