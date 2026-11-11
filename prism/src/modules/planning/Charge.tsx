// Charge du projet en jours-hommes : ce que le projet demande aux directions, par phase, par
// compétence et par année. Ces demandes s'additionnent face à la capacité des directions.
import { Gauge, Plus, Trash2 } from "lucide-react";
import { TableDonnees, lireNombre, type Colonne } from "@/app/table/TableDonnees";
import { Bouton, Carte, useLectureSeule, Vide } from "@/app/ui";
import { nouvelId } from "@/domaine/lib/id";
import type { EstimationCharge } from "@/domaine/socle/types";
import { useActions, useDoc, useDonnees, useProjet } from "@/donnees/hooks";

export function Charge() {
  const { projet, estimationsCharge } = useProjet();
  const { directions, configurations } = useDonnees();
  const { ajouter, modifier, supprimer } = useActions();
  const lecture = useLectureSeule();
  const type = useDoc("typesProjet", projet?.typeProjetId);
  if (!projet) return null;
  const competences = configurations.find((c) => c.id === "courante")?.competences ?? [];
  const codeDirection = (id?: string) => directions.find((d) => d.id === id)?.code ?? "";
  const annee = Number(projet.dateDebut.slice(0, 4)) || new Date().getFullYear();

  const colonnes: Colonne<EstimationCharge>[] = [
    { id: "annee", titre: "Année", valeur: (e) => e.annee, largeur: "6rem", groupable: true, edition: { type: "nombre", enregistrer: (e, v) => modifier("estimationsCharge", e.id, { annee: Math.round(lireNombre(v)) || e.annee }) } },
    { id: "phase", titre: "Phase", valeur: (e) => e.phase ?? "", groupable: true, edition: { type: "liste", options: ["", ...(type?.phases ?? [])], enregistrer: (e, v) => modifier("estimationsCharge", e.id, { phase: v || undefined }) } },
    { id: "direction", titre: "Direction sollicitée", valeur: (e) => codeDirection(e.directionId), groupable: true, edition: { type: "liste", options: ["", ...directions.map((d) => d.code)], enregistrer: (e, v) => modifier("estimationsCharge", e.id, { directionId: directions.find((d) => d.code === v)?.id }) } },
    { id: "competence", titre: "Compétence", valeur: (e) => e.competence ?? "", groupable: true, edition: { type: "liste", options: ["", ...competences], enregistrer: (e, v) => modifier("estimationsCharge", e.id, { competence: v || undefined }) } },
    { id: "jh", titre: "Jours-hommes", valeur: (e) => e.joursHommes, type: "nombre", total: true, edition: { type: "nombre", enregistrer: (e, v) => modifier("estimationsCharge", e.id, { joursHommes: lireNombre(v) }) } },
    { id: "commentaire", titre: "Commentaire", valeur: (e) => e.commentaire ?? "", edition: { type: "texte", enregistrer: (e, v) => modifier("estimationsCharge", e.id, { commentaire: v || undefined }) } },
  ];
  const bouton = !lecture && <Bouton variante="primaire" icone={<Plus size={15} />} onClick={() => ajouter("estimationsCharge", { id: nouvelId("jh"), projetId: projet.id, annee: estimationsCharge.at(-1)?.annee ?? annee, phase: projet.phaseGroupe, directionId: projet.directionId, joursHommes: 0 })}>Ligne de charge</Bouton>;

  return (
    <Carte>
      <TableDonnees id="charge" lignes={estimationsCharge} colonnes={colonnes} cle={(e) => e.id} barre={bouton} triInitial={{ colonne: "annee", sens: "asc" }}
        actions={lecture ? undefined : (e) => <button type="button" aria-label="Supprimer la ligne" className="rounded p-1 text-slate-300 hover:text-rose-600" onClick={() => supprimer("estimationsCharge", e.id)}><Trash2 size={14} /></button>}
        vide={<Vide icone={<Gauge size={22} />} titre="Aucune charge estimée" texte="Estimez les jours-hommes demandés à chaque direction, par année : la somme des projets est comparée à la capacité des directions dans « Ressources »." action={bouton} />} />
    </Carte>
  );
}
