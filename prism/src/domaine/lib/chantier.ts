// Règles du suivi de chantier : réserves et garanties, bons de régie, métrés contradictoires,
// journal de chantier. Fonctions pures, sans stockage ni interface.
import type { Constat, EntreeJournalChantier, Metre, Reception, Regie, Reserve } from "../types-chantier";
import type { Contrat } from "../types";
import { ajouterJours, joursEntre } from "./format";

// ---------------------------------------------------------------------------------- Numérotation

/** Numéro suivant d'une série « R-001 », « BR-012 »… : le plus grand numéro existant + 1 */
export function numeroSuivant(existants: { numero: string }[], prefixe: string): string {
  let max = 0;
  for (const x of existants) {
    const m = x.numero.match(/(\d+)\s*$/);
    if (m && x.numero.startsWith(prefixe)) max = Math.max(max, Number(m[1]));
  }
  return `${prefixe}-${String(max + 1).padStart(3, "0")}`;
}

// -------------------------------------------------------------------------------------- Réserves

export const STATUTS_RESERVE = ["Ouverte", "Levée annoncée", "Levée", "Contestée"] as const;
export const GRAVITES = ["Mineure", "Majeure", "Bloquante"] as const;

export const reserveOuverte = (r: Reserve) => r.statut !== "Levée";

/** Jours de retard sur le délai de levée (0 si la réserve est levée, sans délai ou dans le délai) */
export function retardReserve(r: Reserve, jour: string): number {
  if (!reserveOuverte(r) || !r.delai || r.delai >= jour) return 0;
  return joursEntre(r.delai, jour);
}

export interface BilanReserves { total: number; ouvertes: number; annoncees: number; enRetard: number; bloquantes: number; levees: number; tauxLevee: number }

export function bilanReserves(reserves: Reserve[], jour: string): BilanReserves {
  const ouvertes = reserves.filter(reserveOuverte);
  const levees = reserves.length - ouvertes.length;
  return {
    total: reserves.length, ouvertes: ouvertes.length, levees,
    annoncees: ouvertes.filter((r) => r.statut === "Levée annoncée").length,
    enRetard: ouvertes.filter((r) => retardReserve(r, jour) > 0).length,
    bloquantes: ouvertes.filter((r) => r.gravite === "Bloquante").length,
    tauxLevee: reserves.length ? Math.round((levees / reserves.length) * 100) : 100,
  };
}

/** Changement de statut d'une réserve : la levée est datée et signée, la réouverture l'efface */
export function changerStatutReserve(r: Reserve, statut: Reserve["statut"], jour: string, parId?: string): Partial<Reserve> {
  if (statut === "Levée") return { statut, dateLevee: r.dateLevee ?? jour, leveeParId: r.leveeParId ?? parId };
  return { statut, dateLevee: undefined, leveeParId: undefined };
}

// ------------------------------------------------------------------------------------ Réceptions

/** SIA 118 : deux ans pour dénoncer les défauts, cinq ans de prescription (renvois dans sia118.ts) */
export const DUREE_DENONCIATION_ANS = 2;
export const DUREE_PRESCRIPTION_ANS = 5;

const ajouterAnnees = (iso: string, annees: number) => `${Number(iso.slice(0, 4)) + annees}${iso.slice(4)}`;

/** Dates de garantie proposées à partir de la date de réception */
export function garantieDepuis(date: string): { debutGarantie: string; finGarantie: string; prescription: string } {
  return { debutGarantie: date, finGarantie: ajouterAnnees(date, DUREE_DENONCIATION_ANS), prescription: ajouterAnnees(date, DUREE_PRESCRIPTION_ANS) };
}

/** Une réception refusée n'ouvre pas le délai de garantie */
export const garantieCourt = (r: Reception) => r.resultat !== "Refusée" && !!r.finGarantie;

export interface EcheanceGarantie { reception: Reception; fin: string; joursRestants: number; etat: "En cours" | "À vérifier" | "Échue" }

