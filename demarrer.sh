#!/bin/bash

echo "================================================"
echo "  DÉMARRAGE SERVEUR - Application Construction"
echo "================================================"
echo ""
echo "Démarrage du serveur local sur le port 8000..."
echo ""
echo "Une fois démarré, ouvrez votre navigateur :"
echo "  http://localhost:8000"
echo ""
echo "Appuyez sur Ctrl+C pour arrêter le serveur"
echo ""
echo "================================================"
echo ""

python3 -m http.server 8000
