// Fabrique du portefeuille de démonstration : transforme la fiche d'un projet en enregistrements
// pour chaque écran — budget, marchés, factures, planning, risques, chantier, documents — en gardant
// les montants et les dates cohérents entre eux. Tout passe par le dépôt, comme une saisie réelle.
import { calculerBudget, photographier } from "../../../domaine/lib/budget";
import { garantieDepuis, numeroSuivant } from "../../../domaine/lib/chantier";
import { ajouterJours, moisDe } from "../../../domaine/lib/format";
import { genererDepuisProjet } from "../../../domaine/lib/organigramme";
import { moisPrecedent } from "../../../domaine/socle/periodes";
import { nouvelleSeance } from "../../../domaine/socle/seances";
import type { PointSeance, Seance } from "../../../domaine/socle/types";
import type { AppelOffres, Avenant, BudgetLigne, ConditionsContrat, Contrat, Facture, Lot, Projet, Risque, Soumission, Tache } from "../../../domaine/types";
import type { EntreeJournalChantier, Metre, Reserve } from "../../../domaine/types-chantier";
import type { Depot } from "../../depot";
import { croquis } from "../chantier";
import type { FicheProjet, LignePoint, Marche, SeanceFiche } from "./types";

const SYS = { origine: "systeme" as const };
const CRITERES = [{ id: "cr-prix", nom: "Prix", poids: 50, estPrix: true }, { id: "cr-ref", nom: "Références", poids: 20 }, { id: "cr-org", nom: "Organisation et délais", poids: 20 }, { id: "cr-dd", nom: "Développement durable", poids: 10 }];
const RANG = { "Préparation": 0, "Publié": 1, "Évaluation": 2, "Adjugé": 3, "Signé": 4, "En cours": 5, "Réceptionné": 6, "Clôturé": 7 } as const;
const STATUT_CONTRAT = { "Adjugé": "En préparation", "Signé": "Signé", "En cours": "En cours", "Réceptionné": "Réceptionné", "Clôturé": "Clôturé" } as const;

/** Suite pseudo-aléatoire reproductible : la même fiche donne toujours les mêmes montants */
function suite(graine: string): () => number {
  let h = 2166136261;
  for (const c of graine) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10_000) / 10_000; };
}
const arrondi = (v: number, pas = 100) => Math.round(v / pas) * pas;
const ouvre = (iso: string) => { const j = new Date(`${iso}T12:00:00Z`).getUTCDay(); return j !== 0 && j !== 6; };

/** Croquis qui tiennent lieu de photographies : aucune image réelle n'est embarquée */
const MOTIFS: [ciel: string, sol: string, dessin: string][] = [
  ["#cbd5e1", "#a16207", '<polygon points="180,360 620,360 540,520 260,520" fill="#713f12"/><rect x="250" y="470" width="300" height="26" rx="13" fill="#0ea5e9"/><rect x="330" y="300" width="14" height="60" fill="#f97316"/><rect x="470" y="300" width="14" height="60" fill="#f97316"/><rect x="330" y="312" width="154" height="10" fill="#fdba74"/>'],
  ["#e2e8f0", "#78716c", '<rect x="180" y="200" width="440" height="230" fill="#a8a29e"/><path d="M200 240 h400 M200 290 h400 M200 340 h400 M200 390 h400" stroke="#57534e" stroke-width="5"/><path d="M260 200 v230 M340 200 v230 M420 200 v230 M500 200 v230 M580 200 v230" stroke="#57534e" stroke-width="5"/>'],
  ["#e0f2fe", "#64748b", '<rect x="120" y="330" width="560" height="38" rx="19" fill="#dc2626"/><rect x="120" y="400" width="560" height="38" rx="19" fill="#2563eb"/><rect x="330" y="315" width="26" height="140" fill="#334155"/><circle cx="343" cy="300" r="26" fill="none" stroke="#334155" stroke-width="10"/>'],
  ["#bae6fd", "#4d7c0f", '<path d="M400 90 L330 420 M400 90 L470 420 M345 340 h110 M360 250 h80 M375 170 h50 M300 170 h200 M320 250 h160" stroke="#334155" stroke-width="9" fill="none"/><path d="M300 170 q-120 60 -300 30 M500 170 q120 60 300 30" stroke="#0f172a" stroke-width="3" fill="none"/>'],
  ["#f1f5f9", "#94a3b8", '<rect x="160" y="170" width="150" height="260" fill="#e2e8f0" stroke="#475569" stroke-width="5"/><rect x="325" y="170" width="150" height="260" fill="#e2e8f0" stroke="#475569" stroke-width="5"/><rect x="490" y="170" width="150" height="260" fill="#e2e8f0" stroke="#475569" stroke-width="5"/><circle cx="235" cy="230" r="14" fill="#16a34a"/><circle cx="400" cy="230" r="14" fill="#16a34a"/><circle cx="565" cy="230" r="14" fill="#dc2626"/>'],
  ["#dbeafe", "#57534e", '<path d="M0 360 L260 150 L540 150 L800 360 Z" fill="#a8a29e"/><rect x="330" y="150" width="140" height="210" fill="#78716c"/><path d="M360 360 q40 90 80 0" fill="#0ea5e9"/>'],
];