/** Garanties en cours, la plus proche d'abord ; « à vérifier » dans les `alerte` jours avant l'échéance */
export function echeancesGarantie(receptions: Reception[], jour: string, alerte = 90): EcheanceGarantie[] {
  return receptions.filter(garantieCourt).map((reception): EcheanceGarantie => {
    const fin = reception.finGarantie!;
    const joursRestants = joursEntre(jour, fin);
    return { reception, fin, joursRestants, etat: joursRestants < 0 ? "Échue" : joursRestants <= alerte ? "À vérifier" : "En cours" };
  }).sort((a, b) => a.fin.localeCompare(b.fin));
}

/** Résultat cohérent avec les réserves rattachées à la réception */
export function resultatReception(reserves: Reserve[]): Reception["resultat"] {
  if (reserves.some((r) => reserveOuverte(r) && r.gravite === "Bloquante")) return "Refusée";
  return reserves.some(reserveOuverte) ? "Acceptée avec réserves" : "Acceptée";
}

// ---------------------------------------------------------------------------------------- Régies

export const TYPES_LIGNE_REGIE = ["Main-d'œuvre", "Matériel", "Engin"] as const;
export const UNITE_PAR_TYPE: Record<(typeof TYPES_LIGNE_REGIE)[number], string> = { "Main-d'œuvre": "h", "Matériel": "pce", Engin: "h" };

const arrondi = (v: number) => Math.round(v * 100) / 100;

export const totalLigneRegie = (l: { quantite: number; prixUnitaire: number }) => arrondi((l.quantite || 0) * (l.prixUnitaire || 0));
export const totalRegie = (r: Regie) => arrondi(r.lignes.reduce((t, l) => t + totalLigneRegie(l), 0));

export function totalRegieParType(r: Regie): Record<string, number> {
  const out: Record<string, number> = {};
  for (const l of r.lignes) out[l.type] = arrondi((out[l.type] ?? 0) + totalLigneRegie(l));
  return out;
}

/** Une régie validée ou facturée est un document contradictoire : ses lignes ne se modifient plus */
export const regieFigee = (r: Regie) => r.statut === "Validé" || r.statut === "Facturé";

export interface BilanRegies { nombre: number; aValider: number; montantAValider: number; valide: number; facture: number; conteste: number; total: number }

export function bilanRegies(regies: Regie[]): BilanRegies {
  const b: BilanRegies = { nombre: regies.length, aValider: 0, montantAValider: 0, valide: 0, facture: 0, conteste: 0, total: 0 };
  for (const r of regies) {
    const t = totalRegie(r);
    if (r.statut === "Saisi") { b.aValider++; b.montantAValider += t; }
    else if (r.statut === "Validé") b.valide += t;
    else if (r.statut === "Facturé") b.facture += t;
    else b.conteste += t;
    if (r.statut !== "Contesté") b.total += t;
  }
  return b;
}

/** Ce qu'il manque à un bon de régie pour être validé */
export function manquesRegie(r: Regie): string[] {
  const m: string[] = [];
  if (!r.objet.trim()) m.push("l'objet des travaux");
  if (!r.contratId) m.push("le contrat concerné");
  if (r.lignes.length === 0) m.push("au moins une ligne");
  if (r.lignes.some((l) => !l.libelle.trim() || !(l.quantite > 0))) m.push("un libellé et une quantité sur chaque ligne");
  if (r.lignes.some((l) => !(l.prixUnitaire > 0))) m.push("un prix unitaire sur chaque ligne");
  return m;
}

// ---------------------------------------------------------------------------------------- Métrés

export const montantMetre = (m: { quantite: number; prixUnitaire: number }) => arrondi((m.quantite || 0) * (m.prixUnitaire || 0));

export interface LigneSituation {
  position: string; libelle: string; unite: string; prixUnitaire: number;
  /** Quantité relevée jusqu'au mois précédent */
  anterieur: number;
  /** Quantité relevée dans le mois */
  periode: number;
  cumul: number;
  montantPeriode: number;
  montantCumul: number;
  /** Relevés du mois pour cette position */
  metres: Metre[];
}

