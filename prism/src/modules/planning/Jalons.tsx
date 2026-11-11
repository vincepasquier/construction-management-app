// Jalons du projet : date de référence, date actuelle, date réelle, écart. La date de référence est
// arrêtée une fois (« figer la référence ») ; les décalages ultérieurs se lisent contre elle.
import { Flag, Plus, Target } from "lucide-react";
import { TableDonnees, type Colonne } from "@/app/table/TableDonnees";
import { useSuppression } from "@/app/suppression";
import { Badge, Bouton, Carte, useLectureSeule, Vide, type CouleurBadge } from "@/app/ui";
import { aujourdhui } from "@/domaine/lib/format";
import { nouvelId } from "@/domaine/lib/id";
import { ecartJalon, etatJalon, reference, type EtatJalon } from "@/domaine/socle/planification";
import type { Tache } from "@/domaine/types";
import { useActions, useDonnees, useProjet } from "@/donnees/hooks";
import { Trash2 } from "lucide-react";

const COULEUR: Record<EtatJalon, CouleurBadge> = { Atteint: "vert", "En retard": "rouge", "Décalé": "orange", "À venir": "gris" };

export function Jalons() {
  const { projet, taches } = useProjet();
  const { personnes } = useDonnees();
  const { ajouter, modifier, grouper } = useActions();
  const supprimer = useSuppression();
  const lecture = useLectureSeule();
  const jour = aujourdhui();
  if (!projet) return null;
  const jalons = taches.filter((t) => t.jalon);
  const sansReference = jalons.filter((t) => !t.finPrevue);
  const responsables = ["", ...personnes.map((p) => p.nom).sort((a, b) => a.localeCompare(b, "fr"))];

  const colonnes: Colonne<Tache>[] = [
    { id: "nom", titre: "Jalon", valeur: (t) => t.nom, largeur: "24rem", edition: { type: "texte", enregistrer: (t, v) => v.trim() && modifier("taches", t.id, { nom: v.trim() }) } },
    { id: "reference", titre: "Référence", valeur: (t) => reference(t), type: "date", edition: { type: "date", enregistrer: (t, v) => modifier("taches", t.id, { finPrevue: v || undefined }) } },
    { id: "actuelle", titre: "Date actuelle", valeur: (t) => t.fin, type: "date", edition: { type: "date", enregistrer: (t, v) => v && modifier("taches", t.id, { fin: v, debut: v }) } },
    { id: "reelle", titre: "Date réelle", valeur: (t) => t.finReelle ?? "", type: "date", edition: { type: "date", enregistrer: (t, v) => modifier("taches", t.id, { finReelle: v || undefined, avancement: v ? 100 : t.avancement >= 100 ? 0 : t.avancement }) } },
    { id: "ecart", titre: "Écart (jours)", valeur: (t) => ecartJalon(t), type: "nombre", rendu: (t) => { const e = ecartJalon(t); return e === 0 ? <span className="text-slate-400">—</span> : <span className={e > 0 ? "text-rose-600" : "text-emerald-600"}>{e > 0 ? "+" : ""}{e}</span>; } },
    { id: "etat", titre: "État", valeur: (t) => etatJalon(t, jour), rendu: (t) => <Badge couleur={COULEUR[etatJalon(t, jour)]}>{etatJalon(t, jour)}</Badge>, groupable: true },
    { id: "responsable", titre: "Responsable", valeur: (t) => personnes.find((p) => p.id === t.responsableId)?.nom ?? "", edition: { type: "liste", options: responsables, enregistrer: (t, v) => modifier("taches", t.id, { responsableId: personnes.find((p) => p.nom === v)?.id }) } },
  ];
  const ajouterJalon = !lecture && <Bouton variante="primaire" icone={<Plus size={15} />} onClick={() => ajouter("taches", { id: nouvelId("tac"), projetId: projet.id, nom: "Nouveau jalon", debut: jour, fin: jour, avancement: 0, jalon: true, dependances: [] })}>Jalon</Bouton>;

  return (
    <Carte>
      <TableDonnees id="jalons" lignes={jalons} colonnes={colonnes} cle={(t) => t.id} triInitial={{ colonne: "actuelle", sens: "asc" }}
        barre={<>
          {ajouterJalon}
          {!lecture && sansReference.length > 0 && <Bouton icone={<Target size={15} />} title="Les dates actuelles deviennent les dates de référence des jalons qui n'en ont pas"
            onClick={() => grouper("Référence des jalons figée", () => sansReference.forEach((t) => modifier("taches", t.id, { finPrevue: t.fin })))}>Figer la référence ({sansReference.length})</Bouton>}
        </>}
        actions={lecture ? undefined : (t) => <button type="button" aria-label={`Supprimer ${t.nom}`} className="rounded p-1 text-slate-300 hover:text-rose-600" onClick={() => void supprimer("taches", t.id, { quoi: `le jalon « ${t.nom} »` })}><Trash2 size={14} /></button>}
        vide={<Vide icone={<Flag size={22} />} titre="Aucun jalon" texte="Les jalons sont les rendez-vous du projet : décisions, mises en service, réceptions. Ils alimentent le portefeuille et les rapports." action={ajouterJalon} />} />
    </Carte>
  );
}
