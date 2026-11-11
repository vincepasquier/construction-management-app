// Couverture du cahier des charges PRISM du groupe par cette preuve de concept, exigence par
// exigence. Les intitulés sont reformulés ; les états disent ce qui est réellement là :
//   Réalisé  — la fonction existe et s'utilise dans l'application ;
//   Partiel  — une partie seulement est couverte (voir la remarque) ;
//   Simulé   — l'interface est en place, mais sur une source ou un canal factice, remplaçable ;
//   Hors preuve de concept — demande une infrastructure du groupe (serveur, annuaire, exploitation).
export type EtatExigence = "Réalisé" | "Partiel" | "Simulé" | "Hors preuve de concept";

export interface Exigence { code: string; titre: string; etat: EtatExigence; remarque: string }

export const FAMILLES: Record<string, string> = {
  PIL: "Pilotage et tableaux de bord", PRJ: "Fiche projet", FIN: "Finances", PAR: "Parties prenantes et accès", RIS: "Risques", MAN: "Mandat de projet",
  RAP: "Rapports et complétude", PLA: "Planification et ressources", DOC: "Documents", COM: "ComInv et décisions", COL: "Collaboration", REC: "Recherche",
  ARC: "Archivage", ADM: "Administration", DEV: "Développement et livraison", INT: "Interfaces", SEC: "Sécurité", EXP: "Exploitation", ERG: "Ergonomie", AUD: "Audit et qualité des données",
};

const R = "Réalisé", P = "Partiel", S = "Simulé", H = "Hors preuve de concept";
type Ligne = [string, string, EtatExigence, string];

