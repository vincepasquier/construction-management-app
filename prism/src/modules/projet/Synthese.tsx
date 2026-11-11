import { Commentaires } from "@/modules/collaboration/Commentaires";
// Fiche projet : l'état du projet en une page, lisible et imprimable, avec l'origine de chaque
// donnée (système source, calcul, saisie).
import { AlertTriangle, CalendarClock, GitBranch, Pencil, Plus, Printer, RefreshCw, ShieldAlert } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { notifier } from "@/app/etatUI";
import { cheminProjet } from "@/app/registre";
import { Alerte, Badge, BadgeStatut, Bouton, Carte, EnTetePage, Indicateur, Info2, PastilleOrigine, Progression, Tableau } from "@/app/ui";
import { BadgePriorite, BadgeSante, Fraicheur, Montant } from "@/app/ui/metier";
import { aujourdhui, formatCHF, formatDate, formatPct } from "@/domaine/lib/format";
import { COULEUR_CRITICITE, criticite, estActif, score } from "@/domaine/lib/risques";
import { rapprochement } from "@/domaine/socle/synthese";
import { dataPlatformSimulee } from "@/donnees/connecteurs/dataPlatformSimulee";
import { origineChamp, synchroniser } from "@/donnees/connecteurs/synchro";
import { useDepot, useDerive, useDonnees, useDroit, useProjet } from "@/donnees/hooks";
import { familleDe, indicateursProjet, useIndicateurs } from "@/donnees/lectures";
import { AjoutProjet } from "../portefeuille/AjoutProjet";
import { FicheEdition } from "./FicheEdition";
import { libelleChamp } from "./libelles";
import { Notes } from "./Notes";

