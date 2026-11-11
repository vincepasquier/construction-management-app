// Partage d'un projet : formulaire de demande d'accès, et liste des demandes à décider.
import { KeyRound } from "lucide-react";
import { useState } from "react";
import { notifier } from "@/app/etatUI";
import { Avatar, Bouton, Carte, Champ, Liste, Panneau, Zone } from "@/app/ui";
import { aujourdhui, formatDate } from "@/domaine/lib/format";
import { projetVisible } from "@/domaine/socle/droits";
import { useDepot, useDonnees, useUtilisateur } from "@/donnees/hooks";
import { deciderPartage, demanderAcces, demandesADecider } from "@/donnees/partage";

/** Demande d'accès de l'utilisateur courant ; `projetId` fixe le projet (page « hors périmètre ») */
export function DemandeAcces({ projetId, onFermer }: { projetId?: string; onFermer: () => void }) {
  const depot = useDepot();
  const utilisateur = useUtilisateur();
  const { projets, personnes, demandesPartage } = useDonnees();
  // Seuls les projets non confidentiels hors du périmètre sont proposés, par leur code et leur nom
  const proposes = projets.filter((p) => !p.archive && !projetVisible(utilisateur, p) && (p.id === projetId || !p.confidentialite || p.confidentialite === "Public" || p.confidentialite === "Interne")).sort((a, b) => a.code.localeCompare(b.code));
  const [choisi, setChoisi] = useState(projetId ?? proposes[0]?.id ?? "");
  const [motif, setMotif] = useState("");
  const projet = projets.find((p) => p.id === choisi);
  const enAttente = demandesPartage.find((d) => d.projetId === choisi && d.personneId === utilisateur?.id && d.statut === "Demandé");
  const envoyer = () => {
    if (!utilisateur || !choisi) return;
    try {
      demanderAcces(depot, choisi, utilisateur.id, motif, aujourdhui());
      notifier("Demande envoyée au responsable du projet.", "succes");
      onFermer();
    } catch (e) { notifier(e instanceof Error ? e.message : "La demande n'a pas pu être envoyée.", "erreur"); }
  };
  return (
    <Panneau ouverte onFermer={onFermer} titre="Demander l'accès à un projet"
      pied={<><Bouton libre onClick={onFermer}>Annuler</Bouton><Bouton libre variante="primaire" disabled={!choisi || !motif.trim() || !!enAttente} onClick={envoyer}>Envoyer la demande</Bouton></>}>
      <div className="space-y-4">
        {proposes.length === 0 ? <p className="text-sm text-slate-500">Tous les projets que vous pouvez demander sont déjà dans votre périmètre.</p> : (
          <>
            <Champ libelle="Projet"><Liste libre disabled={!!projetId} value={choisi} onChange={(e) => setChoisi(e.target.value)}>{proposes.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.nom}</option>)}</Liste></Champ>
            {projet && <p className="text-sm text-slate-500">La demande est adressée à {personnes.find((p) => p.id === projet.directeurId)?.nom ?? "un administrateur"}, responsable du projet. S'il l'accorde, le projet entre dans votre périmètre, avec les droits de votre profil.</p>}
            {enAttente ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">Une demande est déjà en attente depuis le {formatDate(enAttente.date)}.</p> : (
              <Champ libelle="Pourquoi avez-vous besoin de ce projet ?" obligatoire><Zone libre rows={3} value={motif} onChange={(e) => setMotif(e.target.value)} /></Champ>
            )}
          </>
        )}
      </div>
    </Panneau>
  );
}

/** Demandes que l'utilisateur courant peut décider ; n'affiche rien s'il n'y en a pas */
export function DemandesADecider() {
  const depot = useDepot();
  const utilisateur = useUtilisateur();
  const { demandesPartage, projets, personnes } = useDonnees();
  void demandesPartage;
  const liste = demandesADecider(depot, utilisateur);
  if (liste.length === 0) return null;
  const decider = (id: string, accorde: boolean) => {
    try { deciderPartage(depot, id, accorde, aujourdhui()); notifier(accorde ? "Accès accordé." : "Demande refusée.", "succes"); } catch (e) { notifier(e instanceof Error ? e.message : "Opération impossible.", "erreur"); }
  };
  return (
    <Carte className="mb-6" titre={<span className="flex items-center gap-2"><KeyRound size={15} /> Demandes d'accès à décider</span>}>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {liste.map((d) => {
          const p = personnes.find((x) => x.id === d.personneId), projet = projets.find((x) => x.id === d.projetId);
          return (
            <li key={d.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              {p && <Avatar nom={p.nom} taille={28} />}
              <div className="min-w-0 flex-1"><p className="text-sm"><span className="font-medium">{p?.nom}</span> demande l'accès à <span className="font-medium">{projet?.code}</span> <span className="text-slate-500">{projet?.nom}</span></p><p className="text-xs text-slate-500">{formatDate(d.date)} · « {d.motif} »</p></div>
              <Bouton libre taille="sm" variante="primaire" onClick={() => decider(d.id, true)}>Accorder</Bouton>
              <Bouton libre taille="sm" onClick={() => decider(d.id, false)}>Refuser</Bouton>
            </li>
          );
        })}
      </ul>
    </Carte>
  );
}
