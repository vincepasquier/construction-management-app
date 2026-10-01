// Construit un résumé textuel du projet actif, transmis à l'assistant IA comme contexte.
import type {
  Action, Ajustement, Autorisation, Servitude, AppelOffres, BudgetLigne, CircuitValidation, Cloture, Contrat, DocumentProjet, Entreprise,
  Facture, FactureHorsCommande, Lot, Mutation, OffreAttendue, Personne, Projet, Risque, Tache,
} from "../types";
import { criticite, estActif, score } from "./risques";
import { etapeCourante } from "./validations";
import {
  avancementPlanning, avenantsEnAttente, evaluerSoumissions, factureDuContrat, montantContrat,
  positionsManquantes, tachesEnRetard,
} from "./finance";
import { calculerBudget, effetAjustement, equilibreMutation, grouper, reserve, STATUTS_OFFRE_ACTIFS, totaux } from "./budget";

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
  risques?: Risque[];
  actions?: Action[];
  validations?: CircuitValidation[];
  autorisations?: Autorisation[];
  servitudes?: Servitude[];
  mutations?: Mutation[];
  offres?: OffreAttendue[];
  ajustements?: Ajustement[];
  facturesHorsCommande?: FactureHorsCommande[];
  clotures?: Cloture[];
}

const chf = (v: number) => `${Math.round(v).toLocaleString("de-CH")} CHF`;

