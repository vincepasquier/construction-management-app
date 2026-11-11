# PRISM

Plateforme de pilotage, de reporting et de gestion intégrée des projets : un **socle groupe** valable pour
tout type de projet (numérique, investissement, organisation, construction) et une **verticale construction**
— l'ancien Chantier+ — activée selon le type de projet.

C'est une réécriture complète de `plateforme/` (Chantier+), qui reste dans le dépôt comme référence et
n'est pas modifiée. PRISM reste une **preuve de concept** : les données vivent dans le navigateur.

## Lancer

**Sans rien installer d'autre que Node.js** : ouvrir `pret-a-lancer/` et double-cliquer sur `LANCER.bat`
(voir `pret-a-lancer/LISEZ-MOI.txt`). L'application s'ouvre sur http://localhost:8787.

**Pour développer** :

```bash
cd prism
npm install
npm run dev        # application http://localhost:5173 + relais IA http://localhost:8787
```

| Commande | Rôle |
|---|---|
| `npm run typecheck` | Vérification TypeScript |
| `npm run lint` | ESLint |
| `npm test` | Tests (règles métier, dépôt de données, écrans clés) |
| `npm run build` | Compilation dans `dist/` |
| `npm run pret-a-lancer` | Régénère `pret-a-lancer/` (application compilée + serveur en un fichier) |

Ces quatre contrôles tournent à chaque envoi (`.github/workflows/prism.yml`).

Réglages du serveur, dans `.env` (modèle : `.env.example`) :

| Variable | Effet |
|---|---|
| `ANTHROPIC_API_KEY` | Active l'assistant IA. La clé reste sur le serveur local, jamais dans le navigateur. |
| `PRISM_MODELE` | Modèle de l'assistant ; par défaut `claude-opus-5-5`. |
| `PRISM_RESEAU=1` | Sert aussi l'application aux appareils du même réseau (téléphone sur le chantier). L'assistant reste réservé au poste ; chaque appareil garde ses propres données. |

## Ce que fait l'application

**Socle groupe**
- *Mon travail*, portefeuille (liste, tuiles, regroupements, vues enregistrées), fiche projet avec l'origine
  de chaque donnée (source, calcul, saisie), sous-projets, recherche globale (Ctrl+K).
- Finances en synthèse avec la source comptable (simulée) en regard, périodes financières commentées,
  scénarios d'atterrissage, consolidation sans double compte.
- Mandat de projet (trame du groupe, signatures, versions, export Word), passages de phase, rapports et
  indice de complétude, séances et procès-verbaux, registre des décisions, ComInv et conditions suivies.
- Risques enrichis, jalons, charge en jours-hommes et capacité, vues Finance / PMO / Direction / Conseil
  d'administration / Risques.
- Commentaires et mentions, notifications, circuits de validation séquentiels ou parallèles, délégations.
- Journal d'audit (ancienne et nouvelle valeur, motif), annulation de la dernière action, qualité des
  données, archivage en JSON ouvert avec empreinte et lecteur, configuration versionnée, gestion des accès.

**Verticale construction**
- Finances par position (budget, mutations, engagements, factures, prévisions, clôtures mensuelles),
  reprises du classeur de suivi financier et des exports de factures.
- Appels d'offres (descriptif CAN, fichiers CRBX / SIA 451, comparatif, évaluation), contrats et avenants,
  planning et phases SIA, autorisations et foncier.
- Suivi de chantier : journal, séances de chantier, constats avec photographies, réserves, réceptions et
  garanties, bons de régie, métrés contradictoires — utilisable au téléphone.
- Documents Word structurés selon la **SIA 118** : contrat d'entreprise ou de mandat, avenant,
  procès-verbal de réception (sans défaut, défauts mineurs, réception différée), situation mensuelle avec
  calcul de l'acompte, bon de régie, liste des réserves.

**Assistant IA** : répond à partir des données du projet ouvert, réduites à ce que l'utilisateur a le
droit de lire.

L'écran *Administration → Couverture PRISM* donne l'état de chacune des 181 exigences du cahier des
charges du groupe (réalisé, partiel, simulé, hors preuve de concept) et se télécharge en Excel.

## Architecture

```
src/domaine/     règles pures, sans React ni stockage — entièrement testées
  lib/, data/           métier construction repris de Chantier+ ; les calculs financiers et la lecture
                        SIA 451 sont identiques à l'original, ce qu'un test vérifie fichier par fichier
  socle/                droits, mandat, rapports, complétude, séances, périodes, planification, exigences
  types.ts, types-chantier.ts
src/donnees/     dépôt (seul point d'écriture), règles d'intégrité, journal, stockage IndexedDB,
                 sauvegarde, archive, notifications, recherche, reprise de Chantier+, connecteurs, demo/
src/app/         coquille, registre des modules, système de design, tableau et formulaire communs
src/modules/     un dossier par module (portefeuille, finances, mandat, chantier…)
src/outils/      écriture Word et Excel, téléchargements, empreintes, photographies
serveur/         relais vers l'API Anthropic et service de l'application compilée
```

Toute écriture passe par le **dépôt** : il vérifie le droit de l'utilisateur et les règles d'intégrité
(projet archivé, clôture figée, mandat signé, journée de chantier verrouillée, bon de régie validé, motif
obligatoire…), inscrit l'opération au journal d'audit avec l'ancienne et la nouvelle valeur, puis
n'enregistre dans IndexedDB que ce qui a changé. Les écrans ne s'abonnent qu'aux collections qu'ils lisent.

## Limites, dites clairement

- **Pas de serveur de données.** Les données sont dans le navigateur de chaque poste : pas de travail à
  plusieurs sur la même base, pas de partage entre l'ordinateur et le téléphone. La sauvegarde
  (*Administration → Sauvegarde*) est manuelle.
- **Droits non garantis.** L'utilisateur se choisit dans la barre du haut ; les droits sont appliqués par
  l'application, pas par un serveur. Ils montrent le fonctionnement, pas une sécurité.
- **Sources simulées.** Data Platform / Dynamics 365, Teams, courriel et signature électronique sont
  simulés derrière des interfaces remplaçables. SharePoint demande une inscription d'application.
- **Exploitation.** Authentification Entra ID, chiffrement, sauvegardes automatiques, supervision,
  environnements séparés et test d'intrusion relèvent de l'infrastructure du groupe.

## Références à la SIA 118

Les documents renvoient à la norme sans en reproduire le texte. Les numéros d'articles sont ceux de
l'édition 2013 et sont réunis dans `src/domaine/lib/sia118.ts` : c'est le seul fichier à corriger si une
référence doit changer. Ils ont été posés de mémoire et recoupés avec des sources publiques, pas avec le
texte de la norme ; une révision est entrée en vigueur en 2026. **À faire contrôler par une personne qui a
la norme en main avant tout usage réel.**

## Données

Les six directions de la démonstration sont celles du groupe (DG, DGC, DFI, DEN, DDE, DSE) ; les projets,
les personnes, les entreprises et les montants sont fictifs. Aucune donnée réelle n'est dans le dépôt. Au premier lancement, PRISM
propose de reprendre les données de Chantier+ présentes dans le navigateur, sans rien y effacer ; un
fichier de projet ou une sauvegarde Chantier+ s'importe aussi depuis *Administration → Sauvegarde*.
