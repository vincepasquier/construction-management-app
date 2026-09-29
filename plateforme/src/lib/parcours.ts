// Parcours d'un marché : de la préparation de l'appel d'offres jusqu'à la clôture du contrat.
// Chaque étape est « faite », « actuelle » (prochaine chose à faire) ou « à venir ».
import type { AppelOffres, Contrat, Facture } from "../types";
import { montantContrat } from "./finance";

export type IdEtape = "descriptif" | "consultation" | "offres" | "adjudication" | "contrat" | "facturation" | "cloture";
export type EtatEtape = "fait" | "actuel" | "a-venir" | "sans-objet";

export interface EtapeMarche {
  id: IdEtape;
  libelle: string;
  detail: string;
  etat: EtatEtape;
}

export function parcoursMarche(ao: AppelOffres | undefined, contrat: Contrat | undefined, factures: Facture[]): EtapeMarche[] {
  const fs = contrat ? factures.filter((f) => f.contratId === contrat.id && f.statut !== "Contestée") : [];
  const facture = fs.reduce((s, f) => s + f.montantHT, 0);
  const signe = !!contrat && contrat.statut !== "En préparation";
  const clos = contrat?.statut === "Clôturé" || fs.some((f) => f.type === "Décompte final" && f.statut === "Payée");
  const publie = !!ao && ao.statut !== "Préparation";
  const adjuge = !!contrat || ao?.statut === "Adjugé";

  const faits: Record<IdEtape, boolean> = {
    descriptif: !!ao && ao.positions.length > 0,
    consultation: publie,
    offres: !!ao && ao.soumissions.length > 0,
    adjudication: adjuge,
    contrat: signe,
    facturation: clos,
    cloture: clos,
  };
  const etapes: Omit<EtapeMarche, "etat">[] = [
    { id: "descriptif", libelle: "Descriptif", detail: ao ? `${ao.positions.length} position(s) CAN` : "Gré à gré" },
    { id: "consultation", libelle: "Consultation", detail: ao ? (publie ? `Retour ${ao.dateRetour.split("-").reverse().join(".")}` : "À publier") : "—" },
    { id: "offres", libelle: "Offres", detail: ao ? `${ao.soumissions.length} reçue(s)` : "—" },
    { id: "adjudication", libelle: "Adjudication", detail: adjuge ? "Adjugé" : "Évaluation" },
    { id: "contrat", libelle: "Contrat", detail: contrat ? contrat.statut : "À établir" },
    { id: "facturation", libelle: "Facturation", detail: contrat ? `${fs.length} facture(s) · ${contrat && montantContrat(contrat) ? Math.round((facture / montantContrat(contrat)) * 100) : 0} %` : "—" },
    { id: "cloture", libelle: "Clôture", detail: clos ? "Décompte final" : "—" },
  ];
  // Sans appel d'offres (gré à gré), les quatre premières étapes sont sans objet
  const sansAO = !ao;
  let actuelTrouve = false;
  return etapes.map((e) => {
    if (sansAO && ["descriptif", "consultation", "offres", "adjudication"].includes(e.id)) return { ...e, etat: "sans-objet" };
    if (faits[e.id]) return { ...e, etat: "fait" };
    if (!actuelTrouve) { actuelTrouve = true; return { ...e, etat: "actuel" }; }
    return { ...e, etat: "a-venir" };
  });
}
