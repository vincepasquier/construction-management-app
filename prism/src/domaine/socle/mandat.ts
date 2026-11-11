// Mandat de projet selon le modèle du groupe : contenu, contrôles avant soumission, signatures et
// versions. Un mandat signé est figé (empreinte de son contenu) ; toute évolution passe par une
// nouvelle version.
import type { ID, Personne, Projet, Risque } from "../types";
import type { ContenuMandat, Mandat, PartiePrenante, RoleSignataire, SignatureMandat } from "./types";

/** Phases du modèle de mandat ; celles marquées obligatoires doivent être planifiées */
export const PHASES_MANDAT: { phase: string; obligatoire: boolean }[] = [
  { phase: "Définition des objectifs", obligatoire: true },
  { phase: "Études préliminaires", obligatoire: false },
  { phase: "Étude du projet", obligatoire: true },
  { phase: "Appel d'offres", obligatoire: false },
  { phase: "Réalisation", obligatoire: true },
];

export const MOTIFS: { cle: keyof ContenuMandat["motifs"]; libelle: string }[] = [
  { cle: "croissance", libelle: "Soutien à la croissance" },
  { cle: "efficience", libelle: "Efficience, gains d'efficacité, économies" },
  { cle: "maintenance", libelle: "Maintenance, remplacement" },
  { cle: "legal", libelle: "Contraintes légales / SQE" },
];

export const ROLES_SIGNATAIRES: RoleSignataire[] = ["Commanditaire", "Client", "Chef de projet"];

interface Contexte {
  auteur?: Personne;
  sponsor?: Personne;
  chef?: Personne;
  portefeuille?: string;
  budget?: number;
  risques?: Risque[];
  parties?: (PartiePrenante & { nomAffiche: string })[];
}

let compteur = 0;
const id = (prefixe: string) => `${prefixe}-${Date.now().toString(36)}${(compteur++).toString(36)}`;

/** Contenu de départ, prérempli avec ce que la fiche du projet sait déjà */
export function contenuInitial(p: Projet, c: Contexte = {}): ContenuMandat {
  const clients = (c.parties ?? []).filter((x) => /client|métier|utilisateur/i.test(x.roleProjet)).map((x) => x.nomAffiche);
  const autres = (c.parties ?? []).filter((x) => !/client|métier|utilisateur|sponsor|commanditaire|chef de projet/i.test(x.roleProjet)).map((x) => `${x.nomAffiche} (${x.roleProjet})`);
  return {
    nomProjet: `${p.nom}${p.numeroSource ? ` (${p.numeroSource})` : ""}`,
    auteur: c.auteur?.nom ?? "", portefeuille: c.portefeuille ?? "",
    commanditaire: c.sponsor?.nom ?? "", chefProjet: c.chef?.nom ?? "", client: clients.join(", "), autresParties: autres.join(", "),
    motifs: { croissance: false, efficience: false, maintenance: p.classification === "Renouvellement", legal: p.classification === "Réglementaire" },
    contexte: p.description ?? "", benefices: "",
    objectifs: [{ id: id("obj"), objectif: "", critere: "", approbateur: "" }],
    perimetre: "", exclusions: "",
    impactsEnvironnementaux: "", impactsSociaux: "", projetsConnexes: "",
    composanteIT: false, descriptionIT: "",
    phases: PHASES_MANDAT.map((x) => ({ phase: x.phase, applicable: x.obligatoire })),
    coutsTexte: "", budget: Math.round(c.budget ?? 0), centreCout: p.compteAnalytique ?? "",
    ressources: [{ id: id("res"), provenance: c.chef ? `Chefferie de projet – ${c.chef.nom}` : "Chefferie de projet", joursHommes: 0, confirmee: false }],
    risques: (c.risques ?? []).slice(0, 5).map((r) => ({ id: id("rsq"), risque: r.titre, reponse: r.mesures })),
    preavisComInv: false, annexes: "",
  };
}

export interface Manque { cle: string; libelle: string }

/** Rubriques obligatoires du modèle (marquées d'un astérisque) restées incomplètes */
export function manques(c: ContenuMandat): Manque[] {
  const m: Manque[] = [];
  const vide = (s: string | undefined) => !s?.trim();
  const exiger = (condition: boolean, cle: string, libelle: string) => { if (condition) m.push({ cle, libelle }); };
  exiger(vide(c.nomProjet), "nomProjet", "Nom du projet");
  exiger(vide(c.auteur), "auteur", "Auteur du document");
  exiger(vide(c.commanditaire), "commanditaire", "Commanditaire / sponsor");
  exiger(vide(c.chefProjet), "chefProjet", "Chef de projet");
  exiger(!Object.values(c.motifs).some(Boolean), "motifs", "Au moins un motif du projet");
  exiger(vide(c.contexte), "contexte", "Contexte");
  exiger(vide(c.benefices), "benefices", "Bénéfices attendus");
  exiger(!c.objectifs.some((o) => !vide(o.objectif) && !vide(o.critere)), "objectifs", "Au moins un objectif avec son critère de succès");
  exiger(vide(c.impactsEnvironnementaux) || vide(c.impactsSociaux), "impacts", "Impacts environnementaux et sociaux (indiquer « Aucun » le cas échéant)");
  exiger(c.composanteIT && vide(c.descriptionIT), "descriptionIT", "Description de la composante informatique");
  for (const p of PHASES_MANDAT.filter((x) => x.obligatoire)) {
    const ph = c.phases.find((x) => x.phase === p.phase);
    exiger(!ph?.debut || !ph?.fin, `phase-${p.phase}`, `Dates de la phase « ${p.phase} »`);
  }
  exiger(c.phases.some((p) => p.applicable && p.debut && p.fin && p.fin < p.debut), "phases", "Une phase se termine avant d'avoir commencé");
  exiger(!(c.budget > 0), "budget", "Budget estimé");
  exiger(!c.ressources.some((r) => !vide(r.provenance) && r.joursHommes > 0), "ressources", "Estimation des ressources humaines (jours-hommes)");
  return m;
}

