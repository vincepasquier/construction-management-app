// Gouvernance de démonstration, entièrement fictive : mandats, périodes financières, rapports,
// séances, décisions, charge et capacité. Elle est construite avec les mêmes fonctions que
// l'application (soumission, signature, enregistrement d'une séance…), pas écrite à la main.
import { ajouterJours, moisDe } from "../../domaine/lib/format";
import { estActif, score } from "../../domaine/lib/risques";
import { contenuInitial, creerMandat, signer, soumettre } from "../../domaine/socle/mandat";
import { moisPrecedent, photographier } from "../../domaine/socle/periodes";
import { changerStatut, indicateursFiges, rapportVide } from "../../domaine/socle/rapports";
import { nouvelleSeance } from "../../domaine/socle/seances";
import type { PartiePrenante, PointSeance, Seance } from "../../domaine/socle/types";
import type { Projet } from "../../domaine/types";
import type { Depot } from "../depot";
import { completudeProjet } from "../gouvernance";
import { indicateursProjet, syntheseProjet } from "../lectures";
import { enregistrerSeance } from "../seances";

const SYSTEME = { origine: "systeme" as const };

/** Projets dont le dossier est volontairement laissé incomplet, pour que les vues aient quelque chose à montrer */
const SANS_MANDAT = new Set(["NUM-2026-0021", "INF-2026-0312-02"]);
const SANS_RAPPORT = new Set(["NUM-2025-0177", "ENR-2025-0098"]);

const BENEFICES: Record<string, string> = {
  construction: "Ouvrage remis en état pour plusieurs décennies, sécurité des usagers améliorée, réseaux renouvelés en une seule intervention.",
  investissement: "Fiabilité de l'exploitation, réduction des interventions de dépannage et conformité aux exigences en vigueur.",
  numerique: "Moins de ressaisies et de fichiers parallèles, information partagée et disponible au bon moment.",
  organisation: "Processus plus court et plus lisible, décisions tracées, charge administrative réduite.",
};

