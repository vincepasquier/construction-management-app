// Contrôles de qualité des données : complétude, cohérence, unicité et fraîcheur. Chaque anomalie
// désigne son domaine, l'objet concerné, son propriétaire, et l'endroit où la corriger — dans PRISM
// ou, pour une donnée maîtrisée ailleurs, dans le système source.
import { factureDuContrat, montantContrat } from "../domaine/lib/finance";
import { joursEntre } from "../domaine/lib/format";
import { estActif } from "../domaine/lib/risques";
import { libelleChamp } from "../domaine/socle/libelles";
import { rapprochement } from "../domaine/socle/synthese";
import type { ID, Projet } from "../domaine/types";
import type { Depot } from "./depot";
import { risquesARevoir } from "./gouvernance";
import { champsManquantsProjet, syntheseProjet, typeDe } from "./lectures";

export type DomaineQualite = "Fiche projet" | "Finances" | "Risques" | "Planning" | "Référentiels";
export type Gravite = "Bloquant" | "À corriger" | "À vérifier";
export type Controle = "Complétude" | "Cohérence" | "Unicité" | "Fraîcheur";

export interface Anomalie {
  cle: string;
  domaine: DomaineQualite;
  controle: Controle;
  gravite: Gravite;
  projetId?: ID;
  objet: string;
  message: string;
  proprietaireId?: ID;
  /** Où corriger */
  lien?: string;
  /** La correction se fait dans le système source, pas dans PRISM */
  aLaSource?: boolean;
}

const ECART_SOURCE_PCT = 5;
const JOURS_FRAICHEUR = 7;