export interface Situation { lignes: LigneSituation[]; montantPeriode: number; montantAnterieur: number; montantCumul: number; conteste: number }

/**
 * Situation d'un contrat à la fin d'un mois : pour chaque position, quantité antérieure, du mois et
 * cumulée. Les relevés contestés sont montrés mais ne comptent pas dans les montants.
 */
export function situation(metres: Metre[], contratId: string, periode: string): Situation {
  const lignes = new Map<string, LigneSituation>();
  let conteste = 0;
  for (const m of metres.filter((x) => x.contratId === contratId && x.periode <= periode).sort((a, b) => a.periode.localeCompare(b.periode))) {
    const cle = m.position || m.libelle;
    const l = lignes.get(cle) ?? { position: m.position, libelle: m.libelle, unite: m.unite, prixUnitaire: m.prixUnitaire, anterieur: 0, periode: 0, cumul: 0, montantPeriode: 0, montantCumul: 0, metres: [] };
    if (m.periode === periode) l.metres.push(m);
    if (m.statut === "Contesté") { if (m.periode === periode) conteste += montantMetre(m); lignes.set(cle, l); continue; }
    if (m.periode === periode) { l.periode += m.quantite; l.montantPeriode += montantMetre(m); } else l.anterieur += m.quantite;
    l.cumul += m.quantite; l.montantCumul += montantMetre(m);
    // Le libellé et le prix les plus récents font foi
    l.libelle = m.libelle; l.unite = m.unite; l.prixUnitaire = m.prixUnitaire;
    lignes.set(cle, l);
  }
  const liste = [...lignes.values()].map((l) => ({ ...l, anterieur: arrondi(l.anterieur), periode: arrondi(l.periode), cumul: arrondi(l.cumul), montantPeriode: arrondi(l.montantPeriode), montantCumul: arrondi(l.montantCumul) }))
    .sort((a, b) => a.position.localeCompare(b.position, "fr", { numeric: true }) || a.libelle.localeCompare(b.libelle, "fr"));
  const montantPeriode = arrondi(liste.reduce((t, l) => t + l.montantPeriode, 0));
  const montantCumul = arrondi(liste.reduce((t, l) => t + l.montantCumul, 0));
  return { lignes: liste, montantPeriode, montantCumul, montantAnterieur: arrondi(montantCumul - montantPeriode), conteste: arrondi(conteste) };
}

/** Mois pour lesquels un contrat a des relevés, du plus récent au plus ancien */
export const periodesMetrees = (metres: Metre[], contratId: string) => [...new Set(metres.filter((m) => m.contratId === contratId).map((m) => m.periode))].sort().reverse();

/** Montant du contrat, avenants approuvés compris */
export const montantContrat = (c: Contrat) => c.montantInitial + c.avenants.filter((a) => a.statut === "Approuvé").reduce((t, a) => t + a.montant, 0);

/** Part du contrat couverte par les métrés cumulés, en % */
export const avancementMetre = (cumul: number, contrat: Contrat) => { const m = montantContrat(contrat); return m > 0 ? Math.round((cumul / m) * 1000) / 10 : 0; };

// --------------------------------------------------------------------------------------- Journal

export const METEOS = ["Beau", "Nuageux", "Pluie", "Neige", "Gel", "Vent fort"] as const;
export const TYPES_EVENEMENT = ["Livraison", "Visite", "Incident", "Sécurité", "Arrêt", "Autre"] as const;
/** Conditions météorologiques qui peuvent justifier une interruption des travaux */
export const INTEMPERIES: readonly EntreeJournalChantier["meteo"][] = ["Pluie", "Neige", "Gel", "Vent fort"];

export const effectifTotal = (e: EntreeJournalChantier) => e.effectifs.reduce((t, x) => t + (x.personnes || 0), 0);

