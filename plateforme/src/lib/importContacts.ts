// Import d'une liste de parties prenantes (export CSV / Excel d'une liste SharePoint) :
// les collaborateurs internes deviennent des membres de l'équipe, les autres des contacts d'entreprise.
import type { ContactEntreprise, Entreprise, ID, Personne, Role } from "../types";
import { cleEntreprise } from "./importSuiviFinancier";

const txt = (v: unknown) => (v === null || v === undefined ? "" : String(v).replace(/\s+/g, " ").trim());
const norm = (v: unknown) => txt(v).toLowerCase();

export interface LigneContact {
  nom: string;
  prenom: string;
  societe: string;
  fonction: string;
  email: string;
  telephone: string;
  remarques: string;
}

/** Repère la ligne d'en-tête (Nom, Prénom, Société…) et lit les contacts */
export function lireContacts(data: unknown[][]): LigneContact[] {
  const h = data.findIndex((r) => r.some((c) => norm(c) === "nom") && r.some((c) => /^(soci[ée]t[ée]|entreprise|organisation)/.test(norm(c))));
  if (h < 0) throw new Error("Colonnes « Nom » et « Société » introuvables.");
  const e = data[h].map(norm);
  const col = (...l: RegExp[]) => e.findIndex((x) => l.some((y) => y.test(x)));
  const c = {
    nom: col(/^nom$/), prenom: col(/^pr[ée]nom/), societe: col(/^soci[ée]t[ée]|^entreprise|^organisation/), fonction: col(/^fonction|^r[ôo]le/),
    email: col(/mail/), tel: col(/t[ée]l[ée]phone|^t[ée]l/), rem: col(/^remarque|^commentaire|^note/),
  };
  return data.slice(h + 1).map((r) => ({
    nom: txt(r[c.nom]), prenom: c.prenom >= 0 ? txt(r[c.prenom]) : "", societe: txt(r[c.societe]), fonction: c.fonction >= 0 ? txt(r[c.fonction]) : "",
    email: c.email >= 0 ? txt(r[c.email]).replace(/\s/g, "") : "", telephone: c.tel >= 0 ? txt(r[c.tel]) : "", remarques: c.rem >= 0 ? txt(r[c.rem]) : "",
  })).filter((x) => x.nom || x.prenom);
}

/** Domaine e-mail le plus fréquent : sert à proposer les organisations internes */
export function organisationsProbablementInternes(lignes: LigneContact[]): string[] {
  const n = new Map<string, number>();
  for (const l of lignes) { const d = l.email.split("@")[1]?.toLowerCase(); if (d) n.set(d, (n.get(d) ?? 0) + 1); }
  const domaine = [...n].sort((a, b) => b[1] - a[1])[0]?.[0];
  return [...new Set(lignes.filter((l) => domaine && l.email.toLowerCase().endsWith(`@${domaine}`)).map((l) => l.societe))];
}

export function roleDepuisFonction(f: string): Role {
  const x = f.toLowerCase();
  if (/repr[ée]sentant mo|ma[îi]tre d.ouvrage|\brmo\b/.test(x)) return "Maître d'ouvrage";
  if (/resp(onsable|\.)? (de )?lot/.test(x)) return "Responsable de lot";
  if (/^(suppl\.? )?chef de projet|directeur de projet|direction de projet/.test(x)) return "Directeur de projet";
  if (/conducteur|direction des travaux|contrema[îi]tre/.test(x)) return "Conducteur de travaux";
  if (/architecte/.test(x)) return "Architecte";
  if (/assistant/.test(x)) return "Assistant(e) de projet";
  return "Ingénieur";
}

export function categorieOrganisation(societe: string): Entreprise["categorie"] {
  if (!societe || /^-+$/.test(societe)) return "Particulier";
  if (/^(commune|ville|canton|sen\b|service|office|d[ée]partement|etat de|confédération)/i.test(societe) || /^SEn$/i.test(societe)) return "Autorité";
  return undefined;
}

export interface ResultatContacts {
  personnes: Personne[];
  personnesMaj: { id: ID; patch: Partial<Personne> }[];
  entreprises: Entreprise[];
  entreprisesMaj: { id: ID; contacts: ContactEntreprise[] }[];
  resume: string;
}

export function importerContacts(lignes: LigneContact[], o: { internes: string[]; personnes: Personne[]; entreprises: Entreprise[] }): ResultatContacts {
  const internes = new Set(o.internes.map((x) => x.toLowerCase()));
  const nomComplet = (l: LigneContact) => [l.prenom, l.nom].filter(Boolean).join(" ");
  const cleNom = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]+/g, " ").trim();
  const personnes: Personne[] = [];
  const maj: ResultatContacts["personnesMaj"] = [];
  const entreprises: Entreprise[] = [];
  const contactsMaj = new Map<ID, ContactEntreprise[]>();
  const parCle = new Map<string, Entreprise>();
  for (const e of o.entreprises) parCle.set(cleEntreprise(e.nom), e);

  for (const l of lignes) {
    const nom = nomComplet(l);
    if (internes.has(l.societe.toLowerCase())) {
      const ex = [...o.personnes, ...personnes].find((p) => (l.email && p.email.toLowerCase() === l.email.toLowerCase()) || cleNom(p.nom) === cleNom(nom));
      if (ex) {
        if (o.personnes.includes(ex)) maj.push({ id: ex.id, patch: { fonction: l.fonction || ex.fonction, telephone: l.telephone || ex.telephone, email: ex.email || l.email, organisation: ex.organisation || l.societe } });
        continue;
      }
      personnes.push({
        id: `per-${cleNom(nom).replace(/ /g, "-").slice(0, 24)}-${personnes.length + 1}`, nom, role: roleDepuisFonction(l.fonction), email: l.email,
        organisation: l.societe, capacite: 100, fonction: l.fonction || undefined, telephone: l.telephone || undefined,
      });
      continue;
    }
    const categorie = categorieOrganisation(l.societe);
    const societe = categorie === "Particulier" ? "Particuliers et riverains" : l.societe;
    const k = cleEntreprise(societe) || cleNom(societe);
    let e = parCle.get(k);
    if (!e) {
      e = { id: `ent-${k.replace(/ /g, "-").slice(0, 24)}-${entreprises.length + 1}`, nom: societe, localite: "", contact: nom, email: l.email, telephone: l.telephone, specialites: [], contacts: [], ...(categorie ? { categorie } : {}) };
      parCle.set(k, e);
      entreprises.push(e);
    }
    const liste = entreprises.includes(e) ? (e.contacts ??= []) : (contactsMaj.get(e.id) ?? contactsMaj.set(e.id, [...(e.contacts ?? [])]).get(e.id)!);
    if (liste.some((c) => cleNom(c.nom) === cleNom(nom))) continue;
    liste.push({ nom, fonction: l.fonction && l.fonction !== "-" ? l.fonction : undefined, email: l.email && l.email !== "-" ? l.email : undefined, telephone: l.telephone || undefined, remarques: l.remarques || undefined });
  }
  const nbContacts = entreprises.reduce((s, e) => s + (e.contacts?.length ?? 0), 0) + [...contactsMaj].reduce((s, [id, c]) => s + c.length - (o.entreprises.find((e) => e.id === id)?.contacts?.length ?? 0), 0);
  return {
    personnes, personnesMaj: maj, entreprises, entreprisesMaj: [...contactsMaj].map(([id, contacts]) => ({ id, contacts })),
    resume: `${personnes.length} membre(s) de l'équipe, ${maj.length} mis à jour, ${entreprises.length} nouvelle(s) organisation(s), ${nbContacts} contact(s)`,
  };
}