export function controler(depot: Depot, projets: Projet[], jour: string): Anomalie[] {
  const out: Anomalie[] = [];
  const config = depot.parId("configurations", "courante");
  const codes = new Map<string, number>();
  for (const p of depot.tous("projets")) codes.set(p.code.trim().toLowerCase(), (codes.get(p.code.trim().toLowerCase()) ?? 0) + 1);

  for (const p of projets) {
    const pid = p.id;
    const lien = (sous = "") => `/projets/${pid}${sous ? `/${sous}` : ""}`;
    const a = (x: Omit<Anomalie, "projetId" | "proprietaireId" | "cle"> & { proprietaireId?: ID; cle: string }) => out.push({ projetId: pid, proprietaireId: p.directeurId, ...x, cle: `${pid}|${x.cle}` });

    // --- Fiche projet
    const manquants = champsManquantsProjet(p, typeDe(depot, p));
    if (manquants.length) a({ cle: "champs", domaine: "Fiche projet", controle: "Complétude", gravite: manquants.includes("directeurId") ? "Bloquant" : "À corriger", objet: p.code, message: `Champs obligatoires vides : ${manquants.map(libelleChamp).join(", ")}`, lien: lien() });
    if (p.dateFin && p.dateDebut && p.dateFin < p.dateDebut) a({ cle: "dates", domaine: "Fiche projet", controle: "Cohérence", gravite: "À corriger", objet: p.code, message: "La date de fin précède la date de début", lien: lien(), aLaSource: p.synchro?.champs.includes("dateFin") });
    if ((codes.get(p.code.trim().toLowerCase()) ?? 0) > 1) a({ cle: "code", domaine: "Fiche projet", controle: "Unicité", gravite: "À corriger", objet: p.code, message: "Ce code est porté par plusieurs projets", lien: lien() });
    if (p.statut === "En cours" && p.dateFin < jour) a({ cle: "echu", domaine: "Fiche projet", controle: "Cohérence", gravite: "À vérifier", objet: p.code, message: `Projet « en cours » dont la date de fin (${p.dateFin}) est dépassée`, lien: lien(), aLaSource: p.synchro?.champs.includes("dateFin") });
    if (!p.numeroSource && !p.provisoire) a({ cle: "source", domaine: "Fiche projet", controle: "Complétude", gravite: "À vérifier", objet: p.code, message: "Projet sans numéro dans le système source", lien: lien() });
    for (const [champ, s] of Object.entries(p.synchro?.surcharges ?? {})) {
      a({ cle: `surcharge-${champ}`, domaine: "Fiche projet", controle: "Cohérence", gravite: "À corriger", objet: p.code, message: `« ${libelleChamp(champ)} » corrigé localement (${s.motif}) : à corriger dans le système source`, lien: lien(), aLaSource: true });
    }

    // --- Finances
    const s = syntheseProjet(depot, pid);
    if (p.synchro && joursEntre(p.synchro.date.slice(0, 10), jour) > JOURS_FRAICHEUR) a({ cle: "fraicheur", domaine: "Finances", controle: "Fraîcheur", gravite: "À vérifier", objet: p.code, message: `Dernière synchronisation il y a ${joursEntre(p.synchro.date.slice(0, 10), jour)} jours`, lien: "/administration/connecteurs" });
    for (const r of rapprochement(s)) {
      const base = Math.max(Math.abs(r.source), 1);
      if (Math.abs(r.ecart) / base * 100 > ECART_SOURCE_PCT && Math.abs(r.ecart) > 1000) a({ cle: `rapprochement-${r.champ}`, domaine: "Finances", controle: "Cohérence", gravite: "À vérifier", objet: `${p.code} · ${r.champ}`, message: `Écart de ${Math.round(r.ecart).toLocaleString("fr-CH")} CHF entre le calcul (${Math.round(r.prism).toLocaleString("fr-CH")}) et la source (${Math.round(r.source).toLocaleString("fr-CH")})`, lien: lien("finances") });
    }
    const contrats = depot.parProjet("contrats", pid);
    const factures = depot.parProjet("factures", pid);
    const vues = new Map<string, number>();
    for (const f of factures) vues.set(`${f.contratId}|${f.numero.trim().toLowerCase()}`, (vues.get(`${f.contratId}|${f.numero.trim().toLowerCase()}`) ?? 0) + 1);
    for (const [cle, n] of vues) {
      if (n < 2) continue;
      const [contratId, numero] = cle.split("|");
      const c = contrats.find((x) => x.id === contratId);
      a({ cle: `doublon-${cle}`, domaine: "Finances", controle: "Unicité", gravite: "À corriger", objet: `${c?.numero ?? "Contrat"} · facture ${numero.toUpperCase()}`, message: `Numéro de facture saisi ${n} fois sur le même contrat`, lien: lien(`contrats/${contratId}`) });
    }
    for (const c of contrats) {
      const facture = factureDuContrat(c, factures).facture, montant = montantContrat(c);
      if (montant > 0 && facture > montant + 0.5) a({ cle: `depassement-${c.id}`, domaine: "Finances", controle: "Cohérence", gravite: "À corriger", objet: c.numero, message: `Facturé (${Math.round(facture).toLocaleString("fr-CH")}) au-delà du montant du contrat avenants compris (${Math.round(montant).toLocaleString("fr-CH")})`, lien: lien(`contrats/${c.id}`) });
    }
    const sourceFactures = depot.parProjet("facturesSource", pid);
    const vuesSource = new Map<string, number>();
    for (const f of sourceFactures) vuesSource.set(`${f.fournisseur}|${f.numero}`, (vuesSource.get(`${f.fournisseur}|${f.numero}`) ?? 0) + 1);
    for (const [cle, n] of vuesSource) if (n > 1) a({ cle: `doublon-source-${cle}`, domaine: "Finances", controle: "Unicité", gravite: "À corriger", objet: cle.replace("|", " · "), message: `Facture reçue ${n} fois du système comptable`, lien: lien("finances"), aLaSource: true });

    // --- Risques
    const risques = depot.parProjet("risques", pid);
    for (const r of risques.filter(estActif)) {
      if (!r.proprietaireId) a({ cle: `risque-sans-${r.id}`, domaine: "Risques", controle: "Complétude", gravite: "À corriger", objet: `${r.code} ${r.titre}`, message: "Risque ouvert sans responsable", lien: lien("risques") });
      for (const m of r.mesuresDetail ?? []) if (m.echeance && m.echeance < jour && m.statut !== "Réalisée" && m.statut !== "Abandonnée") a({ cle: `mesure-${m.id}`, domaine: "Risques", controle: "Fraîcheur", gravite: "À corriger", objet: `${r.code} · ${m.texte}`, message: `Mesure échue depuis le ${m.echeance}`, proprietaireId: m.responsableId ?? r.proprietaireId, lien: lien("risques") });
    }
    for (const r of risquesARevoir(risques, jour, config?.joursRevueRisque ?? 90)) a({ cle: `revue-${r.id}`, domaine: "Risques", controle: "Fraîcheur", gravite: "À vérifier", objet: `${r.code} ${r.titre}`, message: `Risque non revu depuis plus de ${config?.joursRevueRisque ?? 90} jours`, proprietaireId: r.proprietaireId ?? p.directeurId, lien: lien("risques") });

    // --- Planning
    for (const t of depot.parProjet("taches", pid)) {
      if (t.fin < t.debut) a({ cle: `tache-${t.id}`, domaine: "Planning", controle: "Cohérence", gravite: "À corriger", objet: t.nom, message: "La tâche se termine avant de commencer", proprietaireId: t.responsableId ?? p.directeurId, lien: lien("planning") });
      if (t.jalon && t.fin < jour && !t.finReelle && t.avancement < 100) a({ cle: `jalon-${t.id}`, domaine: "Planning", controle: "Fraîcheur", gravite: "À corriger", objet: t.nom, message: `Jalon dépassé depuis le ${t.fin}, sans date réelle ni nouvelle date`, proprietaireId: t.responsableId ?? p.directeurId, lien: lien("planning") });
    }
  }

  // --- Référentiels
  for (const d of depot.tous("directions")) if (!d.responsableId) out.push({ cle: `direction-${d.id}`, domaine: "Référentiels", controle: "Complétude", gravite: "À vérifier", objet: `${d.code} · ${d.nom}`, message: "Direction sans responsable désigné", lien: "/administration/referentiels" });
  const ordre: Gravite[] = ["Bloquant", "À corriger", "À vérifier"];
  return out.sort((x, y) => ordre.indexOf(x.gravite) - ordre.indexOf(y.gravite));
}

export interface BilanQualite {
  total: number;
  parDomaine: Record<string, number>;
  parGravite: Record<Gravite, number>;
  aLaSource: number;
}

export function bilan(anomalies: Anomalie[]): BilanQualite {
  const b: BilanQualite = { total: anomalies.length, parDomaine: {}, parGravite: { Bloquant: 0, "À corriger": 0, "À vérifier": 0 }, aLaSource: 0 };
  for (const x of anomalies) { b.parDomaine[x.domaine] = (b.parDomaine[x.domaine] ?? 0) + 1; b.parGravite[x.gravite]++; if (x.aLaSource) b.aLaSource++; }
  return b;
}
