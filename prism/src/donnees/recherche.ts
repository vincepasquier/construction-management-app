// Recherche transverse. L'index est construit à partir de ce que l'utilisateur a le droit de voir :
// périmètre de projets, modules, canaux de notes, décisions restreintes. Rien d'autre n'y entre,
// donc rien d'autre ne peut ressortir dans un résultat, un extrait ou une suggestion.
import { canalVisible, decisionVisible, niveau, projetsAccessibles } from "../domaine/socle/droits";
import type { ID, ModuleApp, Personne, Projet } from "../domaine/types";
import type { Depot } from "./depot";
import { META, moduleDe, type NomCollection } from "./schema";

export interface Resultat {
  cle: string;
  type: string;
  titre: string;
  /** Contexte : projet, numéro, statut… */
  detail: string;
  /** Texte complet indexé, en minuscules */
  texte: string;
  lien: string;
  projetId?: ID;
  date?: string;
  statut?: string;
  responsableId?: ID;
}

interface Source {
  collection: NomCollection;
  type: string;
  /** Sous-chemin dans le projet */
  chemin: (d: Record<string, unknown>) => string;
  titre: (d: Record<string, unknown>) => string;
  champs: string[];
  date?: string;
  responsable?: string;
}

const t = (...cles: string[]) => (d: Record<string, unknown>) => cles.map((c) => d[c]).filter((v) => typeof v === "string" && v).join(" · ");

const SOURCES: Source[] = [
  { collection: "risques", type: "Risque", chemin: () => "risques", titre: t("code", "titre"), champs: ["description", "mesures", "categorie", "cause", "consequence"], date: "dateIdentification", responsable: "proprietaireId" },
  { collection: "actions", type: "Tâche", chemin: () => "taches", titre: t("titre"), champs: ["description", "origine"], date: "echeance", responsable: "assigneId" },
  { collection: "taches", type: "Jalon / planning", chemin: () => "planning", titre: t("nom"), champs: [], date: "fin", responsable: "responsableId" },
  { collection: "contrats", type: "Contrat", chemin: (d) => `contrats/${d.id}`, titre: t("numero", "objet"), champs: ["cfc", "remarques"], date: "dateSignature" },
  { collection: "appelsOffres", type: "Appel d'offres", chemin: (d) => `appels-offres/${d.id}`, titre: t("numero", "objet"), champs: ["cfc", "procedure"], date: "dateRetour" },
  { collection: "documents", type: "Document", chemin: () => "documents", titre: t("nom"), champs: ["categorie", "version", "auteur"], date: "date" },
  { collection: "decisions", type: "Décision", chemin: () => "decisions", titre: t("objet"), champs: ["texte", "organe"], date: "date", responsable: "responsableId" },
  { collection: "notes", type: "Note", chemin: () => "", titre: (d) => String(d.texte ?? "").slice(0, 80), champs: ["texte", "canal"], date: "date", responsable: "auteurId" },
  { collection: "mandats", type: "Mandat", chemin: () => "mandat", titre: (d) => `Mandat de projet v${d.version}`, champs: [], date: "dateCreation" },
  { collection: "rapports", type: "Rapport", chemin: () => "rapports", titre: t("titre"), champs: ["type", "phase"], date: "date", responsable: "auteurId" },
  { collection: "autorisations", type: "Autorisation", chemin: () => "juridique", titre: t("type", "objet"), champs: ["autorite", "reference"], date: "dateDepot" },
  { collection: "servitudes", type: "Droit foncier", chemin: () => "juridique", titre: t("parcelle", "proprietaire"), champs: ["commune", "type", "remarque"] },
  { collection: "reserves", type: "Réserve", chemin: () => "chantier?onglet=reserves", titre: t("numero", "libelle"), champs: ["description", "localisation"], date: "dateConstat" },
  { collection: "constats", type: "Constat", chemin: () => "chantier?onglet=constats", titre: t("numero", "titre"), champs: ["description", "localisation"], date: "date" },
  { collection: "regies", type: "Bon de régie", chemin: () => "chantier?onglet=regies", titre: t("numero", "objet"), champs: ["remarques"], date: "date" },
  { collection: "partiesPrenantes", type: "Partie prenante", chemin: () => "organisation", titre: t("nom", "roleProjet"), champs: ["responsabilites", "remarques"] },
];

const texteDe = (d: Record<string, unknown>, champs: string[]) => champs.map((c) => d[c]).filter((v) => typeof v === "string" || typeof v === "number").join(" ");

