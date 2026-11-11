// Passage d'un fichier CRBX lu (sia451.ts) aux objets de l'application.
import type { AppelOffres, Entreprise, PositionCAN, Soumission } from "../types";
import { comparerAuDescriptif, type FichierSia451 } from "./sia451";
import { aujourdhui } from "./format";
import { nouvelId } from "./id";

export const idPosition = (cle: string) => `pos-${cle}`;

export function positionsDepuisCrbx(f: FichierSia451): PositionCAN[] {
  return f.positions.map((p) => ({
    id: idPosition(p.cle), chapitre: p.chapitre, numero: p.numero, libelle: p.libelle || "(sans texte)", texte: p.texte,
    unite: p.unite, quantite: p.quantite, quantitesParElevation: p.quantitesParElevation,
  }));
}

/** Métadonnées de l'appel d'offres issues du fichier */
export function descriptifDepuisCrbx(f: FichierSia451, nomFichier: string): Pick<AppelOffres, "positions" | "source" | "chapitres" | "elevations"> {
  return {
    positions: positionsDepuisCrbx(f),
    source: { fichier: nomFichier, date: f.date, logiciel: f.logiciel, projet: f.projet },
    chapitres: f.chapitres,
    elevations: f.elevations,
  };
}

const normaliser = (nom: string) =>
  nom.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\b(sa|sarl|ag|gmbh|sas)\b/g, "").replace(/[^a-z0-9]/g, "");

/** Retrouve l'entreprise soumissionnaire dans le carnet d'adresses, ou prépare sa création */
export function entrepriseDepuisCrbx(f: FichierSia451, entreprises: Entreprise[]): { entreprise: Entreprise; nouvelle: boolean } {
  const nom = f.entreprise ?? "Entreprise inconnue";
  const cle = normaliser(nom);
  const existante = entreprises.find((e) => normaliser(e.nom) === cle)
    ?? entreprises.find((e) => cle.length >= 4 && (normaliser(e.nom).includes(cle) || cle.includes(normaliser(e.nom))));
  if (existante) return { entreprise: existante, nouvelle: false };
  return {
    nouvelle: true,
    entreprise: { id: nouvelId("ent"), nom, localite: "", contact: f.contact ?? "", email: "", telephone: f.telephone ?? "", specialites: [] },
  };
}

/** Transforme une offre remplie en soumission, contrôlée par rapport au descriptif de l'AO */
export function soumissionDepuisCrbx(ao: AppelOffres, f: FichierSia451, entrepriseId: string, nomFichier: string): Soumission {
  const parNumero = new Map(ao.positions.map((p) => [p.numero, p.id]));
  const prixUnitaires: Record<string, number> = {};
  for (const p of f.positions) {
    const id = parNumero.get(p.cle);
    if (id && p.prixUnitaire) prixUnitaires[id] = p.prixUnitaire;
  }
  const ecarts = comparerAuDescriptif(ao.positions.map((p) => ({ cle: p.numero, libelle: p.libelle, quantite: p.quantite })), f);
  const existante = ao.soumissions.find((s) => s.entrepriseId === entrepriseId);
  return {
    id: existante?.id ?? nouvelId("sou"),
    entrepriseId,
    dateReception: f.date ?? aujourdhui(),
    prixUnitaires,
    rabaisPct: f.rabaisPct,
    escomptePct: f.escomptePct,
    notes: existante?.notes ?? {},
    remarques: existante?.remarques,
    fichier: nomFichier,
    totalDeclare: f.totalDeclare,
    ecarts: ecarts.map(({ cle, type, detail }) => ({ cle, type, detail })),
  };
}

export async function lireFichier(fichier: File): Promise<Uint8Array> {
  return new Uint8Array(await fichier.arrayBuffer());
}
