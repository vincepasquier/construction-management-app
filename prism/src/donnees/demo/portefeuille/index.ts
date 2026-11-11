// Portefeuille de démonstration : onze projets complets, répartis sur les six directions du
// groupe, chacun à un stade différent. C'est ce que charge « Charger la démonstration ».
import { aujourdhui, ajouterJours } from "../../../domaine/lib/format";
import { changerStatut, indicateursFiges, rapportVide } from "../../../domaine/socle/rapports";
import type { Seance } from "../../../domaine/socle/types";
import { dataPlatformSimulee } from "../../connecteurs/dataPlatformSimulee";
import { archiverProjet, controlerArchive } from "../../archive";
import { importerProjet, synchroniser } from "../../connecteurs/synchro";
import type { Depot } from "../../depot";
import { completudeProjet } from "../../gouvernance";
import { importer, installerReferentiels } from "../../initialisation";
import { indicateursProjet } from "../../lectures";
import { enregistrerSeance } from "../../seances";
import { session } from "../../session";
import { installerGouvernanceDemo } from "../gouvernance";
import { LIGNE_HT, POSTE_HT } from "./dde";
import { CENTRALE_CAD, RESEAU_CAD } from "./den-chaleur";
import { BARRAGE, SCHIFFENEN_MORAT } from "./den-hydraulique";
import { CONTRACTING, HOPITAL } from "./dse";
import { installerProjet, seance } from "./fabrique";
import { ENTREPRISES, PERSONNES, VINCENT } from "./referentiel";
import { DEMATERIALISATION, DURABILITE, FACTURATION, STRATEGIE } from "./transverses";
import type { FicheProjet } from "./types";

export const FICHES: FicheProjet[] = [BARRAGE, SCHIFFENEN_MORAT, RESEAU_CAD, CENTRALE_CAD, LIGNE_HT, POSTE_HT, HOPITAL, CONTRACTING, FACTURATION, DURABILITE, STRATEGIE];
/** Un douzième projet, terminé puis archivé : il n'apparaît que dans l'écran « Archives » */
export const FICHE_ARCHIVEE: FicheProjet = DEMATERIALISATION;
const TOUTES = [...FICHES, FICHE_ARCHIVEE];

