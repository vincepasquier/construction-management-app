import { useState } from "react";
import { useStore, useUtilisateur } from "../store/useStore";
import { aujourdhui, ajouterJours } from "../lib/format";
import { nouvelId } from "../lib/id";
import type { Action, PrioriteAction, StatutAction } from "../types";
import { Bouton, Champ, Liste, Modale, Saisie, Zone } from "./ui";

export const STATUTS_ACTION: StatutAction[] = ["À faire", "En cours", "En attente", "Terminé"];
export const PRIORITES: PrioriteAction[] = ["Basse", "Normale", "Haute", "Urgente"];

export function nouvelleAction(projetId: string, p: Partial<Action> = {}): Action {
  return {
    id: nouvelId("act"), projetId, titre: "", statut: "À faire", priorite: "Normale", echeance: ajouterJours(aujourdhui(), 7),
    dateCreation: aujourdhui(), ...p,
  };
}

/** Création / modification d'une tâche, utilisée par les modules Tâches, Risques et Validations */
export function FormulaireAction({ initial, onFermer }: { initial: Action; onFermer: () => void }) {
  const { actions, ajouter, modifier, supprimer, personnes, lots, risques } = useStore();
  const moi = useUtilisateur();
  const [a, setA] = useState<Action>(() => ({ ...initial, creeParId: initial.creeParId ?? moi?.id }));
  const existe = actions.some((x) => x.id === a.id);
  return (
    <Modale ouverte onFermer={onFermer} titre={existe ? "Tâche" : "Nouvelle tâche"}
      pied={<>
        {existe && <Bouton variante="fantome" className="mr-auto text-rose-600" onClick={() => { supprimer("actions", a.id); onFermer(); }}>Supprimer</Bouton>}
        <Bouton libre onClick={onFermer}>Annuler</Bouton>
        <Bouton variante="primaire" disabled={!a.titre} onClick={() => { if (existe) modifier("actions", a.id, a); else ajouter("actions", a); onFermer(); }}>Enregistrer</Bouton>
      </>}>
      <div className="grid grid-cols-2 gap-4">
        <Champ libelle="Tâche" className="col-span-2"><Saisie autoFocus value={a.titre} onChange={(e) => setA({ ...a, titre: e.target.value })} placeholder="ex. Relancer l'entreprise pour les métrés" /></Champ>
        <Champ libelle="Attribuée à">
          <Liste value={a.assigneId ?? ""} onChange={(e) => setA({ ...a, assigneId: e.target.value || undefined })}>
            <option value="">Non attribuée</option>{personnes.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
          </Liste>
        </Champ>
        <Champ libelle="Échéance"><Saisie type="date" value={a.echeance ?? ""} onChange={(e) => setA({ ...a, echeance: e.target.value || undefined })} /></Champ>
        <Champ libelle="Priorité"><Liste value={a.priorite} onChange={(e) => setA({ ...a, priorite: e.target.value as PrioriteAction })}>{PRIORITES.map((p) => <option key={p}>{p}</option>)}</Liste></Champ>
        <Champ libelle="Statut"><Liste value={a.statut} onChange={(e) => setA({ ...a, statut: e.target.value as StatutAction })}>{STATUTS_ACTION.map((p) => <option key={p}>{p}</option>)}</Liste></Champ>
        <Champ libelle="Lot">
          <Liste value={a.lotId ?? ""} onChange={(e) => setA({ ...a, lotId: e.target.value || undefined })}>
            <option value="">—</option>{lots.filter((l) => l.projetId === a.projetId).map((l) => <option key={l.id} value={l.id}>{l.code} {l.nom}</option>)}
          </Liste>
        </Champ>
        <Champ libelle="Risque lié">
          <Liste value={a.risqueId ?? ""} onChange={(e) => setA({ ...a, risqueId: e.target.value || undefined })}>
            <option value="">—</option>{risques.filter((r) => r.projetId === a.projetId).map((r) => <option key={r.id} value={r.id}>{r.code} {r.titre}</option>)}
          </Liste>
        </Champ>
        <Champ libelle="Origine" className="col-span-2" aide="Séance de chantier, courrier, risque, validation…"><Saisie value={a.origine ?? ""} onChange={(e) => setA({ ...a, origine: e.target.value || undefined })} /></Champ>
        <Champ libelle="Détails" className="col-span-2"><Zone rows={3} value={a.description ?? ""} onChange={(e) => setA({ ...a, description: e.target.value || undefined })} /></Champ>
      </div>
    </Modale>
  );
}