export function construireContexte(d: Donnees, aujourdhui: string): string {
  const nomEnt = (id?: string) => d.entreprises.find((e) => e.id === id)?.nom ?? "?";
  const nomPers = (id?: string) => d.personnes.find((p) => p.id === id)?.nom ?? "—";
  const positions = calculerBudget({
    budget: d.budget, lots: d.lots, contrats: d.contrats, factures: d.factures, appelsOffres: d.appelsOffres,
    facturesHorsCommande: d.facturesHorsCommande ?? [], offres: d.offres ?? [], ajustements: d.ajustements ?? [], mutations: d.mutations ?? [],
  });
  const t = totaux(positions);
  const res = reserve(positions);
  const nomLot = (id?: string) => { const l = d.lots.find((x) => x.id === id); return l ? `${l.code} ${l.nom}` : "Hors lot"; };
  const nomPos = (id: string) => { const p = positions.find((x) => x.id === id); return p ? `${p.ligne.groupe ? `${p.ligne.groupe} / ` : ""}${p.ligne.libelle}${p.ligne.etape ? ` [Ét. ${p.ligne.etape}]` : ""}` : "?"; };
  const lignes: string[] = [];

  lignes.push(`# Projet ${d.projet.code} – ${d.projet.nom}`);
  lignes.push(`Maître d'ouvrage : ${d.projet.maitreOuvrage} · Lieu : ${d.projet.lieu} · Phase SIA : ${d.projet.phase}`);
  lignes.push(`Période : ${d.projet.dateDebut} → ${d.projet.dateFin} · Date du jour : ${aujourdhui} · TVA ${d.projet.tauxTVA} %`);
  lignes.push(`Directeur de projet : ${nomPers(d.projet.directeurId)}`);
  if (d.projet.description) lignes.push(d.projet.description);

  lignes.push(`\n## Lots`);
  for (const l of d.lots) lignes.push(`- ${l.code} ${l.nom} (CFC ${l.cfc.join(", ")}) – responsable : ${nomPers(l.responsableId)}${l.phase ? ` – phase SIA ${l.phase}` : ""}`);

  lignes.push(`\n## Synthèse financière (HT)`);
  lignes.push(`Règles : budget révisé = initial + mutations validées ; atterrissage = engagé (commandes + avenants approuvés + factures hors commande) + attendu (offres actives, avenants demandés, AO en cours) + reste à engager + ajustements pondérés ; écart = révisé − atterrissage (négatif = dépassement).`);
  lignes.push(`Budget initial ${chf(t.initial)} · Mutations ${chf(t.mutations)} · Budget révisé ${chf(t.revise)} · Engagé ${chf(t.engage)} · Attendu ${chf(t.attendu)} · Reste à engager ${chf(t.rae)} · Ajustements ${chf(t.ajustements)} · Atterrissage probable ${chf(t.atterrissage)} (défavorable ${chf(t.atterrissageDefavorable)}) · Écart ${chf(t.ecart)} · Facturé ${chf(t.facture)} · Payé ${chf(t.paye)}`);
  if (res.nombre) lignes.push(`Réserve (divers et imprévus) : révisée ${chf(res.revise)}, consommée ${chf(res.consomme)}, restante ${chf(res.restant)}`);
  lignes.push(`\n| Lot | Révisé | Engagé | Attendu | Reste à engager | Ajustements | Atterrissage | Écart | Facturé |\n|---|---|---|---|---|---|---|---|---|`);
  for (const g of grouper(positions, (p) => p.lotId ?? "")) {
    const x = g.totaux;
    lignes.push(`| ${nomLot(g.cle)} | ${chf(x.revise)} | ${chf(x.engage)} | ${chf(x.attendu)} | ${chf(x.rae)} | ${chf(x.ajustements)} | ${chf(x.atterrissage)} | ${chf(x.ecart)} | ${chf(x.facture)} |`);
  }
  lignes.push(`\n### Positions\n| Lot | Position | CFC | Révisé | Engagé | Attendu | Reste à eng. | Ajust. | Atterrissage | Écart | Facturé |\n|---|---|---|---|---|---|---|---|---|---|---|`);
  for (const p of positions.filter((x) => Math.abs(x.revise) + Math.abs(x.atterrissage) > 0.5).slice(0, 200)) {
    lignes.push(`| ${d.lots.find((l) => l.id === p.lotId)?.code ?? ""} | ${nomPos(p.id)}${p.ligne.reserve ? " (réserve)" : ""}${p.virtuelle ? " (hors budget)" : ""} | ${p.ligne.cfc} | ${chf(p.revise)} | ${chf(p.engage)} | ${chf(p.attendu)} | ${chf(p.rae)} | ${chf(p.ajustements)} | ${chf(p.atterrissage)} | ${chf(p.ecart)} | ${chf(p.facture)} |`);
  }
  if (d.mutations?.length) {
    lignes.push(`\n## Mutations budgétaires`);
    for (const m of d.mutations) lignes.push(`- ${m.numero} (${m.date}, ${m.statut}) : ${m.motif} – ${chf(equilibreMutation(m).debits)} ; ${m.lignes.map((l) => `${l.montant > 0 ? "+" : ""}${chf(l.montant)} ${nomPos(l.budgetId)}`).join(" ; ")}`);
  }
  const offresActives = (d.offres ?? []).filter((o) => STATUTS_OFFRE_ACTIFS.has(o.statut));
  if (offresActives.length) {
    lignes.push(`\n## Offres attendues (non commandées)`);
    for (const o of offresActives) lignes.push(`- ${o.numero} ${o.fournisseur} : ${o.description} – ${chf(o.montant)} (${o.statut}) → ${o.repartition.map((r) => nomPos(r.budgetId)).join(", ") || "non répartie"}`);
  }
  const ajActifs = (d.ajustements ?? []).filter((a) => a.statut === "Active");
  if (ajActifs.length) {
    lignes.push(`\n## Estimations prévisionnelles et ajustements`);
    for (const a of ajActifs) lignes.push(`- ${a.type} : ${a.libelle} – ${chf(a.montant)} à ${a.probabilite} % (effet ${chf(effetAjustement(a).probable)}) → ${a.repartition.map((r) => nomPos(r.budgetId)).join(", ")}${a.justification ? ` – ${a.justification}` : ""}`);
  }
  const hcNonAffectees = (d.facturesHorsCommande ?? []).filter((f) => !f.repartition.length);
  if (hcNonAffectees.length) lignes.push(`\n${hcNonAffectees.length} facture(s) hors commande non affectée(s) pour ${chf(hcNonAffectees.reduce((x, f) => x + f.montantHT, 0))}.`);
  const derniere = d.clotures?.at(-1);
  if (derniere) {
    lignes.push(`\n## Dernière clôture (${derniere.mois})`);
    lignes.push(`Atterrissage ${chf(derniere.totaux.atterrissage)} → aujourd'hui ${chf(t.atterrissage)} (engagé ${chf(t.engage - derniere.totaux.engage)}, attendu ${chf(t.attendu - derniere.totaux.attendu)}, reste à engager ${chf(t.rae - derniere.totaux.rae)}, ajustements ${chf(t.ajustements - derniere.totaux.ajustements)}).${derniere.commentaire ? ` Commentaire : ${derniere.commentaire}` : ""}`);
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

  const risques = (d.risques ?? []).filter(estActif).sort((a, b) => score(b) - score(a));
  if (d.risques?.length) {
    lignes.push(`\n## Registre des risques (${risques.length} actif(s))`);
    for (const r of d.risques) {
      lignes.push(`- ${r.code} ${r.titre} [${r.categorie}] : P${r.probabilite} × I${r.impact} = ${score(r)} (${criticite(score(r))}), impact ${chf(r.impactFinancier)}, ${r.statut}, responsable ${nomPers(r.proprietaireId)}${r.mesures ? ` – mesures : ${r.mesures}` : ""}`);
    }
  }

  const ouvertes = (d.actions ?? []).filter((a) => a.statut !== "Terminé");
  if (ouvertes.length) {
    lignes.push(`\n## Tâches ouvertes`);
    for (const a of ouvertes) {
      lignes.push(`- ${a.titre} → ${nomPers(a.assigneId)}, ${a.statut}, priorité ${a.priorite}${a.echeance ? `, échéance ${a.echeance}${a.echeance < aujourdhui ? " – EN RETARD" : ""}` : ""}${a.origine ? ` (origine : ${a.origine})` : ""}`);
    }
  }

  const circuits = (d.validations ?? []).filter((v) => v.statut === "En cours" || v.statut === "À corriger");
  if (circuits.length) {
    lignes.push(`\n## Validations en cours`);
    for (const v of circuits) {
      const ec = etapeCourante(v);
      lignes.push(`- ${v.titre} (${v.objet.type}, v${v.version}) : ${v.statut}${ec ? `, en attente de ${nomPers(ec.personneId)}` : ""}${v.echeance ? `, échéance ${v.echeance}` : ""}`);
    }
  }

  if (d.autorisations?.length || d.servitudes?.length) {
    lignes.push(`\n## Autorisations et foncier`);
    for (const a of d.autorisations ?? []) {
      lignes.push(`- ${a.type} « ${a.objet} » (${a.autorite}${a.reference ? `, réf. ${a.reference}` : ""}) : ${a.statut}, ${a.oppositions} opposition(s)${a.validite ? `, valable jusqu'au ${a.validite}` : ""}`);
      for (const c of a.conditions) lignes.push(`  - Condition ${c.service} : ${c.texte} – ${c.statut}${c.echeance ? `, échéance ${c.echeance}` : ""}, responsable ${nomPers(c.responsableId)}`);
    }
    for (const s of d.servitudes ?? []) {
      lignes.push(`- Parcelle ${s.parcelle} (${s.commune}), ${s.proprietaire} : ${s.type}, ${s.statut}${s.indemnite ? `, indemnité ${chf(s.indemnite)}` : ""}${s.echeance ? `, échéance ${s.echeance}` : ""}`);
    }
  }

  if (d.documents.length) {
    lignes.push(`\n## Documents récents`);
    for (const doc of [...d.documents].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15)) {
      lignes.push(`- ${doc.nom} (${doc.categorie}, v${doc.version}, ${doc.date})`);
    }
  }
  return lignes.join("\n");
}