export function Synthese({ complements }: { complements?: ReactNode }) {
  const depot = useDepot();
  const droit = useDroit("portefeuille");
  const { projet, risques, taches } = useProjet();
  const { projets, personnes, directions, portefeuilles, programmes } = useDonnees();
  const [edition, setEdition] = useState(false);
  const [ajout, setAjout] = useState(false);
  const [synchro, setSynchro] = useState(false);
  const jour = aujourdhui();
  const i = useDerive((d, suivre) => (projet ? indicateursProjet(d, projet, jour, suivre) : null), [projet, jour]);
  const enfants = projets.filter((p) => p.parentId === projet?.id);
  const indicateursEnfants = useIndicateurs(enfants, jour);
  if (!projet || !i) return null;

  const s = i.synthese;
  const parent = projets.find((p) => p.id === projet.parentId);
  const nom = (id?: string) => personnes.find((x) => x.id === id)?.nom;
  const origine = (cle: string) => (projet.synchro ? origineChamp(projet, cle) : undefined);
  const ecarts = rapprochement(s);
  const majeurs = risques.filter(estActif).sort((a, b) => score(b) - score(a)).slice(0, 5);
  const jalons = taches.filter((t) => t.jalon && t.avancement < 100).sort((a, b) => a.fin.localeCompare(b.fin)).slice(0, 6);
  const corrections = Object.entries(projet.synchro?.surcharges ?? {});

  const resynchroniser = async () => {
    setSynchro(true);
    const e = await synchroniser(depot, dataPlatformSimulee, { projetIds: familleDe(depot, projet.id) });
    notifier(e.erreurs.length ? `Synchronisation partielle : ${e.erreurs[0]}` : `Synchronisé avec ${e.connecteur} : ${e.modifies} mise(s) à jour.`, e.erreurs.length ? "erreur" : "succes");
    setSynchro(false);
  };

  return (
    <div className="zone-impression">
      <EnTetePage titre={projet.nom}
        description={<span className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-slate-700 dark:text-slate-200">{projet.code}</span>
          <BadgeStatut statut={projet.statut ?? "En cours"} />
          <BadgeSante sante={i.sante} />
          <BadgePriorite priorite={projet.priorite} />
          {i.type && <Badge>{i.type.nom}</Badge>}
          {projet.confidentialite && projet.confidentialite !== "Interne" && <Badge couleur="violet">{projet.confidentialite}</Badge>}
          {projet.provisoire && <Badge couleur="orange" titre="Ce projet n'existe pas encore dans le système source">Provisoire</Badge>}
          {parent && <Link to={cheminProjet(parent.id)} className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"><GitBranch size={12} /> Sous-projet de {parent.code}</Link>}
        </span>}
        actions={<>
          {projet.numeroSource && <Bouton icone={<RefreshCw size={15} className={synchro ? "animate-spin" : ""} />} disabled={synchro} onClick={resynchroniser}>Synchroniser</Bouton>}
          <Bouton libre icone={<Printer size={15} />} onClick={() => window.print()}>Imprimer / PDF</Bouton>
          <Bouton variante="primaire" icone={<Pencil size={15} />} onClick={() => setEdition(true)}>Modifier la fiche</Bouton>
        </>} />
      {edition && <FicheEdition projet={projet} onFermer={() => setEdition(false)} />}
      {ajout && <AjoutProjet parentId={projet.id} onFermer={() => setAjout(false)} />}

      <h1 className="mb-4 hidden text-xl font-semibold print:block">{projet.code} · {projet.nom}</h1>

      {i.champsManquants.length > 0 && (
        <div className="mb-4 pas-impression">
          <Alerte><strong>Fiche incomplète</strong> pour un projet « {i.type?.nom} »{projet.phaseGroupe ? ` en phase « ${projet.phaseGroupe} »` : ""} : {i.champsManquants.map(libelleChamp).join(", ")}.</Alerte>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Indicateur libelle="Budget approuvé" valeur={formatCHF(s.budgetApprouve)} origine={s.origines.budgetApprouve} detail={s.budgetInitial !== s.budgetApprouve ? `initial ${formatCHF(s.budgetInitial)}` : "CHF HT"} />
        <Indicateur libelle="Engagé" valeur={formatCHF(s.engage)} origine={s.origines.engage} detail={s.budgetApprouve ? formatPct((s.engage / s.budgetApprouve) * 100, 0) + " du budget" : undefined} />
        <Indicateur libelle="Réalisé" valeur={formatCHF(s.realise)} origine={s.origines.realise} detail={`payé ${formatCHF(s.paye)}`} />
        <Indicateur libelle="Atterrissage" valeur={formatCHF(s.atterrissage)} origine={s.origines.atterrissage}
          detail={s.atterrissageDefavorable > s.atterrissage ? `défavorable ${formatCHF(s.atterrissageDefavorable)}` : s.commentaireAtterrissage ?? "coût final probable"} />
        <Indicateur libelle="Écart" valeur={<Montant v={s.ecart} signe />} origine="calcul" detail={`${formatPct(s.ecartPct)} du budget`} tendance={s.ecart < -0.5 ? "mauvais" : "bon"} />
      </div>
      {(s.dateSource || s.consolidee) && (
        <p className="-mt-3 mb-6 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          {s.dateSource && <Fraicheur date={s.dateSource} systeme={s.reference?.systeme} />}
          {s.consolidee && <span>Montants consolidés avec {enfants.length} sous-projet(s)</span>}
          {s.mode === "positions" && <span>Calcul par position budgétaire — <Link className="text-brand-600 hover:underline" to={cheminProjet(projet.id, "finances")}>détail</Link></span>}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {complements}

          {enfants.length > 0 && (
            <Carte titre="Sous-projets" action={droit.ecrire && <Bouton taille="sm" icone={<Plus size={14} />} onClick={() => setAjout(true)}>Sous-projet</Bouton>}>
              <Tableau>
                <thead><tr><th>Sous-projet</th><th>Santé</th><th className="!text-right">Budget</th><th className="!text-right">Atterrissage</th><th className="!text-right">Écart</th><th>Avancement</th></tr></thead>
                <tbody>
                  {indicateursEnfants.map((e) => (
                    <tr key={e.projet.id}>
                      <td><Link to={cheminProjet(e.projet.id)} className="font-medium text-brand-600 hover:underline">{e.projet.code}</Link><span className="ml-2 text-slate-600 dark:text-slate-300">{e.projet.nom}</span></td>
                      <td><BadgeSante sante={e.sante} /></td>
                      <td className="text-right"><Montant v={e.synthese.budgetApprouve} /></td>
                      <td className="text-right"><Montant v={e.synthese.atterrissage} /></td>
                      <td className="text-right"><Montant v={e.synthese.ecart} signe /></td>
                      <td><span className="inline-flex w-24 items-center gap-2"><Progression valeur={e.avancement} /><span className="num text-xs text-slate-500">{Math.round(e.avancement)}%</span></span></td>
                    </tr>
                  ))}
                </tbody>
              </Tableau>
              {s.reference && s.mode === "synthese" && Math.abs(s.reference.budgetApprouve - s.budgetApprouve) > 1 && (
                <p className="border-t border-slate-100 px-5 py-2.5 text-xs text-amber-700 dark:border-slate-800">La source annonce {formatCHF(s.reference.budgetApprouve)} pour le projet parent ; la somme des sous-projets donne {formatCHF(s.budgetApprouve)}.</p>
              )}
            </Carte>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <Carte titre={<span className="flex items-center gap-2"><CalendarClock size={15} /> Prochains jalons</span>} action={<Link to={cheminProjet(projet.id, "planning")} className="text-xs text-brand-600 hover:underline pas-impression">Planification</Link>}>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {jalons.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                    <span className="min-w-0 truncate">{t.nom}</span>
                    <span className={`num shrink-0 text-xs ${t.fin < jour ? "font-semibold text-rose-600" : "text-slate-500"}`}>{formatDate(t.fin)}{t.fin < jour ? " · en retard" : ""}</span>
                  </li>
                ))}
                {jalons.length === 0 && <li className="px-5 py-6 text-center text-sm text-slate-500">Aucun jalon à venir.</li>}
              </ul>
              {i.retards.length > 0 && <p className="border-t border-slate-100 px-5 py-2.5 text-xs text-rose-600 dark:border-slate-800"><AlertTriangle size={12} className="mr-1 inline" />{i.retards.length} tâche(s) en retard</p>}
            </Carte>
            <Carte titre={<span className="flex items-center gap-2"><ShieldAlert size={15} /> Risques majeurs</span>} action={<Link to={cheminProjet(projet.id, "risques")} className="text-xs text-brand-600 hover:underline pas-impression">Registre</Link>}>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {majeurs.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white" style={{ background: COULEUR_CRITICITE[criticite(score(r))] }}>{score(r)}</span>
                    <span className="min-w-0 flex-1 truncate" title={r.titre}>{r.titre}</span>
                    {r.impactFinancier > 0 && <span className="num shrink-0 text-xs text-slate-500">{formatCHF(r.impactFinancier)}</span>}
                  </li>
                ))}
                {majeurs.length === 0 && <li className="px-5 py-6 text-center text-sm text-slate-500">Aucun risque ouvert.</li>}
              </ul>
            </Carte>
          </div>

          {ecarts.length > 0 && (
            <Carte titre="Rapprochement avec le système source" sousTitre="Le calcul par position fait foi ; la source sert de contrôle">
              <Tableau>
                <thead><tr><th>Donnée</th><th className="!text-right">PRISM <PastilleOrigine origine="calcul" /></th><th className="!text-right">Source <PastilleOrigine origine="source" /></th><th className="!text-right">Écart</th></tr></thead>
                <tbody>
                  {ecarts.map((e) => (
                    <tr key={e.champ}><td>{e.champ}</td><td className="text-right"><Montant v={e.prism} /></td><td className="text-right"><Montant v={e.source} /></td>
                      <td className="text-right">{Math.abs(e.ecart) < 1 ? <span className="text-emerald-600">concordant</span> : <Montant v={e.ecart} signe />}</td></tr>
                  ))}
                </tbody>
              </Tableau>
            </Carte>
          )}

          <Notes />
          <Commentaires cible={{ collection: "projets", id: projet.id }} projetId={projet.id} titre="Discussion sur le projet" />
        </div>

        <div className="space-y-6">
          <Carte titre="Informations">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5 p-5">
              <Info2 libelle="Responsable de projet" origine={origine("directeurId")}>{nom(projet.directeurId)}</Info2>
              <Info2 libelle="Sponsor">{nom(projet.sponsorId)}</Info2>
              <Info2 libelle="Direction" origine={origine("directionId")}>{directions.find((d) => d.id === projet.directionId)?.nom}</Info2>
              <Info2 libelle="Phase">{projet.phaseGroupe}{i.type?.modeFinancier === "positions" ? <span className="block text-xs text-slate-500">SIA {projet.phase}</span> : null}</Info2>
              <Info2 libelle="Portefeuille">{portefeuilles.find((x) => x.id === projet.portefeuilleId)?.nom}</Info2>
              <Info2 libelle="Programme">{programmes.find((x) => x.id === projet.programmeId)?.nom}</Info2>
              <Info2 libelle="Début" origine={origine("dateDebut")}>{formatDate(projet.dateDebut)}</Info2>
              <Info2 libelle="Fin" origine={origine("dateFin")}>{formatDate(projet.dateFin)}</Info2>
              <Info2 libelle="Classification">{projet.classification}</Info2>
              <Info2 libelle="Compte analytique" origine={origine("compteAnalytique")}>{projet.compteAnalytique}</Info2>
              {projet.maitreOuvrage && <Info2 libelle="Maître d'ouvrage">{projet.maitreOuvrage}</Info2>}
              {projet.lieu && <Info2 libelle="Lieu">{projet.lieu}</Info2>}
              {i.type?.champs.filter((c) => projet.donneesType?.[c.cle]).map((c) => <Info2 key={c.cle} libelle={c.libelle}>{c.type === "date" ? formatDate(projet.donneesType![c.cle]) : projet.donneesType![c.cle]}</Info2>)}
              <div className="col-span-2">
                <Info2 libelle="Avancement">
                  <span className="mt-1 flex items-center gap-2"><Progression valeur={i.avancement} /><span className="num text-xs text-slate-500">{Math.round(i.avancement)} %</span></span>
                </Info2>
              </div>
            </dl>
            {projet.description && <p className="border-t border-slate-100 px-5 py-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">{projet.description}</p>}
          </Carte>

          {projet.synchro ? (
            <Carte titre="Système source">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5 p-5">
                <Info2 libelle="Numéro">{projet.numeroSource}</Info2>
                <Info2 libelle="Statut dans la source" origine="source">{projet.statutSource}</Info2>
                <div className="col-span-2"><Fraicheur date={projet.synchro.date} systeme={projet.synchro.systeme} /></div>
              </dl>
              {corrections.length > 0 && (
                <div className="border-t border-slate-100 px-5 py-3 dark:border-slate-800">
                  <p className="mb-1.5 text-xs font-medium text-amber-700">Corrections locales à reporter dans la source</p>
                  <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    {corrections.map(([cle, c]) => <li key={cle}><strong>{libelleChamp(cle)}</strong> — source : « {String(c.valeurSource ?? "—")} » · {c.motif}</li>)}
                  </ul>
                </div>
              )}
            </Carte>
          ) : (
            <Carte className="p-5 text-sm text-slate-500 pas-impression">
              <p className="font-medium text-slate-700 dark:text-slate-200">Projet non rattaché au système source</p>
              <p className="mt-1">Ses données sont saisies dans PRISM. {projet.provisoire ? "Il reste « provisoire » jusqu'à l'attribution d'un numéro officiel." : ""}</p>
            </Carte>
          )}

          {enfants.length === 0 && droit.ecrire && !projet.parentId && (
            <Bouton className="w-full pas-impression" icone={<Plus size={15} />} onClick={() => setAjout(true)}>Ajouter un sous-projet</Bouton>
          )}
        </div>
      </div>
    </div>
  );
}
