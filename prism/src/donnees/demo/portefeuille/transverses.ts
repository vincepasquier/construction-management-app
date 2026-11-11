// Directions Finance et Informatique, Gouvernance et communication, Direction Générale : un projet
// numérique, un projet de communication et un projet de stratégie. Sans chantier, mais complets :
// mandat, finances, risques, planning, comité de pilotage, décisions, documents. Projets fictifs.
import type { FicheProjet } from "./types";

/** DFI — remplacement du système de facturation : en réalisation, sous tension sur les délais */
export const FACTURATION: FicheProjet = {
  numero: "DFI-2025-0140", cle: "fac", chef: "pf-dubois",
  complements: { phaseGroupe: "Réalisation", sponsorId: "pf-dir-dfi", portefeuilleId: "pf-num", programmeId: "pg-donnees", priorite: "Haute", classification: "Métier", strategique: true, confidentialite: "Interne", donneesType: { application: "Facturation de l'énergie et relation clients" } },
  equipe: [["pf-dubois", 80], ["pf-fin", 20], ["pf-wicht", 10]],
  mandat: {
    contenu: {
      motifs: { croissance: false, efficience: true, maintenance: true, legal: true },
      contexte: "Le système de facturation de l'énergie, en service depuis 2009, n'est plus maintenu par son éditeur après 2027. Il ne sait pas facturer les regroupements pour la consommation propre ni les tarifs dynamiques exigés par la nouvelle législation sur l'approvisionnement en électricité.",
      benefices: "Conformité aux nouvelles exigences légales, facturation mensuelle possible pour 140'000 clients, délai de mise en place d'un nouveau tarif ramené de trois mois à deux semaines.",
      perimetre: "Choix et paramétrage d'une solution du marché, reprise des données de 140'000 clients, interfaces avec les compteurs intelligents, la comptabilité et le portail clients, formation de 60 utilisateurs.",
      exclusions: "Le portail clients et l'application mobile font l'objet d'un projet distinct.",
      impactsEnvironnementaux: "Aucun",
      impactsSociaux: "Les métiers de la facturation évoluent : accompagnement au changement et formation sur six mois.",
      projetsConnexes: "Déploiement des compteurs intelligents (DDE) ; contracting et regroupements de consommation (DSE).",
      composanteIT: true, descriptionIT: "Solution standard hébergée chez l'éditeur ; architecture, sécurité et interfaces validées par le comité d'architecture.",
    },
    objectifs: [["Mettre la nouvelle facturation en service avant la fin de la maintenance de l'ancien système", "Première facturation complète sur le nouveau système", "Sponsor"], ["Reprendre les données sans perte", "Écart de reprise inférieur à 0,1 % des contrats", "Finance"], ["Tenir le budget", "Coût final inférieur ou égal à 4,2 millions", "Finance"]],
  },
  risques: [
    ["Qualité des données de l'ancien système", "Technique", 4, 4, 180_000, "9 % des contrats ont une adresse de facturation ou un point de mesure incohérent.", "Nettoyage par lots avant chaque répétition de reprise ; règles de correction validées par le métier.", "Réduire"],
    ["Interface avec les compteurs intelligents en retard", "Délais", 3, 4, 120_000, "La plateforme de données de mesure livre son interface avec deux mois de retard.", "Démarrage avec l'ancien flux de relève, bascule de l'interface après la mise en service.", "Réduire"],
    ["Surcharge des équipes de facturation pendant la bascule", "Organisation", 3, 3, 0, "La bascule tombe pendant la facturation de fin d'année.", "Renfort temporaire de trois personnes ; bascule décalée après la clôture de janvier.", "Réduire"],
    ["Évolution de la législation en cours de projet", "Juridique", 2, 3, 60_000, "Les ordonnances d'application ne sont pas toutes publiées.", "Veille du service juridique ; paramétrage plutôt que développement spécifique.", "Accepter"],
  ],
  planning: [["Choix de la solution et contrat", -420, -300, 100], ["Conception et paramétrage", -300, -90, 100], ["Reprise des données : répétitions 1 et 2", -150, -20, 100], ["Interfaces", -200, 40, 70], ["Tests d'acceptation par le métier", -30, 60, 35], ["Formation des utilisateurs", 20, 90, 0], ["Bascule et première facturation", 95, 130, 0]],
  jalons: [["Signature du contrat avec l'éditeur", -300], ["Validation en comité d'architecture", -240], ["Deuxième répétition de reprise réussie", -20, 25], ["Fin des tests d'acceptation", 60, 30], ["Bascule", 95, 30], ["Première facturation complète", 130, 30]],
  actions: [["Valider les règles de correction des adresses avec le métier", 8, "Haute", "En cours"], ["Planifier la troisième répétition de reprise", 20, "Haute"], ["Recruter les trois renforts temporaires", 25, "Normale", "En cours", "pf-fin"], ["Analyser les ordonnances publiées", 30, "Normale", "À faire", "pf-wicht"]],
  documents: [["Cahier des charges de la solution", "Autre", "C", 430], ["Contrat avec l'éditeur", "Contrats", "1", 300], ["Dossier d'architecture", "Rapports", "B", 240], ["Rapport de la deuxième répétition de reprise", "Rapports", "1", 18], ["Plan de bascule", "Autre", "0.8", 6]],
  pilotage: [
    { ilYA: 45, lieu: "Siège, salle Informatique 2", invites: [["L. Zbinden", "Éditeur de la solution"]], points: [
      { titre: "Avancement", texte: "Paramétrage terminé. Première répétition de reprise : 2,3 % d'écarts.", clos: true },
      { titre: "Report de la bascule", texte: "La bascule est reportée d'un mois, après la clôture de janvier, pour ne pas charger la facturation de fin d'année.", nature: "Décision", statut: "Approuvée", clos: true },
      { titre: "Renfort temporaire", texte: "Trois personnes pendant quatre mois, financées par la réserve du projet.", nature: "Décision", montant: 96_000, statut: "Approuvée", clos: true },
    ] },
    { ilYA: 10, lieu: "Siège, salle Informatique 2", invites: [["L. Zbinden", "Éditeur de la solution"]], points: [
      { titre: "Deuxième répétition de reprise", texte: "0,4 % d'écarts, concentrés sur les adresses de facturation. Une troisième répétition est nécessaire.", clos: true },
      { titre: "Interface avec les compteurs intelligents", texte: "Le comité accepte un démarrage avec l'ancien flux de relève ; l'interface suit dans les trois mois.", nature: "Décision", statut: "Approuvée", condition: "Aucun client des regroupements de consommation facturé à tort" },
      { titre: "Crédit complémentaire", texte: "Une demande de 180'000 CHF pour le nettoyage des données est préparée pour le comité d'investissement.", nature: "Décision", montant: 180_000, statut: "Reportée" },
      { titre: "Règles de correction des adresses", texte: "À valider par le métier avant la troisième répétition.", nature: "Tâche", dans: 8 },
    ] },
  ],
  notes: [["Responsable de projet", "L'éditeur confirme la disponibilité de son équipe pour la troisième répétition.", "chef", 4], ["Finance / ComInv", "Atterrissage supérieur au budget approuvé si le crédit complémentaire est accordé : à présenter avec le scénario défavorable.", "pf-fin", 8]],
};

