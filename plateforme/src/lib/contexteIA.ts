// Construit un résumé textuel du projet actif, transmis à l'assistant IA comme contexte.
import type { AppelOffres, BudgetLigne, Contrat, DocumentProjet, Entreprise, Facture, Lot, Personne, Projet, Tache } from "../types";
import { libelleCFC } from "../data/cfc";
import {
  avancementPlanning, avenantsEnAttente, evaluerSoumissions, factureDuContrat, montantContrat,
  positionsManquantes, suiviParCFC, tachesEnRetard, totauxSuivi,
} from "./finance";

interface Donnees {
  projet: Projet;
  lots: Lot[];
  budget: BudgetLigne[];
  appelsOffres: AppelOffres[];
  contrats: Contrat[];
  factures: Facture[];
  taches: Tache[];
  documents: DocumentProjet[];
  entreprises: Entreprise[];
  personnes: Personne[];
}

const chf = (v: number) => `${Math.round(v).toLocaleString("de-CH")} CHF`;

export function construireContexte(d: Donnees, aujourdhui: string): string {
  const nomEnt = (id?: string) => d.entreprises.find((e) => e.id === id)?.nom ?? "?";
  const nomPers = (id?: string) => d.personnes.find((p) => p.id === id)?.nom ?? "—";
  const suivi = suiviParCFC(d.budget, d.contrats, d.factures, d.appelsOffres);
  const t = totauxSuivi(suivi);
  const lignes: string[] = [];

  lignes.push(`# Projet ${d.projet.code} – ${d.projet.nom}`);
  lignes.push(`Maître d'ouvrage : ${d.projet.maitreOuvrage} · Lieu : ${d.projet.lieu} · Phase SIA : ${d.projet.phase}`);
  lignes.push(`Période : ${d.projet.dateDebut} → ${d.projet.dateFin} · Date du jour : ${aujourdhui} · TVA ${d.projet.tauxTVA} %`);
  lignes.push(`Directeur de projet : ${nomPers(d.projet.directeurId)}`);
  if (d.projet.description) lignes.push(d.projet.description);

  lignes.push(`\n## Lots`);
  for (const l of d.lots) lignes.push(`- ${l.code} ${l.nom} (CFC ${l.cfc.join(", ")}) – responsable : ${nomPers(l.responsableId)}`);

  lignes.push(`\n## Synthèse financière (HT)`);
  lignes.push(`Budget ${chf(t.budget)} · Engagé ${chf(t.engage)} · Avenants en attente ${chf(t.enAttente)} · Facturé ${chf(t.facture)} · Payé ${chf(t.paye)} · Prévision ${chf(t.prevision)} · Écart ${chf(t.ecart)}`);
  lignes.push(`\n| CFC | Libellé | Budget | Engagé | En attente | Facturé | Prévision | Écart |\n|---|---|---|---|---|---|---|---|`);
  for (const [code, l] of [...suivi].sort(([a], [b]) => a.localeCompare(b))) {
    if (code.length < 2 && suivi.size > 12) continue;
    lignes.push(`| ${code} | ${libelleCFC(code)} | ${chf(l.budget)} | ${chf(l.engage)} | ${chf(l.enAttente)} | ${chf(l.facture)} | ${chf(l.prevision)} | ${chf(l.ecart)} |`);
  }

  lignes.push(`\n## Contrats`);
  for (const c of d.contrats) {
    const f = factureDuContrat(c, d.factures);
    lignes.push(`- ${c.numero} · ${nomEnt(c.entrepriseId)} · ${c.objet} (CFC ${c.cfc}, ${c.statut}) : initial ${chf(c.montantInitial)}, actualisé ${chf(montantContrat(c))}, facturé ${chf(f.facture)} (${f.avancementPct.toFixed(0)} %), retenue ${chf(f.retenue)}`);
    for (const a of c.avenants) lignes.push(`  - Avenant ${a.numero} (${a.statut}, ${a.date}) : ${a.objet} – ${chf(a.montant)}`);
    const enAttente = avenantsEnAttente(c);
    if (enAttente) lignes.push(`  - ⚠ ${chf(enAttente)} d'avenants en attente de décision`);
  }

  const aTraiter = d.factures.filter((f) => f.statut === "Reçue" || f.statut === "Contrôlée");
  if (aTraiter.length) {
    lignes.push(`\n## Factures à traiter`);
    for (const f of aTraiter) {
      const c = d.contrats.find((x) => x.id === f.contratId);
      lignes.push(`- ${c?.numero ?? "?"} ${f.numero} (${f.type}) du ${f.date}, échéance ${f.echeance} : ${chf(f.montantHT)} – ${f.statut}${f.echeance < aujourdhui ? " – ÉCHUE" : ""}`);
    }
  }

  lignes.push(`\n## Appels d'offres`);
  for (const ao of d.appelsOffres) {
    lignes.push(`- ${ao.numero} · ${ao.objet} (CFC ${ao.cfc}, procédure ${ao.procedure}, ${ao.statut}) · retour ${ao.dateRetour} · estimation ${chf(ao.montantEstime)} · ${ao.positions.length} positions CAN`);
    const evals = evaluerSoumissions(ao);
    for (const e of evals) {
      const s = ao.soumissions.find((x) => x.id === e.soumissionId)!;
      const manq = positionsManquantes(ao, s);
      lignes.push(`  - Rang ${e.rang} : ${nomEnt(s.entrepriseId)} – ${chf(e.montant)} net, note prix ${e.notePrix.toFixed(2)}, total ${e.total.toFixed(0)}/500${manq ? ` – ${manq} position(s) sans prix` : ""}`);
    }
    if (ao.criteres.length) lignes.push(`  - Critères : ${ao.criteres.map((c) => `${c.nom} ${c.poids} %`).join(", ")}`);
  }

  const retard = tachesEnRetard(d.taches, aujourdhui);
  lignes.push(`\n## Planning (avancement global ${avancementPlanning(d.taches).toFixed(0)} %)`);
  for (const tache of d.taches) {
    const enRetard = retard.includes(tache);
    lignes.push(`- ${tache.jalon ? "◆ " : ""}${tache.nom} : ${tache.debut} → ${tache.fin}, ${tache.avancement} %${enRetard ? " – EN RETARD" : ""}`);
  }

  if (d.documents.length) {
    lignes.push(`\n## Documents récents`);
    for (const doc of [...d.documents].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15)) {
      lignes.push(`- ${doc.nom} (${doc.categorie}, v${doc.version}, ${doc.date})`);
    }
  }
  return lignes.join("\n");
}
