// Séances d'une série (ComInv, comité de pilotage d'un projet, séances de chantier) : la liste, et
// l'ouverture de la séance suivante qui reprend les points restés ouverts.
import { CalendarPlus, Users } from "lucide-react";
import { useState } from "react";
import { Badge, Bouton, Carte, Tableau, useLectureSeule, Vide, type CouleurBadge } from "@/app/ui";
import { aujourdhui, formatDate } from "@/domaine/lib/format";
import { nouvelId } from "@/domaine/lib/id";
import { nouvelleSeance, resume, serie } from "@/domaine/socle/seances";
import type { Seance, TypeSeance } from "@/domaine/socle/types";
import { useDonnees, useUtilisateur } from "@/donnees/hooks";
import { EditeurSeance } from "./EditeurSeance";

const COULEUR: Record<Seance["statut"], CouleurBadge> = { "Planifiée": "gris", Tenue: "bleu", "Diffusée": "vert" };

export function Seances({ type, projetId, libelle }: { type: TypeSeance; projetId?: string; libelle: string }) {
  const { seances } = useDonnees();
  const utilisateur = useUtilisateur();
  const lecture = useLectureSeule();
  const [ouverte, setOuverte] = useState<Seance | null>(null);
  const liste = serie(seances, { type, projetId });
  if (ouverte) return <EditeurSeance key={ouverte.id} initiale={ouverte} onFermer={() => setOuverte(null)} />;

  const creer = () => setOuverte(nouvelleSeance(seances, { id: nouvelId("sea"), type, projetId, date: aujourdhui(), redacteurId: utilisateur?.id }));
  const bouton = !lecture && <Bouton variante="primaire" icone={<CalendarPlus size={15} />} onClick={creer}>Nouvelle séance</Bouton>;
  const reprise = liste[0]?.points.filter((p) => p.statut === "Ouvert" && p.nature !== "Information").length ?? 0;

  return (
    <Carte titre={libelle} sousTitre={liste.length && reprise ? `${reprise} point(s) ouvert(s) seront repris à la prochaine séance` : undefined} action={liste.length > 0 && bouton}>
      {liste.length === 0 ? <Vide icone={<Users size={22} />} titre="Aucune séance" texte="Chaque séance donne un procès-verbal numéroté ; ses décisions et ses tâches sont portées au registre et suivies jusqu'à leur clôture." action={bouton} /> : (
        <Tableau>
          <thead><tr><th>N°</th><th>Séance</th><th>Date</th><th className="text-right">Points</th><th className="text-right">Ouverts</th><th className="text-right">Décisions</th><th className="text-right">Tâches</th><th>État</th></tr></thead>
          <tbody>{liste.map((s) => {
            const r = resume(s);
            return (
              <tr key={s.id} className="cursor-pointer" onClick={() => setOuverte(s)}>
                <td className="num font-medium">{s.numero}</td><td className="font-medium">{s.titre}</td><td>{formatDate(s.date)}</td>
                <td className="text-right num">{r.points}</td><td className="text-right num">{r.ouverts || "—"}</td><td className="text-right num">{r.decisions || "—"}</td><td className="text-right num">{r.taches || "—"}</td>
                <td><Badge couleur={COULEUR[s.statut]}>{s.statut}</Badge></td>
              </tr>
            );
          })}</tbody>
        </Tableau>
      )}
    </Carte>
  );
}