/** DGC — rapport de durabilité et site institutionnel : en réalisation, proche de la publication */
export const DURABILITE: FicheProjet = {
  numero: "DGC-2026-0031", cle: "dur", chef: "pf-crettaz",
  complements: { phaseGroupe: "Réalisation", sponsorId: "pf-dir-dgc", portefeuilleId: "pf-org", priorite: "Normale", classification: "Réglementaire", donneesType: { processus: "Communication institutionnelle et rapport annuel" } },
  equipe: [["pf-crettaz", 50], ["pf-wicht", 15], ["pf-fin", 5]],
  mandat: {
    contenu: {
      motifs: { croissance: false, efficience: false, maintenance: false, legal: true },
      contexte: "Le groupe devra publier un rapport sur les questions non financières. Il n'a aujourd'hui ni inventaire de ses émissions ni indicateurs consolidés, et son site institutionnel, vieux de dix ans, ne permet pas de publier un tel rapport de façon lisible.",
      benefices: "Obligation légale remplie dès la première année, indicateurs de durabilité consolidés et réutilisables, site institutionnel accessible et à jour.",
      perimetre: "Analyse de matérialité, collecte des indicateurs dans les six directions, rédaction et vérification du rapport, refonte du site institutionnel qui le publie.",
      exclusions: "La stratégie climatique et ses objectifs chiffrés relèvent du projet Stratégie 2035.",
      impactsEnvironnementaux: "Le projet mesure les impacts du groupe ; il n'en crée pas.",
      impactsSociaux: "Chaque direction désigne un correspondant pour la collecte, à raison d'un jour par mois.",
      projetsConnexes: "Stratégie 2035 – feuille de route du groupe.",
    },
    objectifs: [["Publier le premier rapport de durabilité à la date légale", "Rapport approuvé par le conseil d'administration et publié", "Sponsor"], ["Disposer d'indicateurs fiables", "Indicateurs vérifiés par un tiers pour le périmètre retenu", "Direction Gouvernance et communication"], ["Mettre en ligne le nouveau site", "Site en ligne le jour de la publication du rapport", "Sponsor"]],
  },
  risques: [
    ["Données extra-financières incomplètes dans les directions", "Organisation", 4, 3, 0, "Les indicateurs d'émissions et de consommation d'eau manquent pour deux directions.", "Périmètre du premier rapport limité aux indicateurs disponibles ; plan de collecte pour l'édition suivante.", "Réduire"],
    ["Retard de l'agence sur la refonte du site", "Délais", 3, 3, 15_000, "Les maquettes ont été livrées avec trois semaines de retard.", "Jalons de paiement liés aux livraisons ; mise en ligne possible en deux temps.", "Réduire"],
    ["Exigences de publication modifiées en cours de route", "Juridique", 2, 3, 0, "Le cadre de référence retenu est en révision.", "Veille assurée par le service juridique ; structure du rapport compatible avec les deux versions.", "Accepter"],
    ["Critique publique sur un indicateur défavorable", "Tiers", 2, 3, 0, "Les émissions liées au gaz distribué pèsent lourd dans le bilan.", "Message préparé avec la direction générale ; trajectoire de réduction renvoyée à la Stratégie 2035.", "Accepter"],
  ],
  planning: [["Analyse de matérialité", -200, -125, 100], ["Collecte des indicateurs", -120, -9, 100], ["Rédaction du rapport", -40, 55, 45], ["Vérification par un tiers", 30, 60, 0], ["Conception et réalisation du site", -90, 78, 50], ["Approbation et publication", 60, 78, 0]],
  jalons: [["Analyse de matérialité validée", -125], ["Collecte des indicateurs close", -9, 24], ["Maquettes du site validées", 12, 21], ["Rapport approuvé par le conseil d'administration", 70], ["Publication du rapport", 76], ["Mise en ligne du nouveau site", 78]],
  actions: [["Relancer la DEN et la DDE pour les indicateurs manquants", 5, "Haute", "En cours"], ["Faire relire le rapport par le service juridique", 40, "Normale", "À faire", "pf-wicht"], ["Valider les maquettes du site", 12, "Normale"], ["Préparer le message sur les émissions du gaz distribué", 30, "Normale"]],
  documents: [["Analyse de matérialité", "Rapports", "B", 125], ["Tableau des indicateurs de durabilité", "Autre", "D", 9], ["Charte éditoriale du site institutionnel", "Autre", "A", 55], ["Contrat de l'agence de communication", "Contrats", "A", 150], ["Rapport de durabilité, version de travail", "Rapports", "0.5", 7]],
  pilotage: [
    { ilYA: 50, lieu: "Siège, salle du conseil", points: [
      { titre: "Analyse de matérialité", texte: "Onze thèmes retenus, dont le climat, la sécurité d'approvisionnement et la sécurité au travail.", clos: true },
      { titre: "Choix de l'agence", texte: "L'agence est retenue pour la refonte du site, sur trois offres.", nature: "Décision", montant: 86_000, statut: "Approuvée", clos: true },
    ] },
    { ilYA: 8, lieu: "Siège, salle du conseil", invites: [["S. Fellay", "Agence de communication"]], points: [
      { titre: "État de la collecte", texte: "La collecte est close avec trois semaines de retard ; deux séries d'indicateurs restent incomplètes.", clos: true },
      { titre: "Périmètre du premier rapport", texte: "Le premier rapport se limite aux indicateurs disponibles et annonce le plan de collecte des autres.", nature: "Décision", statut: "Approuvée", clos: true },
      { titre: "Indicateurs manquants", texte: "La DEN et la DDE fournissent leurs séries pour l'édition suivante.", nature: "Tâche", dans: 5 },
      { titre: "Maquettes du site", texte: "Validation attendue pour tenir la mise en ligne en même temps que la publication du rapport.", nature: "Tâche", dans: 12 },
    ] },
  ],
  notes: [["Responsable de projet", "L'agence propose une mise en ligne en deux temps si les maquettes ne sont pas validées à la date prévue.", "chef", 3]],
};