export async function chargerPortefeuille(depot: Depot, o: { jour?: string } = {}): Promise<void> {
  const jour = o.jour ?? aujourdhui();
  const horodatage = `${jour}T07:30:00.000Z`;
  installerReferentiels(depot);
  importer(depot, { personnes: PERSONNES, entreprises: ENTREPRISES }, "Personnes et entreprises de la démonstration");
  for (const f of TOUTES) await importerProjet(depot, dataPlatformSimulee, f.numero, horodatage);
  session.ecrire({ utilisateurId: VINCENT, dernierProjetId: null });
  depot.acteurId = VINCENT;

  const seances: Seance[] = [];
  for (const f of TOUTES) seances.push(...((await installerProjet(depot, f, jour))?.seances ?? []));
  await synchroniser(depot, dataPlatformSimulee, { horodatage });

  // Mandats, périodes financières, rapports de phase, charge et capacité : mêmes fonctions que l'application
  installerGouvernanceDemo(depot, jour, {
    finance: "pf-fin", pmo: "pf-pmo", sansComInv: true, sansRapport: [], scenario: null,
    preavis: [CENTRALE_CAD.numero, SCHIFFENEN_MORAT.numero, CONTRACTING.numero, FACTURATION.numero],
    aArreter: [LIGNE_HT.numero, FACTURATION.numero],
    mandats: Object.fromEntries(TOUTES.map((f) => [f.numero, { etat: f.mandat.etat, contenu: { ...f.mandat.contenu, objectifs: f.mandat.objectifs.map(([objectif, critere, approbateur], i) => ({ id: `obj-${f.cle}-${i + 1}`, objectif, critere, approbateur })) } }])),
  });

  const parNumero = (numero: string) => depot.tous("projets").find((p) => p.numeroSource === numero);
  const projet = (f: FicheProjet) => parNumero(f.numero)!;

  depot.grouper("Démonstration : scénario et rapport de clôture", () => {
    // Scénario défavorable du projet de facturation
    const fac = projet(FACTURATION);
    depot.ajouter("scenarios", { id: "sce-fac", projetId: fac.id, nom: "Troisième répétition de reprise et nettoyage des données", type: "Défavorable", valide: true, commentaire: "Si la troisième répétition ne suffit pas, la bascule glisse encore d'un mois.",
      lignes: [{ id: "l1", libelle: "Atterrissage de référence", montant: 4_200_000 }, { id: "l2", libelle: "Nettoyage des données par un prestataire", montant: 180_000 }, { id: "l3", libelle: "Un mois de plus de l'équipe de projet et de l'éditeur", montant: 95_000 }] });
    depot.ajouter("appreciations", { id: "app-fac", projetId: fac.id, auteurId: "pf-pmo", date: ajouterJours(jour, -9), niveau: "À améliorer", texte: "La qualité des données a été sous-estimée au départ ; le suivi des risques et des répétitions de reprise est rigoureux." });

    // Rapport de clôture du poste, en revue
    const poste = projet(POSTE_HT);
    const i = indicateursProjet(depot, poste, jour);
    const cloture = rapportVide({ id: "rap-pht-cloture", projetId: poste.id, type: "Clôture", auteurId: POSTE_HT.chef, date: ajouterJours(jour, -6), preremplissage: {
      resume: "Le nouveau poste 125/20 kV de Praz-Riond remplace l'ancien poste de 1971. Il est en service depuis sept mois, l'ancien poste est démonté et son terrain rendu à l'agriculture.",
      objectifs: "Mise en service sans coupure hors des trois fenêtres annoncées : atteint. Puissance de transformation portée à 2 × 40 MVA : atteint. Une réserve reste ouverte à la clôture.",
      finances: "Budget approuvé de 17,2 millions, coût final prévisionnel de 17,02 millions. L'avenant de la fosse de rétention (118'000 CHF) a été financé par la réserve, dont 200'000 CHF restent disponibles.",
      planning: "Mise en service avec douze jours de retard sur le programme, dus aux essais du contrôle-commande. Le bâtiment a été reçu à la date prévue.",
      qualite: "Deux réserves ne sont pas levées : l'infiltration en toiture, annoncée comme réparée, et deux schémas du contrôle-commande. Le délai de dénonciation des défauts du bâtiment arrive à échéance dans moins de trois mois.",
      enseignements: "Adjuger les transformateurs dix-huit mois avant le gros œuvre a sécurisé le calendrier. Les essais du contrôle-commande demandent une marge de trois semaines, à prévoir dès l'appel d'offres.",
      transfert: "Dossier de l'ouvrage révisé et manuel d'exploitation remis à l'exploitation du réseau. Les contrats de maintenance des transformateurs et de l'appareillage sont signés.",
      reste: "Vérification commune avant la fin de garantie du bâtiment ; levée des deux réserves ; libération du solde de la réserve.",
    } });
    depot.ajouter("rapports", changerStatut(cloture, "En revue", indicateursFiges(i.synthese, { avancement: i.avancement, retards: i.retards.length, risquesOuverts: i.risquesOuverts, risquesCritiques: i.risquesCritiques, completude: completudeProjet(depot, poste, jour).indice, date: jour })));
  }, { origine: "systeme", sansDetail: true });

  // Comité d'investissement : une séance tenue, une séance à venir
  const cominv = seance(depot, { id: "pf-cominv-1", type: "ComInv", jour, internes: ["pf-dg", "pf-dir-den", "pf-dir-dde", "pf-dir-dse", "pf-dir-dfi", "pf-fin", "pf-pmo"], redacteur: "pf-pmo", precedentes: [], fiche: { ilYA: 34, lieu: "Siège, salle du conseil", points: [
    { titre: "Galerie de reconnaissance Schiffenen–Morat", texte: "Le comité approuve l'engagement de 3,6 millions du crédit d'étude pour une galerie de reconnaissance de 350 m.", nature: "Décision", montant: 3_600_000, statut: "Approuvée", clos: true },
    { titre: "Centrale de chauffe des Vergers : crédit d'ouvrage", texte: "Crédit de 16,8 millions approuvé. L'adjudication des chaudières repasse devant le comité.", nature: "Décision", montant: 16_800_000, statut: "Approuvée", condition: "Adjudication des chaudières soumise au comité avant signature" },
    { titre: "Ligne Les Granges – Praz-Riond : avenant du Bois-Murat", texte: "Le comité prend acte de l'avenant de 228'000 CHF financé par la réserve du projet.", clos: true },
    { titre: "Facturation de l'énergie : crédit complémentaire", texte: "Décision reportée à la prochaine séance, dans l'attente de la troisième répétition de reprise.", nature: "Décision", montant: 180_000, statut: "Reportée", responsable: "pf-dubois", dans: 10 },
    { titre: "Arbitrage entre réseau de chaleur et centrale", texte: "Piste de travail : avancer l'étape 3 du réseau si les offres du gros œuvre de la centrale dépassent le devis.", nature: "Note de travail" },
    { titre: "Contracting des Tilleuls : prix plafond de l'offre", texte: "Le modèle financier est à présenter avant la remise de l'offre ferme.", nature: "Tâche", responsable: VINCENT, dans: 60 },
  ] } });
  const projetsPoints = [SCHIFFENEN_MORAT, CENTRALE_CAD, LIGNE_HT, FACTURATION, CENTRALE_CAD, CONTRACTING].map((f) => projet(f).id);
  cominv.points = cominv.points.map((p, i) => ({ ...p, projetId: projetsPoints[i], decision: p.nature === "Note de travail" ? { statut: "Note de travail", restreint: true, conditions: [] } : p.decision }));
  const prochaine = seance(depot, { id: "pf-cominv-2", type: "ComInv", jour, internes: ["pf-dg", "pf-dir-den", "pf-dir-dde", "pf-dir-dse", "pf-dir-dfi", "pf-fin", "pf-pmo"], redacteur: "pf-pmo", precedentes: [cominv], statut: "Planifiée", fiche: { ilYA: -10, lieu: "Siège, salle du conseil", points: [] } });

  // Les séances passent par la même fonction que l'écran : décisions et tâches sont portées au registre
  depot.acteurId = undefined;
  try { for (const s of [...seances, cominv, prochaine]) enregistrerSeance(depot, s); } finally { depot.acteurId = VINCENT; }

  // Le projet terminé : tout est soldé, le rapport de clôture est validé, puis le PMO l'archive
  const clos = projet(FICHE_ARCHIVEE);
  depot.grouper(`Démonstration : clôture de ${clos.code}`, () => {
    for (const r of depot.parProjet("risques", clos.id)) depot.modifier("risques", r.id, { statut: "Clos", dateIdentification: ajouterJours(jour, -600), echeance: ajouterJours(jour, -240) });
    for (const a of depot.parProjet("actions", clos.id)) depot.modifier("actions", a.id, { statut: "Terminé", dateCreation: ajouterJours(a.echeance ?? jour, -30) });
    for (const v of depot.parProjet("validations", clos.id).filter((x) => x.statut === "En cours")) depot.modifier("validations", v.id, { statut: "Approuvé", etapes: v.etapes.map((e) => ({ ...e, statut: "Approuvé" as const, date: e.date ?? ajouterJours(v.dateCreation, 5) })) });
    const i = indicateursProjet(depot, clos, jour);
    const figes = indicateursFiges(i.synthese, { avancement: 100, retards: 0, risquesOuverts: 0, risquesCritiques: 0, completude: completudeProjet(depot, clos, jour).indice, date: ajouterJours(jour, -120) });
    const rapport = rapportVide({ id: "rap-dem-cloture", projetId: clos.id, type: "Clôture", auteurId: FICHE_ARCHIVEE.chef, date: ajouterJours(jour, -125), preremplissage: {
      resume: "Les factures fournisseurs du groupe sont lues, visées et archivées sans papier depuis la mise en service dans les six directions.",
      objectifs: "Délai de traitement de 5,8 jours pour un objectif de six : atteint. Factures payées en retard : 2,1 % pour un objectif de 3 % : atteint. Archivage accepté par l'organe de révision : atteint.",
      finances: "Budget approuvé de 640'000 CHF, coût final de 618'000 CHF. Le solde est rendu.",
      planning: "Mise en service avec neuf jours de retard, dus à la recette des interfaces comptables.",
      qualite: "Neuf factures sur dix sont lues sans reprise ; le portail couvre les deux cents plus petits fournisseurs.",
      enseignements: "Le pilote dans une seule direction a évité un déploiement prématuré. Le blocage du paiement sans visa électronique a suffi à faire disparaître le visa par courriel.",
      transfert: "Exploitation remise à la comptabilité fournisseurs, procédure d'archivage et manuel utilisateur publiés.",
      reste: "Aucun point ouvert.",
    } });
    depot.ajouter("rapports", { ...changerStatut(changerStatut(rapport, "En revue", figes), "Validé"), decision: "Clôture approuvée par le comité de pilotage ; le projet peut être archivé." });
  }, { origine: "systeme", sansDetail: true });
  depot.acteurId = "pf-pmo";
  try {
    const archive = await archiverProjet(depot, clos.id, { motif: "Projet clos : rapport de clôture validé, exploitation remise à la comptabilité.", date: `${ajouterJours(jour, -96)}T10:15:00.000Z` });
    // Contrôle périodique de l'archive : son empreinte est recalculée et comparée au registre
    await controlerArchive(depot, archive, `${ajouterJours(jour, -12)}T08:05:00.000Z`);
  } finally { depot.acteurId = VINCENT; }
}
