@echo off
echo ================================================
echo   DEMARRAGE SERVEUR - Application Construction
echo ================================================
echo.
echo Demarrage du serveur local sur le port 8000...
echo.
echo Une fois demarre, ouvrez votre navigateur :
echo   http://localhost:8000
echo.
echo Appuyez sur Ctrl+C pour arreter le serveur
echo.
echo ================================================
echo.

python -m http.server 8000

pause
