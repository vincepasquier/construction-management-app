# Chantier+ — plateforme de pilotage de projets d'infrastructure

Application web pour **directeurs de projet** et **responsables de lot** : suivi financier par position (mutations, prévisions d'atterrissage, clôtures mensuelles), appels d'offres selon le CAN, contrats d'entreprise (SIA 118), factures, planning, documents SharePoint, ressources, avec un **assistant IA** (Claude) qui connaît les données du projet.

## Démarrage

### Utiliser l'application (seul `node.exe` est nécessaire)

Le dossier [`pret-a-lancer/`](pret-a-lancer/) contient une version déjà compilée, sans dépendance à installer :

1. Double-cliquer sur `pret-a-lancer/LANCER.bat`. Si Node.js n'est pas installé, copier `node.exe` dans ce dossier.
2. Le navigateur s'ouvre sur http://localhost:8787 ; laisser la fenêtre noire ouverte.

Sur Mac / Linux : `cd pret-a-lancer && node serveur.mjs`.

### Développer (Node.js complet avec npm)

```bash
cd plateforme
npm install
cp .env.example .env      # puis renseigner ANTHROPIC_API_KEY pour l'assistant IA
npm run dev               # front http://localhost:5173 + API http://localhost:8787
```

Sous Windows : `DEMARRER.bat`. Après une modification du code, régénérer la version prête à lancer avec `npm run pret-a-lancer`.

L'application démarre avec un **jeu de démonstration fictif** (deux projets : réaménagement de route cantonale et collecteur vers STEP). Paramètres → « Tout effacer » pour repartir de zéro.

| Commande | Rôle |
|---|---|
| `npm run dev` | Développement (front + API, rechargement à chaud) |
| `npm run build` | Vérification TypeScript + compilation dans `dist/` |
| `npm start` | Production : le serveur Node sert `dist/` et l'API |
| `npm test` | Tests unitaires (calculs financiers, évaluation des offres, import) |
| `npm run pret-a-lancer` | Régénère `pret-a-lancer/` (front compilé + serveur en un seul fichier) |

## Modules

| Module | Contenu |
|---|---|
| **Portefeuille** | Tous les projets accessibles : budget, prévision, écart, avancement, santé ; « mon travail » (mes tâches, validations en attente, mes risques) |
| **Tableau de bord** | Indicateurs du projet, **frise des phases SIA 112** (projet et chaque lot : phase en cours en un clic, dates par phase, vue calendrier), courbe en S, alertes, lots et responsables, jalons |
| **Finances** | Budget par **position** (lot → position → sous-position → étape, code CFC en attribut, réserve). **Atterrissage = engagé + attendu + reste à engager + ajustements**, scénario défavorable, écart, réserve disponible. **Mutations** équilibrées avec validation ; **prévisions** (estimations internes, plus-values, risques pondérés, opportunités, corrections de commande) ; commandes et offres **réparties sur plusieurs positions**, conversion offre → commande ; **import des factures Power BI** (sur commande / hors commande, affectation guidée) ; **clôtures mensuelles** et graphique en cascade expliquant la variation ; **rapport mensuel** imprimable en PDF ; **import du classeur Excel de suivi financier** avec contrôle des totaux ; import d'un chiffrage par l'IA |
| **Marchés & appels d'offres** | Parcours guidé en 7 étapes (descriptif → consultation → offres → adjudication → contrat → facturation → clôture) avec la **prochaine action en un clic**. Descriptif par positions **CAN** (saisie ou import CSV), comparatif des prix unitaires (prix le plus bas, écarts > 30 % vs médiane, positions non chiffrées), rabais / escompte, **évaluation multicritère** pondérée, adjudication → contrat créé automatiquement ; marchés de gré à gré |
| **Import CRBX (SIA 451)** | Le CRBX envoyé aux entreprises crée le descriptif (positions CAN, textes, unités, quantités par subdivision). Les CRBX rentrés (Messerli, BauBit, Sorba…) deviennent des offres, avec l'entreprise reconnue ou ajoutée au carnet, et sont contrôlés : total recalculé ligne par ligne et comparé au total annoncé, positions manquantes ou ajoutées, quantités modifiées, positions non chiffrées. Récapitulatif par chapitre CAN |
| **Contrats & factures** | Contrats d'entreprise, mandats, fournitures ; avenants ; situations, régies, décompte final ; TVA ; retenue de garantie ; contrôle de dépassement ; « Faire valider » sur factures et avenants |
| **Planning** | Gantt interactif (glisser pour décaler, étirer pour la durée), dépendances, jalons, retards détectés automatiquement |
| **Tâches** | **Import d'un plan Planner** (export Excel). Actions attribuées aux membres : tableau glisser-déposer (à faire / en cours / en attente / terminé), vue **par personne** (avec ses tâches de planning, validations et risques), « mes tâches » ; priorités, échéances, origine (séance, risque…) |
| **Risques** | Matrice probabilité × impact cliquable, registre, criticité, exposition financière pondérée, **suivi par responsable**, création de tâches de traitement, **suggestions de risques par l'IA** |
| **Validations** | Circuits de validation séquentiels (documents, factures, avenants) : modèles de circuits, décision (approuver / demander des modifications / refuser) avec commentaire, nouvelles versions, historique ; l'issue met à jour la facture ou l'avenant |
| **Autorisations & foncier** | Permis et approbations des plans (dépôt, enquête, oppositions, décision, validité), **conditions des préavis** avec responsable et échéance (→ tâche en un clic), **servitudes et emprises par parcelle** (propriétaire, statut jusqu'à l'inscription au RF, indemnités), échéances des 60 prochains jours |
| **Documents** | Registre documentaire (catégories, versions, liens, état de validation) + navigateur **SharePoint** (parcourir, rechercher, téléverser, créer des dossiers, ajouter au registre) |
| **Organigramme** | Création guidée (génération depuis le projet, modèle type ou à partir de zéro), édition directe, annuaire des intervenants ; **toujours accessible en un clic** (bouton en haut de l'écran, Ctrl Maj O), imprimable |
| **Ressources** | Équipe et rôles, plan de charge sur 12 mois (surcharges en rouge), affectations, organisation des lots et responsables |
| **Entreprises & parties prenantes** | Carnet d'adresses avec interlocuteurs, autorités et riverains ; **import de la liste des parties prenantes** (CSV/Excel SharePoint : collaborateurs internes → équipe, autres → contacts) ; spécialités CFC, historique contrats / offres |
| **Gestion des accès** | Profil par membre (administrateur, directeur de projet, responsable de lot, collaborateur, lecture seule, externe), projets accessibles, droits par module (aucun / lecture / modification) avec dérogations |
| **Assistant IA** | Panneau latéral (Ctrl J) : points de situation, analyse des écarts, comparaison d'offres, lettres d'adjudication, ordres du jour… |

Ergonomie : recherche globale et navigation clavier (**Ctrl K**), thème clair / sombre, compteurs dans le menu (validations et tâches en attente), filtre **« Mes lots uniquement »** pour les responsables de lot. Le sélecteur d'utilisateur en haut à droite permet de tester les profils (ex. Jean Monnier, maître d'ouvrage en lecture seule).

### Règles de calcul (finances)

Par position (sous-position × étape), puis cumulé par lot, étape et projet :

- **Budget révisé** = budget initial + mutations **validées** (une mutation ne change pas le total du projet).
- **Engagé** = commandes (montant initial + avenants approuvés) + factures hors commande.
- **Attendu** = offres en cours, reçues ou retenues + avenants demandés + meilleure offre des appels d'offres en cours.
- **Reste à engager** : règle choisie par position — *automatique* (comme le classeur Excel : budget restant tant que rien n'est commandé ni prévu, puis position soldée), *budget restant*, *soldée* ou *montant estimé*.
- **Ajustements** = estimations internes, plus-values, risques et corrections × probabilité, moins les opportunités pondérées.
- **Atterrissage** = engagé + attendu + reste à engager + ajustements ; **défavorable** = risques à 100 %, sans opportunités.
- **Écart** = budget révisé − atterrissage (négatif = dépassement). **Réserve disponible** = budget des positions de réserve − ce qui y est engagé, attendu ou prévu.
- Une commande sans répartition est imputée sur les positions du même code CFC ; à défaut, elle apparaît sur une position « hors budget ».
- **Facturé** = factures contrôlées, approuvées ou payées (hors contestées) et factures hors commande ; **retenue de garantie** = taux du contrat × acomptes validés.

### Reprise d'un projet existant

- *Finances › Importer un classeur de suivi* : feuilles BUDGET, MUTATIONS, COMMANDES, OFFRES, IMPORT_SUR_CMD et IMPORT_HORS_CMD ; un tableau compare les totaux du classeur et de Chantier+ et signale les incohérences (montant saisi ≠ montant imputé, numéros en double…). Une clôture de reprise est créée.
- *Finances › Factures* : export Power BI mensuel (les factures déjà importées sont reconnues).
- *Entreprises › Importer une liste de parties prenantes* puis *Tâches › Importer Planner*.
- *Paramètres › Ajouter un projet depuis un fichier* : ajoute ou met à jour un projet complet (.json) sans toucher aux autres.

Les fichiers sont lus dans le navigateur ; ils ne sont envoyés à aucun serveur.

## Assistant IA

Le serveur (`server/index.ts`, `server/extractions.ts`) appelle l'API Claude d'Anthropic ; les imports de chiffrage et suggestions de risques utilisent des réponses structurées (schéma imposé) pour obtenir des données directement exploitables ; la clé reste côté serveur (`.env`), elle n'est jamais envoyée au navigateur. À chaque question, un résumé textuel du projet actif (finances CFC, contrats, avenants, factures à traiter, AO et classement des offres, planning, documents) est transmis au modèle. Si le filtre « Mes lots » est actif, seul le périmètre du responsable est transmis.

## SharePoint

1. Portail Azure → *Microsoft Entra ID → Inscriptions d'applications → Nouvelle inscription*.
2. Plateforme **Single-page application**, URI de redirection = adresse de la plateforme (`http://localhost:8787` pour la version prête à lancer, `http://localhost:5173` en développement).
3. Autorisations déléguées Microsoft Graph : `Sites.ReadWrite.All`, `Files.ReadWrite.All` (consentement administrateur).
4. Dans Chantier+ → Paramètres : client ID, tenant ID, hôte (`entreprise.sharepoint.com`), chemin du site (`/sites/Projets`), dossier racine.
5. Sur chaque projet, le champ « Dossier SharePoint » désigne son sous-dossier.

## Import depuis l'ancienne application

Dans l'ancienne application : *Export → Session complète (JSON)*. Puis dans Chantier+ : Paramètres → « Importer une session ». Correspondances : lots d'estimation → budget (numéro de lot = code CFC), appels d'offres + offres → comparatif, commandes → contrats, offres complémentaires → avenants, factures → factures.

## Limites actuelles et suites possibles

- **Droits d'accès** : ils organisent l'interface (menus masqués, lecture seule) mais ne constituent pas une protection tant que les données restent dans le navigateur. La sécurité réelle viendra avec le serveur de données et la connexion Microsoft 365.
- **Stockage local** : les données sont enregistrées dans le navigateur (export / restauration JSON dans les paramètres). Pour un usage à plusieurs, la prochaine étape est une base de données partagée (PostgreSQL, API) avec authentification Microsoft 365 et droits par rôle.
- **CAN / CRBX** : l'import lit les fichiers CRBX / SIA 451 (descriptif et offres). Les textes complets des positions CAN ne figurent pas tous dans ces fichiers (ils proviennent du catalogue CRB sous licence) : certains libellés restent courts. L'export d'un CRBX depuis Chantier+ n'est pas encore disponible.
- **CFC** : extrait des groupes principaux ; compléter selon le référentiel utilisé (ou eCCC-Bât / eCCC-GC).
- **Finances** : prévision de trésorerie (répartition du reste à facturer dans le temps) et lecture directe de D365 à venir ; l'import Power BI couvre le besoin en attendant.
- Pistes : chemin critique calculé, révision des prix (indices), gestion des garanties bancaires, PV de séance, tableau de bord maître d'ouvrage, application mobile de chantier.

## Structure

```
plateforme/
├── server/index.ts          API (assistant IA) + service des fichiers en production
├── src/
│   ├── types.ts             Modèle de données
│   ├── data/                Référentiels CFC / CAN, jeu de démonstration
│   ├── lib/                 Calculs financiers (testés), contexte IA, SharePoint, import
│   ├── store/               État (Zustand, persistance locale)
│   ├── components/          Interface commune, mise en page, assistant
│   └── pages/               Modules
└── .env.example
```