/** Empreinte du contenu, stable quel que soit l'ordre des clés : sert à vérifier qu'un mandat signé n'a pas changé */
export function empreinte(c: ContenuMandat): string {
  const canonique = (v: unknown): string =>
    Array.isArray(v) ? `[${v.map(canonique).join(",")}]`
      : v && typeof v === "object" ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonique((v as Record<string, unknown>)[k])}`).join(",")}}`
        : JSON.stringify(v ?? null);
  const texte = canonique(c);
  // Deux hachages FNV-1a de 32 bits, avec des graines différentes, assemblés en 16 caractères
  const fnv = (graine: number) => {
    let h = graine;
    for (let i = 0; i < texte.length; i++) { h ^= texte.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(16).padStart(8, "0");
  };
  return fnv(2166136261) + fnv(0x9747b28c);
}

export function creerMandat(projetId: ID, contenu: ContenuMandat, o: { version?: number; auteurId?: ID; date: string; id?: ID }): Mandat {
  return { id: o.id ?? id("man"), projetId, version: o.version ?? 1, statut: "Brouillon", contenu, signatures: [], dateCreation: o.date, auteurId: o.auteurId };
}

/** Signatures attendues : commanditaire et chef de projet toujours, client s'il est désigné */
export function signaturesAttendues(c: ContenuMandat, personnes: Personne[]): SignatureMandat[] {
  const trouver = (nom: string) => personnes.find((p) => p.nom.toLowerCase() === nom.trim().toLowerCase());
  const s = (role: RoleSignataire, nom: string): SignatureMandat => ({ role, personneId: trouver(nom)?.id, nom: nom.trim() || undefined });
  return [s("Commanditaire", c.commanditaire), ...(c.client.trim() ? [s("Client", c.client)] : []), s("Chef de projet", c.chefProjet)];
}

export function soumettre(m: Mandat, personnes: Personne[], date: string): Mandat {
  if (m.statut !== "Brouillon" && m.statut !== "Refusé") throw new Error("Seul un mandat en brouillon peut être soumis à signature.");
  const manquants = manques(m.contenu);
  if (manquants.length) throw new Error(`Le mandat est incomplet : ${manquants.map((x) => x.libelle).join(" ; ")}.`);
  return { ...m, statut: "Soumis", dateSoumission: date, signatures: signaturesAttendues(m.contenu, personnes), decision: undefined };
}

export const toutesSignees = (m: Mandat) => m.signatures.length > 0 && m.signatures.every((s) => s.date);

/** Signe pour un rôle ; la dernière signature fige le mandat et autorise le démarrage */
export function signer(m: Mandat, role: RoleSignataire, date: string, signataire?: { id: ID; nom: string }): Mandat {
  if (m.statut !== "Soumis") throw new Error("Ce mandat n'est pas en attente de signature.");
  const signatures = m.signatures.map((s) => (s.role === role ? { ...s, date, personneId: signataire?.id ?? s.personneId, nom: signataire?.nom ?? s.nom } : s));
  const suite = { ...m, signatures };
  return toutesSignees(suite) ? { ...suite, statut: "Signé", decision: "Autorisé", empreinte: empreinte(m.contenu) } : suite;
}

export function refuser(m: Mandat, decision: "Refusé" | "Complément demandé"): Mandat {
  if (m.statut !== "Soumis") throw new Error("Ce mandat n'est pas en attente de signature.");
  // Un complément demandé rend le mandat à son auteur ; les signatures déjà données sont à refaire
  return { ...m, statut: decision === "Refusé" ? "Refusé" : "Brouillon", decision, signatures: [] };
}

export function relancer(m: Mandat, role: RoleSignataire, date: string): Mandat {
  return { ...m, signatures: m.signatures.map((s) => (s.role === role && !s.date ? { ...s, relances: [...(s.relances ?? []), date] } : s)) };
}

/** Nouvelle version en brouillon, partant du contenu de la version indiquée */
export function nouvelleVersion(precedent: Mandat, tous: Mandat[], o: { auteurId?: ID; date: string }): Mandat {
  const version = Math.max(...tous.filter((x) => x.projetId === precedent.projetId).map((x) => x.version), 0) + 1;
  return creerMandat(precedent.projetId, structuredClone(precedent.contenu), { version, auteurId: o.auteurId, date: o.date });
}

/** Mandat qui fait foi : la dernière version signée ; à défaut, la dernière version */
export function mandatEnVigueur(mandats: Mandat[]): Mandat | undefined {
  const tri = [...mandats].sort((a, b) => b.version - a.version);
  return tri.find((m) => m.statut === "Signé") ?? tri[0];
}

/** Le contenu d'un mandat signé correspond-il toujours à son empreinte ? */
export const integre = (m: Mandat) => !m.empreinte || empreinte(m.contenu) === m.empreinte;
