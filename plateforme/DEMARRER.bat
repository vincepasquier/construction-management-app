@echo off
cd /d "%~dp0"
echo ================================================
echo   Chantier+ - mode developpement
echo ================================================
where npm >nul 2>nul || (
  echo npm est introuvable sur ce PC.
  echo Pour simplement utiliser l'application, lancez pret-a-lancer\LANCER.bat
  echo ^(seul node.exe est necessaire^).
  echo Pour developper, installez Node.js depuis https://nodejs.org ^(inclut npm^).
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installation des dependances...
  call npm install
)
if not exist .env copy .env.example .env >nul
echo Ouvrez http://localhost:5173 dans votre navigateur
call npm run dev
pause