/** Tout ce que la personne peut retrouver par la recherche */
export function construireIndex(depot: Depot, p: Personne | undefined): Resultat[] {
  const out: Resultat[] = [];
  const projets = projetsAccessibles(p, depot.tous("projets").filter((x) => !x.archive));
  const parId = new Map<ID, Projet>(projets.map((x) => [x.id, x]));
  const nomPersonne = (id: unknown) => (typeof id === "string" ? depot.parId("personnes", id)?.nom ?? "" : "");

  if (niveau(p, "portefeuille") !== "aucun") {
    for (const x of projets) {
      out.push({
        cle: `projets|${x.id}`, type: "Projet", titre: `${x.code} · ${x.nom}`, detail: [x.statut, x.phaseGroupe, nomPersonne(x.directeurId)].filter(Boolean).join(" · "),
        texte: `${x.code} ${x.nom} ${x.description} ${x.lieu} ${x.maitreOuvrage} ${x.numeroSource ?? ""} ${nomPersonne(x.directeurId)}`.toLowerCase(),
        lien: `/projets/${x.id}`, projetId: x.id, date: x.dateFin, statut: x.statut, responsableId: x.directeurId,
      });
    }
  }

  for (const s of SOURCES) {
    for (const doc of depot.tous(s.collection) as unknown as Record<string, unknown>[]) {
      const projet = parId.get(doc.projetId as ID);
      if (!projet) continue;
      const module: ModuleApp = moduleDe(s.collection, doc);
      if (niveau(p, module) === "aucun") continue;
      if (s.collection === "notes" && !canalVisible(p, doc.canal as never)) continue;
      if (s.collection === "decisions" && !decisionVisible(p, doc as never)) continue;
      const titre = s.titre(doc) || META[s.collection].libelle;
      out.push({
        cle: `${s.collection}|${doc.id}`, type: s.type, titre, detail: `${projet.code}${doc.statut ? ` · ${doc.statut}` : ""}`,
        texte: `${titre} ${texteDe(doc, s.champs)} ${projet.code} ${nomPersonne(s.responsable ? doc[s.responsable] : undefined)}`.toLowerCase(),
        lien: `/projets/${projet.id}${s.chemin(doc) ? `/${s.chemin(doc)}` : ""}`, projetId: projet.id,
        date: s.date ? (doc[s.date] as string | undefined) : undefined, statut: doc.statut as string | undefined,
        responsableId: s.responsable ? (doc[s.responsable] as ID | undefined) : undefined,
      });
    }
  }

  if (niveau(p, "entreprises") !== "aucun") {
    for (const e of depot.tous("entreprises")) {
      out.push({ cle: `entreprises|${e.id}`, type: "Entreprise", titre: e.nom, detail: [e.localite, e.contact].filter(Boolean).join(" · "), texte: `${e.nom} ${e.localite} ${e.contact} ${e.email} ${e.specialites.join(" ")}`.toLowerCase(), lien: "/entreprises" });
      for (const c of e.contacts ?? []) {
        out.push({ cle: `contacts|${e.id}|${c.nom}`, type: "Contact", titre: c.nom, detail: [c.fonction, e.nom].filter(Boolean).join(" · "), texte: `${c.nom} ${c.fonction ?? ""} ${c.email ?? ""} ${e.nom}`.toLowerCase(), lien: "/entreprises" });
      }
    }
  }
  if (niveau(p, "ressources") !== "aucun" || niveau(p, "organigramme") !== "aucun") {
    for (const x of depot.tous("personnes")) {
      out.push({ cle: `personnes|${x.id}`, type: "Personne", titre: x.nom, detail: [x.fonction ?? x.role, x.organisation].filter(Boolean).join(" · "), texte: `${x.nom} ${x.fonction ?? ""} ${x.role} ${x.organisation} ${x.email}`.toLowerCase(), lien: "/ressources", responsableId: x.id });
    }
  }
  return out;
}

export interface FiltresRecherche {
  type?: string;
  projetId?: ID;
  directionId?: ID;
  programmeId?: ID;
  responsableId?: ID;
  statut?: string;
  du?: string;
  au?: string;
}

/** Résultats correspondant à tous les termes, les correspondances dans le titre d'abord */
export function chercher(index: Resultat[], requete: string, filtres: FiltresRecherche = {}, projets: Pick<Projet, "id" | "directionId" | "programmeId">[] = []): Resultat[] {
  const termes = requete.toLowerCase().split(/\s+/).filter(Boolean);
  const projet = new Map(projets.map((p) => [p.id, p]));
  return index.filter((r) => {
    if (filtres.type && r.type !== filtres.type) return false;
    if (filtres.projetId && r.projetId !== filtres.projetId) return false;
    if (filtres.responsableId && r.responsableId !== filtres.responsableId) return false;
    if (filtres.statut && r.statut !== filtres.statut) return false;
    if (filtres.directionId && projet.get(r.projetId ?? "")?.directionId !== filtres.directionId) return false;
    if (filtres.programmeId && projet.get(r.projetId ?? "")?.programmeId !== filtres.programmeId) return false;
    if (filtres.du && (!r.date || r.date.slice(0, 10) < filtres.du)) return false;
    if (filtres.au && (!r.date || r.date.slice(0, 10) > filtres.au)) return false;
    return termes.every((x) => r.texte.includes(x));
  }).map((r) => ({ r, score: termes.reduce((s, x) => s + (r.titre.toLowerCase().includes(x) ? 2 : 0), 0) + (r.type === "Projet" ? 1 : 0) }))
    .sort((a, b) => b.score - a.score || (b.r.date ?? "").localeCompare(a.r.date ?? ""))
    .map((x) => x.r);
}
