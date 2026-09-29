@echo off
cd /d "%~dp0"
echo ================================================
echo   Chantier+ - demarrage
echo ================================================
if not exist node_modules (
  echo Installation des dependances...
  call npm install
)
if not exist .env copy .env.example .env >nul
echo Ouvrez http://localhost:5173 dans votre navigateur
call npm run dev
pause
