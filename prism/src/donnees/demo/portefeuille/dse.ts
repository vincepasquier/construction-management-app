// Direction Solutions Energie : la rénovation des installations énergétiques d'un hôpital, en
// chantier dans un site occupé, et un contracting de quartier à l'étude. Projets fictifs.
import { VINCENT } from "./referentiel";
import type { FicheProjet } from "./types";

/** Rénovation énergétique d'un hôpital : réalisation avancée, premières réceptions partielles */
export const HOPITAL: FicheProjet = {
  numero: "DSE-2025-0073", cle: "hop", chef: VINCENT,
  complements: { phase: "52 Exécution de l'ouvrage", phaseGroupe: "Réalisation", lieu: "Hôpital régional des Trois-Sapins", maitreOuvrage: "Hôpital régional des Trois-Sapins", sponsorId: "pf-dir-dse", portefeuilleId: "pf-inv", priorite: "Haute", classification: "Métier", strategique: true, donneesType: { typeOuvrage: "Installation énergétique" } },
  equipe: [[VINCENT, 50], ["pf-gachoud", 100], ["pf-perret", 60]],
  mandat: {
    contenu: {
      motifs: { croissance: true, efficience: true, maintenance: true, legal: false },
      contexte: "Les chaudières à mazout de l'hôpital datent de 1994 et la production de froid de 2001. L'établissement veut sortir du mazout, sécuriser son approvisionnement et confie au groupe la conception, la réalisation et l'exploitation des nouvelles installations, par un contrat de fourniture d'énergie de vingt ans.",
      benefices: "Consommation de mazout supprimée, émissions de CO2 réduites de 85 %, redondance de la production de chaleur et de froid, revenu d'exploitation sur vingt ans pour le groupe.",
      perimetre: "Deux pompes à chaleur sur sondes géothermiques, chaudière d'appoint, production de froid, distribution hydraulique, ventilation des blocs opératoires avec récupération de chaleur, mesure, commande et régulation.",
      exclusions: "L'enveloppe des bâtiments et la distribution terminale dans les chambres restent à la charge de l'hôpital.",
      impactsEnvironnementaux: "24 sondes géothermiques de 250 m sous le parking ; fluides frigorigènes à faible potentiel de réchauffement.",
      impactsSociaux: "Travaux dans un hôpital en service : aucune interruption de chaleur ni de froid tolérée, bruit et poussière limités, travail de nuit dans les blocs.",
      projetsConnexes: "Extension de l'aile est de l'hôpital, conduite par l'établissement.",
    },
    objectifs: [["Basculer sur les nouvelles installations sans interruption de service", "Aucune coupure de chaleur ou de froid non planifiée", "Sponsor"], ["Atteindre la performance promise au client", "Coefficient de performance annuel supérieur ou égal à 3,8", "Client"], ["Tenir l'investissement", "Coût final inférieur ou égal à 9,8 millions", "Finance"]],
  },
  risques: [
    ["Interruption de la production de chaleur pendant le basculement", "Technique", 2, 5, 200_000, "Le raccordement de la seconde pompe à chaleur impose de couper le collecteur principal pendant six heures.", "Chaufferie mobile raccordée en secours, basculement de nuit, procédure répétée à blanc avec le service technique de l'hôpital.", "Réduire"],
    ["Contamination par les poussières dans les zones de soins", "Sécurité", 2, 5, 0, "Percements à proximité du bloc opératoire B.", "Confinement en dépression, contrôle par l'hygiène hospitalière avant chaque ouverture de zone.", "Réduire"],
    ["Travail de nuit plus étendu que prévu", "Financier", 4, 3, 90_000, "L'hôpital impose le travail de nuit dans tout le bloc B, et non dans deux salles seulement.", "Avenant négocié sur la base des heures réelles ; planning regroupé sur trois semaines.", "Accepter"],
    ["Performance des sondes inférieure aux calculs", "Technique", 2, 4, 150_000, "Le test de réponse thermique n'a porté que sur une sonde.", "Suivi des températures dès la mise en service ; appoint dimensionné avec une marge.", "Accepter"],
    ["Retard de livraison du groupe de froid", "Délais", 3, 3, 60_000, "Le fabricant annonce quatre semaines de retard.", "Ancien groupe maintenu en service jusqu'à l'automne prochain.", "Réduire"],
  ],
  planning: [["Forage des sondes géothermiques", -330, -210, 100, "L1"], ["Local technique et percements", -300, -180, 100, "L3"], ["Première pompe à chaleur", -200, -60, 100, "L1"], ["Seconde pompe à chaleur et appoint", -70, 30, 75, "L1"], ["Distribution hydraulique et sous-stations", -220, 40, 85, "L1"], ["Ventilation des blocs opératoires", -150, 55, 75, "L2"], ["Production de froid", 20, 130, 0, "L2"], ["Régulation, essais et optimisation", -90, 160, 55, "L2"]],
  jalons: [["Signature du contrat de fourniture d'énergie", -520], ["Fin des forages", -210], ["Mise en service de la première pompe à chaleur", -48, 14], ["Basculement du collecteur principal", 18, 20], ["Arrêt définitif des chaudières à mazout", 32, 20], ["Mise en service de la production de froid", 130, 30], ["Réception finale", 170, 30]],
  actions: [["Répéter à blanc le basculement avec le service technique de l'hôpital", 10, "Urgente", "En cours", "pf-gachoud"], ["Négocier l'avenant du travail de nuit au bloc B", 7, "Haute", "En cours"], ["Lever les réserves de la première pompe à chaleur", 14, "Haute", "En cours", "pf-gachoud"], ["Valider le protocole de confinement avec l'hygiène hospitalière", 3, "Haute", "À faire", "pf-perret"], ["Mettre à jour le planning du groupe de froid", 12, "Normale"]],
  documents: [["Contrat de fourniture d'énergie", "Contrats", "1", 520], ["Schéma de principe hydraulique", "Plans", "F", 30], ["Procédure de basculement du collecteur", "Autre", "3", 6], ["Rapport du test de réponse thermique", "Rapports", "1", 300], ["Protocole de confinement, bloc B", "Autre", "2", 9], ["Procès-verbal de mise en service de la pompe à chaleur n° 1", "Rapports", "1", 48]],
  pilotage: [
    { ilYA: 42, lieu: "Hôpital, salle de conférence du niveau 0", invites: [["Dr M. Sudan", "Hôpital – direction"], ["R. Tinguely", "Hôpital – service technique"], ["W. Egger", "Bureau technique CVC Romand SA"]], points: [
      { titre: "Mise en service de la première pompe à chaleur", texte: "En service depuis six jours ; la réception partielle a été prononcée avec quatre réserves.", clos: true },
      { titre: "Vannes d'isolement vétustes", texte: "Avenant de 64'000 CHF approuvé pour le remplacement de onze vannes non prévues, découvertes à la vidange du collecteur.", nature: "Décision", montant: 64_000, statut: "Approuvée", clos: true },
      { titre: "Procédure de basculement", texte: "À rédiger avec le service technique et à répéter à blanc.", nature: "Tâche", dans: -8, responsable: "pf-gachoud", clos: true },
    ] },
    { ilYA: 7, lieu: "Hôpital, salle de conférence du niveau 0", invites: [["Dr M. Sudan", "Hôpital – direction"], ["R. Tinguely", "Hôpital – service technique"], ["W. Egger", "Bureau technique CVC Romand SA"]], points: [
      { titre: "Avancement", texte: "Seconde pompe à chaleur posée, raccordement en cours. Ventilation du bloc A terminée, bloc B à 50 %.", clos: true },
      { titre: "Date du basculement", texte: "Fixée dans dix-huit jours, de nuit, avec la chaufferie mobile en secours. L'hôpital informe ses services.", nature: "Décision", statut: "Approuvée", condition: "Répétition à blanc réussie" },
      { titre: "Travail de nuit au bloc B", texte: "L'entreprise demande 38'000 CHF. Le comité demande le détail des heures avant de se prononcer.", nature: "Décision", montant: 38_000, statut: "Reportée" },
      { titre: "Réserves de la pompe à chaleur n° 1", texte: "Deux réserves sur quatre sont levées ; les deux autres avant le basculement.", nature: "Tâche", dans: 14, responsable: "pf-gachoud" },
    ] },
  ],
  notes: [["Responsable de projet", "Le service technique de l'hôpital confirme la fenêtre de nuit pour le basculement. Chaufferie mobile réservée.", "chef", 2], ["Finance / ComInv", "Atterrissage à 9,74 millions avec l'avenant du travail de nuit ; marge de 60'000 CHF sur le budget.", "pf-fin", 5]],
  construction: {
    lots: [["L1", "Production et distribution de chaleur", ["242", "243"], "pf-perret", "52 Exécution de l'ouvrage"], ["L2", "Ventilation, froid et régulation", ["244", "246", "23"], "pf-perret", "52 Exécution de l'ouvrage"], ["L3", "Travaux de construction", ["211"], "pf-gachoud", "53 Mise en service, achèvement"], ["L0", "Honoraires et frais", ["29", "51"], VINCENT, "52 Exécution de l'ouvrage"]],
    budget: [["242", "Pompes à chaleur, sondes et chaudière d'appoint", 3_150_000], ["243", "Distribution hydraulique et sous-stations", 1_480_000], ["244", "Ventilation des blocs opératoires", 1_720_000], ["246", "Production de froid", 980_000], ["23", "Électricité, mesure, commande et régulation", 1_050_000], ["211", "Local technique, percements et protection incendie", 520_000], ["294", "Honoraires d'ingénieur CVC", 610_000], ["51", "Autorisations et installations provisoires", 140_000], ["583", "Réserve pour imprévus", 150_000]],
    marches: [
      { cle: "pac", objet: "Pompes à chaleur, sondes géothermiques et chaudière d'appoint", cfc: "242", lot: "L1", type: "Contrat d'entreprise", entreprise: "e-pac", concurrents: [["e-cvc1", 4.4], ["e-cvc2", 9]], procedure: "Ouverte", etat: "En cours", signe: -380, debut: -330, fin: 30, facture: 0.9, metres: true,
        positions: [["242.111.101", "Pompe à chaleur eau-eau de 600 kW", "pce", 2, 685_000], ["242.211.101", "Chaudière à gaz d'appoint de 1'200 kW", "pce", 1, 310_000], ["242.311.101", "Sonde géothermique de 250 m", "pce", 24, 34_500], ["242.411.101", "Accumulateur de 10 m3", "pce", 3, 46_000], ["242.511.101", "Raccordements, mise en service et essais", "gl", 1, 365_000]],
        reception: { objet: "Production de chaleur : pompe à chaleur n° 1 et sondes", ilYA: 48, type: "Partielle", resultat: "Acceptée avec réserves", lieu: "Hôpital, local technique du niveau -1", participants: "V. Pasquier (maître de l'ouvrage), É. Gachoud (direction des travaux), T. Huber (Pompes à chaleur Industrielles SA), R. Tinguely (service technique de l'hôpital)", documents: "Procès-verbal de mise en service\nProtocole d'essai de performance\nSchémas révisés\nNotices d'exploitation", remarques: "Coefficient de performance mesuré à 4,1 au point de fonctionnement contractuel." },
        reserves: [["Calorifuge incomplet sur le collecteur de départ", "Local technique, niveau -1", "Mineure", "Levée", -20], ["Sonde de température mal positionnée sur le retour", "Local technique, niveau -1", "Mineure", "Levée", -25], ["Niveau sonore supérieur à la valeur garantie", "Local technique, côté chambres", "Majeure", "Ouverte", 12, "51 dB(A) mesurés pour 47 garantis ; capotage acoustique proposé par l'entreprise."], ["Étiquetage des vannes absent", "Local technique, niveau -1", "Mineure", "Levée annoncée", 10]] },
      { cle: "hyd", objet: "Distribution hydraulique et sous-stations", cfc: "243", lot: "L1", type: "Contrat d'entreprise", entreprise: "e-cvc1", concurrents: [["e-cvc2", 3]], etat: "En cours", montant: 1_395_000, signe: -300, debut: -220, fin: 40, facture: 0.85,
        avenants: [["Remplacement de onze vannes d'isolement vétustes", 64_000, "Approuvé", "Imprévu : vannes grippées découvertes à la vidange du collecteur principal.", 40, 4], ["Travail de nuit étendu à tout le bloc B", 38_000, "Demandé", "Demande du client : aucun travail de jour dans le bloc opératoire B.", 8]],
        regies: [["Vidange et remplissage du circuit de l'aile ouest", 30, "Facturé", [["Main-d'œuvre", "Monteur en chauffage", 12, "h", 98], ["Matériel", "Glycol et produits de traitement", 1, "gl", 480]]], ["Recherche d'une fuite sur l'ancien réseau, niveau 2", 12, "Validé", [["Main-d'œuvre", "Monteur en chauffage", 7, "h", 98], ["Engin", "Caméra thermique", 3, "h", 60]], "Fuite sur l'installation existante, hors contrat ; refacturation au client."]] },
      { cle: "ven", objet: "Ventilation des blocs opératoires et récupération de chaleur", cfc: "244", lot: "L2", type: "Contrat d'entreprise", entreprise: "e-cvc2", concurrents: [["e-cvc1", 2.1]], etat: "En cours", montant: 1_640_000, signe: -260, debut: -150, fin: 55, facture: 0.75,
        regies: [["Confinement supplémentaire demandé par l'hygiène hospitalière", 5, "Saisi", [["Main-d'œuvre", "Monteur en ventilation", 10, "h", 96], ["Matériel", "Film et sas de confinement", 1, "gl", 720]]]] },
      { cle: "fro", objet: "Production de froid", cfc: "246", lot: "L2", type: "Contrat d'entreprise", entreprise: "e-cvc1", etat: "Signé", montant: 915_000, signe: -80, debut: 20, fin: 130, facture: 0.2, procedure: "Sur invitation" },
      { cle: "mcr", objet: "Électricité, mesure, commande et régulation", cfc: "23", lot: "L2", type: "Contrat d'entreprise", entreprise: "e-reg", concurrents: [["e-elec1", 5.2]], etat: "En cours", montant: 985_000, signe: -280, debut: -200, fin: 160, facture: 0.7 },
      { cle: "gc", objet: "Local technique, percements et protection incendie", cfc: "211", lot: "L3", type: "Contrat d'entreprise", entreprise: "e-gc2", etat: "Réceptionné", montant: 478_000, signe: -340, debut: -300, fin: -180, facture: 1, procedure: "Sur invitation",
        reception: { objet: "Local technique et percements", ilYA: 170, type: "Finale", resultat: "Acceptée", lieu: "Hôpital, niveau -1", participants: "V. Pasquier (maître de l'ouvrage), É. Gachoud (direction des travaux), A. Carron (Constructions Sarine SA)", documents: "Attestation des obturations coupe-feu\nPlans conformes à l'exécution" } },
      { cle: "ing", objet: "Mandat d'ingénieur CVC", cfc: "294", lot: "L0", type: "Mandat", entreprise: "e-ing4", concurrents: [["e-ing2", 8]], etat: "En cours", montant: 585_000, signe: -560, debut: -540, fin: 170, facture: 0.82, conditions: { reglement: "SIA 108 (ingénieurs mécaniciens, électriciens et CVC)", phases: "31 à 53" } },
    ],
    mutations: [["Vannes d'isolement vétustes (avenant AV-01) financées par la réserve", "583", "243", 64_000, "Validée", 38]],
    ajustements: [["Plus-value attendue", "Travail de nuit étendu au bloc B", 38_000, 80, "243", "Avenant AV-02 demandé ; le client impose la contrainte, le montant reste à négocier."], ["Risque", "Capotage acoustique des pompes à chaleur", 25_000, 30, "242", "À la charge de l'entreprise si le dépassement de la valeur garantie est confirmé."], ["Opportunité", "Chaufferie mobile louée moins longtemps", 12_000, 50, "51", "Deux semaines de location en moins si le basculement réussit du premier coup."]],
    horsCommande: [["Loueur de chaufferies mobiles", 28_400, "51", "Chaufferie mobile de secours, premier mois", 20], ["Service de l'environnement", 7_800, "51", "Émolument de l'autorisation de forage", 400]],
    autorisations: [
      ["Autorisation spéciale", "Forage de 24 sondes géothermiques de 250 m", "Service cantonal de l'environnement", "SEn-2025-0331", "Délivrée", 450, 400, 0, [["Service de l'environnement", "Rapport de forage et profil géologique de chaque sonde", "Respectée"], ["Service de l'environnement", "Essai d'étanchéité des sondes avant le remblayage", "Respectée"]]],
      ["Permis de construire", "Local technique enterré et cheminée de l'appoint", "Préfecture, sur préavis de la commune", "PC-2025-0604", "Délivrée", 470, 390, 1, [["Service de l'environnement", "Niveau sonore en limite de propriété inférieur aux valeurs de planification", "En cours", 30], ["Établissement cantonal d'assurance", "Contrôle des obturations coupe-feu", "Respectée"]]],
    ],
    servitudes: [["4410", "Les Trois-Sapins", "Commune", "Servitude de conduite", "Inscrite au registre foncier", 0, "sondes sous le parking communal, 1'800 m2"], ["4402", "Les Trois-Sapins", "Hôpital régional des Trois-Sapins", "Droit de superficie", "Convention signée", 0, "local technique, 240 m2, 20 ans", "Lié au contrat de fourniture d'énergie."]],
    chantier: {
      conducteur: "pf-gachoud", lieuSeance: "Hôpital, local de chantier du niveau -1", invites: [["T. Huber", "Pompes à chaleur Industrielles SA"], ["G. Pittet", "Thermo-Technique SA"], ["C. Overney", "Climat & Chaleur Sàrl"], ["R. Tinguely", "Hôpital – service technique"]],
      entreprises: [["Thermo-Technique SA", 9], ["Climat & Chaleur Sàrl", 7], ["Pompes à chaleur Industrielles SA", 4], ["Régulation & Automation SA", 3]],
      travaux: [
        "Pompe à chaleur n° 2 : mise en place sur plots antivibratiles, raccordement des sondes. Bloc A : équilibrage des débits d'air.",
        "Pompe à chaleur n° 2 : tuyauterie du condenseur. Distribution : remplacement des vannes d'isolement de l'aile ouest.",
        "Bloc B, salles 1 et 2 : dépose des anciennes gaines, travail de nuit sous confinement. Régulation : câblage de l'armoire n° 2.",
        "Bloc B, salles 1 et 2 : pose des nouvelles gaines et des filtres. Contrôle de l'hygiène hospitalière avant réouverture.",
        "Pompe à chaleur n° 2 : essai de pression du circuit, calorifuge. Sous-station de l'aile est : raccordement.",
        "Chaufferie mobile : livraison et raccordement provisoire en vue du basculement. Bloc B, salle 3 : confinement.",
        "Bloc B, salle 3 : dépose et pose des gaines, de nuit. Régulation : essais des points de mesure de la pompe à chaleur n° 2.",
        "Pompe à chaleur n° 2 : mise sous tension, premiers essais à vide. Répétition à blanc du basculement avec le service technique.",
        "Distribution : rinçage et équilibrage de l'aile est. Bloc B, salle 3 : contrôle particulaire, salle rendue à l'hôpital.",
      ],
      evenements: [[2, "Sécurité", "Contrôle de la dépression du confinement avant le début des travaux de nuit : conforme."], [3, "Visite", "Contrôle de l'hygiène hospitalière : salles 1 et 2 rendues, comptage particulaire conforme."], [5, "Livraison", "Chaufferie mobile de 800 kW, posée sur le parking de service."], [7, "Visite", "Répétition à blanc du basculement : 5 h 20 pour 6 h prévues."], [8, "Incident", "Alarme technique au bloc A pendant l'équilibrage : fausse alarme, sonde recalibrée."]],
      seances: [
        [{ titre: "Avancement", texte: "Pompe à chaleur n° 2 posée. Bloc A terminé. Bloc B : salles 1 et 2 planifiées de nuit.", clos: true }, { titre: "Protocole de confinement du bloc B", texte: "À valider par l'hygiène hospitalière avant le premier travail de nuit.", nature: "Tâche", dans: -10, responsable: "pf-perret", clos: true }, { titre: "Niveau sonore de la pompe à chaleur n° 1", texte: "L'entreprise présente une proposition de capotage.", nature: "Tâche", dans: 12, responsableNom: "Pompes à chaleur Industrielles SA" }, { titre: "Chaufferie mobile", texte: "Livraison et raccordement provisoire avant la répétition à blanc.", nature: "Tâche", dans: -3, responsableNom: "Thermo-Technique SA", clos: true }],
        [{ titre: "Répétition à blanc du basculement", texte: "Réussie en 5 h 20. La procédure est figée ; le basculement est confirmé à la date prévue.", nature: "Décision", statut: "Approuvée", clos: true }, { titre: "Bloc B, salles 4 à 6", texte: "Planning de nuit à convenir avec le bloc opératoire.", nature: "Tâche", dans: 6 }, { titre: "Étiquetage des vannes", texte: "Réserve à lever avant le basculement.", nature: "Tâche", dans: 10, responsableNom: "Pompes à chaleur Industrielles SA" }],
      ],
      constats: [
        ["Qualité", "Niveau sonore de la pompe à chaleur n° 1 supérieur à la valeur garantie", "51 dB(A) mesurés à 1 m côté chambres, pour 47 dB(A) garantis au contrat. Mesure faite de nuit, pompe à pleine charge.", "Local technique, niveau -1, paroi est", "e-pac", "Sonomètre devant la pompe à chaleur n° 1", 40],
        ["Sécurité", "Confinement du bloc B avant travaux de nuit", "Sas en place, dépression de 15 Pa mesurée, extraction filtrée. Autorisation de démarrer donnée par l'hygiène hospitalière.", "Bloc opératoire B, salles 1 et 2", "e-cvc2", "Sas de confinement à l'entrée du bloc B", 8],
        ["Qualité", "Vannes d'isolement grippées sur le collecteur principal", "Onze vannes de 1994 ne se manœuvrent plus. Leur remplacement est nécessaire pour isoler les secteurs lors du basculement.", "Collecteur principal, niveau -1", "e-cvc1", "Vannes d'origine sur le collecteur", 44, "tache"],
        ["Avancement", "Pompe à chaleur n° 2 en place", "Machine posée sur plots antivibratiles, alignement contrôlé. Raccordement hydraulique en cours.", "Local technique, niveau -1", "e-pac", "Pompe à chaleur n° 2 sur ses plots", 7],
        ["Qualité", "Calorifuge abîmé après le passage d'un autre corps de métier", "Calorifuge écrasé sur 2 m au droit du passage de câbles. À reprendre par l'entreprise responsable.", "Local technique, collecteur de départ", "e-reg", "Calorifuge écrasé", 3, "reserve"],
      ],
    },
  },
};

