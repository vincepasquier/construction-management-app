import { DemandesADecider } from "@/modules/acces/DemandesAcces";
// Mon travail : ce que l'utilisateur doit traiter, tous projets confondus, et ses projets.
import { CheckCircle2, FileCheck2, LifeBuoy, ListChecks, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cheminProjet } from "@/app/registre";
import { Bouton, Carte, EnTetePage } from "@/app/ui";
import { BadgeSante, Montant } from "@/app/ui/metier";
import { aujourdhui, formatDate } from "@/domaine/lib/format";
import { COULEUR_CRITICITE, criticite, score } from "@/domaine/lib/risques";
import { projetsAccessibles } from "@/domaine/socle/droits";
import { useDerive, useDonnees, useUtilisateur } from "@/donnees/hooks";
import { aTraiter, useIndicateurs } from "@/donnees/lectures";
import { session } from "@/donnees/session";

function Bloc({ titre, icone, compte, vide, children }: { titre: string; icone: ReactNode; compte: number; vide: string; children: ReactNode }) {
  return (
    <Carte titre={<span className="flex items-center gap-2">{icone}{titre}{compte > 0 && <span className="rounded-full bg-slate-100 px-1.5 text-xs font-semibold text-slate-600 num dark:bg-slate-800 dark:text-slate-300">{compte}</span>}</span>}>
      {compte === 0 ? <p className="flex items-center gap-2 px-5 py-6 text-sm text-slate-500"><CheckCircle2 size={15} className="text-emerald-500" /> {vide}</p> : <ul className="divide-y divide-slate-100 dark:divide-slate-800">{children}</ul>}
    </Carte>
  );
}

export function MonTravail() {
  const utilisateur = useUtilisateur();
  const { projets, lots } = useDonnees();
  const derniereSauvegarde = session.utiliser((s) => s.derniereSauvegarde);
  const jour = aujourdhui();
  const visibles = projetsAccessibles(utilisateur, projets.filter((p) => !p.archive));
  const ids = new Set(visibles.map((p) => p.id));
  const t = useDerive((depot, suivre) => {
    for (const c of ["validations", "actions", "risques"]) suivre(c);
    return aTraiter(depot, utilisateur?.id, ids, jour);
  }, [utilisateur?.id, jour, visibles.length]);

  const miens = visibles.filter((p) => p.directeurId === utilisateur?.id || p.sponsorId === utilisateur?.id || lots.some((l) => l.projetId === p.id && l.responsableId === utilisateur?.id));
  const indicateurs = useIndicateurs(miens.length ? miens : visibles.slice(0, 6), jour);
  const code = (projetId: string) => projets.find((p) => p.id === projetId)?.code ?? "";
  const sauvegardeAncienne = !derniereSauvegarde || Date.now() - new Date(derniereSauvegarde).getTime() > 14 * 86_400_000;
  const ligne = "flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-slate-50/70 dark:hover:bg-slate-800/40";

  return (
    <>
      <EnTetePage titre={`Bonjour${utilisateur ? `, ${utilisateur.nom.split(" ")[0]}` : ""}`} description={`Ce qui vous attend au ${formatDate(jour)}`} />

      {sauvegardeAncienne && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900">
          <LifeBuoy size={16} className="shrink-0" />
          <p className="min-w-0 flex-1">Les données vivent dans ce navigateur. {derniereSauvegarde ? `Dernière sauvegarde le ${formatDate(derniereSauvegarde)}.` : "Aucune sauvegarde n'a encore été téléchargée."}</p>
          <Link to="/administration/sauvegarde"><Bouton libre taille="sm">Sauvegarder</Bouton></Link>
        </div>
      )}

      <DemandesADecider />
      <div className="grid gap-6 lg:grid-cols-3">
        <Bloc titre="À valider" icone={<FileCheck2 size={15} />} compte={t.validations.length} vide="Aucune validation ne vous attend.">
          {t.validations.slice(0, 8).map((v) => (
            <li key={v.id}><Link to={cheminProjet(v.projetId, "validations")} className={ligne}>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{v.titre}</span>
                <span className="block text-xs text-slate-500">{code(v.projetId)}{v.echeance ? ` · échéance ${formatDate(v.echeance)}` : ""}</span>
              </span>
            </Link></li>
          ))}
        </Bloc>
        <Bloc titre="Mes tâches" icone={<ListChecks size={15} />} compte={t.actions.length} vide="Aucune tâche ouverte.">
          {t.actions.slice(0, 8).map((a) => (
            <li key={a.id}><Link to={cheminProjet(a.projetId, "taches")} className={ligne}>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{a.titre}</span>
                <span className={`block text-xs ${a.echeance && a.echeance < jour ? "font-semibold text-rose-600" : "text-slate-500"}`}>{code(a.projetId)}{a.echeance ? ` · échéance ${formatDate(a.echeance)}` : ""}</span>
              </span>
            </Link></li>
          ))}
        </Bloc>
        <Bloc titre="Mes risques" icone={<ShieldAlert size={15} />} compte={t.risques.length} vide="Aucun risque ouvert sous votre responsabilité.">
          {t.risques.slice(0, 8).map((r) => (
            <li key={r.id}><Link to={cheminProjet(r.projetId, "risques")} className={ligne}>
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white" style={{ background: COULEUR_CRITICITE[criticite(score(r))] }}>{score(r)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{r.titre}</span>
                <span className="block text-xs text-slate-500">{code(r.projetId)}</span>
              </span>
            </Link></li>
          ))}
        </Bloc>
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold text-slate-900 dark:text-white">{miens.length ? "Mes projets" : "Projets récents de mon périmètre"}</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {indicateurs.map((i) => (
          <Link key={i.projet.id} to={cheminProjet(i.projet.id)} className="rounded-xl bg-white p-4 ring-1 ring-slate-200 transition hover:shadow-md hover:ring-brand-500 dark:bg-slate-900 dark:ring-slate-800">
            <div className="flex items-center gap-2"><span className="text-xs font-semibold text-slate-500">{i.projet.code}</span><BadgeSante sante={i.sante} /></div>
            <p className="mt-1 truncate font-semibold text-slate-900 dark:text-white">{i.projet.nom}</p>
            <p className="mt-2 text-xs text-slate-500">
              Atterrissage <Montant v={i.synthese.atterrissage} compact /> · écart <Montant v={i.synthese.ecart} compact signe />
              {i.retards.length > 0 && <span className="text-rose-600"> · {i.retards.length} retard(s)</span>}
            </p>
          </Link>
        ))}
        {indicateurs.length === 0 && <p className="text-sm text-slate-500">Aucun projet dans votre périmètre. <Link className="text-brand-600 underline" to="/portefeuille">Ouvrir le portefeuille</Link></p>}
      </div>
    </>
  );
}
