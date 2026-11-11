// Rédaction d'une séance et de son procès-verbal : participants, points numérotés, décisions et
// tâches. Sert au ComInv (points par projet), aux comités de pilotage et aux séances de chantier.
import { ArrowLeft, Download, Plus, Save, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { confirmer, notifier } from "@/app/etatUI";
import { lireNombre } from "@/app/table/TableDonnees";
import { Badge, Bouton, Carte, Case, Champ, cx, Liste, Saisie, useLectureSeule, Zone } from "@/app/ui";
import { formatDate } from "@/domaine/lib/format";
import { nouvelId } from "@/domaine/lib/id";
import { projetsAccessibles } from "@/domaine/socle/droits";
import { numeroPoint } from "@/domaine/socle/seances";
import type { Decision, NaturePoint, ParticipantSeance, PointSeance, Seance } from "@/domaine/socle/types";
import { ErreurDepot } from "@/donnees/depot";
import { useActions, useDepot, useDonnees, useUtilisateur } from "@/donnees/hooks";
import { candidatsComInv, enregistrerSeance } from "@/donnees/seances";
import { telechargerDocx } from "@/outils/telechargement";
import { SaisieConditions } from "../gouvernance/Conditions";
import { blocsSeance } from "./exportSeance";

const NATURES: NaturePoint[] = ["Information", "Décision", "Tâche", "Note de travail"];
const STATUTS_DECISION: Decision["statut"][] = ["Approuvée", "Refusée", "Reportée"];
const STATUTS: Seance["statut"][] = ["Planifiée", "Tenue", "Diffusée"];

export function EditeurSeance({ initiale, onFermer }: { initiale: Seance; onFermer: () => void }) {
  const depot = useDepot();
  const { personnes, projets } = useDonnees();
  const { supprimer } = useActions();
  const utilisateur = useUtilisateur();
  const lecture = useLectureSeule();
  const [s, setS] = useState<Seance>(initiale);
  const [modifie, setModifie] = useState(!depot.parId("seances", initiale.id));
  const maj = (patch: Partial<Seance>) => { setS({ ...s, ...patch }); setModifie(true); };
  const majPoint = (id: string, patch: Partial<PointSeance>) => maj({ points: s.points.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  const majParticipant = (i: number, patch: Partial<ParticipantSeance>) => maj({ participants: s.participants.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  const transverse = !s.projetId;
  const mesProjets = projetsAccessibles(utilisateur, projets.filter((p) => !p.archive)).sort((a, b) => a.code.localeCompare(b.code));
  const tries = [...personnes].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  const nomPersonne = (id?: string) => personnes.find((p) => p.id === id)?.nom;
  const fonctionPersonne = (id?: string) => personnes.find((p) => p.id === id)?.fonction;
  const existe = !!depot.parId("seances", s.id);
  const candidats = transverse ? candidatsComInv(depot, mesProjets).filter((x) => !s.points.some((p) => p.projetId === x.projet.id && p.titre === x.titre)) : [];

  const enregistrer = () => {
    try {
      setS(enregistrerSeance(depot, s));
      setModifie(false);
      notifier(s.statut === "Planifiée" ? "Séance enregistrée." : "Séance enregistrée : décisions et tâches portées au registre.", "succes");
    } catch (e) {
      notifier(e instanceof ErreurDepot ? e.message : "La séance n'a pas pu être enregistrée.", "erreur");
    }
  };
  const exporter = () => void telechargerDocx(`PV ${s.titre} ${s.date}`, blocsSeance(s, { nomPersonne, fonctionPersonne, codeProjet: (id) => projets.find((p) => p.id === id)?.code, projet: s.projetId ? `${projets.find((p) => p.id === s.projetId)?.code} – ${projets.find((p) => p.id === s.projetId)?.nom}` : undefined }), `${s.titre} · ${formatDate(s.date)}`);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 pas-impression">
        <button type="button" onClick={onFermer} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"><ArrowLeft size={14} /> Toutes les séances</button>
        <div className="ml-auto flex flex-wrap gap-2">
          {existe && !lecture && <Bouton variante="fantome" className="text-rose-600" icone={<Trash2 size={14} />} onClick={async () => { if (await confirmer({ message: `Supprimer « ${s.titre} » ? Les décisions et les tâches déjà portées au registre sont conservées.`, action: "Supprimer", danger: true })) { supprimer("seances", s.id); onFermer(); } }}>Supprimer</Bouton>}
          <Bouton libre icone={<Download size={15} />} onClick={exporter}>Procès-verbal (Word)</Bouton>
          {!lecture && <Bouton variante="primaire" icone={<Save size={15} />} disabled={!modifie} onClick={enregistrer}>{modifie ? "Enregistrer" : "Enregistré"}</Bouton>}
        </div>
      </div>

      <Carte>
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Champ libelle="Titre" className="sm:col-span-2"><Saisie value={s.titre} onChange={(e) => maj({ titre: e.target.value })} /></Champ>
          <Champ libelle="Date"><Saisie type="date" value={s.date} onChange={(e) => maj({ date: e.target.value })} /></Champ>
          <Champ libelle="État" aide={s.statut === "Planifiée" ? "Rien n'est porté au registre avant que la séance soit tenue" : undefined}><Liste value={s.statut} onChange={(e) => maj({ statut: e.target.value as Seance["statut"] })}>{STATUTS.map((x) => <option key={x}>{x}</option>)}</Liste></Champ>
          <Champ libelle="Lieu" className="sm:col-span-2"><Saisie value={s.lieu ?? ""} onChange={(e) => maj({ lieu: e.target.value })} /></Champ>
          <Champ libelle="Rédaction"><Liste value={s.redacteurId ?? ""} onChange={(e) => maj({ redacteurId: e.target.value || undefined })}><option value="">—</option>{tries.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}</Liste></Champ>
          <Champ libelle="Prochaine séance"><Saisie type="date" value={s.prochaineSeance ?? ""} onChange={(e) => maj({ prochaineSeance: e.target.value || undefined })} /></Champ>
        </div>
      </Carte>

      <Carte titre="Participants" sousTitre={`${s.participants.filter((p) => p.presence === "Présent").length} présent(s) sur ${s.participants.length}`}
        action={!lecture && <Bouton taille="sm" icone={<UserPlus size={13} />} onClick={() => maj({ participants: [...s.participants, { presence: "Présent", diffusion: true }] })}>Participant</Bouton>}>
        {s.participants.length === 0 ? <p className="px-5 py-5 text-center text-sm text-slate-500">Ajoutez les participants : ils sont repris d'une séance à la suivante.</p> : (
          <div className="grid gap-2 p-4 lg:grid-cols-2">
            {s.participants.map((p, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2 dark:bg-slate-800/50">
                <div className="min-w-40 flex-1"><Liste aria-label="Participant" value={p.personneId ?? ""} onChange={(e) => majParticipant(i, { personneId: e.target.value || undefined })}><option value="">Externe…</option>{tries.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}</Liste></div>
                {!p.personneId && <div className="min-w-32 flex-1"><Saisie aria-label="Nom" placeholder="Nom, organisation" value={p.nom ?? ""} onChange={(e) => majParticipant(i, { nom: e.target.value })} /></div>}
                <div className="w-32 shrink-0"><Liste aria-label="Présence" value={p.presence} onChange={(e) => majParticipant(i, { presence: e.target.value as ParticipantSeance["presence"] })}><option>Présent</option><option>Excusé</option><option>Absent</option></Liste></div>
                <Case libelle="PV" title="Reçoit le procès-verbal" checked={p.diffusion} onChange={(e) => majParticipant(i, { diffusion: e.target.checked })} />
                {!lecture && <button type="button" aria-label="Retirer le participant" className="rounded p-1 text-slate-300 hover:text-rose-600" onClick={() => maj({ participants: s.participants.filter((_, j) => j !== i) })}><Trash2 size={14} /></button>}
              </div>
            ))}
          </div>
        )}
      </Carte>

      {transverse && !lecture && candidats.length > 0 && (
        <Carte titre="Projets candidats à l'ordre du jour" sousTitre="Projets qui attendent une décision du comité et ne figurent pas encore dans cette séance">
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {candidats.map((x) => (
              <li key={`${x.projet.id}-${x.motif}`} className="flex flex-wrap items-center gap-3 px-5 py-2.5 text-sm">
                <span className="font-medium text-slate-900 dark:text-white">{x.projet.code}</span><span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">{x.projet.nom}</span>
                <span className="text-xs text-slate-500">{x.motif}</span>
                <Bouton taille="sm" icone={<Plus size={13} />} onClick={() => maj({ points: [...s.points, { id: nouvelId("pt"), numero: numeroPoint(s), projetId: x.projet.id, titre: x.titre, texte: "", nature: "Décision", statut: "Ouvert", origineSeanceId: s.id, responsableId: x.projet.directeurId, decision: { statut: "Approuvée", montant: x.montant, conditions: [] } }] })}>Inscrire</Bouton>
              </li>
            ))}
          </ul>
        </Carte>
      )}

      <Carte titre="Points" sousTitre="Un point resté ouvert est repris, avec son numéro, à la séance suivante"
        action={!lecture && <Bouton taille="sm" variante="primaire" icone={<Plus size={13} />} onClick={() => maj({ points: [...s.points, { id: nouvelId("pt"), numero: numeroPoint(s), titre: "", texte: "", nature: transverse ? "Décision" : "Information", statut: "Ouvert", origineSeanceId: s.id, decision: transverse ? { statut: "Approuvée", conditions: [] } : undefined }] })}>Point</Bouton>}>
        {s.points.length === 0 && <p className="px-5 py-6 text-center text-sm text-slate-500">Aucun point à l'ordre du jour.</p>}
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {s.points.map((p) => {
            const repris = !!p.origineSeanceId && p.origineSeanceId !== s.id;
            const estDecision = p.nature === "Décision" || (p.nature === "Note de travail" && !!p.decision);
            const majDecision = (patch: Partial<NonNullable<PointSeance["decision"]>>) => majPoint(p.id, { decision: { statut: "Approuvée", conditions: [], ...p.decision, ...patch } });
            return (
              <li key={p.id} className={cx("grid gap-3 px-5 py-4 lg:grid-cols-[4.5rem_minmax(0,1fr)_17rem]", p.statut === "Clos" && "bg-slate-50/60 dark:bg-slate-900/40")}>
                <div><p className="font-semibold num text-slate-900 dark:text-white">{p.numero}</p>{repris && <Badge titre="Point ouvert lors d'une séance précédente">repris</Badge>}</div>
                <div className="space-y-2">
                  {transverse && <Liste aria-label="Projet concerné" value={p.projetId ?? ""} onChange={(e) => majPoint(p.id, { projetId: e.target.value || undefined })}><option value="">Projet concerné…</option>{mesProjets.map((x) => <option key={x.id} value={x.id}>{x.code} · {x.nom}</option>)}</Liste>}
                  <Saisie aria-label="Objet du point" className="font-medium" placeholder="Objet du point" value={p.titre} onChange={(e) => majPoint(p.id, { titre: e.target.value })} />
                  <Zone aria-label="Discussion, décision prise" rows={2} placeholder="Discussion, décision prise, suite à donner" value={p.texte} onChange={(e) => majPoint(p.id, { texte: e.target.value })} />
                  {estDecision && (
                    <div className="space-y-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                      <div className="grid gap-3 sm:grid-cols-3">
                        {p.nature === "Décision" && <Champ libelle="Décision"><Liste value={p.decision?.statut ?? "Approuvée"} onChange={(e) => majDecision({ statut: e.target.value as Decision["statut"] })}>{STATUTS_DECISION.map((x) => <option key={x}>{x}</option>)}</Liste></Champ>}
                        <Champ libelle="Montant CHF"><Saisie inputMode="decimal" className="text-right num" key={p.decision?.montant ?? 0} defaultValue={p.decision?.montant ? p.decision.montant.toLocaleString("fr-CH") : ""} onBlur={(e) => majDecision({ montant: lireNombre(e.target.value) || undefined })} /></Champ>
                        <div className="self-end pb-2"><Case libelle="Diffusion restreinte" checked={!!p.decision?.restreint} onChange={(e) => majDecision({ restreint: e.target.checked })} /></div>
                      </div>
                      <SaisieConditions valeur={p.decision?.conditions ?? []} onChange={(conditions) => majDecision({ conditions })} />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Liste aria-label="Nature du point" value={p.nature} onChange={(e) => { const nature = e.target.value as NaturePoint; majPoint(p.id, { nature, decision: nature === "Décision" ? p.decision ?? { statut: "Approuvée", conditions: [] } : nature === "Note de travail" ? p.decision : undefined }); }}>{NATURES.map((x) => <option key={x}>{x}</option>)}</Liste>
                  {p.nature === "Note de travail" && <Case libelle="Porter au registre comme note de travail" checked={!!p.decision} onChange={(e) => majPoint(p.id, { decision: e.target.checked ? { statut: "Note de travail", conditions: [] } : undefined })} />}
                  <Liste aria-label="Responsable" value={p.responsableId ?? ""} onChange={(e) => majPoint(p.id, { responsableId: e.target.value || undefined })}><option value="">Responsable…</option>{tries.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}</Liste>
                  {!p.responsableId && !transverse && <Saisie aria-label="Responsable externe" placeholder="ou entreprise, mandataire" value={p.responsableNom ?? ""} onChange={(e) => majPoint(p.id, { responsableNom: e.target.value || undefined })} />}
                  <div className="flex items-center gap-2">
                    <Saisie type="date" aria-label="Délai" value={p.echeance ?? ""} onChange={(e) => majPoint(p.id, { echeance: e.target.value || undefined })} />
                    <Case libelle="Clos" checked={p.statut === "Clos"} onChange={(e) => majPoint(p.id, { statut: e.target.checked ? "Clos" : "Ouvert" })} />
                    {!lecture && !p.decisionId && !p.actionId && <button type="button" aria-label="Retirer le point" className="rounded p-1 text-slate-300 hover:text-rose-600" onClick={() => maj({ points: s.points.filter((x) => x.id !== p.id) })}><Trash2 size={14} /></button>}
                  </div>
                  {(p.decisionId || p.actionId) && <p className="text-xs text-emerald-600">{p.decisionId ? "Au registre des décisions" : "Tâche créée"}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      </Carte>
    </div>
  );
}