/** DG — stratégie à dix ans : à l'étude, avant la présentation au conseil d'administration */
export const STRATEGIE: FicheProjet = {
  numero: "DG-2026-0002", cle: "str", chef: "pf-savioz",
  complements: { phaseGroupe: "Étude du projet", sponsorId: "pf-dg", portefeuilleId: "pf-org", priorite: "Haute", classification: "Stratégique", strategique: true, suiviCA: true, confidentialite: "Confidentiel", donneesType: { processus: "Planification stratégique" } },
  equipe: [["pf-savioz", 30], ["pf-fin", 15], ["pf-pmo", 10]],
  mandat: {
    contenu: {
      motifs: { croissance: true, efficience: true, maintenance: false, legal: false },
      contexte: "La stratégie actuelle du groupe court jusqu'en 2027. La sortie des énergies fossiles, l'électrification et la production décentralisée changent les métiers de chaque direction ; le conseil d'administration demande une stratégie à dix ans et une feuille de route chiffrée.",
      benefices: "Priorités d'investissement claires pour dix ans, arbitrages entre directions tranchés, cadre commun pour les projets du portefeuille.",
      perimetre: "Diagnostic, ateliers avec les six directions, choix des axes stratégiques, feuille de route chiffrée, présentation au conseil d'administration.",
      exclusions: "La mise en œuvre de chaque axe fera l'objet de projets propres, inscrits au portefeuille.",
      impactsEnvironnementaux: "La stratégie fixe la trajectoire climatique du groupe.",
      impactsSociaux: "Évolution des métiers et des compétences : volet ressources humaines dans la feuille de route.",
      projetsConnexes: "Rapport de durabilité ; refonte du processus d'investissement.",
    },
    objectifs: [["Faire approuver la stratégie par le conseil d'administration", "Stratégie et feuille de route approuvées", "Sponsor"], ["Chiffrer les investissements à dix ans", "Enveloppe par axe et par direction, validée par la finance", "Finance"], ["Associer les cadres", "Les six directions ont tenu leurs ateliers", "Sponsor"]],
  },
  risques: [
    ["Arbitrages entre directions non tranchés à temps", "Organisation", 3, 4, 0, "Les priorités d'investissement de trois directions dépassent ensemble l'enveloppe à dix ans.", "Séance d'arbitrage de la direction générale avant le chiffrage final.", "Réduire"],
    ["Hypothèses de prix de l'énergie trop incertaines", "Financier", 3, 3, 0, "Les scénarios de prix divergent fortement au-delà de cinq ans.", "Trois scénarios chiffrés ; feuille de route révisée tous les deux ans.", "Accepter"],
    ["Mobilisation insuffisante des cadres", "Organisation", 2, 3, 0, "La charge courante limite la participation aux ateliers.", "Ateliers d'une demi-journée, calendrier fixé avec les directeurs.", "Réduire"],
    ["Fuite d'informations sensibles avant la décision", "Organisation", 2, 4, 0, "La feuille de route contient des hypothèses d'acquisition.", "Diffusion restreinte, documents de travail numérotés, projet classé confidentiel.", "Réduire"],
  ],
  planning: [["Diagnostic", -240, -145, 100], ["Ateliers par direction", -140, -40, 100], ["Chiffrage de la feuille de route", -30, 19, 60], ["Arbitrage de la direction générale", 10, 25, 0], ["Rédaction et validation", 5, 37, 10]],
  jalons: [["Diagnostic partagé avec les directions", -145], ["Séminaire stratégique de la direction", -32], ["Feuille de route chiffrée", 19, 14], ["Arbitrage de la direction générale", 25, 14], ["Présentation au conseil d'administration", 37]],
  actions: [["Chiffrer les investissements de l'axe chaleur renouvelable", 10, "Haute", "En cours", "pf-fin"], ["Préparer la séance d'arbitrage", 18, "Haute"], ["Préparer le dossier du conseil d'administration", 25, "Haute"], ["Rédiger le volet ressources humaines", 22, "Normale"]],
  documents: [["Diagnostic stratégique", "Rapports", "B", 145], ["Compte rendu du séminaire de la direction", "PV de séance", "A", 30], ["Feuille de route, version de travail", "Rapports", "0.6", 5], ["Scénarios de prix de l'énergie", "Rapports", "A", 60]],
  pilotage: [
    { ilYA: 60, lieu: "Salle de direction", points: [
      { titre: "Diagnostic", texte: "Diagnostic partagé avec les six directions ; trois ruptures identifiées : chaleur, réseau électrique, services.", clos: true },
      { titre: "Méthode de chiffrage", texte: "Chiffrage par axe et par direction, selon trois scénarios de prix.", nature: "Décision", statut: "Approuvée", clos: true },
    ] },
    { ilYA: 20, lieu: "Salle de direction", points: [
      { titre: "Résultats du séminaire", texte: "Trois axes sont retenus : chaleur renouvelable, réseau électrique intelligent, services aux communes.", nature: "Décision", statut: "Approuvée", clos: true },
      { titre: "Chiffrage de l'axe chaleur renouvelable", texte: "La DEN, la DSE et la finance chiffrent les investissements à dix ans.", nature: "Tâche", dans: 10, responsable: "pf-fin" },
      { titre: "Arbitrage des priorités", texte: "Les demandes dépassent l'enveloppe ; l'arbitrage est renvoyé à la prochaine séance, sur la base du chiffrage.", nature: "Décision", statut: "Reportée" },
    ] },
  ],
  notes: [["PMO", "Projet confidentiel : accès limité à l'équipe du projet et à la direction générale.", "pf-pmo", 30]],
};

