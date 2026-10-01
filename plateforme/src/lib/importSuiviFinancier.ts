// Import du classeur Excel de suivi financier (feuilles BUDGET, MUTATIONS, COMMANDES, OFFRES,
// IMPORT_SUR_CMD, IMPORT_HORS_CMD) vers le suivi par position de Chantier+.
import type {
  Ajustement, BudgetLigne, Cloture, Contrat, Entreprise, Facture, FactureHorsCommande, ID, Lot, Mutation, OffreAttendue,
  Repartition, StatutContrat, StatutOffreAttendue, TypeContrat,
} from "../types";
import { calculerBudget, photographier, totaux, type Totaux } from "./budget";

export interface Feuille {
  sheet: string;
  data: unknown[][];
}

export interface OptionsImport {
  projetId: ID;
  /** Entreprises déjà connues (rapprochées par le nom) */
  entreprises: Entreprise[];
  /** Mois de la clôture de reprise, ex. « 2026-07 » */
  moisCloture: string;
  dateImport: string;
  auteurId?: ID;
  nomFichier?: string;
}

export interface LigneControle {
  libelle: string;
  classeur: number;
  chantier: number;
  note?: string;
}

export interface ResultatImport {
  lots: Lot[];
  budget: BudgetLigne[];
  mutations: Mutation[];
  contrats: Contrat[];
  offres: OffreAttendue[];
  ajustements: Ajustement[];
  factures: Facture[];
  facturesHorsCommande: FactureHorsCommande[];
  entreprises: Entreprise[];
  clotures: Cloture[];
  controle: LigneControle[];
  avertissements: string[];
  resume: string;
}

// ---------------------------------------------------------------------------
// Lecture des cellules
// ---------------------------------------------------------------------------