export interface Installation { seances: Seance[]; projetId: string }

/** Écrit tous les enregistrements du projet ; rend les séances, à enregistrer ensuite comme le fait l'écran */
/** Prix unitaire d'une offre, arrondi comme le ferait une entreprise selon son ordre de grandeur. */
export function prixRond(prix: number): number {
  const pas = prix >= 100_000 ? 1_000 : prix >= 10_000 ? 100 : prix >= 1_000 ? 10 : prix >= 100 ? 1 : prix >= 10 ? 0.5 : 0.05;
  return Math.round(Math.round(prix / pas) * pas * 100) / 100;
}

export async function installerProjet(depot: Depot, f: FicheProjet, jour: string): Promise<Installation | undefined> {
  const p = depot.tous("projets").find((x) => x.numeroSource === f.numero);
  if (!p) return undefined;
  const k = f.cle;
  const date = (dans: number) => ajouterJours(jour, dans);
  const hasard = suite(f.numero);
  const fc = f.construction;
  const nomPersonne = (id?: string) => depot.parId("personnes", id ?? "")?.nom ?? "";
  const nomEntreprise = (id?: string) => depot.parId("entreprises", id ?? "")?.nom ?? "";
  const seances: Seance[] = [];

  // Les croquis des constats sont rangés avant les données qui les citent
  const constats = fc?.chantier?.constats ?? [];
  for (let i = 0; i < constats.length; i++) {
    const [ciel, sol, dessin] = MOTIFS[(i + k.length) % MOTIFS.length];
    const image = croquis(constats[i][5], ciel, sol, dessin);
    await depot.ajouterFichier({ id: `photo-${k}-${i + 1}`, nom: `photo-${k}-${i + 1}.svg`, type: "image/svg+xml", taille: image.size, projetId: p.id, donnees: image });
  }

  depot.grouper(`Démonstration : ${p.code}`, () => {
    depot.modifier("projets", p.id, { ...f.complements, directeurId: f.chef });
    const projet: Projet = { ...p, ...f.complements, directeurId: f.chef };
    f.equipe.forEach(([personneId, pourcentage], i) => depot.ajouter("affectations", { id: `${k}-aff-${i + 1}`, personneId, projetId: p.id, pourcentage, debut: p.dateDebut, fin: p.dateFin }));

    // ------------------------------------------------------------------ Risques, planning, tâches
    f.risques.forEach(([titre, categorie, probabilite, impact, impactFinancier, description, mesures, strategie], i) => {
      const risque: Risque = {
        id: `${k}-rsk-${i + 1}`, projetId: p.id, code: `R-${String(i + 1).padStart(2, "0")}`, titre, description, categorie, probabilite, impact, impactFinancier, proprietaireId: f.equipe[i % f.equipe.length]?.[0] ?? f.chef,
        statut: i === 0 ? "En traitement" : "Ouvert", mesures, dateIdentification: date(-200 + i * 35), echeance: date(25 + i * 20), nature: "Risque", strategie,
        probabiliteResiduelle: Math.max(1, probabilite - 1), impactResiduel: impact,
        revues: i % 4 === 3 ? [] : [{ date: date(-9 - i * 7), auteurId: f.chef, probabilite, impact, commentaire: "Revue mensuelle : évaluation confirmée, mesures en cours." }],
      };
      depot.ajouter("risques", risque);
    });
    const lotId = (code?: string) => (code ? `${k}-lot-${code}` : undefined);
    f.planning.forEach(([nom, debut, fin, avancement, lot], i) => {
      const t: Tache = { id: `${k}-tch-${i + 1}`, projetId: p.id, nom, debut: date(debut), fin: date(fin), avancement, jalon: false, dependances: i > 0 ? [`${k}-tch-${i}`] : [], responsableId: f.equipe[i % f.equipe.length]?.[0] ?? f.chef, lotId: lotId(lot) };
      depot.ajouter("taches", t);
    });
    f.jalons.forEach(([nom, dans, glissement = 0], i) => {
      const fait = dans < 0;
      const t: Tache = { id: `${k}-jal-${i + 1}`, projetId: p.id, nom, debut: date(dans), fin: date(dans), finPrevue: date(dans - glissement), finReelle: fait ? date(dans) : undefined, avancement: fait ? 100 : 0, jalon: true, dependances: [], responsableId: f.chef };
      depot.ajouter("taches", t);
    });
    f.actions.forEach(([titre, dans, priorite, statut = "À faire", assigne], i) => {
      depot.ajouter("actions", { id: `${k}-act-${i + 1}`, projetId: p.id, titre, statut, priorite, echeance: date(dans), assigneId: assigne ?? f.chef, creeParId: f.chef, dateCreation: date(-25 - i * 4), origine: "Suivi du projet" });
    });
    f.documents.forEach(([nom, categorie, version, ilYA], i) => {
      depot.ajouter("documents", { id: `${k}-doc-${i + 1}`, projetId: p.id, nom, categorie, version, date: date(-ilYA), source: "Lien", auteur: nomPersonne(f.equipe[i % f.equipe.length]?.[0] ?? f.chef) });
    });
    // Circuits de validation : un document approuvé, et le plus récent en cours de visa
    const visa = (n: number, rangDoc: number, enCours: boolean) => {
      const doc = f.documents[rangDoc];
      if (!doc) return;
      const [nom, , version, ilYA] = doc;
      const demandeur = f.equipe[1]?.[0] ?? f.chef, quand = date(-ilYA + 1);
      depot.ajouter("validations", { id: `${k}-val-doc-${n}`, projetId: p.id, titre: `${nom} – version ${version}`, objet: { type: "Document", id: `${k}-doc-${rangDoc + 1}` }, version: 1, demandeurId: demandeur, statut: enCours ? "En cours" : "Approuvé", dateCreation: quand, echeance: ajouterJours(quand, 14),
        etapes: [{ id: "e1", personneId: f.chef, statut: "Approuvé", date: ajouterJours(quand, 2), commentaire: "Conforme, bon pour diffusion." }, ...(f.complements.sponsorId ? [{ id: "e2", personneId: f.complements.sponsorId, statut: enCours ? "En attente" as const : "Approuvé" as const, date: enCours ? undefined : ajouterJours(quand, 5) }] : [])],
        historique: [{ date: quand, personneId: demandeur, action: "Circuit créé", version: 1 }, { date: ajouterJours(quand, 2), personneId: f.chef, action: "Approuvé", version: 1, commentaire: "Conforme, bon pour diffusion." }, ...(!enCours && f.complements.sponsorId ? [{ date: ajouterJours(quand, 5), personneId: f.complements.sponsorId, action: "Approuvé", version: 1 }] : [])] });
    };
    const recent = f.documents.reduce((m, d, i) => (d[3] < f.documents[m][3] ? i : m), 0);
    visa(1, f.documents.findIndex((x, i) => !!x && i !== recent), false);
    visa(2, recent, true);
    (f.notes ?? []).forEach(([canal, texte, auteur, ilYA], i) => {
      depot.ajouter("notes", { id: `${k}-note-${i + 1}`, projetId: p.id, canal, texte, auteurId: auteur === "chef" ? f.chef : auteur, date: `${date(-ilYA)}T09:30:00.000Z` });
    });
    f.pilotage.forEach((s, i) => seances.push(seance(depot, { id: `${k}-pil-${i + 1}`, type: "Comité de pilotage", projet, fiche: s, jour, internes: [projet.sponsorId, f.chef, "pf-fin", "pf-pmo"], redacteur: f.chef, precedentes: seances })));

    if (!fc) return;

    // ---------------------------------------------------------------------------- Lots et budget
    const lots: Lot[] = fc.lots.map(([code, nom, cfc, responsableId, phase]) => ({ id: `${k}-lot-${code}`, projetId: p.id, code, nom, cfc, responsableId, phase }));
    for (const l of lots) depot.ajouter("lots", l);
    const lotDuCfc = (cfc: string) => lots.find((l) => l.cfc.some((c) => cfc.startsWith(c)))?.id;
    const budget: BudgetLigne[] = fc.budget.map(([cfc, libelle, montant], i) => ({ id: `${k}-bud-${i + 1}`, projetId: p.id, cfc, libelle, montant, lotId: lotDuCfc(cfc), ...(cfc === "583" ? { reserve: true } : {}) }));
    for (const b of budget) depot.ajouter("budget", b);
    const ligne = (cfc: string) => { const b = budget.find((x) => x.cfc === cfc); if (!b) throw new Error(`${f.numero} : position budgétaire ${cfc} inconnue`); return b.id; };

    // ---------------------------------------------------------------------------------- Marchés
    const contrats: Contrat[] = [], factures: Facture[] = [], appels: AppelOffres[] = [];
    const reserves: Reserve[] = [];
    const conducteur = fc.chantier?.conducteur ?? f.chef;
    fc.marches.forEach((m, rangMarche) => {
      const rang = RANG[m.etat];
      const nn = String(rangMarche + 1).padStart(2, "0");
      const lignes = m.positions?.length ? m.positions : [["000.100.001", "Prestations selon le cahier des charges, forfait", "gl", 1, m.montant ?? 0] as NonNullable<Marche["positions"]>[number]];
      const montant = m.montant ?? arrondi(lignes.reduce((t, [, , , q, pu]) => t + q * pu, 0), 1);
      ligne(m.cfc);

      // Appel d'offres : dès qu'il y a une mise en concurrence, ou tant que le marché n'est pas attribué
      const aoId = `${k}-ao-${m.cle}`;
      if (m.concurrents?.length || rang < 3) {
        const positions = lignes.map(([numero, libelle, unite, quantite], i) => ({ id: `${m.cle}-p${i + 1}`, chapitre: numero.split(".")[0], numero, libelle, unite, quantite }));
        const offre = (entrepriseId: string, ecartPct: number, i: number): Soumission => ({
          id: `${m.cle}-s${i + 1}`, entrepriseId, dateReception: date(m.signe - (rang >= 3 ? 50 : 0) - i), rabaisPct: 0, escomptePct: 0,
          prixUnitaires: Object.fromEntries(lignes.map(([, , , , pu], j) => [`${m.cle}-p${j + 1}`, prixRond(pu * (1 + ecartPct / 100) * (i === 0 ? 1 : 0.97 + hasard() * 0.06))])),
          notes: Object.fromEntries(CRITERES.filter((c) => !c.estPrix).map((c) => [c.id, Math.round((i === 0 ? 4 : 3) * 2 + hasard() * 2) / 2])),
        });
        const ao: AppelOffres = {
          id: aoId, projetId: p.id, numero: `AO-${k.toUpperCase()}-${nn}`, objet: m.objet, cfc: m.cfc, lotId: lotId(m.lot),
          procedure: m.procedure ?? (montant > 2_000_000 ? "Ouverte" : "Sur invitation"), statut: rang >= 3 ? "Adjugé" : m.etat as AppelOffres["statut"],
          dateEnvoi: date(rang >= 3 ? m.signe - 95 : rang === 0 ? m.signe - 40 : m.signe - 45), dateRetour: date(rang >= 3 ? m.signe - 50 : m.signe),
          montantEstime: m.estime ?? arrondi(montant * 1.04, 1000), criteres: CRITERES, positions,
          entreprisesInvitees: [m.entreprise, ...(m.concurrents ?? []).map(([e]) => e)],
          soumissions: rang >= 2 ? [offre(m.entreprise, 0, 0), ...(m.concurrents ?? []).map(([e, ecart], i) => offre(e, ecart, i + 1))] : [],
          adjudicataireId: rang >= 3 ? m.entreprise : undefined,
        };
        appels.push(ao);
        depot.ajouter("appelsOffres", ao);
      }
      if (rang < 3) return;

      // Contrat, avenants, conditions
      const ctrId = `${k}-ctr-${m.cle}`;
      const entreprise = m.type === "Contrat d'entreprise";
      const avenants: Avenant[] = (m.avenants ?? []).map(([objet, mt, statut, motif, ilYA, delai], i) => ({ id: `${k}-av-${m.cle}-${i + 1}`, numero: `AV-${String(i + 1).padStart(2, "0")}`, date: date(-ilYA), objet, montant: mt, statut, motif, incidenceDelaiJours: delai }));
      const conditions: ConditionsContrat = entreprise
        ? { typePrix: m.positions?.length ? "Prix unitaires" : "Prix global", debutTravaux: date(m.debut), finTravaux: date(m.fin), peineParJour: Math.min(5000, Math.max(500, arrondi(montant * 0.0005, 500))), peinePlafondPct: 5, delaiPaiementJours: 30, surete: "Cautionnement solidaire", suretePct: 10, directionTravaux: nomPersonne(conducteur), ...m.conditions }
        : m.type === "Mandat" ? { typePrix: "Honoraires au temps", debutTravaux: date(m.debut), finTravaux: date(m.fin), delaiPaiementJours: 30, reglement: "SIA 103 (ingénieurs civils)", phases: "31 à 53", ...m.conditions }
          : { typePrix: "Prix global", debutTravaux: date(m.debut), finTravaux: date(m.fin), delaiPaiementJours: 30, surete: "Garantie bancaire", suretePct: 10, ...m.conditions };
      const contrat: Contrat = {
        id: ctrId, projetId: p.id, numero: `${entreprise ? "C" : m.type === "Mandat" ? "M" : "F"}-${k.toUpperCase()}-${nn}`, entrepriseId: m.entreprise, cfc: m.cfc, lotId: lotId(m.lot),
        appelOffresId: appels.some((a) => a.id === aoId) ? aoId : undefined, objet: m.objet, type: m.type, montantInitial: montant, dateSignature: date(m.signe),
        retenuePct: entreprise ? 10 : 0, statut: STATUT_CONTRAT[m.etat as keyof typeof STATUT_CONTRAT], avenants, conditions,
      };
      contrats.push(contrat);
      depot.ajouter("contrats", contrat);
      if (rang >= 4) depot.ajouter("documents", { id: `${k}-doc-ctr-${m.cle}`, projetId: p.id, nom: `Contrat ${contrat.numero} signé – ${nomEntreprise(m.entreprise)}`, categorie: "Contrats", version: "1", date: date(m.signe), source: "Lien", auteur: nomPersonne(f.chef), cfc: m.cfc, cible: { collection: "contrats", id: ctrId } });

      // Factures : situations mensuelles jusqu'à la part facturée
      const part = m.facture ?? (rang >= 7 ? 1 : 0);
      const actualise = montant + avenants.filter((a) => a.statut === "Approuvé").reduce((t, a) => t + a.montant, 0);
      if (part > 0) {
        const total = arrondi(actualise * part, 1);
        const n = Math.max(1, Math.min(9, Math.round((Math.min(0, m.fin) - m.debut) / 30) || 1));
        const poids = Array.from({ length: n }, () => 0.7 + hasard() * 0.6);
        const somme = poids.reduce((a, b) => a + b, 0);
        let reste = total;
        const fin = Math.min(-6, m.fin + (rang >= 7 ? 40 : 0));
        for (let i = 0; i < n; i++) {
          const dernier = i === n - 1;
          const mt = dernier ? reste : arrondi((total * poids[i]) / somme, 100);
          reste -= mt;
          const decompte = dernier && rang >= 6 && part >= 1;
          // Le décompte final d'un marché reçu mais pas encore clôturé est récent : il est en contrôle
          const quand = decompte && rang === 6 ? -18 : fin - (n - 1 - i) * 30;
          const facture: Facture = {
            id: `${k}-fac-${m.cle}-${i + 1}`, contratId: ctrId, projetId: p.id, numero: decompte ? "DF" : `${entreprise ? "S" : "H"}${i + 1}`, type: decompte ? "Décompte final" : entreprise ? "Situation" : "Acompte",
            date: date(quand), echeance: date(quand + 30), montantHT: mt,
            statut: rang >= 7 ? "Payée" : dernier ? (rang === 6 ? "Contrôlée" : "Reçue") : i === n - 2 && quand > -70 ? "Approuvée" : "Payée",
          };
          factures.push(facture);
          depot.ajouter("factures", facture);
          if (facture.statut === "Reçue") {
            depot.ajouter("validations", { id: `${k}-val-${m.cle}`, projetId: p.id, titre: `${facture.type} ${facture.numero} – ${nomEntreprise(m.entreprise)}`, objet: { type: "Facture", id: facture.id, contratId: ctrId }, version: 1, demandeurId: conducteur, statut: "En cours", dateCreation: date(quand + 2), echeance: date(quand + 25),
              etapes: [{ id: "e1", personneId: conducteur, statut: "Approuvé", date: date(quand + 4), commentaire: "Quantités contrôlées avec le métré du mois." }, { id: "e2", personneId: f.chef, statut: "En attente" }],
              historique: [{ date: date(quand + 2), personneId: conducteur, action: "Circuit créé", version: 1 }, { date: date(quand + 4), personneId: conducteur, action: "Approuvé", version: 1, commentaire: "Quantités contrôlées avec le métré du mois." }] });
          }
        }
      }
      for (const a of avenants.filter((x) => x.statut === "Demandé")) {
        depot.ajouter("validations", { id: `${k}-val-${a.id}`, projetId: p.id, titre: `Avenant ${a.numero} – ${a.objet}`, objet: { type: "Avenant", id: a.id, contratId: ctrId }, version: 1, demandeurId: conducteur, statut: "En cours", dateCreation: a.date, echeance: ajouterJours(a.date, 30),
          etapes: [{ id: "e1", personneId: f.chef, statut: "En attente" }, ...(projet.sponsorId ? [{ id: "e2", personneId: projet.sponsorId, statut: "En attente" as const }] : [])], historique: [{ date: a.date, personneId: conducteur, action: "Circuit créé", version: 1 }] });
      }

      // Métrés : les positions du contrat, au prorata de la facturation, sur deux mois
      if (m.metres && m.positions?.length && part > 0 && rang >= 6) {
        // Marché terminé : l'essentiel relevé le mois précédent, le solde au métré final, tous deux reconnus par les parties
        const dernier = moisDe(date(m.fin)), avantDernier = moisPrecedent(dernier);
        m.positions.forEach(([numero, libelle, unite, quantite, pu], i) => {
          const avant = unite === "gl" ? Math.round(quantite * 0.85 * 100) / 100 : Math.floor(quantite * 0.88);
          const base = { projetId: p.id, contratId: ctrId, position: numero, libelle, unite, prixUnitaire: pu, statut: "Contradictoire" as const };
          if (avant > 0) depot.ajouter("metres", { ...base, id: `${k}-met-${m.cle}-${i + 1}a`, periode: avantDernier, quantite: avant } satisfies Metre);
          if (quantite - avant > 0) depot.ajouter("metres", { ...base, id: `${k}-met-${m.cle}-${i + 1}`, periode: dernier, quantite: Math.round((quantite - avant) * 100) / 100 } satisfies Metre);
        });
      } else if (m.metres && m.positions?.length && part > 0) {
        const courant = moisDe(jour), precedent = moisPrecedent(courant);
        const anterieur = Math.max(0, part - 0.12);
        m.positions.forEach(([numero, libelle, unite, quantite, pu], i) => {
          const q = (v: number) => (unite === "gl" ? Math.round(v * 100) / 100 : Math.round(v));
          const avant = q(quantite * Math.min(1, anterieur * (0.85 + hasard() * 0.3))), mois = q(quantite * (part - anterieur) * (0.6 + hasard() * 0.8));
          const base = { projetId: p.id, contratId: ctrId, position: numero, libelle, unite, prixUnitaire: pu };
          if (avant > 0) depot.ajouter("metres", { ...base, id: `${k}-met-${m.cle}-${i + 1}a`, periode: precedent, quantite: avant, statut: "Contradictoire" } satisfies Metre);
          if (mois > 0 && rang === 5) depot.ajouter("metres", { ...base, id: `${k}-met-${m.cle}-${i + 1}b`, periode: courant, quantite: mois, statut: i === 1 ? "Contesté" : "Relevé", remarque: i === 1 ? "Quantité contestée par la direction des travaux : relevé à refaire en commun." : undefined } satisfies Metre);
        });
      }

      // Régies
      (m.regies ?? []).forEach(([objet, ilYA, statut, lr, remarques]) => {
        const fige = statut === "Validé" || statut === "Facturé";
        depot.ajouter("regies", { id: `${k}-reg-${m.cle}-${ilYA}`, projetId: p.id, contratId: ctrId, numero: numeroSuivant(depot.parProjet("regies", p.id), "BR"), date: date(-ilYA), objet, statut, remarques,
          valideParId: fige ? conducteur : undefined, dateValidation: fige ? date(-ilYA + 2) : undefined, lignes: lr.map(([type, libelle, quantite, unite, prixUnitaire], i) => ({ id: `lr${i + 1}`, type, libelle, quantite, unite, prixUnitaire })) });
      });

      // Réception et réserves du marché
      const rcpId = m.reception ? `${k}-rcp-${m.cle}` : undefined;
      if (m.reception && rcpId) {
        const r = m.reception, quand = date(-r.ilYA), g = garantieDepuis(quand);
        depot.ajouter("receptions", { id: rcpId, projetId: p.id, contratId: ctrId, lotId: lotId(m.lot), objet: r.objet, date: quand, type: r.type, resultat: r.resultat, lieu: r.lieu, participants: r.participants, avisAchevement: date(-r.ilYA - 12),
          documentsRemis: r.documents, remarques: r.remarques, ...(r.resultat === "Refusée" ? { secondeVerification: date(r.secondeDans ?? 21) } : { debutGarantie: g.debutGarantie, finGarantie: g.finGarantie, surete: r.surete ?? "Cautionnement solidaire remis avec le décompte final" }) });
        depot.ajouter("documents", { id: `${k}-doc-rcp-${m.cle}`, projetId: p.id, nom: `Procès-verbal de réception – ${r.objet}`, categorie: "PV de séance", version: "1", date: quand, source: "Lien", auteur: nomPersonne(conducteur), cible: { collection: "receptions", id: rcpId } });
      }
      (m.reserves ?? []).forEach(([libelle, localisation, gravite, statut, delaiDans, description]) => {
        const constat = m.reception ? date(-m.reception.ilYA) : date(Math.min(-3, delaiDans - 30));
        reserves.push({ id: `${k}-res-${reserves.length + 1}`, projetId: p.id, numero: `R-${String(reserves.length + 1).padStart(3, "0")}`, libelle, description, localisation, lotId: lotId(m.lot), contratId: ctrId, entrepriseId: m.entreprise, gravite, statut,
          dateConstat: constat, delai: date(delaiDans), receptionId: rcpId, photos: [], ...(statut === "Levée" ? { dateLevee: date(Math.min(-1, delaiDans - 4)), leveeParId: conducteur } : {}) });
      });
    });

    // ------------------------------------------------- Mutations, prévisions, factures hors commande
    (fc.mutations ?? []).forEach(([motif, de, vers, montant, statut, ilYA], i) => {
      depot.ajouter("mutations", { id: `${k}-mut-${i + 1}`, projetId: p.id, numero: `M-${String(i + 1).padStart(2, "0")}`, motif, date: date(-ilYA), statut, demandeurId: f.chef, lignes: [{ budgetId: ligne(de), montant: -montant }, { budgetId: ligne(vers), montant }],
        ...(statut === "Validée" ? { valideurId: projet.sponsorId ?? f.chef, dateValidation: date(-ilYA + 3) } : {}) });
    });
    (fc.ajustements ?? []).forEach(([type, libelle, montant, probabilite, cfc, justification], i) => {
      depot.ajouter("ajustements", { id: `${k}-aj-${i + 1}`, projetId: p.id, type, libelle, montant, probabilite, statut: "Active", repartition: [{ budgetId: ligne(cfc), montant }], auteurId: f.chef, date: date(-60 + i * 15), justification, dateRevue: date(-12) });
    });
    (fc.horsCommande ?? []).forEach(([fournisseur, montant, cfc, remarque, ilYA], i) => {
      depot.ajouter("facturesHorsCommande", { id: `${k}-fhc-${i + 1}`, projetId: p.id, numero: `FHC-${k.toUpperCase()}-${i + 1}`, fournisseur, date: date(-ilYA), montantHT: montant, paye: ilYA > 40, repartition: [{ budgetId: ligne(cfc), montant }], remarques: remarque });
    });

    // ------------------------------------------------------------------- Autorisations et foncier
    (fc.autorisations ?? []).forEach(([type, objet, autorite, reference, statut, depot_, decision, oppositions, conditions], i) => {
      depot.ajouter("autorisations", { id: `${k}-aut-${i + 1}`, projetId: p.id, type, objet, autorite, reference, statut, oppositions,
        dateDepot: depot_ !== undefined ? date(-depot_) : undefined, dateEnquete: depot_ !== undefined && statut !== "Déposée" ? date(-depot_ + 30) : undefined,
        dateDecision: decision !== undefined ? date(-decision) : undefined, validite: decision !== undefined ? date(-decision + 3 * 365) : undefined,
        conditions: conditions.map(([service, texte, st, dans], j) => ({ id: `c${j + 1}`, service, texte, statut: st, echeance: dans !== undefined ? date(dans) : undefined, responsableId: f.equipe[j % f.equipe.length]?.[0] ?? f.chef })) });
    });
    (fc.servitudes ?? []).forEach(([parcelle, commune, proprietaire, type, statut, indemnite, emprise, remarque], i) => {
      const signe = statut === "Convention signée" || statut === "Inscrite au registre foncier";
      depot.ajouter("servitudes", { id: `${k}-srv-${i + 1}`, projetId: p.id, parcelle, commune, proprietaire, type, statut, indemnite, emprise, remarque, dateSignature: signe ? date(-150 - i * 20) : undefined, echeance: signe ? undefined : date(30 + i * 15) });
    });

    // --------------------------------------------------------------------- Organigramme et clôture
    for (const n of genererDepuisProjet(projet, lots, depot.tous("personnes"), contrats, depot.tous("entreprises"))) depot.ajouter("organigramme", n);
    if (factures.length) {
      const courant = moisDe(jour), mois = moisPrecedent(courant);
      const validees = depot.parProjet("mutations", p.id).filter((x) => x.statut === "Validée" && x.date < `${courant}-01`);
      depot.ajouter("clotures", { id: `${k}-clo-1`, projetId: p.id, mois, date: `${courant}-03`, auteurId: f.chef, commentaire: "Situation arrêtée avec la direction des travaux ; les écarts sont expliqués dans les prévisions.",
        ...photographier(calculerBudget({ budget, lots, contrats, factures: factures.filter((x) => x.date < `${courant}-01`), facturesHorsCommande: depot.parProjet("facturesHorsCommande", p.id).filter((x) => x.date < `${courant}-01`), appelsOffres: [], mutations: validees, offres: [], ajustements: depot.parProjet("ajustements", p.id) })) });
    }

    // ------------------------------------------------------------------------------------ Chantier
    const ch = fc.chantier;
    if (!ch) { for (const r of reserves) depot.ajouter("reserves", r); return; }
    (ch.reserves ?? []).forEach(([libelle, localisation, gravite, statut, delaiDans, entrepriseId, description]) => {
      reserves.push({ id: `${k}-res-${reserves.length + 1}`, projetId: p.id, numero: `R-${String(reserves.length + 1).padStart(3, "0")}`, libelle, description, localisation, entrepriseId, contratId: contrats.find((c) => c.entrepriseId === entrepriseId)?.id, gravite, statut, dateConstat: date(Math.min(-2, delaiDans - 25)), delai: date(delaiDans), photos: [],
        ...(statut === "Levée" ? { dateLevee: date(Math.min(-1, delaiDans - 3)), leveeParId: ch.conducteur } : {}) });
    });
    constats.forEach(([type, titre, description, localisation, entrepriseId, legende, ilYA, suiteDonnee], i) => {
      const id = `${k}-cst-${i + 1}`, photo = `photo-${k}-${i + 1}`;
      let reserveId: string | undefined, actionId: string | undefined;
      if (suiteDonnee === "reserve") {
        reserveId = `${k}-res-${reserves.length + 1}`;
        reserves.push({ id: reserveId, projetId: p.id, numero: `R-${String(reserves.length + 1).padStart(3, "0")}`, libelle: titre, description, localisation, entrepriseId, contratId: contrats.find((c) => c.entrepriseId === entrepriseId)?.id, gravite: type === "Sécurité" ? "Majeure" : "Mineure", statut: "Ouverte", dateConstat: date(-ilYA), delai: date(-ilYA + 30), constatId: id, photos: [photo] });
      } else if (suiteDonnee === "tache") {
        actionId = `${k}-act-cst-${i + 1}`;
        depot.ajouter("actions", { id: actionId, projetId: p.id, titre: `Suite du constat CT-${String(i + 1).padStart(3, "0")} : ${titre}`, description, statut: "En cours", priorite: type === "Sécurité" ? "Haute" : "Normale", echeance: date(-ilYA + 10), assigneId: ch.conducteur, creeParId: ch.conducteur, dateCreation: date(-ilYA), origine: "Constat de chantier" });
      }
      depot.ajouter("constats", { id, projetId: p.id, numero: `CT-${String(i + 1).padStart(3, "0")}`, date: date(-ilYA), type, titre, description, localisation, entrepriseId, partiesPresentes: `${nomPersonne(ch.conducteur)} (direction des travaux)${entrepriseId ? `, ${nomEntreprise(entrepriseId)}` : ""}`, photos: [{ fichierId: photo, legende }], auteurId: ch.conducteur, reserveId, actionId });
    });
    for (const r of reserves) depot.ajouter("reserves", r);

    // Journal : les derniers jours ouvrés, verrouillés au-delà d'une semaine
    const jours: string[] = [];
    const fin = ch.finIlYA ?? 0;
    for (let j = date(-1 - fin); jours.length < ch.travaux.length; j = ajouterJours(j, -1)) if (ouvre(j)) jours.unshift(j);
    const meteos: EntreeJournalChantier["meteo"][] = ["Beau", "Nuageux", "Nuageux", "Pluie", "Nuageux", "Beau", "Beau", "Gel", "Nuageux", "Beau"];
    jours.forEach((quand, i) => {
      const entree: EntreeJournalChantier = {
        id: `${k}-jc-${i + 1}`, projetId: p.id, date: quand, meteo: meteos[(i + k.length) % meteos.length], temperature: 3 + Math.round(hasard() * 9),
        effectifs: ch.entreprises.map(([entreprise, effectif], j) => ({ entreprise, personnes: Math.max(0, effectif + Math.round((hasard() - 0.5) * 3) - ((i + j) % 5 === 4 ? effectif : 0)) })).filter((x) => x.personnes > 0),
        travaux: ch.travaux[i], evenements: (ch.evenements ?? []).filter(([n]) => n === i).map(([, type, texte], j) => ({ id: `ev-${i}-${j}`, type, texte })),
        photos: constats.map((c, n) => ({ c, n })).filter(({ c }) => date(-c[6]) === quand).map(({ n }) => `photo-${k}-${n + 1}`), auteurId: ch.conducteur, verrouillee: quand < date(-7) || undefined,
      };
      depot.ajouter("journalChantier", entree);
    });

    // Séances de chantier : la seconde reprend les points restés ouverts de la première
    const chantierSeances: Seance[] = [];
    ch.seances.forEach((points, i) => {
      const s = seance(depot, { id: `${k}-sch-${i + 1}`, type: "Chantier", projet, fiche: { ilYA: (i === 0 ? 15 : 8) + fin, lieu: ch.lieuSeance, invites: ch.invites, points }, jour, internes: [ch.conducteur, f.chef], redacteur: ch.conducteur, precedentes: chantierSeances, statut: i === 0 || fin > 0 ? "Diffusée" : "Tenue" });
      chantierSeances.push(s);
      seances.push(s);
    });
  }, { ...SYS, sansDetail: true });

  return { seances, projetId: p.id };
}