const LIGNES: Ligne[] = [
  ["PIL-01", "Projets en liste et en tuiles, filtres, vues enregistrées", R, "Portefeuille"],
  ["PIL-02", "Ajouter un projet à partir de son numéro", S, "Portefeuille → Ajouter un projet ; la source de projets est simulée"],
  ["PIL-03", "Reprise automatique du projet et de ses sous-projets depuis la source", S, "Connecteur « Data Platform » simulé, remplaçable"],
  ["PIL-04", "Budget, réalisé, engagé, atterrissage, avancement, risques, jalons, statut", R, "Portefeuille et synthèse du projet"],
  ["PIL-05", "Regroupements par responsable, direction, portefeuille, programme, statut, année, type", R, "Portefeuille → regroupement"],
  ["PIL-06", "Alertes, validations, actions en retard, données manquantes", R, "Mon travail ; points d'attention du projet"],
  ["PIL-07", "Vues personnelles et partage contrôlé de vues", P, "Vues personnelles enregistrées ; le partage entre utilisateurs reste à faire"],
  ["PIL-08", "Export Excel et PDF dans le respect des droits", R, "Excel sur chaque tableau, PDF par impression ; chaque export est journalisé"],
  ["PIL-09", "Page de garde Finance", R, "Pilotage groupe → Finance"],
  ["PIL-10", "Vue PMO", R, "Pilotage groupe → PMO"],
  ["PIL-11", "Vue Directions et direction générale", R, "Pilotage groupe → Direction"],
  ["PIL-12", "Vue Conseil d'administration sur un ensemble de projets marqués", R, "Pilotage groupe → Conseil d'administration"],

  ["PRJ-01", "Fiche projet selon un modèle paramétrable, avec un minimum fixe", R, "Types de projet : modules, phases, champs obligatoires, champs propres"],
  ["PRJ-02", "Informations générales, responsable, direction, portefeuille, programme", R, "Fiche du projet"],
  ["PRJ-03", "Projets, sous-projets et relations parent-enfant", R, "Sous-projets consolidés sans double compte"],
  ["PRJ-04", "Origine de chaque champ : source, calcul ou saisie", R, "Pastilles d'origine sur la fiche et les indicateurs"],
  ["PRJ-05", "Saisie manuelle quand la donnée n'est pas synchronisée", R, "Correction locale d'un champ maître, avec motif, signalée à corriger à la source"],
  ["PRJ-06", "Statut, phase, priorité, classification, dates, jalons", R, "Fiche du projet ; Planification → Jalons"],
  ["PRJ-07", "Notes du responsable, du PMO et de la Finance / ComInv à visibilité distincte", R, "Synthèse → Notes de suivi par canal"],
  ["PRJ-08", "Données propres au type de projet, en sections configurables", R, "Champs propres au type"],
  ["PRJ-09", "Dupliquer la structure d'un projet ou partir d'un modèle", R, "Ajouter un projet → reprendre la structure d'un projet existant"],
  ["PRJ-10", "Synthèse en une page, lisible et imprimable", R, "Synthèse du projet"],

  ["FIN-01", "Budget initial, approuvé, réalisé, atterrissage", R, "Finances du projet"],
  ["FIN-02", "Synchronisation du budget et des coûts réels", S, "Source simulée ; journal des synchronisations"],
  ["FIN-03", "Historique des budgets, révisions et atterrissages", R, "Périodes financières, saisies d'atterrissage, journal"],
  ["FIN-04", "Atterrissage saisi et commenté quand la source n'en tient pas", R, "Finances → Atterrissage"],
  ["FIN-05", "Variations entre périodes, commentaire exigé au-delà d'un seuil", R, "Règle appliquée par le dépôt ; seuil dans la configuration"],
  ["FIN-06", "Suivi des factures : statut, montant, fournisseur, commande, échéances", R, "Factures du système comptable ; factures des contrats (construction)"],
  ["FIN-07", "Rapprochement des factures avec le budget et le système comptable", S, "Rapprochement calcul / source, sur des valeurs simulées"],
  ["FIN-08", "Détection des incohérences, doublons et dépassements", R, "Administration → Qualité des données"],
  ["FIN-09", "Consolidation par projet, programme, portefeuille, direction, année, compte analytique", P, "Tous les axes sauf le compte analytique"],
  ["FIN-10", "Page de reporting financier configurable par projet", P, "Rapport mensuel et périodes ; la mise en page n'est pas configurable"],
  ["FIN-11", "Informations et conditions financières du ComInv", R, "Registre des décisions : montant, conditions, suivi"],
  ["FIN-12", "Scénarios d'atterrissage et analyse pluriannuelle", R, "Finances → Scénarios ; budget et réalisé par année"],

  ["PAR-01", "Organisation du projet et organigramme", R, "Organisation"],
  ["PAR-02", "Parties prenantes internes et externes", R, "Organisation → Parties prenantes"],
  ["PAR-03", "Entreprises et fournisseurs", R, "Entreprises"],
  ["PAR-04", "Fiches de contact", R, "Entreprises → contacts ; annuaire du projet"],
  ["PAR-05", "Rôle et responsabilités de chaque partie prenante", R, "Parties prenantes"],
  ["PAR-06", "Droits par projet, page, module et type de donnée", R, "Gestion des accès ; contrôlés à chaque écriture, dans le navigateur"],
  ["PAR-07", "Partage d'un projet avec un utilisateur interne, selon un circuit contrôlé", R, "Demande d'accès, décidée par le responsable du projet"],
  ["PAR-08", "Accès invité externe", H, "Demande une validation sécurité et juridique, et une authentification réelle"],
  ["PAR-09", "Historique des modifications d'organisation et d'accès", R, "Journal d'audit"],

  ["RIS-01", "Risque ou opportunité : catégorie, cause, événement, conséquence", R, "Risques → Analyse"],
  ["RIS-02", "Probabilité et impacts financier, délai, qualité, sécurité, réputation", R, "Risques"],
  ["RIS-03", "Criticité brute et résiduelle selon une matrice paramétrable", R, "Seuils dans la configuration"],
  ["RIS-04", "Propriétaire, stratégie et mesures", R, "Risques"],
  ["RIS-05", "Responsable, échéance, coût et état des mesures", R, "Risques → Mesures"],
  ["RIS-06", "Matrice des risques et risques majeurs dans la fiche projet", R, "Risques ; synthèse du projet"],
  ["RIS-07", "Historique des revues et de la criticité", R, "Risques → Revues"],
  ["RIS-08", "Alerte sur les risques non revus et les mesures en retard", R, "Risques ; Qualité des données ; vue PMO"],
  ["RIS-09", "Consolidation des risques par programme, portefeuille et groupe", R, "Pilotage groupe → Risques"],
  ["RIS-10", "Lien entre l'exposition financière et le scénario d'atterrissage", R, "Hypothèses de scénario liées à un risque"],

  ["MAN-01", "Formulaire de mandat conforme au modèle du groupe", R, "Mandat et phases"],
  ["MAN-02", "Préremplissage depuis la fiche projet", R, "Parties, budget, risques, portefeuille"],
  ["MAN-03", "Objectifs, périmètre, livrables, budget, planning, risques, ressources", R, "Toutes les rubriques du modèle"],
  ["MAN-04", "Blocs de signature et rôles signataires", R, "Commanditaire, client, chef de projet ; signature simulée"],
  ["MAN-05", "Version imprimable PDF et Word", R, "Export Word ; PDF par impression"],
  ["MAN-06", "Conservation des versions soumises, signées et remplacées", R, "Versions ; mandat signé figé par une empreinte"],
  ["MAN-07", "Décisions de passage de phase, conditions et réserves", R, "Mandat et phases → Phases"],
  ["MAN-08", "Notification et relance des signataires", S, "Notifications dans l'application ; Teams et courriel simulés"],

  ["RAP-01", "Rapport de phase à partir d'un modèle paramétrable", P, "Trame de rubriques fixe, non paramétrable"],
  ["RAP-02", "Rapport de clôture", R, "Rapports"],
  ["RAP-03", "Rédaction dans l'application ou dépôt d'un document existant", R, "Rapports"],
  ["RAP-04", "Indicateurs du projet extraits automatiquement", R, "Rubriques préremplies ; indicateurs figés à la soumission"],
  ["RAP-05", "Revue et validation des rapports", R, "Brouillon → en revue → validé ou refusé"],
  ["RAP-06", "Versions et décision associée", R, "Rapports"],
  ["RAP-07", "Indice de complétude sur des critères transparents et paramétrables", R, "Critères et poids dans la configuration ; chaque critère est expliqué"],
  ["RAP-08", "Complétude documentaire, qualité des données, performance et objectifs distingués", R, "Deux axes de complétude ; santé financière et appréciation à part"],
  ["RAP-09", "Appréciation qualitative motivée d'un responsable autorisé", R, "Rapports → Appréciation"],
  ["RAP-10", "Pas d'usage automatique de l'indice comme évaluation individuelle", R, "L'indice porte sur le projet ; l'appréciation est saisie, jamais calculée"],

  ["PLA-01", "Jalons, dates prévues et réelles, dépendances, responsables", R, "Planification → Planning et Jalons"],
  ["PLA-02", "Chronologie et signalement des retards", R, "Planning ; synthèse ; Mon travail"],
  ["PLA-03", "Microsoft Planner en capsule ou en lien", P, "Import d'un export Planner et lien vers le plan"],
  ["PLA-04", "Synchronisation des statuts de tâches avec Planner", H, "Demande un accès à Microsoft Graph"],
  ["PLA-05", "Jours-hommes par projet, phase, direction et compétence", R, "Planification → Charge"],
  ["PLA-06", "Demande de capacité consolidée", R, "Ressources → Capacité des directions"],
  ["PLA-07", "Demande comparée au potentiel disponible", R, "Capacité saisie par direction et par année"],
  ["PLA-08", "Surcharges et conflits affichés, sans affectation automatique", R, "Taux de charge ; aucune affectation n'est déduite"],
  ["PLA-09", "Import et export d'un planning", P, "Import Planner ; export Excel des jalons"],

  ["DOC-01", "SharePoint dans le contexte du projet", P, "Navigateur SharePoint, dès qu'une inscription d'application est renseignée"],
  ["DOC-02", "Création ou association automatique de l'espace documentaire", H, "Demande des droits d'administration SharePoint"],
  ["DOC-03", "Arborescence et métadonnées paramétrables", P, "Catégories fixes ; métadonnées libres par document"],
  ["DOC-04", "Accès au document et à sa version courante depuis un objet", R, "Registre des documents ; liens depuis les validations et les rapports"],
  ["DOC-05", "Liens vers mandats, rapports, décisions et pièces financières", P, "Liens saisis ; pas de classement automatique"],
  ["DOC-06", "Respect des versions, droits et rétention de SharePoint", R, "PRISM ne copie aucun document : il garde leurs liens"],
  ["DOC-07", "Métadonnées indexées dans la recherche globale", R, "Recherche → Documents"],
  ["DOC-08", "Prévisualisation sans téléchargement", H, "Non traité"],

  ["COM-01", "Page ComInv par projet", R, "Projet → Décisions"],
  ["COM-02", "Ordre du jour à partir des projets candidats", R, "Séance → projets candidats"],
  ["COM-03", "Notes de séance reliées aux projets", R, "Points de séance par projet"],
  ["COM-04", "Décision, date, organe, montant, conditions, responsables, échéances", R, "Registre des décisions"],
  ["COM-05", "Notes de travail distinguées des décisions approuvées", R, "Statut « note de travail »"],
  ["COM-06", "Relevé de décisions imprimable", R, "Procès-verbal Word"],
  ["COM-07", "Suivi des conditions et des actions décidées", R, "Conditions à lever ; tâches créées depuis la séance"],
  ["COM-08", "Accès restreint aux notes et décisions sensibles", R, "Diffusion restreinte, respectée dans la recherche"],

  ["COL-01", "Commentaires sur un projet ou un objet", R, "Projet, risque, contrat, rapport, mandat"],
  ["COL-02", "Auteur, date et modifications d'un commentaire", R, "Versions précédentes conservées"],
  ["COL-03", "Mentions et notification de l'action attendue", R, "@Prénom Nom"],
  ["COL-04", "Notifications configurables par événement, rôle et fréquence", P, "Par événement et par canal ; ni par rôle ni par fréquence"],
  ["COL-05", "Notifications Teams et courriel sans donnée sensible", S, "Canaux simulés : on voit ce qui partirait, sans contenu"],
  ["COL-06", "Validations séquentielles ou parallèles", R, "Validations"],
  ["COL-07", "Délégations en cas d'absence", R, "Cloche → Réglages"],
  ["COL-08", "Validations et actions en attente de chacun", R, "Mon travail"],

  ["REC-01", "Recherche sur projets, documents, risques, décisions, notes, contacts", R, "Ctrl + K"],
  ["REC-02", "Filtres par type, responsable, direction, programme, période, statut", R, "Recherche → Filtres"],
  ["REC-03", "Droits respectés dans les résultats, extraits et suggestions", R, "L'index ne contient que ce que l'utilisateur peut voir"],
  ["REC-04", "Origine, contexte et date du résultat", R, "Type, projet, statut et date"],
  ["REC-05", "Recherches enregistrées", R, "Recherche"],
  ["REC-06", "Recherche sémantique", H, "Recherche par mots ; l'assistant IA répond sur le projet ouvert"],

  ["ARC-01", "Archive dans un format texte ouvert et documenté", R, "JSON, décrit dans le fichier"],
  ["ARC-02", "Identifiants, relations, historique, métadonnées et manifeste", R, "Archives"],
  ["ARC-03", "Empreinte et journal de l'archivage", R, "SHA-256 ; opération journalisée"],
  ["ARC-04", "Documents conservés selon SharePoint, sans duplication", R, "L'archive garde les liens"],
  ["ARC-05", "Lecteur intégré en lecture seule", R, "Archives → Consulter"],
  ["ARC-06", "Recherche dans les archives selon les droits", R, "Archives"],
  ["ARC-07", "Test périodique de la restaurabilité", P, "Contrôle à la demande, daté au registre ; pas de planification automatique"],
  ["ARC-08", "Durées de conservation et règles de suppression", R, "Élimination possible seulement après la durée fixée"],

  ["ADM-01", "Droits par rôle, page, module, projet, direction, confidentialité", R, "Gestion des accès"],
  ["ADM-02", "Créer ou désactiver des pages", P, "Modules activés ou non par type de projet"],
  ["ADM-03", "Libellés, sections, ordre des champs, règles de visibilité", P, "Champs propres au type ; les libellés ne sont pas administrables"],
  ["ADM-04", "Types de projet, portefeuilles, programmes, statuts, matrices, modèles", P, "Tout sauf les statuts et les modèles de documents"],
  ["ADM-05", "Champs obligatoires selon le type et la phase", P, "Par type ; le réglage par phase existe dans le modèle, pas à l'écran"],
  ["ADM-06", "Circuits de validation et seuils de compétence", R, "Configuration → Circuits"],
  ["ADM-07", "Prévisualiser et tester avant publication", P, "Effet du brouillon mesuré sur les projets ; pas d'environnement de test"],
  ["ADM-08", "Configurations versionnées et retour arrière", R, "Configuration → Versions"],
  ["ADM-09", "Traçabilité des actions d'administration", R, "Journal d'audit"],
  ["ADM-10", "Configuration déléguée aux administrateurs fonctionnels", R, "Profil PMO"],

  ["DEV-01", "Code source dans un dépôt du groupe", P, "Dépôt Git avec historique ; pas encore celui du groupe"],
  ["DEV-02", "Comparaison d'une version candidate et journal des changements", H, ""],
  ["DEV-03", "Tests et contrôles automatiques", P, "Typage, règles de code, tests et construction à chaque envoi ; pas de contrôle de sécurité"],
  ["DEV-04", "Déploiement de paquets signés", H, ""],
  ["DEV-05", "Environnements séparés", H, ""],
  ["DEV-06", "Migrations de données versionnées et réversibles", P, "Reprise des données Chantier+ ; migrations non réversibles"],
  ["DEV-07", "Retour arrière documenté", H, ""],
  ["DEV-08", "Catalogue des versions et notes de publication", P, "Notes de version dans l'administration"],
  ["DEV-09", "Aucun script utilisateur en production", R, "L'application n'exécute aucun script importé"],

  ["INT-01", "Interfaces documentées", P, "Administration → Connecteurs"],
  ["INT-02", "API ou flux gouvernés", S, "Une seule interface vers la source, sans accès direct"],
  ["INT-03", "Mode dégradé pendant une indisponibilité", R, "L'application fonctionne sans la source"],
  ["INT-04", "Fraîcheur des données synchronisées", R, "Affichée sur chaque projet"],
  ["INT-05", "Volumes, durées, erreurs et reprises", R, "Journal des synchronisations"],
  ["INT-06", "Relance idempotente", R, "Synchroniser deux fois ne change rien"],
  ["INT-07", "Correspondance des identifiants", R, "Numéro du projet dans la source"],
  ["INT-08", "Connecteurs isolés", R, "Interface « source de projets » remplaçable"],

  ["SEC-01", "Authentification Entra ID et MFA", S, "L'utilisateur se choisit dans la barre du haut"],
  ["SEC-02", "Autorisations vérifiées côté serveur", H, "Pas de serveur de données : les droits sont vérifiés dans le navigateur"],
  ["SEC-03", "Moindre privilège", P, "Profils et périmètres appliqués, sans valeur de sécurité tant que les données sont locales"],
  ["SEC-04", "Chiffrement en transit et au repos", H, ""],
  ["SEC-05", "Journal des accès, exports, modifications, décisions, administration", P, "Tout sauf les simples consultations"],
  ["SEC-06", "Secrets dans un coffre-fort", P, "La clé de l'assistant IA reste sur le serveur local"],
  ["SEC-07", "Classification des données et conservation", P, "Niveau de confidentialité des projets ; conservation des archives"],
  ["SEC-08", "Protection des données (LPD)", H, "À instruire avec le groupe"],
  ["SEC-09", "Revue d'architecture, analyse de risques, test d'intrusion", H, ""],
  ["SEC-10", "Exports sensibles marqués et tracés", P, "Tracés au journal ; pas de marquage"],

  ["EXP-01", "Fiche projet en moins de deux secondes", P, "Affichage immédiat en local ; non mesuré en conditions réelles"],
  ["EXP-02", "Disponibilité cible et fenêtres de maintenance", H, ""],
  ["EXP-03", "Volumétrie validée", H, ""],
  ["EXP-04", "Sauvegarde et restauration à un instant donné", P, "Sauvegarde et restauration manuelles de toute la base"],
  ["EXP-05", "RPO et RTO", H, ""],
  ["EXP-06", "Supervision", H, ""],
  ["EXP-07", "Journaux corrélés et procédure de diagnostic", H, ""],
  ["EXP-08", "Support et niveaux de service", H, ""],
  ["EXP-09", "Test annuel de continuité et de restauration", H, ""],

  ["ERG-01", "État d'un projet en une page", R, "Synthèse du projet"],
  ["ERG-02", "Écrans adaptés au rôle", R, "Navigation et vues selon le profil et le type de projet"],
  ["ERG-03", "Saisie rapide, copier-coller, modifications de masse", P, "Saisie en ligne et collage depuis Excel ; pas de modification de masse"],
  ["ERG-04", "Interface utilisable sur ordinateur, tablette et téléphone", P, "Toute l'application s'affiche au téléphone ; le suivi de chantier y est pensé pour la saisie sur place ; les grands tableaux restent faits pour l'ordinateur"],
  ["ERG-05", "Accessibilité (WCAG 2.1 AA)", P, "Clavier, libellés, contrastes ; non audité"],
  ["ERG-06", "Exports PDF, Word et Excel soignés", R, "Mandat, rapports, procès-verbaux, tableaux"],
  ["ERG-07", "Aide contextuelle et exemples", P, "Aides sous les champs et écrans vides explicatifs"],
  ["ERG-08", "Français et allemand, libellés administrables", H, "Français seulement"],
  ["ERG-09", "Confirmations et conséquences avant les actions sensibles", R, "Confirmation dans la page, motif exigé, annulation"],

  ["AUD-01", "Historique des changements", R, "Journal d'audit"],
  ["AUD-02", "Qui a modifié quoi, quand, depuis quelle source", R, "Auteur, date, origine"],
  ["AUD-03", "Ancienne et nouvelle valeur", R, "Détail de chaque entrée"],
  ["AUD-04", "Motif exigé pour les modifications sensibles", R, "Suppressions financières, corrections locales, désarchivage"],
  ["AUD-05", "Contrôles de complétude, cohérence, unicité et fraîcheur", R, "Qualité des données"],
  ["AUD-06", "Tableau de qualité par domaine et par propriétaire", R, "Qualité des données"],
  ["AUD-07", "Export d'audit selon les droits", R, "Journal → Excel"],
  ["AUD-08", "Correction à la source plutôt que dans PRISM", R, "Corrections locales signalées « à corriger dans le système source »"],
];

