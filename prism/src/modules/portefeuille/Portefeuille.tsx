// Portefeuille : tous les projets du périmètre de l'utilisateur, en liste ou en tuiles, avec filtres,
// regroupements, vues enregistrées et export.
import { AlertTriangle, CalendarClock, FolderKanban, LayoutGrid, List, Plus, Printer, ShieldAlert, TrendingUp, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cheminProjet } from "@/app/registre";
import { TableDonnees, type Colonne } from "@/app/table/TableDonnees";
import { BadgeStatut, Bouton, Carte, EnTetePage, Indicateur, Liste, Progression, Vide } from "@/app/ui";
import { BadgePriorite, BadgeSante, Montant } from "@/app/ui/metier";
import { aujourdhui, formatCompact, formatDate, formatPct } from "@/domaine/lib/format";
import { projetsAccessibles } from "@/domaine/socle/droits";
import { LIBELLE_SANTE } from "@/domaine/socle/synthese";
import { useDonnees, useDroit, useUtilisateur } from "@/donnees/hooks";
import { useIndicateurs, type IndicateursProjet } from "@/donnees/lectures";
import { AjoutProjet } from "./AjoutProjet";

type Affichage = "liste" | "tuiles";

export function Portefeuille() {
  const navigate = useNavigate();
  const utilisateur = useUtilisateur();
  const droit = useDroit("portefeuille");
  const { projets, personnes, directions, portefeuilles, programmes, typesProjet } = useDonnees();
  const [affichage, setAffichage] = useState<Affichage>("liste");
  const [ajout, setAjout] = useState(false);
  const [detail, setDetail] = useState(false);
  const [filtres, setFiltres] = useState({ direction: "", portefeuille: "", type: "", statut: "" });
  const jour = aujourdhui();

  const visibles = useMemo(() => projetsAccessibles(utilisateur, projets.filter((p) => !p.archive)), [utilisateur, projets]);
  // Par défaut, un projet et ses sous-projets forment une seule ligne consolidée ; « Détailler » les
  // remplace par leurs sous-projets : dans les deux cas, aucun montant n'est compté deux fois.
  const lignes = useMemo(() => {
    const ids = new Set(visibles.map((p) => p.id));
    const parents = new Set(visibles.filter((p) => p.parentId && ids.has(p.parentId)).map((p) => p.parentId));
    return visibles.filter((p) => (detail ? !parents.has(p.id) : !p.parentId || !ids.has(p.parentId)))
      .filter((p) => (!filtres.direction || p.directionId === filtres.direction) && (!filtres.portefeuille || p.portefeuilleId === filtres.portefeuille)
        && (!filtres.type || p.typeProjetId === filtres.type) && (!filtres.statut || (p.statut ?? "En cours") === filtres.statut));
  }, [visibles, detail, filtres]);
  const indicateurs = useIndicateurs(lignes, jour);

  const nom = (id?: string) => personnes.find((x) => x.id === id)?.nom;
  const total = (f: (i: IndicateursProjet) => number) => indicateurs.reduce((s, i) => s + f(i), 0);
  const budget = total((i) => i.synthese.budgetApprouve);
  const atterrissage = total((i) => i.synthese.atterrissage);
  const attention = indicateurs.filter((i) => i.sante !== "bon").length;

  const colonnes: Colonne<IndicateursProjet>[] = useMemo(() => [
    { id: "code", titre: "Code", valeur: (i) => i.projet.code, rendu: (i) => <span className="whitespace-nowrap font-medium text-slate-900 dark:text-white">{i.projet.code}</span> },
    { id: "nom", titre: "Projet", valeur: (i) => i.projet.nom, rendu: (i) => <span className="block max-w-80 truncate" title={i.projet.nom}>{i.projet.nom}{i.sousProjets > 0 && <span className="ml-1.5 text-xs text-slate-400">+{i.sousProjets} sous-projets</span>}</span> },
    { id: "sante", titre: "Santé", valeur: (i) => LIBELLE_SANTE[i.sante], rendu: (i) => <BadgeSante sante={i.sante} />, groupable: true },
    { id: "statut", titre: "Statut", valeur: (i) => i.projet.statut ?? "En cours", rendu: (i) => <BadgeStatut statut={i.projet.statut ?? "En cours"} />, groupable: true },
    { id: "type", titre: "Type", valeur: (i) => i.type?.nom, groupable: true, masquee: true },
    { id: "direction", titre: "Direction", valeur: (i) => directions.find((d) => d.id === i.projet.directionId)?.code, groupable: true },
    { id: "portefeuille", titre: "Portefeuille", valeur: (i) => portefeuilles.find((x) => x.id === i.projet.portefeuilleId)?.nom, groupable: true, masquee: true },
    { id: "programme", titre: "Programme", valeur: (i) => programmes.find((x) => x.id === i.projet.programmeId)?.nom, groupable: true, masquee: true },
    { id: "responsable", titre: "Responsable", valeur: (i) => nom(i.projet.directeurId), groupable: true },
    { id: "phase", titre: "Phase", valeur: (i) => i.projet.phaseGroupe, groupable: true, masquee: true },
    { id: "priorite", titre: "Priorité", valeur: (i) => i.projet.priorite, rendu: (i) => <BadgePriorite priorite={i.projet.priorite} />, groupable: true, masquee: true },
    { id: "budget", titre: "Budget approuvé", valeur: (i) => i.synthese.budgetApprouve, type: "montant", total: true, rendu: (i) => <Montant v={i.synthese.budgetApprouve} /> },
    { id: "engage", titre: "Engagé", valeur: (i) => i.synthese.engage, type: "montant", total: true, rendu: (i) => <Montant v={i.synthese.engage} /> },
    { id: "realise", titre: "Réalisé", valeur: (i) => i.synthese.realise, type: "montant", total: true, rendu: (i) => <Montant v={i.synthese.realise} />, masquee: true },
    { id: "atterrissage", titre: "Atterrissage", valeur: (i) => i.synthese.atterrissage, type: "montant", total: true, rendu: (i) => <Montant v={i.synthese.atterrissage} /> },
    { id: "ecart", titre: "Écart", valeur: (i) => i.synthese.ecart, type: "montant", total: true, rendu: (i) => <Montant v={i.synthese.ecart} signe /> },
    { id: "avancement", titre: "Avancement", valeur: (i) => Math.round(i.avancement), type: "pourcent", rendu: (i) => <span className="inline-flex w-24 items-center gap-2"><Progression valeur={i.avancement} /><span className="num text-xs text-slate-500">{Math.round(i.avancement)}%</span></span> },
    { id: "risques", titre: "Risques critiques", valeur: (i) => i.risquesCritiques, type: "nombre", rendu: (i) => (i.risquesCritiques ? <span className="font-semibold text-rose-600">{i.risquesCritiques}</span> : <span className="text-slate-300">0</span>) },
    { id: "jalon", titre: "Prochain jalon", valeur: (i) => i.prochainJalon?.fin, rendu: (i) => (i.prochainJalon ? <span title={i.prochainJalon.nom}>{formatDate(i.prochainJalon.fin)}</span> : <span className="text-slate-300">—</span>), type: "date", masquee: true },
    { id: "retards", titre: "Retards", valeur: (i) => i.retards.length, type: "nombre", masquee: true },
    { id: "fin", titre: "Fin prévue", valeur: (i) => i.projet.dateFin, type: "date" },
    { id: "annee", titre: "Année de fin", valeur: (i) => i.projet.dateFin.slice(0, 4), groupable: true, masquee: true },
    { id: "manquants", titre: "Données manquantes", valeur: (i) => i.champsManquants.length, type: "nombre", masquee: true },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [directions, portefeuilles, programmes, personnes]);

  const selecteur = (cle: keyof typeof filtres, libelle: string, options: { id: string; nom: string }[]) => (
    <Liste libre aria-label={libelle} value={filtres[cle]} onChange={(e) => setFiltres({ ...filtres, [cle]: e.target.value })} className="!h-8 !w-auto !py-0 !text-xs">
      <option value="">{libelle}</option>
      {options.map((o) => <option key={o.id} value={o.id}>{o.nom}</option>)}
    </Liste>
  );

  return (
    <>
      <EnTetePage titre="Portefeuille" description={`${lignes.length} projet${lignes.length > 1 ? "s" : ""} dans votre périmètre au ${formatDate(jour)}`}
        actions={<>
          <Bouton libre icone={<Printer size={15} />} onClick={() => window.print()}>Imprimer / PDF</Bouton>
          {droit.ecrire && <Bouton variante="primaire" icone={<Plus size={16} />} onClick={() => setAjout(true)}>Ajouter un projet</Bouton>}
        </>} />
      {ajout && <AjoutProjet onFermer={() => setAjout(false)} />}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Indicateur libelle="Projets" valeur={lignes.length} icone={<FolderKanban size={16} />} detail={`${indicateurs.filter((i) => i.sousProjets).length} avec sous-projets`} />
        <Indicateur libelle="Budget approuvé" valeur={formatCompact(budget)} icone={<Wallet size={16} />} detail="CHF HT" />
        <Indicateur libelle="Atterrissage" valeur={formatCompact(atterrissage)} icone={<TrendingUp size={16} />}
          detail={budget ? `${atterrissage > budget ? "+" : ""}${formatCompact(atterrissage - budget)} CHF (${formatPct(((atterrissage - budget) / budget) * 100)})` : undefined}
          tendance={atterrissage > budget * 1.0001 ? "mauvais" : "bon"} />
        <Indicateur libelle="Points d'attention" valeur={attention} icone={<AlertTriangle size={16} />} detail="projets à surveiller ou critiques" tendance={attention ? "alerte" : "bon"} />
      </div>

      <div className="zone-impression">
        <Carte>
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2.5 dark:border-slate-800 pas-impression">
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
              {([["liste", List, "Liste"], ["tuiles", LayoutGrid, "Tuiles"]] as const).map(([id, Icone, libelle]) => (
                <button key={id} type="button" onClick={() => setAffichage(id)} aria-pressed={affichage === id}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${affichage === id ? "bg-white shadow-sm dark:bg-slate-900" : "text-slate-500"}`}>
                  <Icone size={13} /> {libelle}
                </button>
              ))}
            </div>
            {selecteur("direction", "Toutes les directions", directions.map((d) => ({ id: d.id, nom: `${d.code} – ${d.nom}` })))}
            {selecteur("portefeuille", "Tous les portefeuilles", portefeuilles)}
            {selecteur("type", "Tous les types", typesProjet)}
            {selecteur("statut", "Tous les statuts", ["Idée", "En préparation", "En cours", "En pause", "Terminé", "Abandonné"].map((s) => ({ id: s, nom: s })))}
            <label className="ml-auto flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={detail} onChange={(e) => setDetail(e.target.checked)} /> Détailler les sous-projets
            </label>
          </div>
          {lignes.length === 0 ? (
            <Vide icone={<FolderKanban size={22} />} titre="Aucun projet" texte="Aucun projet ne correspond à ces filtres dans votre périmètre." />
          ) : affichage === "liste" ? (
            <TableDonnees id="portefeuille" lignes={indicateurs} colonnes={colonnes} cle={(i) => i.projet.id} onOuvrir={(i) => navigate(cheminProjet(i.projet.id))} />
          ) : (
            <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
              {indicateurs.map((i) => <Tuile key={i.projet.id} i={i} responsable={nom(i.projet.directeurId)} />)}
            </div>
          )}
        </Carte>
      </div>
    </>
  );
}

function Tuile({ i, responsable }: { i: IndicateursProjet; responsable?: string }) {
  const p = i.projet;
  return (
    <Link to={cheminProjet(p.id)} className="block rounded-xl p-4 ring-1 ring-slate-200 transition hover:shadow-md hover:ring-brand-500 dark:ring-slate-800">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 h-9 w-1 shrink-0 rounded-full" style={{ background: p.couleur }} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">{p.code}</span>
            <BadgeSante sante={i.sante} />
            {p.provisoire && <span className="text-[10px] font-medium uppercase text-amber-600">provisoire</span>}
          </div>
          <p className="mt-0.5 truncate font-semibold text-slate-900 dark:text-white" title={p.nom}>{p.nom}</p>
          <p className="truncate text-xs text-slate-500">{[i.type?.nom, responsable, p.phaseGroupe].filter(Boolean).join(" · ")}</p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <div><dt className="text-xs text-slate-500">Budget</dt><dd className="font-semibold"><Montant v={i.synthese.budgetApprouve} compact /></dd></div>
        <div><dt className="text-xs text-slate-500">Atterrissage</dt><dd className="font-semibold"><Montant v={i.synthese.atterrissage} compact /></dd></div>
        <div><dt className="text-xs text-slate-500">Écart</dt><dd className="font-semibold"><Montant v={i.synthese.ecart} compact signe /></dd></div>
      </dl>
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <Progression valeur={i.avancement} className="flex-1" /><span className="num">{Math.round(i.avancement)} %</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
        {i.retards.length > 0 && <span className="inline-flex items-center gap-1 text-rose-600"><CalendarClock size={12} /> {i.retards.length} retard(s)</span>}
        {i.risquesCritiques > 0 && <span className="inline-flex items-center gap-1 text-rose-600"><ShieldAlert size={12} /> {i.risquesCritiques} risque(s) critique(s)</span>}
        {i.sousProjets > 0 && <span>{i.sousProjets} sous-projets</span>}
        {i.champsManquants.length > 0 && <span className="text-amber-600">{i.champsManquants.length} donnée(s) manquante(s)</span>}
        <span className="ml-auto">Fin {formatDate(p.dateFin)}</span>
      </div>
    </Link>
  );
}
