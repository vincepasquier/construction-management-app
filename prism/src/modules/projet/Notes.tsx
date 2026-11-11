// Notes de suivi du projet. Trois canaux à visibilité distincte : responsable de projet (visible de
// l'équipe), PMO, et Finance / ComInv (visibles des seuls profils concernés).
import { Lock, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { useSuppression } from "@/app/suppression";
import { Avatar, Badge, Bouton, Carte, Liste, Zone } from "@/app/ui";
import { formatDate } from "@/domaine/lib/format";
import { nouvelId } from "@/domaine/lib/id";
import { accesDe, canalDe, canalVisible } from "@/domaine/socle/droits";
import type { CanalNote } from "@/domaine/socle/types";
import { useDonnees, useProjet, useUtilisateur } from "@/donnees/hooks";

const CANAUX: CanalNote[] = ["Responsable de projet", "PMO", "Finance / ComInv"];

export function Notes() {
  const { projet, notes } = useProjet();
  const { personnes, ajouter } = useDonnees();
  const utilisateur = useUtilisateur();
  const supprimer = useSuppression();
  const visibles = CANAUX.filter((c) => canalVisible(utilisateur, c));
  const [canal, setCanal] = useState<CanalNote>(canalDe(utilisateur));
  const [texte, setTexte] = useState("");
  if (!projet) return null;
  const liste = notes.filter((n) => canalVisible(utilisateur, n.canal)).sort((a, b) => b.date.localeCompare(a.date));
  // Chacun écrit dans le canal de son rôle ; un administrateur peut écrire dans tous
  const ecrire = accesDe(utilisateur ?? ({ role: "Ingénieur" } as never)).profil === "Administrateur" || !utilisateur ? visibles : visibles.filter((c) => c === canalDe(utilisateur));

  const publier = () => {
    if (!texte.trim()) return;
    ajouter("notes", { id: nouvelId("note"), projetId: projet.id, canal: ecrire.includes(canal) ? canal : ecrire[0], texte: texte.trim(), auteurId: utilisateur?.id, date: new Date().toISOString() },
      { libelle: `Note de suivi : ${projet.code}` });
    setTexte("");
  };

  return (
    <Carte titre="Notes de suivi" sousTitre="Chaque canal a sa propre visibilité">
      <div className="space-y-3 p-5">
        {ecrire.length > 0 && (
          <div className="pas-impression">
            <Zone libre rows={2} value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Point de situation, décision à prendre, élément à retenir…"
              onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) publier(); }} />
            <div className="mt-2 flex items-center justify-end gap-2">
              {ecrire.length > 1 && <Liste libre aria-label="Canal" value={canal} onChange={(e) => setCanal(e.target.value as CanalNote)} className="!w-auto !py-1.5 !text-xs">{ecrire.map((c) => <option key={c}>{c}</option>)}</Liste>}
              <Bouton libre taille="sm" variante="primaire" icone={<Send size={13} />} disabled={!texte.trim()} onClick={publier}>Publier</Bouton>
            </div>
          </div>
        )}
        {liste.length === 0 && <p className="py-4 text-center text-sm text-slate-500">Aucune note pour l'instant.</p>}
        <ul className="space-y-3">
          {liste.map((n) => {
            const auteur = personnes.find((x) => x.id === n.auteurId);
            return (
              <li key={n.id} className="flex gap-3">
                <Avatar nom={auteur?.nom ?? "?"} taille={26} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-medium text-slate-700 dark:text-slate-200">{auteur?.nom ?? "Inconnu"}</span>
                    {formatDate(n.date)}
                    {n.canal !== "Responsable de projet" && <Badge couleur="violet" titre="Visible des seuls profils concernés"><Lock size={10} />{n.canal}</Badge>}
                    {n.auteurId === utilisateur?.id && (
                      <button type="button" aria-label="Supprimer la note" className="text-slate-300 hover:text-rose-600 pas-impression" onClick={() => supprimer("notes", n.id, { quoi: "cette note" })}><Trash2 size={12} /></button>
                    )}
                  </p>
                  <p className="mt-0.5 whitespace-pre-line text-sm text-slate-800 dark:text-slate-200">{n.texte}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Carte>
  );
}
