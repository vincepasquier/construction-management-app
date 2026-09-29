# Chantier+ — plateforme de pilotage de projets d'infrastructure

Application web pour **directeurs de projet** et **responsables de lot** : finances par CFC, appels d'offres selon le CAN, contrats d'entreprise (SIA 118), factures, planning, documents SharePoint, ressources, avec un **assistant IA** (Claude) qui connaît les données du projet.

## Démarrage

Prérequis : [Node.js](https://nodejs.org) 20 ou plus récent.

```bash
cd plateforme
npm install
cp .env.example .env      # puis renseigner ANTHROPIC_API_KEY pour l'assistant IA
npm run dev               # front http://localhost:5173 + API http://localhost:8787
```

Sous Windows : double-cliquer sur `DEMARRER.bat`.

L'application démarre avec un **jeu de démonstration fictif** (deux projets : réaménagement de route cantonale et collecteur vers STEP). Paramètres → « Tout effacer » pour repartir de zéro.

| Commande | Rôle |
|---|---|
| `npm run dev` | Développement (front + API, rechargement à chaud) |
| `npm run build` | Vérification TypeScript + compilation dans `dist/` |
| `npm start` | Production : le serveur Node sert `dist/` et l'API |
| `npm test` | Tests unitaires (calculs financiers, évaluation des offres, import) |

## Modules

| Module | Contenu |
|---|---|
| **Portefeuille** | Tous les projets : budget, prévision, écart, avancement, santé, points d'attention |
| **Tableau de bord** | Indicateurs du projet, courbe en S (planifié vs facturé), alertes (retards, avenants, factures échues), lots et responsables, jalons |
| **Finances CFC** | Arborescence CFC (SN 506 500) : budget, engagé, avenants en attente, facturé, prévision, écart ; budget détaillé ; export Excel |
| **Appels d'offres** | Descriptif par positions **CAN** (saisie ou import CSV), comparatif des prix unitaires (prix le plus bas, écarts anormaux > 30 % vs médiane, positions non chiffrées), rabais / escompte, **évaluation multicritère** pondérée (notes 0–5, prix proportionnel), adjudication → création automatique du contrat |
| **Contrats & factures** | Contrats d'entreprise, mandats, fournitures ; avenants (demandé / approuvé / refusé) ; situations, régies, décompte final ; TVA ; retenue de garantie ; contrôle de dépassement |
| **Planning** | Gantt interactif (glisser pour décaler, étirer pour la durée), dépendances, jalons, retards détectés automatiquement |
| **Documents** | Registre documentaire (catégories, versions, liens) + navigateur **SharePoint** (parcourir, rechercher, téléverser, créer des dossiers, ajouter au registre) |
| **Ressources** | Équipe et rôles, plan de charge sur 12 mois (surcharges en rouge), affectations, **organisation des lots** et responsables |
| **Entreprises** | Carnet d'adresses, spécialités CFC (suggestions lors des AO), historique contrats / offres |
| **Assistant IA** | Panneau latéral (Ctrl J) : points de situation, analyse des écarts, comparaison d'offres, lettres d'adjudication, ordres du jour… |

Ergonomie : recherche globale et navigation clavier (**Ctrl K**), thème clair / sombre, filtre **« Mes lots uniquement »** pour les responsables de lot (le sélecteur d'utilisateur en haut à droite permet de tester les rôles).

### Règles de calcul (finances)

- **Montant actualisé** d'un contrat = montant initial + avenants approuvés.
- **Facturé** = factures contrôlées, approuvées ou payées (hors contestées).
- **Retenue de garantie** = taux du contrat × acomptes / situations validés (hors décompte final).
- **Prévision** (coût final probable) d'un code CFC : contrats + avenants en attente s'il y a un contrat ; sinon meilleure offre reçue ; sinon estimation de l'AO ; sinon budget.
- **Écart** = budget − prévision (négatif = dépassement).

Les lignes de budget et les contrats doivent utiliser le **même niveau de code CFC** (par ex. 461 des deux côtés) pour que la prévision remplace bien le budget.

## Assistant IA

Le serveur (`server/index.ts`) appelle l'API Claude d'Anthropic ; la clé reste côté serveur (`.env`), elle n'est jamais envoyée au navigateur. À chaque question, un résumé textuel du projet actif (finances CFC, contrats, avenants, factures à traiter, AO et classement des offres, planning, documents) est transmis au modèle. Si le filtre « Mes lots » est actif, seul le périmètre du responsable est transmis.

## SharePoint

1. Portail Azure → *Microsoft Entra ID → Inscriptions d'applications → Nouvelle inscription*.
2. Plateforme **Single-page application**, URI de redirection = adresse de la plateforme (ex. `http://localhost:5173`).
3. Autorisations déléguées Microsoft Graph : `Sites.ReadWrite.All`, `Files.ReadWrite.All` (consentement administrateur).
4. Dans Chantier+ → Paramètres : client ID, tenant ID, hôte (`entreprise.sharepoint.com`), chemin du site (`/sites/Projets`), dossier racine.
5. Sur chaque projet, le champ « Dossier SharePoint » désigne son sous-dossier.

## Import depuis l'ancienne application

Dans l'ancienne application : *Export → Session complète (JSON)*. Puis dans Chantier+ : Paramètres → « Importer une session ». Correspondances : lots d'estimation → budget (numéro de lot = code CFC), appels d'offres + offres → comparatif, commandes → contrats, offres complémentaires → avenants, factures → factures.

## Limites actuelles et suites possibles

- **Stockage local** : les données sont enregistrées dans le navigateur (export / restauration JSON dans les paramètres). Pour un usage à plusieurs, la prochaine étape est une base de données partagée (PostgreSQL, API) avec authentification Microsoft 365 et droits par rôle.
- **CAN** : seuls les numéros et titres de chapitres courants sont inclus (le contenu est sous licence CRB). Import des fichiers **SIA 451** à ajouter.
- **CFC** : extrait des groupes principaux ; compléter selon le référentiel utilisé (ou eCCC-Bât / eCCC-GC).
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