const jourOuvre = (iso: string) => { const j = new Date(`${iso}T12:00:00Z`).getUTCDay(); return j !== 0 && j !== 6; };

/** Jours ouvrés (lundi à vendredi) sans entrée au journal, entre deux dates comprises */
export function joursSansEntree(entrees: EntreeJournalChantier[], debut: string, fin: string): string[] {
  const dates = new Set(entrees.map((e) => e.date));
  const out: string[] = [];
  for (let j = debut; j <= fin; j = ajouterJours(j, 1)) if (jourOuvre(j) && !dates.has(j)) out.push(j);
  return out;
}

export interface BilanJournal { jours: number; effectifMoyen: number; joursIntemperies: number; arrets: number; incidents: number; nonVerrouillees: number }

export function bilanJournal(entrees: EntreeJournalChantier[]): BilanJournal {
  const avecEffectif = entrees.filter((e) => effectifTotal(e) > 0);
  const compter = (type: string) => entrees.reduce((t, e) => t + e.evenements.filter((x) => x.type === type).length, 0);
  return {
    jours: entrees.length,
    effectifMoyen: avecEffectif.length ? Math.round(avecEffectif.reduce((t, e) => t + effectifTotal(e), 0) / avecEffectif.length) : 0,
    joursIntemperies: entrees.filter((e) => INTEMPERIES.includes(e.meteo)).length,
    arrets: compter("Arrêt"), incidents: compter("Incident") + compter("Sécurité"),
    nonVerrouillees: entrees.filter((e) => !e.verrouillee).length,
  };
}

/** Nouvelle journée : les entreprises présentes la veille sont reprises, avec leur effectif */
export function nouvelleEntree(entrees: EntreeJournalChantier[], o: { id: string; projetId: string; date: string; auteurId?: string }): EntreeJournalChantier {
  const veille = [...entrees].filter((e) => e.date < o.date).sort((a, b) => b.date.localeCompare(a.date))[0];
  return { ...o, meteo: veille?.meteo ?? "Beau", effectifs: (veille?.effectifs ?? []).map((x) => ({ entreprise: x.entreprise, personnes: x.personnes })), travaux: "", evenements: [], photos: [] };
}

/** Entrées qui devraient être verrouillées : antérieures au délai de correction */
export const aVerrouiller = (entrees: EntreeJournalChantier[], jour: string, delaiJours = 7) => entrees.filter((e) => !e.verrouillee && joursEntre(e.date, jour) > delaiJours);

// -------------------------------------------------------------------------------------- Constats

export const TYPES_CONSTAT = ["Qualité", "Sécurité", "Environnement", "Avancement", "État des lieux", "Autre"] as const;

/** Suites données à un constat, pour l'affichage */
export function suitesConstat(c: Constat): string[] {
  return [c.reserveId && "Réserve", c.actionId && "Tâche", c.risqueId && "Risque"].filter((x): x is string => !!x);
}

/** Un constat de qualité ou de sécurité sans suite ni photo mérite d'être complété */
export const constatIncomplet = (c: Constat) => (c.type === "Qualité" || c.type === "Sécurité") && suitesConstat(c).length === 0;

// ---------------------------------------------------------------------------------------- Résumé

export interface DonneesChantier { journal: EntreeJournalChantier[]; reserves: Reserve[]; receptions: Reception[]; regies: Regie[]; constats: Constat[] }

/** Points du chantier qui demandent une action, pour la synthèse du projet */
export function alertesChantier(d: DonneesChantier, jour: string): string[] {
  const r = bilanReserves(d.reserves, jour), g = bilanRegies(d.regies);
  const garanties = echeancesGarantie(d.receptions, jour).filter((e) => e.etat === "À vérifier");
  return [
    r.bloquantes > 0 && `${r.bloquantes} réserve(s) bloquante(s) : la réception n'est pas possible`,
    r.enRetard > 0 && `${r.enRetard} réserve(s) dont le délai de levée est dépassé`,
    r.annoncees > 0 && `${r.annoncees} levée(s) de réserve annoncée(s) à vérifier sur place`,
    g.aValider > 0 && `${g.aValider} bon(s) de régie à valider`,
    ...garanties.map((e) => `Garantie « ${e.reception.objet} » : fin du délai de dénonciation dans ${e.joursRestants} jour(s)`),
  ].filter((x): x is string => !!x);
}

