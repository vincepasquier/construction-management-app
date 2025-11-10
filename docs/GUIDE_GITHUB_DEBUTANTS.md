# 🎓 GUIDE GITHUB POUR DÉBUTANTS

Ce guide t'explique comment utiliser ce projet avec GitHub, même si c'est ta première fois !

---

## 📥 TÉLÉCHARGER LE PROJET (Cloner)

### Qu'est-ce que "cloner" ?

**Cloner** = Télécharger le projet sur ton ordinateur depuis GitHub

### Comment faire ?

#### Méthode 1 : Avec Git Bash / Terminal (RECOMMANDÉ)

1. **Ouvrir Git Bash (Windows) ou Terminal (Mac/Linux)**

2. **Aller dans le dossier où tu veux le projet**
   ```bash
   # Exemple : aller sur le Bureau
   cd ~/Desktop
   
   # OU aller dans Documents
   cd ~/Documents
   ```

3. **Cloner le projet**
   ```bash
   git clone https://github.com/TON-USERNAME/construction-management-app.git
   ```

4. **Entrer dans le dossier**
   ```bash
   cd construction-management-app
   ```

✅ **Le projet est sur ton ordinateur !**

#### Méthode 2 : Télécharger le ZIP

1. Sur la page GitHub, cliquer sur le bouton vert **"<> Code"**
2. Cliquer sur **"Download ZIP"**
3. Extraire le ZIP dans un dossier
4. Ouvrir le dossier dans Git Bash / Terminal

---

## 🔄 LES COMMANDES GIT DE BASE

### Les 3 commandes essentielles :

```bash
# 1. Voir l'état actuel (fichiers modifiés)
git status

# 2. Enregistrer les changements
git add .                    # Ajouter tous les fichiers
git commit -m "Description"  # Enregistrer avec un message

# 3. Envoyer sur GitHub
git push
```

### Exemple concret :

Tu as modifié `app.js` et tu veux l'envoyer sur GitHub :

```bash
# 1. Vérifier ce qui a changé
git status
# → Tu verras : modified: app.js

# 2. Ajouter le fichier modifié
git add app.js
# OU ajouter tous les fichiers modifiés :
git add .

# 3. Enregistrer avec un message
git commit -m "Ajout du système d'appels d'offres"

# 4. Envoyer sur GitHub
git push
```

✅ **Tes modifications sont sur GitHub !**

---

## 📝 WORKFLOW QUOTIDIEN

### Chaque fois que tu travailles :

```bash
# 1. TOUJOURS COMMENCER PAR :
git pull

# → Télécharge les dernières modifications depuis GitHub
# → Important si tu travailles depuis plusieurs ordinateurs

# 2. Travailler sur ton code
# (modifier les fichiers, ajouter des fonctionnalités, etc.)

# 3. Enregistrer régulièrement :
git add .
git commit -m "Description de ce que tu as fait"

# 4. À la fin de ta session :
git push

# → Envoie tout sur GitHub
```

---

## 🌿 LES BRANCHES (Niveau intermédiaire)

### Qu'est-ce qu'une branche ?

**Branche** = Une copie parallèle de ton code où tu peux expérimenter sans casser la version principale

### Les commandes de base :

```bash
# Créer une nouvelle branche
git checkout -b nom-de-la-branche

# Exemple :
git checkout -b feature/nouveaux-filtres

# Voir toutes les branches
git branch

# Changer de branche
git checkout nom-de-la-branche

# Exemple : retourner à la branche principale
git checkout main
```

### Workflow avec branches :

```bash
# 1. Créer une branche pour une nouvelle fonctionnalité
git checkout -b feature/appels-offres

# 2. Travailler et commit normalement
git add .
git commit -m "Travail en cours sur AO"

# 3. Envoyer la branche sur GitHub
git push -u origin feature/appels-offres

# 4. Sur GitHub : créer une Pull Request pour fusionner dans main
```

---

## 🆘 COMMANDES D'URGENCE

### Annuler des modifications (AVANT commit)

```bash
# Annuler les modifications d'un fichier
git checkout -- nom-du-fichier.js

# Annuler TOUTES les modifications
git checkout -- .
```

### Revenir en arrière (APRÈS commit)

```bash
# Voir l'historique
git log

# Revenir au commit précédent (annule le dernier commit)
git reset --soft HEAD~1

# ATTENTION : Cette commande annule définitivement
git reset --hard HEAD~1
```

### Si tu es bloqué

```bash
# Voir l'état
git status

# Abandonner tous les changements et revenir à la version GitHub
git fetch origin
git reset --hard origin/main

# ⚠️ ATTENTION : Cela efface TOUS tes changements locaux !
```

---

## 📖 GLOSSAIRE

| Terme | Signification |
|-------|---------------|
| **Repository (Repo)** | Dossier de projet sur GitHub |
| **Clone** | Télécharger un repo sur ton ordinateur |
| **Commit** | Enregistrer des changements |
| **Push** | Envoyer tes commits sur GitHub |
| **Pull** | Télécharger les dernières modifications depuis GitHub |
| **Branch** | Version parallèle du code |
| **Merge** | Fusionner deux branches |
| **Pull Request (PR)** | Demande de fusion de branches |
| **Fork** | Copier le repo de quelqu'un d'autre |

---

## 💡 CONSEILS

### ✅ À FAIRE

- **Commit souvent** : Petits commits fréquents plutôt qu'un énorme commit
- **Messages clairs** : "Ajout filtre par date" plutôt que "modifs"
- **Pull avant push** : Toujours faire `git pull` avant `git push`
- **Branches pour features** : Une branche par fonctionnalité

### ❌ À ÉVITER

- **Ne jamais commit** : mots de passe, clés API, données sensibles
- **Éviter les gros fichiers** : Images > 1MB, vidéos, archives
- **Ne pas forcer** : `git push --force` (sauf si tu sais ce que tu fais)

---

## 🎯 CHECKLIST POUR DÉBUTANT

Avant de push sur GitHub, vérifie :

- [ ] J'ai fait `git status` pour voir mes changements
- [ ] J'ai ajouté les fichiers avec `git add`
- [ ] J'ai fait un commit avec un message clair
- [ ] J'ai vérifié qu'il n'y a pas de données sensibles
- [ ] J'ai fait `git pull` pour avoir la dernière version
- [ ] Je peux faire `git push` !

---

## 📚 RESSOURCES

- 🎓 **GitHub Learning Lab** : https://lab.github.com
- 📖 **Documentation Git** : https://git-scm.com/doc
- 🎥 **Vidéos YouTube** : "Git pour débutants"
- 💬 **Forum** : Stack Overflow

---

## 🎉 TU ES PRÊT !

Avec ces commandes de base, tu peux déjà faire 90% de ce dont tu as besoin !

**Les 3 commandes magiques à retenir :**

```bash
git add .                           # Ajouter
git commit -m "Mon message"         # Enregistrer
git push                            # Envoyer
```

**Bon courage ! 🚀**
