# ✅ CHECKLIST D'INTÉGRATION - Système d'Appels d'Offres

## 📦 FICHIERS À COPIER

### 1. Nouveaux Composants (dossier `components/`)
- [ ] `AppelOffreModal.js` → Créer/modifier des AO
- [ ] `AppelOffreDetailView.js` → Vue comparative des offres
- [ ] `OffreModal.js` → **REMPLACER** l'ancien fichier

### 2. Fichiers de démarrage (racine du projet)
- [ ] `DEMARRER.bat` → Script Windows
- [ ] `demarrer.sh` → Script Mac/Linux (rendre exécutable avec `chmod +x`)

### 3. Documentation (racine du projet)
- [ ] `README.md` → Guide complet d'utilisation
- [ ] `GUIDE_INTEGRATION_APP_JS.md` → Modifications de app.js
- [ ] `GUIDE_INTEGRATION_DASHBOARD_JS.md` → Modifications de Dashboard.js

---

## ✏️ FICHIERS À MODIFIER

### 1. `index.html`
- [ ] Ajouter `<script type="text/babel" src="components/AppelOffreModal.js"></script>`
- [ ] Ajouter `<script type="text/babel" src="components/AppelOffreDetailView.js"></script>`
- [ ] S'assurer que `OffreModal.js` est chargé (devrait déjà être présent)

**Position recommandée :** AVANT `<script type="text/babel" src="app.js"></script>`

---

### 2. `app.js`
Suivre le guide `GUIDE_INTEGRATION_APP_JS.md` pour :

- [ ] **Étape 1 :** Ajouter 5 nouveaux états
  - `appelOffres`, `showAppelOffreModal`, `showAppelOffreDetail`
  - `editingAppelOffre`, `selectedAppelOffre`

- [ ] **Étape 2 :** Modifier `loadAllData` (ajouter `appelOffres`)

- [ ] **Étape 3 :** Modifier `handleSaveOffre` (gestion des favorites)

- [ ] **Étape 4 :** Ajouter 3 nouveaux handlers
  - `handleSaveAppelOffre`
  - `handleUpdateFavorites`
  - `handleCreateCommandeFromAO`

- [ ] **Étape 5 :** Modifier `handleExportAllData` (ajouter `appelOffres`)

- [ ] **Étape 6 :** Ajouter l'onglet "Appels d'Offres" dans la navigation

- [ ] **Étape 7 :** Ajouter le contenu de l'onglet AO (tableau complet)

- [ ] **Étape 8 :** Modifier `<window.OffreModal>` (ajouter props `appelOffres` et `offres`)

- [ ] **Étape 9 :** Ajouter les 2 nouveaux modals
  - `<window.AppelOffreModal>`
  - `<window.AppelOffreDetailView>`

---

### 3. `Dashboard.js`
Suivre le guide `GUIDE_INTEGRATION_DASHBOARD_JS.md` pour :

- [ ] Modifier le calcul de `totalOffres`
- [ ] Ajouter le filtre `.filter(o => o.isFavorite === true || !o.appelOffreId)`

---

## 🧪 TESTS À EFFECTUER

### Test 1 : Création d'un Appel d'Offres
1. [ ] Ouvrir l'application
2. [ ] Aller dans l'onglet "Appels d'Offres"
3. [ ] Cliquer sur "Nouvel AO"
4. [ ] Remplir les champs (N°, Désignation, Lots)
5. [ ] Enregistrer
6. [ ] Vérifier que l'AO apparaît dans le tableau

### Test 2 : Liaison d'offres à un AO
1. [ ] Aller dans l'onglet "Offres"
2. [ ] Créer une nouvelle offre
3. [ ] Dans "Lier à un Appel d'Offres", sélectionner l'AO créé
4. [ ] Renseigner le montant (ex: 100'000 CHF)
5. [ ] Enregistrer
6. [ ] Vérifier qu'un badge "⭐ Favorite" apparaît (c'est la première offre)