/** Résumé en texte du suivi de chantier, transmis à l'assistant */
export function resumeChantier(d: DonneesChantier, jour: string): string {
  if (!d.journal.length && !d.reserves.length && !d.regies.length && !d.constats.length && !d.receptions.length) return "";
  const lignes: string[] = ["## Suivi de chantier"];
  if (d.journal.length) {
    const b = bilanJournal(d.journal), derniere = [...d.journal].sort((a, c) => c.date.localeCompare(a.date))[0];
    lignes.push(`Journal : ${b.jours} journée(s), la dernière le ${derniere.date} ; effectif moyen ${b.effectifMoyen} ; ${b.joursIntemperies} jour(s) d'intempéries ; ${b.arrets} arrêt(s) ; ${b.incidents} incident(s) ou événement(s) de sécurité.`);
    lignes.push(`Dernière journée (${derniere.date}, ${derniere.meteo}) : ${derniere.travaux || "travaux non décrits"}`);
  }
  if (d.reserves.length) {
    const b = bilanReserves(d.reserves, jour);
    lignes.push(`Réserves : ${b.ouvertes} ouverte(s) sur ${b.total}, dont ${b.bloquantes} bloquante(s) et ${b.enRetard} en retard.`);
    for (const r of d.reserves.filter(reserveOuverte).slice(0, 15)) lignes.push(`- ${r.numero} ${r.libelle} (${r.gravite}, ${r.statut}${r.delai ? `, à lever jusqu'au ${r.delai}` : ""})`);
  }
  for (const e of echeancesGarantie(d.receptions, jour)) lignes.push(`Garantie « ${e.reception.objet} » : réception du ${e.reception.date}, délai de dénonciation jusqu'au ${e.fin} (${e.etat}).`);
  if (d.regies.length) {
    const g = bilanRegies(d.regies);
    lignes.push(`Régies : ${g.nombre} bon(s) ; ${g.aValider} à valider (${g.montantAValider} CHF) ; validé non facturé ${g.valide} CHF ; facturé ${g.facture} CHF ; contesté ${g.conteste} CHF.`);
  }
  if (d.constats.length) {
    lignes.push(`Constats (${d.constats.length}), les plus récents :`);
    for (const c of [...d.constats].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8)) lignes.push(`- ${c.numero} du ${c.date}, ${c.type} : ${c.titre}${suitesConstat(c).length ? ` (suite : ${suitesConstat(c).join(", ").toLowerCase()})` : ", sans suite"}`);
  }
  return lignes.join("\n");
}

// ------------------------------------------------------------------------- Acompte sur situation

export interface Acompte { cumul: number; retenue: number; netCumul: number; anterieurNet: number; acompteHT: number; tva: number; acompteTTC: number }

/**
 * Acompte demandé pour une situation : prestations cumulées, moins la retenue, moins ce qui a déjà
 * été demandé pour les mois précédents. La retenue s'applique au cumul, pas au seul mois.
 */
export function acompteSituation(s: Pick<Situation, "montantCumul" | "montantAnterieur">, retenuePct: number, tauxTVA: number): Acompte {
  const part = 1 - (retenuePct || 0) / 100;
  const cumul = s.montantCumul, retenue = arrondi(cumul * (1 - part)), netCumul = arrondi(cumul - retenue);
  const anterieurNet = arrondi(s.montantAnterieur * part), acompteHT = arrondi(netCumul - anterieurNet), tva = arrondi(acompteHT * (tauxTVA || 0) / 100);
  return { cumul, retenue, netCumul, anterieurNet, acompteHT, tva, acompteTTC: arrondi(acompteHT + tva) };
}