const txt = (v: unknown) => (v === null || v === undefined ? "" : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).trim());
const num = (v: unknown) => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(txt(v).replace(/['’\s]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const dateIso = (v: unknown) => {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const t = txt(v);
  const m = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return /^\d{4}-\d{2}-\d{2}/.test(t) ? t.slice(0, 10) : "";
};
const entete = (v: unknown) => txt(v).replace(/\s+/g, " ").toLowerCase();
const arrondi = (x: number) => Math.round(x * 100) / 100;

function feuille(feuilles: Feuille[], nom: string): unknown[][] | null {
  return feuilles.find((f) => f.sheet.trim().toUpperCase() === nom)?.data ?? null;
}

/** Index de la ligne d'en-tête contenant tous les libellés demandés (début de texte) */
function ligneEntete(data: unknown[][], libelles: string[]): number {
  return data.findIndex((r) => libelles.every((l) => r.some((c) => entete(c).startsWith(l.toLowerCase()))));
}
const colonne = (r: unknown[], libelle: string) => r.findIndex((c) => entete(c).startsWith(libelle.toLowerCase()));

/** Clé de rapprochement d'un nom d'entreprise : sans accents, formes juridiques ni ponctuation */
export function cleEntreprise(nom: string): string {
  return nom.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/,.*$/, "")
    .replace(/\b(sa|sarl|s\.a\.|s\.a|ag|gmbh|ltd|sas|s\.?a\.?r\.?l\.?)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ").trim();
}

const STATUTS_OFFRE: StatutOffreAttendue[] = ["En cours", "Reçue", "Retenue", "Commandée", "Refusée", "Expirée"];

function typeContrat(fournisseur: string, description: string): TypeContrat {
  return /ing[ée]n|etude|étude|\bsia\b|archi|honorair|\bdp\b|conseil|\bbim\b|g[ée]om[èe]tre|g[ée]otech|sondage|analyse|rapport|s[ée]curit/i.test(`${fournisseur} ${description}`)
    ? "Mandat" : "Contrat d'entreprise";
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

export function importerSuiviFinancier(feuilles: Feuille[], o: OptionsImport): ResultatImport {
  const avert: string[] = [];
  const budgetData = feuille(feuilles, "BUDGET");
  if (!budgetData) throw new Error("Feuille « BUDGET » introuvable : ce fichier n'est pas un classeur de suivi financier reconnu.");
  const pid = o.projetId;
  const prefixe = `${pid}-x`;

  // --- Lots (récap de la feuille SUIVI)
  const nomsLots = new Map<string, string>();
  for (const r of feuille(feuilles, "SUIVI") ?? []) {
    for (const c of r) {
      const m = txt(c).match(/^Lot\s+(\w+)\s*[—–-]\s*(.+)$/);
      if (m) nomsLots.set(m[1], m[2].trim());
    }
  }

  // --- Positions
  const h = ligneEntete(budgetData, ["Lot", "Position 0", "ID", "Budget Initial"]);
  if (h < 0) throw new Error("En-têtes de la feuille BUDGET non reconnus.");
  const e = budgetData[h];
  const c = {
    lot: colonne(e, "Lot"), groupe: colonne(e, "Position 0"), libelle: colonne(e, "Position 1"), etape: colonne(e, "Et."),
    id: colonne(e, "ID"), initial: colonne(e, "Budget Initial"), revise: colonne(e, "Budget Révisé"), engage: colonne(e, "Engagé"),
    attendu: colonne(e, "Attendu"), atterrissage: colonne(e, "Atterrissage"), facture: e.findIndex((x) => /^factur[ée] \(chf\)|^factur[ée]$/.test(entete(x)) || entete(x) === "facturé (chf)"),
    paye: colonne(e, "Payé"), horsCmd: colonne(e, "Facturé hors cmd"),
  };
  if (c.facture < 0) c.facture = e.findIndex((x) => entete(x).startsWith("facturé") && !entete(x).includes("hors"));

  const lots = new Map<string, Lot>();
  const budget: BudgetLigne[] = [];
  const excel = { initial: 0, revise: 0, engage: 0, attendu: 0, atterrissage: 0, facture: 0, paye: 0, horsCmd: 0 };
  const parRef = new Map<string, ID>();
  for (const r of budgetData.slice(h + 1)) {
    const ref = txt(r[c.id]);
    const libelle = txt(r[c.libelle]);
    if (!ref || !libelle) continue;
    const codeLot = txt(r[c.lot]);
    if (!lots.has(codeLot)) {
      lots.set(codeLot, { id: `${prefixe}-lot-${codeLot || "x"}`, projetId: pid, code: `L${codeLot}`, nom: nomsLots.get(codeLot) ?? `Lot ${codeLot}`, cfc: [] });
    }
    const groupe = txt(r[c.groupe]);
    const ligne: BudgetLigne = {
      id: parRef.has(ref) ? `${prefixe}-pos-${budget.length + 1}` : `${prefixe}-pos-${ref.replace(/[^\w-]/g, "") || budget.length + 1}`, projetId: pid, cfc: "", libelle, groupe, etape: txt(r[c.etape]) || undefined,
      montant: num(r[c.initial]), lotId: lots.get(codeLot)!.id, refExterne: ref,
      ...(/divers et impr[ée]vus|r[ée]serve/i.test(`${groupe} ${libelle}`) ? { reserve: true } : {}),
    };
    budget.push(ligne);
    parRef.set(ref, ligne.id);
    excel.initial += num(r[c.initial]);
    excel.revise += num(r[c.revise]);
    excel.engage += num(r[c.engage]);
    excel.attendu += num(r[c.attendu]);
    excel.atterrissage += num(r[c.atterrissage]);
    excel.facture += c.facture >= 0 ? num(r[c.facture]) : 0;
    excel.paye += num(r[c.paye]);
    excel.horsCmd += c.horsCmd >= 0 ? num(r[c.horsCmd]) : 0;
  }
  if (!budget.length) throw new Error("Aucune position trouvée dans la feuille BUDGET.");

  // --- Libellés des listes déroulantes → positions (feuille REF, sinon reconstruits)
  const parLibelle = new Map<string, ID>();
  for (const r of feuille(feuilles, "REF") ?? []) {
    const id = parRef.get(txt(r[0]));
    if (id && txt(r[1])) parLibelle.set(txt(r[1]), id);
  }
  for (const l of budget) {
    const lot = [...lots.values()].find((x) => x.id === l.lotId)!;
    parLibelle.set(`${lot.code}|${l.groupe}|${l.libelle} [Et.${l.etape ?? ""}]`, l.id);
  }
  const introuvables = new Set<string>();
  const position = (libelle: string): ID | undefined => {
    if (!libelle) return undefined;
    const id = parLibelle.get(libelle) ?? parRef.get(libelle.split(/\s+[—–-]\s+/)[0]);
    if (!id) introuvables.add(libelle);
    return id;
  };
  /** Paires (position, montant) à partir d'une colonne, sur n paires */
  const paires = (r: unknown[], debut: number, n: number): Repartition[] => {
    const rep: Repartition[] = [];
    for (let i = 0; i < n; i++) {
      const id = position(txt(r[debut + 2 * i]));
      const m = num(r[debut + 2 * i + 1]);
      if (id && Math.abs(m) > 0.004) rep.push({ budgetId: id, montant: arrondi(m) });
    }
    return rep;
  };

  // --- Entreprises
  const entreprises: Entreprise[] = [];
  const parCle = new Map<string, Entreprise>();
  for (const x of o.entreprises) parCle.set(cleEntreprise(x.nom), x);
  const entreprise = (nom: string): Entreprise | undefined => {
    if (!nom || /^(a d[ée]finir|-)$/i.test(nom)) return undefined;
    const k = cleEntreprise(nom);
    if (!k) return undefined;
    if (!parCle.has(k)) {
      const n: Entreprise = { id: `${prefixe}-ent-${entreprises.length + 1}`, nom, localite: "", contact: "", email: "", telephone: "", specialites: [] };
      parCle.set(k, n);
      entreprises.push(n);
    }
    return parCle.get(k);
  };

  // --- Mutations
  const mutations: Mutation[] = [];
  const mutData = feuille(feuilles, "MUTATIONS") ?? [];
  for (let i = 0; i < mutData.length; i++) {
    const titre = txt(mutData[i][0]);
    const m = titre.match(/^MUTATION\s+N°\s*(\S+)/i);
    if (!m) continue;
    const motifL = mutData[i + 1] ?? [];
    const colDate = motifL.findIndex((x) => /^date/i.test(txt(x)));
    const colVal = motifL.findIndex((x) => /^valid/i.test(txt(x)));
    const lignes: Repartition[] = [];
    for (let j = i + 3; j < mutData.length && !/^total/i.test(txt(mutData[j][0])) && !/^mutation/i.test(txt(mutData[j][0])); j++) {
      const r = mutData[j];
      const deb = position(txt(r[1]));
      const cre = position(txt(r[5]));
      if (deb && num(r[2])) lignes.push({ budgetId: deb, montant: -Math.abs(num(r[2])) });
      if (cre && num(r[6])) lignes.push({ budgetId: cre, montant: Math.abs(num(r[6])) });
    }
    if (!lignes.length) continue;
    const valideur = colVal >= 0 ? txt(motifL[colVal + 1]) : "";
    mutations.push({
      id: `${prefixe}-mut-${m[1]}`, projetId: pid, numero: m[1], motif: txt(motifL[1]) || "(sans motif)",
      date: (colDate >= 0 && dateIso(motifL[colDate + 1])) || o.dateImport, statut: "Validée",
      remarques: `Reprise du classeur${valideur ? ` – validée par ${valideur}` : ""}`, lignes,
    });
  }

  // --- Commandes
  const contrats: Contrat[] = [];
  const ajustements: Ajustement[] = [];
  const cmdData = feuille(feuilles, "COMMANDES") ?? [];
  const hc = ligneEntete(cmdData, ["N° Commande", "Fournisseur", "Montant"]);
  if (hc >= 0) {
    const e2 = cmdData[hc];
    const sous = cmdData[hc + 1] ?? [];
    const p1 = colonne(e2, "Position 1");
    const nPaires = e2.filter((x) => /^position \d+$/.test(entete(x))).length;
    const cCorr = colonne(sous, "Correction");
    const vus = new Map<string, number>();
    for (const r of cmdData.slice(hc + 2)) {
      const numero = txt(r[0]);
      if (!numero) continue;
      const fournisseur = txt(r[1]);
      const description = txt(r[2]);
      const ent = entreprise(fournisseur);
      const statutX = txt(r[5]);
      const statut: StatutContrat = /annul/i.test(statutX) ? "Annulé" : /r[ée]ception/i.test(statutX) ? "Réceptionné" : /cl[ôo]tur|sold/i.test(statutX) ? "Clôturé" : "En cours";
      const rep = paires(r, p1, nPaires);
      const montant = num(r[4]);
      const ecart = montant - rep.reduce((s, x) => s + x.montant, 0);
      if (rep.length && Math.abs(ecart) > 1) avert.push(`Commande ${numero} : ${ecart.toFixed(2)} CHF non répartis sur les positions.`);
      if (!rep.length) avert.push(`Commande ${numero} (${fournisseur}) sans position : à répartir.`);
      vus.set(numero, (vus.get(numero) ?? 0) + 1);
      if (vus.get(numero) === 2) avert.push(`Numéro de commande ${numero} présent plusieurs fois : les factures sont rattachées à la première ligne.`);
      const ctr: Contrat = {
        id: `${prefixe}-cmd-${contrats.length + 1}`, projetId: pid, numero, entrepriseId: ent?.id ?? "", cfc: "",
        lotId: rep.length ? budget.find((b) => b.id === rep[0].budgetId)?.lotId : undefined,
        objet: description || fournisseur, type: typeContrat(fournisseur, description), montantInitial: arrondi(montant),
        dateSignature: dateIso(r[3]), retenuePct: 0, statut, avenants: [], repartition: rep,
        remarques: txt(r[6]) || undefined,
      };
      contrats.push(ctr);
      const corr = cCorr >= 0 ? num(r[cCorr]) : 0;
      if (Math.abs(corr) > 0.004) {
        ajustements.push({
          id: `${prefixe}-aj-c${contrats.length}`, projetId: pid, type: "Correction de commande", libelle: `Correction ${numero} – ${description || fournisseur}`,
          montant: Math.abs(corr), probabilite: 100, statut: "Active", contratId: ctr.id, date: o.dateImport, auteurId: o.auteurId,
          repartition: rep.length ? rep : [], justification: "Colonne « Correction » du classeur (non comptée dans l'atterrissage du classeur).",
        });
      }
    }
  }

  // --- Offres et estimations
  const offres: OffreAttendue[] = [];
  const offData = feuille(feuilles, "OFFRES") ?? [];
  const ho = ligneEntete(offData, ["N° Offre", "Statut"]);
  if (ho >= 0) {
    const e3 = offData[ho];
    const p1 = colonne(e3, "Position 1");
    const nPaires = e3.filter((x) => /^position \d+$/.test(entete(x))).length;
    const sous = offData[ho + 1] ?? [];
    let cTotal = colonne(sous, "Montant total saisi");
    if (cTotal < 0) cTotal = colonne(e3, "Montant Total");
    const numerosOffres = new Map<string, number>();
    for (const r of offData.slice(ho + 2)) {
      const ref = txt(r[0]);
      const fournisseur = txt(r[1]);
      if (!ref && !fournisseur) continue;
      const type = txt(r[3]);
      const statutX = txt(r[4]);
      const statut = STATUTS_OFFRE.find((s) => s.toLowerCase() === statutX.toLowerCase()) ?? "En cours";
      const remarques = txt(r[5]);
      const rep = paires(r, p1, nPaires);
      const impute = rep.reduce((s, x) => s + x.montant, 0);
      const montant = num(r[cTotal]) || impute;
      const nom = `${/estimation/i.test(type) ? "Estimation" : "Offre"} n° ${ref}${remarques ? ` (${remarques})` : ""}`;
      if (rep.length && Math.abs(impute - montant) > 1) {
        avert.push(`${nom} : montant saisi ${montant.toLocaleString("fr-CH")} CHF, mais ${impute.toLocaleString("fr-CH")} CHF imputés sur les positions. Le classeur comptait le montant imputé ; Chantier+ retient le montant saisi.`);
      }
      if (ref) {
        numerosOffres.set(ref, (numerosOffres.get(ref) ?? 0) + 1);
        if (numerosOffres.get(ref) === 2) avert.push(`Numéro d'offre ${ref} utilisé deux fois : vérifier que les deux lignes sont bien distinctes (le classeur n'en comptait qu'une).`);
      }
      if (/estimation/i.test(type)) {
        ajustements.push({
          id: `${prefixe}-aj-o${offres.length + ajustements.length + 1}`, projetId: pid, type: "Estimation interne",
          libelle: [remarques, fournisseur && !/a d[ée]finir/i.test(fournisseur) ? `(${fournisseur})` : ""].filter(Boolean).join(" ") || `Estimation ${ref}`,
          montant: arrondi(montant), probabilite: 100, statut: statut === "Commandée" ? "Convertie" : ["Refusée", "Expirée"].includes(statut) ? "Abandonnée" : "Active",
          repartition: rep, date: dateIso(r[2]) || o.dateImport, auteurId: o.auteurId, justification: `Estimation n° ${ref} reprise du classeur.`,
        });
        continue;
      }
      const ent = entreprise(fournisseur);
      const kf = cleEntreprise(fournisseur);
      const ctr = statut === "Commandée"
        ? contrats.find((k) => Math.abs(k.montantInitial - montant) < 1 && (k.entrepriseId === ent?.id || cleEntreprise(entreprises.find((x) => x.id === k.entrepriseId)?.nom ?? "").startsWith(kf)))
        : undefined;
      offres.push({
        id: `${prefixe}-off-${offres.length + 1}`, projetId: pid, numero: ref, fournisseur, entrepriseId: ent?.id,
        description: remarques || fournisseur, date: dateIso(r[2]) || undefined, type: "Offre ferme", statut, montant: arrondi(montant),
        repartition: rep, contratId: ctr?.id,
      });
    }
  }

  // --- Factures sur commande (export Power BI)
  const factures: Facture[] = [];
  const facturesHorsCommande: FactureHorsCommande[] = [];
  const paye = (s: string) => /^(r[ée]gl[ée]e?|pay[ée]e?)$/i.test(s);
  const plus30 = (iso: string) => { if (!iso) return ""; const d = new Date(iso); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10); };
  const surData = feuille(feuilles, "IMPORT_SUR_CMD") ?? [];
  const hs = ligneEntete(surData, ["N° comd", "N° fact"]);
  if (hs >= 0) {
    const e4 = surData[hs];
    const col = (l: string) => colonne(e4, l);
    const cc = { cmd: col("N° comd"), fact: col("N° fact"), montant: col("Montant validé"), date: col("Date"), statut: col("Statut facture"), four: col("Fournisseur"), ff: col("N° fact fourn") };
    for (const r of surData.slice(hs + 1)) {
      const cmd = txt(r[cc.cmd]);
      const montant = num(r[cc.montant]);
      if (!cmd || !montant) continue;
      const date = dateIso(r[cc.date]);
      const ctr = contrats.find((k) => k.numero === cmd);
      if (!ctr) {
        avert.push(`Facture ${txt(r[cc.fact])} : commande ${cmd} introuvable, classée hors commande (à affecter).`);
        facturesHorsCommande.push({
          id: `${prefixe}-fhc-${facturesHorsCommande.length + 1}`, projetId: pid, numero: txt(r[cc.fact]), numeroFournisseur: txt(r[cc.ff]) || undefined,
          fournisseur: txt(r[cc.four]), date, montantHT: arrondi(montant), paye: paye(txt(r[cc.statut])), repartition: [], remarques: `Commande ${cmd} introuvable dans le classeur`,
        });
        continue;
      }
      factures.push({
        id: `${prefixe}-fac-${factures.length + 1}`, projetId: pid, contratId: ctr.id,
        numero: [txt(r[cc.fact]), txt(r[cc.ff]) && `(${txt(r[cc.ff])})`].filter(Boolean).join(" "),
        type: montant < 0 ? "Régie" : "Situation", date, echeance: plus30(date), montantHT: arrondi(montant), statut: paye(txt(r[cc.statut])) ? "Payée" : "Approuvée",
      });
    }
  }

  // --- Factures hors commande
  const horsData = feuille(feuilles, "IMPORT_HORS_CMD") ?? [];
  const hh = ligneEntete(horsData, ["N° fact", "Montant validé"]);
  if (hh >= 0) {
    const e5 = horsData[hh];
    const col = (l: string) => colonne(e5, l);
    const cc = {
      fact: col("N° fact"), montant: col("Montant validé"), date: col("Date"), statut: col("Statut facture"), four: col("Fournisseur"), ff: col("N° fact fourn"),
      p1: col("Position 1"), m1: col("Montant P1"), p2: col("Position 2"), m2: col("Montant P2"), p3: col("Position 3"), m3: col("Montant P3"),
    };
    for (const r of horsData.slice(hh + 1)) {
      const numero = txt(r[cc.fact]);
      const montant = num(r[cc.montant]);
      if (!numero || !montant) continue;
      const rep: Repartition[] = [];
      const pos1 = position(txt(r[cc.p1]));
      const vide = (i: number) => i < 0 || txt(r[i]) === "";
      if (pos1) rep.push({ budgetId: pos1, montant: !vide(cc.m1) ? num(r[cc.m1]) : vide(cc.p2) && vide(cc.p3) ? montant : 0 });
      const pos2 = cc.p2 >= 0 ? position(txt(r[cc.p2])) : undefined;
      if (pos2) rep.push({ budgetId: pos2, montant: num(r[cc.m2]) });
      const pos3 = cc.p3 >= 0 ? position(txt(r[cc.p3])) : undefined;
      if (pos3) rep.push({ budgetId: pos3, montant: num(r[cc.m3]) });
      facturesHorsCommande.push({
        id: `${prefixe}-fhc-${facturesHorsCommande.length + 1}`, projetId: pid, numero, numeroFournisseur: txt(r[cc.ff]) || undefined,
        fournisseur: txt(r[cc.four]), date: dateIso(r[cc.date]), montantHT: arrondi(montant), paye: paye(txt(r[cc.statut])),
        repartition: rep.filter((x) => Math.abs(x.montant) > 0.004).map((x) => ({ ...x, montant: arrondi(x.montant) })),
      });
    }
  }
  const nonAffectees = facturesHorsCommande.filter((f) => !f.repartition.length).length;
  if (nonAffectees) avert.push(`${nonAffectees} facture(s) hors commande sans position : à affecter dans l'onglet Factures.`);
  for (const l of introuvables) avert.push(`Position « ${l} » introuvable dans le budget.`);

  // --- Contrôle et clôture de reprise
  const lotsListe = [...lots.values()];
  const ps = calculerBudget({ budget, lots: lotsListe, contrats, factures, facturesHorsCommande, offres, ajustements, mutations, appelsOffres: [] });
  const t: Totaux = totaux(ps);
  const corrections = ajustements.filter((a) => a.type === "Correction de commande").reduce((s, a) => s + a.montant, 0);
  const controle: LigneControle[] = [
    { libelle: "Budget initial", classeur: excel.initial, chantier: t.initial },
    { libelle: "Budget révisé", classeur: excel.revise, chantier: t.revise },
    { libelle: "Engagé (commandes)", classeur: excel.engage, chantier: t.engageCommandes },
    { libelle: "Factures hors commande", classeur: excel.horsCmd, chantier: t.horsCommande, note: nonAffectees ? "Factures non affectées comprises" : undefined },
    { libelle: "Facturé", classeur: excel.facture, chantier: t.facture },
    { libelle: "Payé", classeur: excel.paye, chantier: t.paye },
    { libelle: "Atterrissage hors corrections de commande", classeur: excel.atterrissage, chantier: t.atterrissage - corrections,
      note: Math.abs(t.atterrissage - corrections - excel.atterrissage) > 1 ? "Écart dû aux offres et estimations signalées dans les avertissements" : undefined },
    { libelle: "Atterrissage Chantier+", classeur: excel.atterrissage, chantier: t.atterrissage, note: corrections ? `Dont ${Math.round(corrections).toLocaleString("fr-CH")} CHF de corrections de commande, que le classeur ne comptait pas` : undefined },
  ];
  const clotures: Cloture[] = [{
    id: `${prefixe}-clo-${o.moisCloture}`, projetId: pid, mois: o.moisCloture, date: o.dateImport, auteurId: o.auteurId,
    commentaire: `Reprise du classeur ${o.nomFichier ?? "de suivi financier"}.`, ...photographier(ps),
  }];

  return {
    lots: lotsListe, budget, mutations, contrats, offres, ajustements, factures, facturesHorsCommande, entreprises, clotures, controle,
    avertissements: avert,
    resume: `${budget.length} positions sur ${lots.size} lots, ${mutations.length} mutations, ${contrats.length} commandes, ${offres.length} offres, `
      + `${ajustements.length} estimations et corrections, ${factures.length + facturesHorsCommande.length} factures, ${entreprises.length} nouvelles entreprises`,
  };
}

/** Mois de référence tiré du nom de fichier (…_20260713…), sinon le mois courant */
export function moisDuFichier(nom: string, defaut: string): string {
  const m = nom.match(/(20\d{2})[-_.]?(0[1-9]|1[0-2])[-_.]?([0-3]\d)/);
  return m ? `${m[1]}-${m[2]}` : defaut.slice(0, 7);
}
