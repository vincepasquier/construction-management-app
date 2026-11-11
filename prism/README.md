# PRISM

Plateforme de pilotage, de reporting et de gestion intégrée des projets : un **socle groupe** valable pour
tout type de projet, et une **verticale construction** (ex-Chantier+) activée selon le type de projet.

Réécriture en cours de `plateforme/` (Chantier+), qui reste en place comme référence.

## Démarrer

```bash
cd prism
npm install
npm run dev        # application http://localhost:5173 + relais IA http://localhost:8787
```

| Commande | Rôle |
|---|---|
| `npm run typecheck` | Vérification TypeScript |
| `npm run lint` | ESLint |
| `npm test` | Tests (règles métier, dépôt de données, composants) |
| `npm run build` | Compilation dans `dist/` |
| `npm run pret-a-lancer` | Régénère le dossier `pret-a-lancer/` (application compilée + serveur en un fichier) |

## Architecture

```
src/domaine/     règles pures, sans React ni stockage
  types.ts, lib/, data/   repris de Chantier+ ; budget.ts et finance.ts sont identiques à l'original (test)
  socle/                  droits, types du socle groupe
src/donnees/     dépôt (seul point d'écriture), journal d'audit, stockage IndexedDB, sauvegarde,
                 reprise de Chantier+, connecteurs (source de projets simulée)
src/app/         coquille, registre des modules, système de design, tableau et formulaire communs
src/modules/     un dossier par module
serveur/         relais vers l'API Anthropic (la clé reste côté serveur) et service de l'application
```

Les données vivent dans le navigateur (IndexedDB). Toute écriture passe par le dépôt, qui vérifie les
droits et les règles d'intégrité puis laisse une entrée dans le journal d'audit ; la dernière opération
s'annule par Ctrl+Z. Une sauvegarde complète se télécharge depuis `/secours`.

## Limites connues

Sans serveur de données ni authentification, l'identité est un profil choisi et les droits sont appliqués
dans l'application, pas garantis par un serveur. La source de projets (Data Platform) est simulée.