### Test 3 : Sélection automatique de la favorite
1. [ ] Créer une 2ème offre pour le même AO
2. [ ] Mettre un montant PLUS BAS (ex: 95'000 CHF)
3. [ ] Enregistrer
4. [ ] Vérifier que cette offre devient la nouvelle favorite
5. [ ] Créer une 3ème offre avec un montant PLUS HAUT (ex: 110'000 CHF)
6. [ ] Vérifier qu'elle ne devient PAS favorite

### Test 4 : Vue comparative
1. [ ] Retourner dans "Appels d'Offres"
2. [ ] Cliquer sur le N° de l'AO
3. [ ] Vérifier que les 3 offres sont listées
4. [ ] Vérifier que le badge 🏆 est sur l'offre la moins chère
5. [ ] Vérifier que le radio button ⭐ est sur l'offre favorite
6. [ ] Vérifier les statistiques (min, max, écart)

### Test 5 : Changement manuel de la favorite
1. [ ] Dans la vue détaillée de l'AO
2. [ ] Cliquer sur le radio button d'une autre offre
3. [ ] Vérifier le message de confirmation
4. [ ] Retourner dans "Offres"
5. [ ] Vérifier que seule la nouvelle favorite a le badge "⭐"

### Test 6 : Impact sur le Dashboard
1. [ ] Aller dans "Dashboard"
2. [ ] Vérifier le total des offres
3. [ ] Ce total doit correspondre UNIQUEMENT à l'offre favorite
4. [ ] Les offres non-favorites ne doivent PAS être comptées

### Test 7 : Création de commande depuis l'AO
1. [ ] Retourner dans la vue détaillée de l'AO
2. [ ] Cliquer sur "Créer commande depuis favorite"
3. [ ] Vérifier le message de confirmation
4. [ ] Aller dans "Offres"
5. [ ] Vérifier que la favorite est en statut "Acceptée"
6. [ ] Vérifier que les autres sont en statut "Refusées"
7. [ ] Aller dans "Appels d'Offres"
8. [ ] Vérifier que l'AO est en statut "Attribué"
9. [ ] Aller dans "Commandes"
10. [ ] Vérifier qu'une nouvelle commande a été créée

### Test 8 : Offres indépendantes (sans AO)
1. [ ] Créer une offre SANS lier d'AO
2. [ ] Vérifier qu'elle n'a pas de badge "⭐"
3. [ ] Aller dans "Dashboard"
4. [ ] Vérifier qu'elle est comptée dans le total des offres

---

## 🎯 RÉSULTATS ATTENDUS

Après l'intégration complète, votre application devrait :

### Fonctionnalités
✅ Créer des appels d'offres avec lots et positions  
✅ Lier plusieurs offres à un même AO  
✅ Sélectionner automatiquement l'offre la moins chère comme favorite  
✅ Permettre de changer manuellement la favorite  
✅ N'afficher que les offres favorites dans les totaux  
✅ Créer des commandes depuis les AO avec mise à jour automatique des statuts  

### Interface
✅ Nouvel onglet "Appels d'Offres" dans la navigation  
✅ Tableau listant tous les AO avec nombre d'offres reçues  
✅ Vue détaillée comparative pour chaque AO  
✅ Badge "⭐ Favorite" sur les offres sélectionnées  
✅ Badge "🏆 Moins chère" dans la vue comparative  

### Données
✅ Nouveau type de données `appelOffres` sauvegardé en localStorage  
✅ Champs `appelOffreId` et `isFavorite` ajoutés aux offres  
✅ Calculs du Dashboard basés uniquement sur les favorites  
✅ Export JSON incluant les appels d'offres  

---

## ❓ DÉPANNAGE

### Problème : Les composants ne s'affichent pas
**Solution :** Vérifier que les scripts sont bien chargés dans `index.html`

### Problème : Erreur "window.AppelOffreModal is not a function"
**Solution :** Vérifier que le fichier `AppelOffreModal.js` est bien dans `components/` et chargé dans `index.html`

### Problème : La favorite ne se met pas à jour
**Solution :** Vérifier la logique dans `handleSaveOffre` dans `app.js`

### Problème : Le Dashboard compte toutes les offres
**Solution :** Vérifier le filtre dans `Dashboard.js` (voir GUIDE_INTEGRATION_DASHBOARD_JS.md)

### Problème : Les offres ne se lient pas à l'AO
**Solution :** Vérifier que `OffreModal.js` a bien été remplacé par la nouvelle version et reçoit les bonnes props

---

## 📞 SUPPORT

Pour toute question ou problème :
1. Consulter le README.md pour les détails d'utilisation
2. Vérifier les guides d'intégration (app.js et Dashboard.js)
3. Tester chaque étape de la checklist une par une
4. Consulter la console du navigateur (F12) pour les erreurs JavaScript

---

## 🎊 FÉLICITATIONS !

Une fois toutes les cases cochées, votre système d'Appels d'Offres est **opérationnel** ! 🚀

**Profitez bien de cette nouvelle fonctionnalité ! 🏗️**

---

_Date de création : 10 novembre 2025_  
_Version : 2.0 - Système d'Appels d'Offres_