/** Contracting énergétique d'un quartier : études préliminaires, mandat en cours de signature */
export const CONTRACTING: FicheProjet = {
  numero: "DSE-2026-0105", cle: "ctg", chef: VINCENT,
  complements: { phase: "21 Définition du projet", phaseGroupe: "Études préliminaires", lieu: "Quartier des Tilleuls", maitreOuvrage: "Coopérative d'habitation des Tilleuls", sponsorId: "pf-dir-dse", portefeuilleId: "pf-inv", priorite: "Normale", classification: "Stratégique", donneesType: { typeOuvrage: "Installation énergétique" } },
  equipe: [[VINCENT, 30], ["pf-perret", 40], ["pf-wicht", 15]],
  mandat: {
    etat: "En signature",
    contenu: {
      motifs: { croissance: true, efficience: false, maintenance: false, legal: false },
      contexte: "Une coopérative construit 420 logements en six immeubles dans le quartier des Tilleuls. Elle ne veut ni financer ni exploiter les installations énergétiques et lance un appel à des contracteurs. Le groupe a été retenu pour une offre ferme, à remettre après les études préliminaires.",
      benefices: "Contrat de fourniture de chaleur, de froid et d'électricité solaire sur trente ans ; vitrine d'un quartier alimenté à plus de 90 % par des énergies renouvelables locales.",
      perimetre: "Études préliminaires et avant-projet : pompes à chaleur sur la nappe, réseau de quartier, installation photovoltaïque de 600 kWc, regroupement pour la consommation propre, jusqu'à l'offre ferme au client.",
      exclusions: "Les installations à l'intérieur des logements et la mobilité électrique sont traitées par la coopérative.",
      impactsEnvironnementaux: "Prélèvement et restitution dans la nappe : concession à obtenir, essais de pompage pour vérifier le débit et la température.",
      impactsSociaux: "Tarif de la chaleur plafonné par le contrat, pour des loyers coopératifs.",
      projetsConnexes: "Raccordement du quartier au réseau de distribution électrique par la DDE.",
    },
    objectifs: [["Remettre une offre ferme au client", "Offre remise à la date fixée par la coopérative", "Sponsor"], ["Confirmer la ressource en eau de la nappe", "Débit de 1'800 l/min démontré par l'essai de pompage", "Direction Solutions Energie"], ["Démontrer la rentabilité du contrat", "Rendement du projet supérieur au seuil fixé par le groupe", "Finance"]],
  },
  risques: [
    ["Débit de la nappe insuffisant", "Technique", 3, 5, 600_000, "Le débit nécessaire est de 1'800 l/min ; le forage d'essai en donne 1'450 après 48 heures.", "Essai de longue durée en cours ; variante avec sondes géothermiques en complément chiffrée.", "Réduire"],
    ["Concession d'utilisation de la nappe refusée ou limitée", "Juridique", 2, 5, 0, "Un captage d'eau potable se trouve à 900 m en aval.", "Étude hydrogéologique jointe à la demande ; restitution à une température limitée.", "Réduire"],
    ["Calendrier du promoteur plus rapide que les études", "Délais", 3, 4, 0, "Le gros œuvre du premier immeuble commence dans huit mois.", "Réservations dans le gros œuvre convenues dès l'avant-projet ; offre ferme en deux étapes.", "Réduire"],
    ["Tarif plafonné insuffisant si les prix de l'électricité montent", "Financier", 3, 4, 0, "Les pompes à chaleur consomment de l'électricité dont le prix n'est pas garanti sur trente ans.", "Clause d'indexation partielle ; autoconsommation solaire maximisée.", "Transférer"],
  ],
  planning: [["Étude de faisabilité", -150, -60, 100], ["Forage d'essai et essais de pompage", -45, 25, 60, "L1"], ["Avant-projet des installations", -50, 70, 35], ["Demande de concession pour la nappe", -20, 150, 15], ["Modèle financier et offre ferme", 30, 100, 0], ["Négociation du contrat de contracting", 100, 180, 0]],
  jalons: [["Sélection du groupe pour une offre ferme", -160], ["Étude de faisabilité remise", -60, 10], ["Fin de l'essai de pompage de longue durée", 25, 15], ["Avant-projet validé", 70, 15], ["Remise de l'offre ferme", 100], ["Signature du contrat de contracting", 180]],
  actions: [["Analyser les résultats de l'essai de pompage avec l'hydrogéologue", 26, "Haute", "À faire", "pf-perret"], ["Chiffrer la variante avec sondes géothermiques", 20, "Haute", "En cours", "pf-perret"], ["Déposer la demande de concession", 15, "Haute", "En cours", "pf-wicht"], ["Convenir des réservations dans le gros œuvre avec l'architecte du promoteur", 30, "Normale"], ["Faire signer le mandat de projet", 5, "Normale", "En cours"]],
  documents: [["Appel à contracteurs de la coopérative", "Autre", "1", 200], ["Étude de faisabilité", "Rapports", "B", 60], ["Rapport intermédiaire de l'essai de pompage", "Rapports", "1", 6], ["Schéma de principe des installations", "Plans", "A", 12], ["Modèle financier, version de travail", "Rapports", "0.4", 4]],
  pilotage: [
    { ilYA: 14, lieu: "Siège, salle Solutions", invites: [["W. Egger", "Bureau technique CVC Romand SA"], ["Y. Piller", "Géologie & Géotechnique SA"]], points: [
      { titre: "Étude de faisabilité", texte: "La solution sur nappe est faisable si le débit de 1'800 l/min est confirmé. Le solaire couvre 35 % des besoins électriques des pompes à chaleur.", clos: true },
      { titre: "Premier résultat de l'essai de pompage", texte: "1'450 l/min après 48 heures. Le comité décide de poursuivre l'essai sur trois semaines et de chiffrer une variante avec sondes en complément.", nature: "Décision", montant: 48_000, statut: "Approuvée" },
      { titre: "Demande de concession", texte: "À déposer sans attendre la fin de l'essai, avec l'étude hydrogéologique.", nature: "Tâche", dans: 15, responsable: "pf-wicht" },
      { titre: "Variante avec sondes géothermiques", texte: "Chiffrage attendu pour la prochaine séance.", nature: "Tâche", dans: 20, responsable: "pf-perret" },
    ] },
  ],
  notes: [["Responsable de projet", "La coopérative accepte une offre ferme en deux étapes : principe et prix plafond d'abord, prix définitif après la concession.", "chef", 3], ["PMO", "Mandat de projet en cours de signature : il manque la signature du commanditaire.", "pf-pmo", 4]],
  construction: {
    lots: [["L1", "Captage et production", ["201", "242"], "pf-perret", "31 Avant-projet"], ["L2", "Réseau, solaire et électricité", ["243", "231", "23"], "pf-perret", "21 Définition du projet"], ["L0", "Honoraires et frais", ["29", "51"], VINCENT, "31 Avant-projet"]],
    budget: [["242", "Pompes à chaleur sur la nappe et appoint", 2_350_000], ["243", "Réseau de quartier et sous-stations", 1_700_000], ["231", "Installation photovoltaïque de 600 kWc", 980_000], ["23", "Électricité, comptage et regroupement de consommation", 420_000], ["201", "Forages de captage et de restitution", 380_000], ["294", "Honoraires", 430_000], ["51", "Concession et autorisations", 60_000], ["583", "Réserve pour imprévus", 80_000]],
    marches: [
      { cle: "ing", objet: "Mandat d'ingénieur : faisabilité et avant-projet", cfc: "294", lot: "L0", type: "Mandat", entreprise: "e-ing4", concurrents: [["e-ing2", 11]], procedure: "Sur invitation", etat: "En cours", montant: 148_000, signe: -155, debut: -150, fin: 100, facture: 0.45, conditions: { reglement: "SIA 108 (ingénieurs mécaniciens, électriciens et CVC)", phases: "21 à 31" } },
      { cle: "for", objet: "Forage d'essai et essais de pompage", cfc: "201", lot: "L1", type: "Contrat d'entreprise", entreprise: "e-for", concurrents: [["e-gc3", 12]], etat: "En cours", signe: -55, debut: -45, fin: 25, facture: 0.6, metres: true,
        positions: [["201.111.101", "Forage d'essai, diamètre 400 mm", "m", 60, 950], ["201.211.101", "Essai de pompage de longue durée", "gl", 1, 48_000], ["201.311.101", "Analyse d'eau en laboratoire", "pce", 12, 850], ["201.411.101", "Piézomètre de contrôle", "pce", 3, 8_900]],
        reception: { objet: "Forage d'essai F1, forage de restitution F2 et piézomètres", ilYA: 30, type: "Partielle", resultat: "Acceptée", lieu: "Quartier des Tilleuls, parcelle 6120", participants: "É. Gachoud (direction des travaux), J. Dafflon (Forages et Sondages SA), Y. Piller (hydrogéologue)", documents: "Coupes des forages F1 et F2\nFiches d'équipement des piézomètres\nRapport de développement des forages" },
        regies: [["Prolongation de l'essai de pompage d'une semaine", 4, "Saisi", [["Engin", "Pompe immergée et groupe électrogène", 168, "h", 22], ["Main-d'œuvre", "Technicien de mesure", 14, "h", 105]], "Décidée par le comité de pilotage."]] },
      { cle: "hyd", objet: "Mandat d'hydrogéologue", cfc: "294", lot: "L0", type: "Mandat", entreprise: "e-geo", etat: "En cours", montant: 64_000, signe: -60, debut: -55, fin: 150, facture: 0.4, procedure: "Gré à gré", conditions: { phases: "21 à 33" } },
      { cle: "pac", objet: "Pompes à chaleur sur la nappe et appoint", cfc: "242", lot: "L1", type: "Contrat d'entreprise", entreprise: "e-pac", etat: "Préparation", estime: 2_300_000, montant: 2_300_000, signe: 200, debut: 320, fin: 560 },
      { cle: "pv", objet: "Installation photovoltaïque de 600 kWc", cfc: "231", lot: "L2", type: "Contrat d'entreprise", entreprise: "e-elec1", etat: "Préparation", estime: 950_000, montant: 950_000, signe: 260, debut: 400, fin: 600 },
    ],
    ajustements: [["Risque", "Sondes géothermiques en complément de la nappe", 600_000, 40, "242", "Si le débit de 1'800 l/min n'est pas atteint, 18 sondes de 200 m compléteraient la ressource."], ["Estimation interne", "Seconde paire de forages", 140_000, 30, "201", "Un second doublet pourrait répartir le prélèvement et faciliter la concession."]],
    horsCommande: [["Laboratoire cantonal", 3_200, "51", "Analyses de référence de la nappe", 30]],
    autorisations: [
      ["Autorisation spéciale", "Forage d'essai et essais de pompage dans la nappe", "Service cantonal de l'environnement", "SEn-2026-0507", "Délivrée", 90, 60, 0, [["Service de l'environnement", "Restitution de l'eau pompée dans la nappe, sans rejet au réseau", "En cours"], ["Service de l'environnement", "Rapport d'essai à remettre dans les trente jours", "À traiter", 55]]],
      ["Autorisation spéciale", "Concession d'utilisation de la nappe pour la production de chaleur", "Direction cantonale de l'environnement", "", "En préparation", undefined, undefined, 0, []],
    ],
    servitudes: [["6120", "Les Tilleuls", "Coopérative d'habitation des Tilleuls", "Droit de superficie", "Accord de principe", 0, "local technique, 180 m2, 30 ans", "À inscrire avec le contrat de contracting."], ["6121", "Les Tilleuls", "Coopérative d'habitation des Tilleuls", "Servitude de conduite", "Accord de principe", 0, "réseau de quartier, 640 m"], ["6098", "Les Tilleuls", "Commune", "Servitude de conduite", "À négocier", 2_000, "conduite de restitution, 45 m"]],
    chantier: {
      conducteur: "pf-gachoud", lieuSeance: "Sur place, roulotte de l'entreprise de forage", invites: [["J. Dafflon", "Forages et Sondages SA"], ["Y. Piller", "Géologie & Géotechnique SA"]],
      entreprises: [["Forages et Sondages SA", 3], ["Géologie & Géotechnique SA", 1]],
      travaux: [
        "Essai de pompage de longue durée : palier à 1'200 l/min, relevés du niveau dans les trois piézomètres.",
        "Essai de pompage : palier à 1'450 l/min, rabattement stabilisé à 3,8 m. Prélèvement d'eau n° 7.",
        "Essai de pompage : tentative à 1'700 l/min, rabattement non stabilisé après huit heures. Retour à 1'450 l/min.",
        "Essai de pompage : palier à 1'450 l/min maintenu. Mesure de la température de restitution.",
        "Essai de pompage : palier à 1'450 l/min, septième jour. Prélèvement d'eau n° 8, contrôle du groupe électrogène.",
        "Essai de pompage : palier à 1'550 l/min, rabattement de 4,6 m en cours de stabilisation.",
      ],
      evenements: [[2, "Incident", "Rabattement non stabilisé à 1'700 l/min : palier abandonné sur avis de l'hydrogéologue."], [4, "Visite", "Visite du service de l'environnement sur le site de l'essai."]],
      seances: [
        [{ titre: "Forage d'essai", texte: "Forage terminé à 58 m, nappe rencontrée à 11 m. Crépine posée entre 22 et 52 m.", clos: true }, { titre: "Programme de l'essai de pompage", texte: "Quatre paliers de 800 à 1'800 l/min, puis palier de longue durée.", nature: "Tâche", dans: -9, responsableNom: "Géologie & Géotechnique SA", clos: true }],
        [{ titre: "Résultat intermédiaire", texte: "1'450 l/min tenus sans difficulté ; 1'700 l/min non tenus. Prolongation de l'essai décidée, avec un palier à 1'550 l/min.", nature: "Décision", statut: "Approuvée", clos: true }, { titre: "Rapport d'essai", texte: "À remettre au service de l'environnement dans les trente jours suivant la fin de l'essai.", nature: "Tâche", dans: 55, responsableNom: "Géologie & Géotechnique SA" }],
      ],
      constats: [
        ["État des lieux", "État des lieux de la parcelle avant le forage d'essai", "Terrain en friche, clôture de chantier du promoteur en place. Aucun réseau dans l'emprise selon le cadastre.", "Parcelle 6120, angle sud", undefined, "Emplacement du forage d'essai", 50],
        ["Avancement", "Installation de l'essai de pompage", "Pompe immergée à 30 m, débitmètre et sondes de niveau en place, restitution par le second forage.", "Parcelle 6120, forage F1", "e-for", "Tête de forage et débitmètre", 10],
        ["Environnement", "Restitution de l'eau pompée", "Eau restituée dans la nappe par le forage F2, sans rejet au réseau. Température de restitution mesurée à 12,4 °C.", "Parcelle 6120, forage F2", "e-for", "Tête du forage de restitution", 4],
      ],
      reserves: [["Bac de rétention absent sous le groupe électrogène", "Parcelle 6120, forage F1", "Majeure", "Levée", -6, "e-for"], ["Tête du piézomètre P2 non cadenassée", "Parcelle 6120, piézomètre P2", "Mineure", "Ouverte", 6, "e-for"]],
    },
  },
};
