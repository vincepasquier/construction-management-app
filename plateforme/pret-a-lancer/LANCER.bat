@echo off
setlocal
cd /d "%~dp0"
title Chantier+
echo ================================================
echo   Chantier+ - lancement
echo ================================================
echo.

rem --- Recherche de node.exe : installe sur le PC, ou copie dans ce dossier / le dossier parent
set "NODE="
where node >nul 2>nul && set "NODE=node"
if not defined NODE if exist "%~dp0node.exe" set "NODE=%~dp0node.exe"
if not defined NODE if exist "%~dp0..\node.exe" set "NODE=%~dp0..\node.exe"
if not defined NODE (
  echo node.exe est introuvable.
  echo.
  echo Solution 1 : copiez votre fichier node.exe dans ce dossier :
  echo    %~dp0
  echo Solution 2 : installez Node.js depuis https://nodejs.org ^(version LTS^).
  echo.
  pause
  exit /b 1
)

if not exist .env copy .env.example .env >nul

echo L'application s'ouvre dans votre navigateur : http://localhost:8787
echo Laissez cette fenetre ouverte pendant l'utilisation. Fermez-la pour arreter.
echo.
start "" /b cmd /c "timeout /t 2 >nul & start http://localhost:8787"
"%NODE%" serveur.mjs
echo.
echo Le serveur s'est arrete. Si un message indique que le port 8787 est deja utilise,
echo fermez l'autre fenetre Chantier+ ouverte.
pause