/** Séance construite comme le ferait l'écran : numéro de la série, points repris, décisions et tâches à porter au registre */
export function seance(depot: Depot, o: { id: string; type: Seance["type"]; projet?: Projet; fiche: SeanceFiche; jour: string; internes: (string | undefined)[]; redacteur?: string; precedentes: Seance[]; statut?: Seance["statut"] }): Seance {
  const meme = o.precedentes.filter((s) => s.type === o.type && s.projetId === o.projet?.id);
  const base = nouvelleSeance([...depot.tous("seances"), ...meme], { id: o.id, type: o.type, projetId: o.projet?.id, date: ajouterJours(o.jour, -o.fiche.ilYA), redacteurId: o.redacteur });
  const internes = [...new Set(o.internes.filter((v): v is string => !!v && !!depot.parId("personnes", v)))];
  const point = (pt: LignePoint, i: number): PointSeance => ({
    id: `pt-${o.id}-${i + 1}`, numero: `${base.numero}.${i + 1}`, titre: pt.titre, texte: pt.texte, nature: pt.nature ?? "Information", statut: pt.clos ? "Clos" : "Ouvert", origineSeanceId: o.id,
    responsableId: pt.responsableNom ? undefined : pt.nature === "Tâche" ? pt.responsable ?? o.redacteur : pt.responsable, responsableNom: pt.responsableNom,
    echeance: pt.dans !== undefined ? ajouterJours(o.jour, pt.dans) : undefined,
    decision: pt.nature === "Décision" ? { statut: pt.statut ?? "Approuvée", montant: pt.montant, conditions: pt.condition ? [{ id: `cond-${o.id}-${i + 1}`, texte: pt.condition, responsableId: o.redacteur, echeance: ajouterJours(o.jour, 30), statut: "À traiter" }] : [] } : undefined,
  });
  return {
    ...base, lieu: o.fiche.lieu, statut: o.statut ?? "Diffusée", prochaineSeance: ajouterJours(o.jour, o.type === "Chantier" ? 6 : 28 - (o.fiche.ilYA % 14)),
    participants: [...internes.map((personneId) => ({ personneId, presence: "Présent" as const, diffusion: true })), ...(o.fiche.invites ?? []).map(([nom, organisation]) => ({ nom, organisation, presence: "Présent" as const, diffusion: true }))],
    points: [...base.points, ...o.fiche.points.map(point)],
  };
}