const SANS_REMARQUE = "Demande l'infrastructure du groupe (hébergement, exploitation, chaîne de livraison)";
export const EXIGENCES: Exigence[] = LIGNES.map(([code, titre, etat, remarque]) => ({ code, titre, etat, remarque: remarque || (etat === H ? SANS_REMARQUE : "") }));

/**
 * Fonctions de la verticale construction (périmètre de Chantier+), hors du cahier des charges du
 * groupe : même vocabulaire d'états, pour que la couverture se lise d'un seul tenant.
 */
export const VERTICALE_CONSTRUCTION: { fonction: string; etat: EtatExigence; remarque: string }[] = [
  { fonction: "Finances par position : budget, mutations, engagements, factures, prévisions", etat: R, remarque: "Finances du projet ; calcul identique à celui de Chantier+, vérifié par un test de parité" },
  { fonction: "Clôtures mensuelles et rapport mensuel", etat: R, remarque: "Finances → Clôtures ; la clôture est une photo figée" },
  { fonction: "Reprise du classeur de suivi financier et des exports de factures", etat: R, remarque: "Par fichier, avec contrôle des totaux avant import" },
  { fonction: "Appels d'offres : descriptif, fichiers CRBX (SIA 451), comparatif, évaluation", etat: R, remarque: "Appels d'offres ; les soumissions restent établies dans le logiciel de devis" },
  { fonction: "Contrats, avenants, factures, retenues de garantie", etat: R, remarque: "Contrats et factures" },
  { fonction: "Documents de contrat structurés selon la SIA 118 : contrat, avenant, procès-verbal de réception, situation et acompte, bon de régie", etat: R, remarque: "Word, depuis le contrat et le suivi de chantier ; les renvois d'articles sont ceux de l'édition 2013, réunis dans un seul fichier, et restent à contrôler avec l'édition applicable au contrat" },
  { fonction: "Planning, phases SIA, lots", etat: R, remarque: "Planification" },
  { fonction: "Autorisations, servitudes et emprises", etat: R, remarque: "Autorisations et foncier" },
  { fonction: "Journal de chantier", etat: R, remarque: "Suivi de chantier → Journal ; verrouillage après une semaine" },
  { fonction: "Séances de chantier et procès-verbaux", etat: R, remarque: "Suivi de chantier → Séances et PV ; points repris de séance en séance, export Word" },
  { fonction: "Constats avec photographies", etat: R, remarque: "Suivi de chantier → Constats ; suites en réserve, tâche ou risque" },
  { fonction: "Réserves, réceptions et garanties", etat: R, remarque: "Suivi de chantier → Réserves et réceptions ; délais SIA 118 proposés" },
  { fonction: "Bons de régie", etat: R, remarque: "Suivi de chantier → Régies ; validation contradictoire" },
  { fonction: "Métrés contradictoires et situation mensuelle", etat: R, remarque: "Suivi de chantier → Métrés ; positions et prix de l'offre retenue" },
  { fonction: "Saisie sur place, au téléphone", etat: P, remarque: "Constat, réserve et journal en quelques gestes, avec l'appareil photo ; pas de saisie hors réseau, et les données restent sur l'appareil qui les a saisies" },
  { fonction: "Photographies", etat: P, remarque: "Réduites et rangées dans le navigateur, comprises dans la sauvegarde ; pas de stockage partagé ni d'insertion dans les documents Word" },
  { fonction: "Repérage sur plan et signature sur l'écran", etat: H, remarque: "Non traité : localisation en texte, documents Word à signer" },
];
export const ETATS: EtatExigence[] = [R, P, S, H];
export const familleDe = (code: string) => code.split("-")[0];

export function bilanExigences(liste: Exigence[] = EXIGENCES): Record<EtatExigence, number> & { total: number } {
  const b = { "Réalisé": 0, Partiel: 0, "Simulé": 0, "Hors preuve de concept": 0, total: liste.length };
  for (const e of liste) b[e.etat]++;
  return b;
}
