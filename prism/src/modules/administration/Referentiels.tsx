// Référentiels du groupe : directions, portefeuilles, programmes. Saisie directe dans les tableaux.
import { Plus, Trash2 } from "lucide-react";
import { notifier } from "@/app/etatUI";
import { useSuppression } from "@/app/suppression";
import { TableDonnees, type Colonne } from "@/app/table/TableDonnees";
import { Bouton, Carte } from "@/app/ui";
import { nouvelId } from "@/domaine/lib/id";
import type { Direction, Portefeuille, Programme } from "@/domaine/socle/types";
import { useDonnees } from "@/donnees/hooks";

export function Referentiels() {
  const { directions, portefeuilles, programmes, projets, personnes, ajouter, modifier } = useDonnees();
  const supprimer = useSuppression();
  const utilises = (cle: "directionId" | "portefeuilleId" | "programmeId", id: string) => projets.filter((p) => p[cle] === id).length;
  const retirer = (collection: "directions" | "portefeuilles" | "programmes", cle: "directionId" | "portefeuilleId" | "programmeId", id: string, nom: string) => {
    const n = utilises(cle, id);
    if (n) notifier(`« ${nom} » est utilisé par ${n} projet(s) : il ne peut pas être supprimé.`, "erreur");
    else void supprimer(collection, id, { quoi: `« ${nom} »` });
  };
  const responsables = ["", ...personnes.map((p) => p.nom).sort((a, b) => a.localeCompare(b, "fr"))];
  const idDe = (nom: string) => personnes.find((p) => p.nom === nom)?.id;
  const nomDe = (id?: string) => personnes.find((p) => p.id === id)?.nom ?? "";
  const poubelle = (action: () => void) => <button type="button" aria-label="Supprimer" className="rounded p-1 text-slate-300 hover:text-rose-600" onClick={action}><Trash2 size={14} /></button>;

  const colDirections: Colonne<Direction>[] = [
    { id: "code", titre: "Code", valeur: (d) => d.code, largeur: "7rem", edition: { type: "texte", enregistrer: (d, v) => modifier("directions", d.id, { code: v.trim().toUpperCase() }) } },
    { id: "nom", titre: "Nom", valeur: (d) => d.nom, edition: { type: "texte", enregistrer: (d, v) => modifier("directions", d.id, { nom: v }) } },
    { id: "resp", titre: "Responsable", valeur: (d) => nomDe(d.responsableId), edition: { type: "liste", options: responsables, enregistrer: (d, v) => modifier("directions", d.id, { responsableId: idDe(v) }) } },
    { id: "n", titre: "Projets", valeur: (d) => utilises("directionId", d.id), type: "nombre" },
  ];
  const colPortefeuilles: Colonne<Portefeuille>[] = [
    { id: "nom", titre: "Nom", valeur: (d) => d.nom, edition: { type: "texte", enregistrer: (d, v) => modifier("portefeuilles", d.id, { nom: v }) } },
    { id: "desc", titre: "Description", valeur: (d) => d.description, edition: { type: "texte", enregistrer: (d, v) => modifier("portefeuilles", d.id, { description: v }) } },
    { id: "resp", titre: "Responsable", valeur: (d) => nomDe(d.responsableId), edition: { type: "liste", options: responsables, enregistrer: (d, v) => modifier("portefeuilles", d.id, { responsableId: idDe(v) }) } },
    { id: "n", titre: "Projets", valeur: (d) => utilises("portefeuilleId", d.id), type: "nombre" },
  ];
  const colProgrammes: Colonne<Programme>[] = [
    { id: "nom", titre: "Nom", valeur: (d) => d.nom, edition: { type: "texte", enregistrer: (d, v) => modifier("programmes", d.id, { nom: v }) } },
    { id: "pf", titre: "Portefeuille", valeur: (d) => portefeuilles.find((x) => x.id === d.portefeuilleId)?.nom ?? "",
      edition: { type: "liste", options: ["", ...portefeuilles.map((x) => x.nom)], enregistrer: (d, v) => modifier("programmes", d.id, { portefeuilleId: portefeuilles.find((x) => x.nom === v)?.id }) } },
    { id: "desc", titre: "Description", valeur: (d) => d.description, edition: { type: "texte", enregistrer: (d, v) => modifier("programmes", d.id, { description: v }) } },
    { id: "n", titre: "Projets", valeur: (d) => utilises("programmeId", d.id), type: "nombre" },
  ];

  return (
    <div className="space-y-6">
      <Carte titre="Directions" sousTitre="Rattachement des projets et périmètre des droits"
        action={<Bouton taille="sm" icone={<Plus size={14} />} onClick={() => ajouter("directions", { id: nouvelId("dir"), code: "NOUV", nom: "Nouvelle direction" })}>Direction</Bouton>}>
        <TableDonnees simple id="directions" lignes={directions} colonnes={colDirections} cle={(d) => d.id} actions={(d) => poubelle(() => retirer("directions", "directionId", d.id, d.nom))} />
      </Carte>
      <Carte titre="Portefeuilles" sousTitre="Regroupements de gouvernance"
        action={<Bouton taille="sm" icone={<Plus size={14} />} onClick={() => ajouter("portefeuilles", { id: nouvelId("pf"), nom: "Nouveau portefeuille" })}>Portefeuille</Bouton>}>
        <TableDonnees simple id="portefeuilles" lignes={portefeuilles} colonnes={colPortefeuilles} cle={(d) => d.id} actions={(d) => poubelle(() => retirer("portefeuilles", "portefeuilleId", d.id, d.nom))} />
      </Carte>
      <Carte titre="Programmes" sousTitre="Projets qui concourent à un même objectif"
        action={<Bouton taille="sm" icone={<Plus size={14} />} onClick={() => ajouter("programmes", { id: nouvelId("pg"), nom: "Nouveau programme" })}>Programme</Bouton>}>
        <TableDonnees simple id="programmes" lignes={programmes} colonnes={colProgrammes} cle={(d) => d.id} actions={(d) => poubelle(() => retirer("programmes", "programmeId", d.id, d.nom))} />
      </Carte>
    </div>
  );
}
