@echo off
setlocal EnableExtensions
title Chantier+
cd /d "%~dp0"

rem Ce script evite volontairement les blocs entre parentheses : un chemin de dossier
rem contenant une parenthese, par exemple "...(1)", les ferait echouer.

echo ================================================
echo   Chantier+ - lancement
echo ================================================
echo.

if not exist "serveur.mjs" goto pas_decompresse

rem --- Recherche de node.exe : dans ce dossier, dans le dossier parent, ou installe sur le PC
set "NODE="
if exist "node.exe" set "NODE=%CD%\node.exe"
if not defined NODE if exist "..\node.exe" set "NODE=%CD%\..\node.exe"
if not defined NODE for /f "delims=" %%i in ('where node 2^>nul') do if not defined NODE set "NODE=%%i"
if not defined NODE goto pas_de_node

echo Node.js : "%NODE%"
"%NODE%" -v
if errorlevel 1 goto node_invalide
"%NODE%" -e "process.exit(Number(process.versions.node.split('.')[0]) < 18 ? 1 : 0)"
if errorlevel 1 goto node_trop_ancien

if not exist ".env" if exist ".env.example" copy ".env.example" ".env" >nul

echo.
echo L'application va s'ouvrir dans le navigateur : http://localhost:8787
echo Laissez cette fenetre ouverte pendant l'utilisation. Fermez-la pour arreter.
echo.
start "" /b cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:8787"
"%NODE%" serveur.mjs
echo.
echo Le serveur s'est arrete.
echo Si le message ci-dessus contient "EADDRINUSE", Chantier+ est deja ouvert dans une
echo autre fenetre : ouvrez simplement http://localhost:8787 dans le navigateur.
goto fin

:pas_decompresse
echo Le fichier serveur.mjs est introuvable a cote de LANCER.bat.
echo.
echo Le ZIP n'a probablement pas ete decompresse :
echo   1. Clic droit sur le fichier ZIP, puis "Extraire tout..."
echo   2. Ouvrez le dossier extrait, puis plateforme, puis pret-a-lancer
echo   3. Double-cliquez sur LANCER.bat
goto fin

:pas_de_node
echo node.exe est introuvable.
echo.
echo Copiez votre fichier node.exe dans le meme dossier que LANCER.bat, puis relancez.
echo Ou installez Node.js, version LTS, depuis https://nodejs.org
goto fin

:node_invalide
echo Le fichier node.exe trouve ne fonctionne pas sur ce PC.
echo Telechargez Node.js, version LTS, depuis https://nodejs.org
goto fin

:node_trop_ancien
echo Cette version de Node.js est trop ancienne : la version 18 ou plus recente est necessaire.
echo Telechargez Node.js, version LTS, depuis https://nodejs.org
goto fin

:fin
echo.
pause