export function installerGouvernanceDemo(depot: Depot, jour: string): void {
  const acteur = depot.acteurId;
  const personnes = depot.tous("personnes");
  const nom = (id?: string) => personnes.find((p) => p.id === id)?.nom ?? "";
  const projets = depot.tous("projets");
  const racines = projets.filter((p) => !p.parentId);
  const mois = moisPrecedent(moisDe(jour));
  const typeDe = (p: Projet) => depot.parId("typesProjet", p.typeProjetId);

  depot.grouper("Gouvernance de démonstration", () => {
    for (const p of projets) {
      const pid = p.id;
      const code = p.numeroSource ?? p.code;
      const type = typeDe(p);
      const demarre = p.dateDebut <= jour;

      // Parties prenantes
      const parties: PartiePrenante[] = [
        ...(p.sponsorId ? [{ id: `pp-${pid}-1`, projetId: pid, personneId: p.sponsorId, roleProjet: "Sponsor", interne: true, responsabilites: "Arbitre les priorités et représente le projet devant les organes de décision." }] : []),
        ...(p.directeurId ? [{ id: `pp-${pid}-2`, projetId: pid, personneId: p.directeurId, roleProjet: "Chef de projet", interne: true, responsabilites: "Conduit le projet, tient le budget, le planning et les risques." }] : []),
        { id: `pp-${pid}-3`, projetId: pid, personneId: "per-fin", roleProjet: "Finance", interne: true, responsabilites: "Contrôle de gestion et arrêts de période." },
        { id: `pp-${pid}-4`, projetId: pid, nom: type?.id === "construction" ? "Commune et riverains" : "Utilisateurs des directions concernées", roleProjet: type?.id === "construction" ? "Riverain / tiers" : "Utilisateur", interne: type?.id !== "construction", remarques: "À informer avant chaque étape visible." },
      ];
      if (code !== "INF-2026-0312-02") for (const x of parties) depot.ajouter("partiesPrenantes", x, SYSTEME);

      // Mandat signé, sauf pour les projets dont le dossier reste à compléter
      const s = syntheseProjet(depot, pid);
      const risques = depot.parProjet("risques", pid).filter(estActif).sort((a, b) => score(b) - score(a));
      const contenu = contenuInitial(p, { auteur: personnes.find((x) => x.id === p.directeurId), sponsor: personnes.find((x) => x.id === p.sponsorId) ?? personnes.find((x) => x.id === "per-dir"), chef: personnes.find((x) => x.id === p.directeurId), portefeuille: depot.parId("portefeuilles", p.portefeuilleId)?.nom, budget: s.budgetApprouve || 100_000, risques });
      contenu.motifs.efficience = true;
      contenu.benefices = BENEFICES[type?.id ?? ""] ?? BENEFICES.investissement;
      contenu.objectifs = [
        { id: `obj-${pid}-1`, objectif: "Livrer l'ouvrage ou la solution dans le périmètre convenu", critere: "Réception sans réserve majeure à la date prévue", approbateur: "Sponsor" },
        { id: `obj-${pid}-2`, objectif: "Tenir l'enveloppe financière", critere: "Coût final dans le budget approuvé", approbateur: "Finance" },
      ];
      contenu.perimetre = p.description;
      contenu.impactsEnvironnementaux = type?.id === "construction" ? "Nuisances de chantier limitées par le phasage ; matériaux d'excavation valorisés sur place." : "Aucun";
      contenu.impactsSociaux = "Information régulière des personnes concernées ; accompagnement au changement.";
      contenu.preavisComInv = ["ENR-2025-0098", "INF-2026-0240", "INF-2026-0312"].includes(code);
      contenu.composanteIT = type?.id === "numerique";
      contenu.descriptionIT = type?.id === "numerique" ? "Solution métier reposant sur l'environnement informatique du groupe ; l'informatique valide l'architecture, la sécurité et les interfaces." : "";
      contenu.phases = contenu.phases.map((ph, i) => (ph.applicable ? { ...ph, debut: ajouterJours(p.dateDebut, -120 + i * 40), fin: i === contenu.phases.length - 1 ? p.dateFin : ajouterJours(p.dateDebut, -80 + i * 40), livrables: ["Mandat de projet signé", "", "Dossier de projet et devis", "", "Ouvrage ou solution en service"][i] } : ph));
      contenu.ressources = [{ id: `res-${pid}-1`, provenance: `Chefferie de projet – ${nom(p.directeurId) || "à désigner"}`, joursHommes: 60, confirmee: true }, { id: `res-${pid}-2`, provenance: "Direction métier", joursHommes: 25, confirmee: demarre }];
      if (!contenu.risques.length) contenu.risques = [{ id: `rsq-${pid}-1`, risque: "Disponibilité des ressources internes", reponse: "Faire confirmer les ressources par les responsables d'unité avant le lancement." }];
      let mandat = creerMandat(pid, contenu, { id: `man-${pid}`, auteurId: p.directeurId, date: ajouterJours(p.dateDebut, -150) });
      if (!SANS_MANDAT.has(code) && contenu.chefProjet && contenu.commanditaire) {
        mandat = soumettre(mandat, personnes, ajouterJours(p.dateDebut, -140));
        for (const sg of mandat.signatures) mandat = signer(mandat, sg.role, ajouterJours(p.dateDebut, -130));
      }
      depot.ajouter("mandats", mandat, SYSTEME);

      // Revue récente d'une partie des risques
      depot.parProjet("risques", pid).forEach((r, i) => {
        if (i % 3 !== 2) depot.modifier("risques", r.id, { revues: [{ date: ajouterJours(jour, -12 - i * 9), auteurId: r.proprietaireId ?? p.directeurId, probabilite: r.probabilite, impact: r.impact, commentaire: "Revue mensuelle : évaluation confirmée." }], strategie: "Réduire", nature: "Risque" }, SYSTEME);
      });
    }

    // Périodes financières des trois derniers mois, pour les projets démarrés
    for (const p of racines.filter((x) => x.dateDebut <= jour)) {
      const s = syntheseProjet(depot, p.id);
      const avant = moisPrecedent(mois), encore = moisPrecedent(avant);
      const recule = (part: number, derive: number) => ({ ...s, engage: s.engage * part, realise: s.realise * part, paye: s.paye * part, atterrissage: s.atterrissage - (s.atterrissage - s.budgetApprouve) * derive, atterrissageDefavorable: s.atterrissageDefavorable });
      depot.ajouter("periodesFinancieres", photographier(p.id, encore, `${avant}-03T08:00:00.000Z`, recule(0.82, 1), "per-fin"), SYSTEME);
      depot.ajouter("periodesFinancieres", photographier(p.id, avant, `${mois}-03T08:00:00.000Z`, recule(0.91, 0.6), "per-fin", Math.abs(s.ecartPct) > 1 ? "Première alerte sur l'atterrissage, à confirmer le mois prochain." : undefined), SYSTEME);
      // Le dernier mois reste à arrêter pour deux projets : c'est le travail qui attend la Finance
      if (!["NUM-2025-0177", "INF-2026-0240"].includes(p.numeroSource ?? "")) depot.ajouter("periodesFinancieres", photographier(p.id, mois, `${moisDe(jour)}-03T08:00:00.000Z`, recule(0.97, 0.9), "per-fin", Math.abs(s.ecartPct) > 1 ? "Écart expliqué par les avenants en cours ; mesures engagées." : undefined), SYSTEME);
    }

    // Rapports de phase validés pour les phases terminées
    for (const p of racines) {
      const phases = typeDe(p)?.phases ?? [];
      const rang = phases.indexOf(p.phaseGroupe ?? "");
      if (rang <= 0 || SANS_RAPPORT.has(p.numeroSource ?? "")) continue;
      const i = indicateursProjet(depot, p, jour);
      for (const phase of phases.slice(0, p.statut === "Terminé" ? phases.length : rang)) {
        if (phase === "Clôture") continue;
        let r = rapportVide({ id: `rap-${p.id}-${phases.indexOf(phase)}`, projetId: p.id, type: "Phase", phase, auteurId: p.directeurId, date: ajouterJours(p.dateDebut, -30 + phases.indexOf(phase) * 45) });
        r = { ...r, sections: r.sections.map((sec) => ({ ...sec, texte: `${sec.titre} : objectifs de la phase « ${phase} » tenus ; aucun écart significatif à signaler.` })) };
        r = changerStatut(changerStatut(r, "En revue", indicateursFiges(i.synthese, { avancement: i.avancement, retards: i.retards.length, risquesOuverts: i.risquesOuverts, risquesCritiques: i.risquesCritiques, completude: completudeProjet(depot, p, jour).indice, date: r.date })), "Validé");
        depot.ajouter("rapports", { ...r, decision: "Rapport conforme, passage de phase recommandé." }, SYSTEME);
      }
    }

    // Charge demandée et capacité des directions
    const annee = Number(jour.slice(0, 4));
    racines.forEach((p, i) => {
      if (p.statut === "Terminé") return;
      const base = 40 + ((i * 37) % 90);
      for (const a of [annee, annee + 1]) {
        if (String(a) > p.dateFin.slice(0, 4)) continue;
        depot.ajouter("estimationsCharge", { id: `jh-${p.id}-${a}-1`, projetId: p.id, annee: a, phase: p.phaseGroupe, directionId: p.directionId, competence: "Direction de projet", joursHommes: base }, SYSTEME);
        depot.ajouter("estimationsCharge", { id: `jh-${p.id}-${a}-2`, projetId: p.id, annee: a, phase: p.phaseGroupe, directionId: typeDe(p)?.id === "numerique" ? p.directionId : "dir-num", competence: "Informatique", joursHommes: Math.round(base / 4) }, SYSTEME);
        depot.ajouter("estimationsCharge", { id: `jh-${p.id}-${a}-3`, projetId: p.id, annee: a, phase: p.phaseGroupe, directionId: "dir-fin", competence: "Finance", joursHommes: 8 }, SYSTEME);
      }
    });
    for (const [directionId, jh] of [["dir-inf", 260], ["dir-enr", 220], ["dir-num", 160], ["dir-fin", 90]] as const) {
      for (const a of [annee, annee + 1]) depot.ajouter("capacites", { id: `cap-${directionId}-${a}-toutes`, directionId, annee: a, joursHommes: jh }, SYSTEME);
    }

    // Scénario défavorable et appréciation
    const critique = racines.find((p) => p.numeroSource === "NUM-2025-0177");
    if (critique) {
      const s = syntheseProjet(depot, critique.id);
      depot.ajouter("scenarios", { id: `sce-${critique.id}`, projetId: critique.id, nom: "Reprise manuelle des espaces non conformes", type: "Défavorable", valide: true, lignes: [{ id: "l1", libelle: "Atterrissage de référence", montant: Math.round(s.atterrissage) }, { id: "l2", libelle: "Reprise manuelle de 400 espaces de projet", montant: 45_000, annee }, { id: "l3", libelle: "Prolongation de l'assistance externe", montant: 28_000, annee: annee + 1 }] }, SYSTEME);
      depot.ajouter("appreciations", { id: `app-${critique.id}`, projetId: critique.id, auteurId: "per-pmo", date: ajouterJours(jour, -20), niveau: "À améliorer", texte: "Le périmètre a été sous-estimé au départ ; le suivi des risques est tenu, mais le mandat doit être révisé pour refléter la reprise manuelle." }, SYSTEME);
    }
  }, { origine: "systeme", sansDetail: true, irreversible: true });

  // Séance du comité d'investissement : trois décisions, dont une à diffusion restreinte et une condition échue
  const parCode = (code: string) => projets.find((p) => (p.numeroSource ?? p.code) === code)?.id;
  const point = (n: string, code: string, x: Partial<PointSeance>): PointSeance => ({ id: `pt-demo-${n}`, numero: n, projetId: parCode(code), titre: "", texte: "", nature: "Décision", statut: "Ouvert", origineSeanceId: "sea-demo-1", ...x });
  const seance: Seance = {
    ...nouvelleSeance([], { id: "sea-demo-1", type: "ComInv", date: ajouterJours(jour, -35), redacteurId: "per-pmo" }),
    lieu: "Salle du conseil", statut: "Diffusée", prochaineSeance: ajouterJours(jour, 10),
    participants: [{ personneId: "per-cominv", presence: "Présent", diffusion: true }, { personneId: "per-dir", presence: "Présent", diffusion: true }, { personneId: "per-fin", presence: "Présent", diffusion: true }, { personneId: "per-pmo", presence: "Présent", diffusion: true }, { personneId: "per-keller", presence: "Excusé", diffusion: true }],
    points: [
      point("1.1", "INF-2026-0312", { titre: "Crédit d'étude pour la centrale de chauffe", texte: "Le comité accorde le crédit d'étude et demande une variante avec stockage thermique.", responsableId: "per-dir", decision: { statut: "Approuvée", montant: 480_000, conditions: [{ id: "cnd-demo-1", texte: "Présenter la variante avec stockage thermique", responsableId: "per-dir", echeance: ajouterJours(jour, -5), statut: "En cours" }, { id: "cnd-demo-2", texte: "Confirmer les subventions cantonales", responsableId: "per-fin", echeance: ajouterJours(jour, 40), statut: "À traiter" }] } }),
      point("1.2", "ENR-2026-0154", { titre: "Libération de la troisième tranche", texte: "Tranche libérée conformément au mandat.", statut: "Clos", decision: { statut: "Approuvée", montant: 2_100_000, conditions: [] } }),
      point("1.3", "NUM-2025-0177", { titre: "Demande de crédit complémentaire", texte: "Décision reportée à la prochaine séance, dans l'attente du mandat révisé.", responsableId: "per-dubois", echeance: ajouterJours(jour, 10), decision: { statut: "Reportée", montant: 73_000, conditions: [] } }),
      point("1.4", "FIN-2026-0009", { titre: "Arbitrage des priorités du portefeuille", texte: "Piste de travail : regrouper deux projets d'organisation.", nature: "Note de travail", decision: { statut: "Note de travail", restreint: true, conditions: [] } }),
      point("1.5", "INF-2025-0601", { titre: "Chiffrer l'effet de l'avenant du giratoire sur l'atterrissage", nature: "Tâche", responsableId: projets.find((p) => p.id === parCode("INF-2025-0601"))?.directeurId, echeance: ajouterJours(jour, 7), decision: undefined }),
    ],
  };
  const origine = depot.acteurId;
  depot.acteurId = undefined;
  try { enregistrerSeance(depot, seance); } finally { depot.acteurId = origine ?? acteur; }
}