/** Projet terminé et archivé : l'exemple de l'écran « Archives » (hors des onze projets actifs) */
export const DEMATERIALISATION: FicheProjet = {
  numero: "DFI-2025-0018", cle: "dem", chef: "pf-dubois",
  complements: { phaseGroupe: "Clôture", statut: "Terminé", sponsorId: "pf-dir-dfi", portefeuilleId: "pf-num", programmeId: "pg-donnees", priorite: "Normale", classification: "Métier", donneesType: { application: "Comptabilité fournisseurs" } },
  equipe: [["pf-dubois", 20], ["pf-fin", 10], ["pf-wicht", 5]],
  mandat: {
    contenu: {
      motifs: { croissance: false, efficience: true, maintenance: false, legal: false },
      contexte: "Les 38'000 factures fournisseurs annuelles du groupe arrivent sur papier ou en PDF et sont saisies à la main. Le visa circule par courrier interne : une facture sur cinq est payée après son échéance.",
      benefices: "Délai de traitement ramené de dix-neuf à six jours, escomptes à nouveau obtenus, deux postes de saisie réaffectés au contrôle.",
      perimetre: "Lecture automatique des factures, circuit de visa électronique par direction, rapprochement avec les commandes, archivage électronique à valeur probante.",
      exclusions: "Les factures clients relèvent du projet de remplacement du système de facturation.",
      impactsEnvironnementaux: "Suppression de l'impression et de l'archivage papier.",
      impactsSociaux: "Deux collaboratrices de la saisie formées au contrôle des fournisseurs.",
      projetsConnexes: "Remplacement du système de facturation de l'énergie.",
    },
    objectifs: [["Traiter une facture en six jours", "Délai moyen mesuré sur trois mois après la mise en service", "Finance"], ["Payer à l'échéance", "Moins de 3 % de factures payées en retard", "Sponsor"], ["Archiver sans papier", "Archivage électronique accepté par l'organe de révision", "Finance"]],
  },
  risques: [
    ["Taux de lecture automatique insuffisant", "Technique", 3, 3, 25_000, "Les factures manuscrites des petits fournisseurs sont mal reconnues.", "Portail de dépôt proposé aux deux cents plus petits fournisseurs.", "Réduire"],
    ["Circuit de visa contourné par courriel", "Organisation", 3, 2, 0, "Les habitudes de visa par courriel persistent dans deux directions.", "Formation par direction et blocage du paiement sans visa électronique.", "Réduire"],
    ["Archivage refusé par l'organe de révision", "Juridique", 2, 4, 0, "La valeur probante de l'archive électronique doit être reconnue.", "Procédure validée par l'organe de révision avant la mise en service.", "Éviter"],
  ],
  planning: [["Analyse des circuits de visa", -640, -560, 100], ["Choix de la solution", -555, -480, 100], ["Paramétrage et interfaces comptables", -475, -330, 100], ["Pilote à la DFI", -325, -280, 100], ["Déploiement dans les six directions", -275, -235, 100], ["Bilan à trois mois", -225, -135, 100]],
  jalons: [["Solution retenue", -480], ["Interfaces comptables recettées", -330, 12], ["Pilote concluant", -280], ["Mise en service dans les six directions", -235, 9], ["Archivage accepté par l'organe de révision", -180], ["Bilan à trois mois présenté", -135]],
  actions: [["Former les approbateurs de la DEN", -260, "Normale", "Terminé"], ["Ouvrir le portail aux petits fournisseurs", -210, "Normale", "Terminé", "pf-wicht"], ["Mesurer le délai de traitement sur trois mois", -140, "Haute", "Terminé", "pf-fin"], ["Remettre l'exploitation à la comptabilité", -130, "Normale", "Terminé"]],
  documents: [["Cahier des charges de la dématérialisation", "Rapports", "B", 560], ["Contrat de la solution de lecture automatique", "Contrats", "A", 470], ["Procédure d'archivage à valeur probante", "Autre", "C", 185], ["Procès-verbal de recette des interfaces", "PV de séance", "1", 330], ["Bilan à trois mois", "Rapports", "1", 135]],
  pilotage: [
    { ilYA: 290, lieu: "Siège, salle des finances", points: [
      { titre: "Résultat du pilote", texte: "Neuf factures sur dix sont lues sans reprise ; le délai moyen tombe à sept jours à la DFI.", clos: true },
      { titre: "Déploiement dans les six directions", texte: "Le comité autorise le déploiement, direction par direction, sur six semaines.", nature: "Décision", statut: "Approuvée", clos: true },
    ] },
    { ilYA: 132, lieu: "Siège, salle des finances", points: [
      { titre: "Bilan à trois mois", texte: "Délai moyen de 5,8 jours ; 2,1 % de factures payées en retard ; archivage accepté par l'organe de révision.", clos: true },
      { titre: "Clôture du projet", texte: "Les trois objectifs sont atteints. Le comité clôt le projet et remet l'exploitation à la comptabilité.", nature: "Décision", statut: "Approuvée", clos: true },
    ] },
  ],
  notes: [["Responsable de projet", "Projet clos : les trois objectifs du mandat sont atteints, le solde du budget est rendu.", "chef", 130]],
};
