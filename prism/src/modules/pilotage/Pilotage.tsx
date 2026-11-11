// Pilotage groupe : la même base de projets, lue selon quatre rôles — Finance, PMO, Direction et
// Conseil d'administration. Les sous-projets sont compris dans leur projet parent (pas de double compte).
import { CalendarCheck, Printer } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { notifier } from "@/app/etatUI";
import { cheminProjet } from "@/app/registre";
import { TableDonnees, type Colonne } from "@/app/table/TableDonnees";
import { Alerte, Badge, Bouton, Carte, EnTetePage, Indicateur, Liste, Onglets, Progression, Tableau, useLectureSeule } from "@/app/ui";
import { BadgeSante, Montant } from "@/app/ui/metier";
import { aujourdhui, formatCompact, formatDate, formatPct, moisDe, moisEnClair } from "@/domaine/lib/format";
import { criticite, estActif, exposition, score } from "@/domaine/lib/risques";
import { accesDe, decisionVisible, projetsAccessibles } from "@/domaine/socle/droits";
import { moisPrecedent } from "@/domaine/socle/periodes";
import { LIBELLE_SANTE } from "@/domaine/socle/synthese";
import { agreger, parAnnee, total, type Agregat } from "@/domaine/socle/vues";
import { useDepot, useDonnees, useUtilisateur } from "@/donnees/hooks";
import { arreterPeriodeGroupe } from "@/donnees/periodes";
import { useLignesPilotage, type LignePilotage } from "@/donnees/pilotage";
import { couleurIndice } from "../rapports/Completude";

type Vue = "finance" | "pmo" | "direction" | "risques" | "ca";
type Regroupement = "direction" | "portefeuille" | "programme" | "type";

const lienProjet = (l: LignePilotage, sous = "") => <Link to={cheminProjet(l.projet.id, sous)} className="font-medium text-brand-600 hover:underline">{l.projet.code}</Link>;

export function Pilotage() {
  const { projets, directions, portefeuilles, programmes, typesProjet, relevesSource, risques, decisions, personnes } = useDonnees();
  const depot = useDepot();
  const utilisateur = useUtilisateur();
  const lecture = useLectureSeule();
  const jour = aujourdhui();
  const profil = utilisateur ? accesDe(utilisateur).profil : undefined;
  const [vue, setVue] = useState<Vue>(profil === "PMO" ? "pmo" : profil === "Direction" ? "direction" : profil === "ComInv" ? "ca" : "finance");
  const [regroupement, setRegroupement] = useState<Regroupement>("direction");
  const [directionId, setDirectionId] = useState(utilisateur?.directionId ?? "");

  const visibles = projetsAccessibles(utilisateur, projets.filter((p) => !p.archive));
  const ids = new Set(visibles.map((p) => p.id));
  // Un sous-projet est compris dans son parent, sauf si le parent est hors du périmètre de l'utilisateur
  const racines = visibles.filter((p) => !p.parentId || !ids.has(p.parentId));
  const lignes = useLignesPilotage(racines, jour);
  const mois = moisPrecedent(moisDe(jour));

  const nomDirection = (id?: string) => directions.find((d) => d.id === id)?.nom ?? "Sans direction";
  const cleDe = (l: LignePilotage): string => regroupement === "direction" ? nomDirection(l.projet.directionId)
    : regroupement === "portefeuille" ? portefeuilles.find((x) => x.id === l.projet.portefeuilleId)?.nom ?? "Sans portefeuille"
      : regroupement === "programme" ? programmes.find((x) => x.id === l.projet.programmeId)?.nom ?? "Hors programme"
        : typesProjet.find((x) => x.id === l.projet.typeProjetId)?.nom ?? "Sans type";
  const enLigne = (liste: LignePilotage[], cle: (l: LignePilotage) => string = cleDe) => liste.map((l) => ({ cle: cle(l), valeurs: l.i.synthese, sante: l.i.sante }));

  const arreter = () => {
    const r = arreterPeriodeGroupe(depot, racines.map((p) => p.id), mois);
    notifier(`Période ${moisEnClair(mois)} : ${r.arretees.length} projet(s) arrêté(s)${r.aCommenter.length ? `, ${r.aCommenter.length} à commenter par leur responsable` : ""}${r.dejaFaites.length ? `, ${r.dejaFaites.length} déjà arrêté(s)` : ""}.`, r.aCommenter.length ? "info" : "succes");
  };

  const ligneAgregat = (a: Agregat, gras = false) => (
    <tr key={a.cle} className={gras ? "font-semibold" : undefined}>
      <td>{a.cle}</td><td className="text-right num">{a.projets}</td>
      <td className="text-right"><Montant v={a.budgetApprouve} /></td><td className="text-right"><Montant v={a.engage} /></td><td className="text-right"><Montant v={a.realise} /></td>
      <td className="text-right"><Montant v={a.atterrissage} /></td><td className="text-right"><Montant v={a.ecart} signe /></td><td className="text-right num">{formatPct(a.ecartPct)}</td>
      <td className="text-right">{a.critiques > 0 && <Badge couleur="rouge">{a.critiques}</Badge>} {a.aSurveiller > 0 && <Badge couleur="orange">{a.aSurveiller}</Badge>}</td>
    </tr>
  );
  const enTeteAgregat = <tr><th>Groupe</th><th className="text-right">Projets</th><th className="text-right">Budget approuvé</th><th className="text-right">Engagé</th><th className="text-right">Réalisé</th><th className="text-right">Atterrissage</th><th className="text-right">Écart</th><th className="text-right">%</th><th className="text-right">Alertes</th></tr>;

  // ------------------------------------------------------------------ Finance
  const t = total(enLigne(lignes));
  const annees = parAnnee(relevesSource.filter((r) => racines.some((p) => p.id === r.projetId)));
  const arretees = lignes.filter((l) => l.periode.existante);
  const aCommenter = lignes.filter((l) => !l.periode.existante && l.periode.commentaireExige);
  const variations = lignes.filter((l) => l.derniere && Math.abs(l.depuisDerniere.atterrissage) > 0.5).sort((a, b) => Math.abs(b.depuisDerniere.atterrissage) - Math.abs(a.depuisDerniere.atterrissage));
  const hausse = (v: number) => <span className={`whitespace-nowrap num ${v > 0 ? "text-rose-600" : "text-emerald-600"}`}>{v > 0 ? "+" : ""}{Math.round(v).toLocaleString("fr-CH")}</span>;
  const vueFinance = (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Indicateur libelle="Budget approuvé" valeur={formatCompact(t.budgetApprouve)} detail={`${t.projets} projets · CHF HT`} />
        <Indicateur libelle="Engagé" valeur={formatCompact(t.engage)} detail={`${formatPct(t.budgetApprouve ? (t.engage / t.budgetApprouve) * 100 : 0, 0)} du budget`} />
        <Indicateur libelle="Réalisé" valeur={formatCompact(t.realise)} detail={`${formatPct(t.budgetApprouve ? (t.realise / t.budgetApprouve) * 100 : 0, 0)} du budget`} />
        <Indicateur libelle="Atterrissage" valeur={formatCompact(t.atterrissage)} />
        <Indicateur libelle="Écart" valeur={<Montant v={t.ecart} compact signe />} detail={formatPct(t.ecartPct)} tendance={t.ecart < -0.5 ? "mauvais" : "bon"} />
      </div>
      <Carte titre="Synthèse financière" sousTitre="Sous-projets compris dans leur projet parent"
        action={<div className="w-44"><Liste libre aria-label="Regrouper par" value={regroupement} onChange={(e) => setRegroupement(e.target.value as Regroupement)}><option value="direction">Par direction</option><option value="portefeuille">Par portefeuille</option><option value="programme">Par programme</option><option value="type">Par type de projet</option></Liste></div>}>
        <Tableau><thead>{enTeteAgregat}</thead><tbody>{agreger(enLigne(lignes)).map((a) => ligneAgregat(a))}</tbody><tfoot>{ligneAgregat(t, true)}</tfoot></Tableau>
      </Carte>
      <div className="grid gap-6 xl:grid-cols-2">
        <Carte titre={`Arrêt de la période ${moisEnClair(mois)}`} sousTitre={`${arretees.length} projet(s) arrêté(s) sur ${lignes.length}`}
          action={!lecture && arretees.length < lignes.length && <Bouton variante="primaire" icone={<CalendarCheck size={15} />} onClick={arreter}>Arrêter pour le portefeuille</Bouton>}>
          <div className="space-y-3 p-5">
            <Progression valeur={lignes.length ? (arretees.length / lignes.length) * 100 : 0} />
            {aCommenter.length > 0 ? (
              <>
                <p className="text-sm text-slate-600 dark:text-slate-300">L'atterrissage de ces projets a varié de plus de {aCommenter[0].periode.seuilPct} % : leur responsable doit commenter la variation pour arrêter la période.</p>
                <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
                  {aCommenter.map((l) => <li key={l.projet.id} className="flex items-center gap-3 py-2">{lienProjet(l, "finances")}<span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">{l.projet.nom}</span>{hausse(l.periode.variation.atterrissage)}<span className="w-16 text-right text-xs text-slate-500 num">{formatPct(l.periode.variation.pct)}</span></li>)}
                </ul>
              </>
            ) : <p className="text-sm text-slate-500">{arretees.length === lignes.length ? "Tous les projets sont arrêtés pour cette période." : "Aucune variation ne demande de commentaire : la période peut être arrêtée pour tout le portefeuille."}</p>}
          </div>
        </Carte>
        <Carte titre="Budget et réalisé par année" sousTitre="Valeurs du système source">
          <Tableau>
            <thead><tr><th>Année</th><th className="text-right">Budget</th><th className="text-right">Réalisé</th><th className="text-right">Reste</th><th className="w-36">Consommé</th></tr></thead>
            <tbody>{annees.map((a) => <tr key={a.annee}><td className="font-medium num">{a.annee}</td><td className="text-right"><Montant v={a.budget} /></td><td className="text-right"><Montant v={a.realise} /></td><td className="text-right"><Montant v={a.budget - a.realise} /></td><td><Progression valeur={a.budget ? (a.realise / a.budget) * 100 : 0} /></td></tr>)}</tbody>
          </Tableau>
        </Carte>
      </div>
      <Carte titre="Variations depuis la dernière période arrêtée" sousTitre="Atterrissage du jour comparé à la dernière photo de chaque projet">
        {variations.length === 0 ? <p className="px-5 py-6 text-center text-sm text-slate-500">Aucune variation : soit aucune période n'a encore été arrêtée, soit les atterrissages n'ont pas bougé.</p> : (
          <Tableau>
            <thead><tr><th>Projet</th><th>Depuis</th><th className="text-right">Atterrissage précédent</th><th className="text-right">Atterrissage du jour</th><th className="text-right">Variation</th><th className="text-right">%</th></tr></thead>
            <tbody>{variations.slice(0, 12).map((l) => <tr key={l.projet.id}><td>{lienProjet(l, "finances")} <span className="text-slate-500">{l.projet.nom}</span></td><td className="whitespace-nowrap capitalize">{moisEnClair(l.derniere!.mois)}</td><td className="text-right"><Montant v={l.derniere!.valeurs.atterrissage} /></td><td className="text-right"><Montant v={l.periode.valeurs.atterrissage} /></td><td className="text-right">{hausse(l.depuisDerniere.atterrissage)}</td><td className="whitespace-nowrap text-right num">{formatPct(l.depuisDerniere.pct)}</td></tr>)}</tbody>
          </Tableau>
        )}
      </Carte>
    </div>
  );

  // ---------------------------------------------------------------------- PMO
  const moyenne = lignes.length ? Math.round(lignes.reduce((s, l) => s + l.completude.indice, 0) / lignes.length) : 0;
  const colonnesPmo: Colonne<LignePilotage>[] = [
    { id: "code", titre: "Code", valeur: (l) => l.projet.code, rendu: (l) => <span className="whitespace-nowrap">{lienProjet(l, "rapports")}</span> },
    { id: "nom", titre: "Projet", valeur: (l) => l.projet.nom },
    { id: "direction", titre: "Direction", valeur: (l) => directions.find((d) => d.id === l.projet.directionId)?.code ?? "", groupable: true },
    { id: "phase", titre: "Phase", valeur: (l) => l.projet.phaseGroupe ?? "", groupable: true },
    { id: "sante", titre: "Santé", valeur: (l) => LIBELLE_SANTE[l.i.sante], rendu: (l) => <BadgeSante sante={l.i.sante} />, groupable: true },
    { id: "completude", titre: "Complétude", valeur: (l) => l.completude.indice, type: "nombre", rendu: (l) => <span className={`font-semibold num ${couleurIndice(l.completude.indice)}`}>{l.completude.indice} %</span> },
    { id: "dossier", titre: "Dossier", valeur: (l) => l.completude.parAxe.Documentaire, type: "pourcent", masquee: true },
    { id: "donnees", titre: "Données", valeur: (l) => l.completude.parAxe["Qualité des données"], type: "pourcent", masquee: true },
    { id: "mandat", titre: "Mandat", valeur: (l) => (l.mandatSigne ? "Signé" : "Non signé"), rendu: (l) => <Badge couleur={l.mandatSigne ? "vert" : "orange"}>{l.mandatSigne ? "Signé" : "Non signé"}</Badge>, groupable: true },
    { id: "periode", titre: "Dernière période", valeur: (l) => l.completude.criteres.length ? (l.periode.existante?.mois ?? l.periode.precedente?.mois ?? "") : "" },
    { id: "arevoir", titre: "Risques à revoir", valeur: (l) => l.risquesARevoir || "", type: "nombre" },
    { id: "conditions", titre: "Conditions échues", valeur: (l) => l.conditionsEchues || "", type: "nombre" },
    { id: "manques", titre: "À compléter", valeur: (l) => l.completude.manquants.map((m) => m.critere.libelle).join(" ; ") },
  ];
  const vuePmo = (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Indicateur libelle="Complétude moyenne" valeur={`${moyenne} %`} detail={`${lignes.filter((l) => l.completude.indice < 60).length} projet(s) sous 60 %`} tendance={moyenne >= 85 ? "bon" : moyenne >= 60 ? "alerte" : "mauvais"} />
        <Indicateur libelle="Mandats signés" valeur={`${lignes.filter((l) => l.mandatSigne).length} / ${lignes.length}`} />
        <Indicateur libelle="Rapports en revue" valeur={lignes.reduce((s, l) => s + l.rapportsEnRevue, 0)} detail="à valider" />
        <Indicateur libelle="Conditions échues" valeur={lignes.reduce((s, l) => s + l.conditionsEchues, 0)} tendance={lignes.some((l) => l.conditionsEchues) ? "alerte" : "bon"} detail="décisions et passages de phase" />
        <Indicateur libelle="Risques à revoir" valeur={lignes.reduce((s, l) => s + l.risquesARevoir, 0)} detail="revue au-delà du délai" />
      </div>
      <Carte><TableDonnees id="pilotage-pmo" lignes={lignes} colonnes={colonnesPmo} cle={(l) => l.projet.id} triInitial={{ colonne: "completude", sens: "asc" }} /></Carte>
    </div>
  );

  // ---------------------------------------------------------------- Direction
  const deDirection = directionId ? lignes.filter((l) => l.projet.directionId === directionId) : lignes;
  const td = total(enLigne(deDirection));
  const idsDirection = new Set(deDirection.map((l) => l.projet.id));
  const risquesCritiques = risques.filter((r) => idsDirection.has(r.projetId) && estActif(r) && criticite(score(r)) === "Critique").sort((a, b) => score(b) - score(a)).slice(0, 8);
  const aDecider = deDirection.filter((l) => l.i.validationsEnAttente || l.conditionsEchues || l.rapportsEnRevue || !l.mandatSigne);
  const vueDirection = (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-80"><Liste libre aria-label="Direction" value={directionId} onChange={(e) => setDirectionId(e.target.value)}><option value="">Toutes les directions</option>{directions.map((d) => <option key={d.id} value={d.id}>{d.code} · {d.nom}</option>)}</Liste></div>
        <p className="text-sm text-slate-500">{deDirection.length} projet(s)</p>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Indicateur libelle="Budget approuvé" valeur={formatCompact(td.budgetApprouve)} />
        <Indicateur libelle="Atterrissage" valeur={formatCompact(td.atterrissage)} detail={`écart ${formatPct(td.ecartPct)}`} tendance={td.ecart < -0.5 ? "mauvais" : "bon"} />
        <Indicateur libelle="Projets critiques" valeur={td.critiques} tendance={td.critiques ? "mauvais" : "bon"} detail={`${td.aSurveiller} à surveiller`} />
        <Indicateur libelle="Tâches en retard" valeur={deDirection.reduce((s, l) => s + l.i.retards.length, 0)} />
        <Indicateur libelle="Points à trancher" valeur={aDecider.length} detail="projets avec une décision attendue" />
      </div>
      <Carte titre="Projets">
        <Tableau>
          <thead><tr><th>Projet</th><th>Santé</th><th>Phase</th><th className="w-32">Avancement</th><th className="text-right">Budget</th><th className="text-right">Atterrissage</th><th className="text-right">Écart</th><th>Prochain jalon</th></tr></thead>
          <tbody>{[...deDirection].sort((a, b) => ["mauvais", "alerte", "bon"].indexOf(a.i.sante) - ["mauvais", "alerte", "bon"].indexOf(b.i.sante)).map((l) => (
            <tr key={l.projet.id}>
              <td>{lienProjet(l)} <span className="text-slate-600 dark:text-slate-300">{l.projet.nom}</span></td><td><BadgeSante sante={l.i.sante} /></td><td>{l.projet.phaseGroupe ?? "—"}</td>
              <td><div className="flex items-center gap-2"><Progression valeur={l.i.avancement} className="flex-1" /><span className="w-9 text-right text-xs num">{Math.round(l.i.avancement)} %</span></div></td>
              <td className="text-right"><Montant v={l.i.synthese.budgetApprouve} compact /></td><td className="text-right"><Montant v={l.i.synthese.atterrissage} compact /></td><td className="text-right"><Montant v={l.i.synthese.ecart} compact signe /></td>
              <td className="text-sm">{l.i.prochainJalon ? <>{l.i.prochainJalon.nom} <span className="text-slate-500">· {formatDate(l.i.prochainJalon.fin)}</span></> : <span className="text-slate-400">—</span>}</td>
            </tr>
          ))}</tbody>
        </Tableau>
      </Carte>
      <div className="grid gap-6 xl:grid-cols-2">
        <Carte titre="Ce qui attend une décision">
          {aDecider.length === 0 ? <p className="px-5 py-6 text-center text-sm text-slate-500">Rien n'attend de décision.</p> : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">{aDecider.map((l) => (
              <li key={l.projet.id} className="flex flex-wrap items-center gap-2 px-5 py-3 text-sm">
                {lienProjet(l)}<span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">{l.projet.nom}</span>
                {!l.mandatSigne && <Link to={cheminProjet(l.projet.id, "mandat")}><Badge couleur="orange">Mandat à signer</Badge></Link>}
                {l.i.validationsEnAttente > 0 && <Link to={cheminProjet(l.projet.id, "validations")}><Badge couleur="bleu">{l.i.validationsEnAttente} validation(s)</Badge></Link>}
                {l.rapportsEnRevue > 0 && <Link to={cheminProjet(l.projet.id, "rapports")}><Badge couleur="bleu">{l.rapportsEnRevue} rapport(s) en revue</Badge></Link>}
                {l.conditionsEchues > 0 && <Link to={cheminProjet(l.projet.id, "decisions")}><Badge couleur="rouge">{l.conditionsEchues} condition(s) échue(s)</Badge></Link>}
              </li>
            ))}</ul>
          )}
        </Carte>
        <Carte titre="Risques critiques">
          {risquesCritiques.length === 0 ? <p className="px-5 py-6 text-center text-sm text-slate-500">Aucun risque critique ouvert.</p> : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">{risquesCritiques.map((r) => (
              <li key={r.id}><Link to={cheminProjet(r.projetId, "risques")} className="flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-rose-600 text-xs font-semibold text-white">{score(r)}</span>
                <span className="min-w-0 flex-1 truncate">{r.titre}</span>
                <span className="shrink-0 text-xs text-slate-500">{projets.find((p) => p.id === r.projetId)?.code}{r.impactFinancier ? ` · ${formatCompact(r.impactFinancier)}` : ""}</span>
              </Link></li>
            ))}</ul>
          )}
        </Carte>
      </div>
    </div>
  );

  // ------------------------------------------------------------------ Risques
  const idsRacines = new Map<string, LignePilotage>();
  // Les risques des sous-projets sont rattachés au projet parent affiché
  for (const l of lignes) { idsRacines.set(l.projet.id, l); for (const p of visibles) if (p.parentId === l.projet.id) idsRacines.set(p.id, l); }
  const actifs = risques.filter((x) => idsRacines.has(x.projetId) && estActif(x));
  const niveaux = ["Critique", "Élevée", "Moyenne", "Faible"] as const;
  const groupesRisques = new Map<string, { cle: string; total: number; exposition: number; parNiveau: Record<string, number> }>();
  for (const x of actifs) {
    const cle = cleDe(idsRacines.get(x.projetId)!);
    const g = groupesRisques.get(cle) ?? { cle, total: 0, exposition: 0, parNiveau: {} };
    const n = criticite(score(x));
    g.total++; g.parNiveau[n] = (g.parNiveau[n] ?? 0) + 1; g.exposition += exposition([x]);
    groupesRisques.set(cle, g);
  }
  const lignesRisques = [...groupesRisques.values()].sort((a, b) => (b.parNiveau.Critique ?? 0) - (a.parNiveau.Critique ?? 0) || b.exposition - a.exposition);
  const majeurs = [...actifs].sort((a, b) => score(b) - score(a) || b.impactFinancier - a.impactFinancier).slice(0, 15);
  const COULEUR_NIVEAU: Record<string, "rouge" | "orange" | "gris" | "vert"> = { Critique: "rouge", "Élevée": "orange", Moyenne: "gris", Faible: "vert" };
  const vueRisques = (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Indicateur libelle="Risques ouverts" valeur={actifs.filter((x) => x.nature !== "Opportunité").length} detail={`${actifs.filter((x) => x.nature === "Opportunité").length} opportunité(s)`} />
        <Indicateur libelle="Critiques" valeur={actifs.filter((x) => criticite(score(x)) === "Critique").length} tendance={actifs.some((x) => criticite(score(x)) === "Critique") ? "mauvais" : "bon"} />
        <Indicateur libelle="Exposition pondérée" valeur={formatCompact(exposition(actifs))} detail="CHF · impact × probabilité" />
        <Indicateur libelle="À revoir" valeur={lignes.reduce((t2, l) => t2 + l.risquesARevoir, 0)} detail="revue au-delà du délai" />
        <Indicateur libelle="Sans responsable" valeur={actifs.filter((x) => !x.proprietaireId).length} tendance={actifs.some((x) => !x.proprietaireId) ? "alerte" : "bon"} />
      </div>
      <Carte titre="Risques ouverts par groupe" sousTitre="Risques des sous-projets compris dans leur projet parent"
        action={<div className="w-44"><Liste libre aria-label="Regrouper par" value={regroupement} onChange={(e) => setRegroupement(e.target.value as Regroupement)}><option value="direction">Par direction</option><option value="portefeuille">Par portefeuille</option><option value="programme">Par programme</option><option value="type">Par type de projet</option></Liste></div>}>
        <Tableau>
          <thead><tr><th>Groupe</th><th className="text-right">Ouverts</th>{niveaux.map((n) => <th key={n} className="text-right">{n}</th>)}<th className="text-right">Exposition pondérée</th></tr></thead>
          <tbody>{lignesRisques.map((g) => (
            <tr key={g.cle}><td>{g.cle}</td><td className="text-right num">{g.total}</td>{niveaux.map((n) => <td key={n} className="text-right">{g.parNiveau[n] ? <Badge couleur={COULEUR_NIVEAU[n]}>{g.parNiveau[n]}</Badge> : <span className="text-slate-300">—</span>}</td>)}<td className="text-right"><Montant v={g.exposition} /></td></tr>
          ))}</tbody>
        </Tableau>
      </Carte>
      <Carte titre="Risques majeurs du périmètre" sousTitre="Les quinze premiers par criticité">
        <Tableau>
          <thead><tr><th className="w-16">Score</th><th>Risque</th><th>Projet</th><th>Responsable</th><th className="text-right">Impact financier</th><th>Stratégie</th></tr></thead>
          <tbody>{majeurs.map((x) => {
            const l = idsRacines.get(x.projetId)!;
            return (
              <tr key={x.id}>
                <td><Badge couleur={COULEUR_NIVEAU[criticite(score(x))]}>{score(x)}</Badge></td>
                <td><Link className="font-medium text-slate-900 hover:underline dark:text-white" to={cheminProjet(x.projetId, "risques")}>{x.titre}</Link>{x.nature === "Opportunité" && <span className="ml-2"><Badge couleur="vert">Opportunité</Badge></span>}</td>
                <td className="whitespace-nowrap">{l.projet.code}</td><td>{personnes.find((p) => p.id === x.proprietaireId)?.nom ?? <span className="text-amber-600">à désigner</span>}</td>
                <td className="text-right">{x.impactFinancier ? <Montant v={x.impactFinancier} /> : "—"}</td><td>{x.strategie ?? "—"}</td>
              </tr>
            );
          })}</tbody>
        </Tableau>
      </Carte>
    </div>
  );

  // ------------------------------------------------------------------------ CA
  const suivis = lignes.filter((l) => l.projet.suiviCA || l.projet.strategique);
  const tca = total(enLigne(suivis));
  const derniereDecision = (projetId: string) => decisions.filter((d) => d.projetId === projetId && d.statut === "Approuvée" && !d.restreint && decisionVisible(utilisateur, d)).sort((a, b) => b.date.localeCompare(a.date))[0];
  const vueCA = (
    <div className="space-y-6 zone-impression">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600 dark:text-slate-300">Projets stratégiques ou suivis par le Conseil d'administration, au {formatDate(jour)}. Ce marquage se règle dans la fiche de chaque projet.</p>
        <Bouton libre icone={<Printer size={15} />} className="pas-impression" onClick={() => window.print()}>Imprimer / PDF</Bouton>
      </div>
      {suivis.length === 0 ? <Alerte type="info">Aucun projet n'est marqué « stratégique » ou « suivi par le Conseil d'administration ».</Alerte> : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Indicateur libelle="Projets suivis" valeur={suivis.length} detail={`${tca.critiques} critique(s) · ${tca.aSurveiller} à surveiller`} />
            <Indicateur libelle="Budget approuvé" valeur={formatCompact(tca.budgetApprouve)} />
            <Indicateur libelle="Atterrissage" valeur={formatCompact(tca.atterrissage)} />
            <Indicateur libelle="Écart" valeur={<Montant v={tca.ecart} compact signe />} detail={formatPct(tca.ecartPct)} tendance={tca.ecart < -0.5 ? "mauvais" : "bon"} />
          </div>
          <div className="space-y-4">
            {suivis.map((l) => {
              const d = derniereDecision(l.projet.id);
              return (
                <Carte key={l.projet.id}>
                  <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500">{lienProjet(l)}<BadgeSante sante={l.i.sante} />{l.projet.strategique && <Badge couleur="violet">Stratégique</Badge>}</p>
                      <p className="mt-1 font-semibold text-slate-900 dark:text-white">{l.projet.nom}</p>
                      <p className="mt-0.5 text-sm text-slate-500">{nomDirection(l.projet.directionId)} · {l.projet.phaseGroupe ?? "—"} · {personnes.find((p) => p.id === l.projet.directeurId)?.nom ?? "sans responsable"}</p>
                      <div className="mt-3 flex items-center gap-2"><Progression valeur={l.i.avancement} className="flex-1" /><span className="text-xs text-slate-500 num">{Math.round(l.i.avancement)} %</span></div>
                    </div>
                    <dl className="grid grid-cols-3 gap-2 text-sm">
                      <div><dt className="text-xs text-slate-500">Budget</dt><dd className="font-medium"><Montant v={l.i.synthese.budgetApprouve} compact /></dd></div>
                      <div><dt className="text-xs text-slate-500">Atterrissage</dt><dd className="font-medium"><Montant v={l.i.synthese.atterrissage} compact /></dd></div>
                      <div><dt className="text-xs text-slate-500">Écart</dt><dd className="font-medium"><Montant v={l.i.synthese.ecart} compact signe /></dd></div>
                      <div className="col-span-3"><dt className="text-xs text-slate-500">Prochain jalon</dt><dd>{l.i.prochainJalon ? `${l.i.prochainJalon.nom} · ${formatDate(l.i.prochainJalon.fin)}` : "—"}</dd></div>
                    </dl>
                    <div className="min-w-0 text-sm">
                      <p className="text-xs text-slate-500">Dernière décision</p>
                      {d ? <p className="mt-0.5"><span className="font-medium">{d.objet}</span><span className="block text-xs text-slate-500">{d.organe} du {formatDate(d.date)}{d.montant ? ` · ${formatCompact(d.montant)} CHF` : ""}</span></p> : <p className="mt-0.5 text-slate-400">Aucune décision au registre</p>}
                      {l.i.risquesCritiques > 0 && <p className="mt-2 text-xs text-rose-600">{l.i.risquesCritiques} risque(s) critique(s) ouvert(s)</p>}
                    </div>
                  </div>
                </Carte>
              );
            })}
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      <EnTetePage titre="Pilotage groupe" description={`${lignes.length} projets de votre périmètre au ${formatDate(jour)} — une même base, lue selon le rôle`} />
      <div className="mb-6 pas-impression"><Onglets valeur={vue} onChange={setVue} options={[{ id: "finance", libelle: "Finance" }, { id: "pmo", libelle: "PMO" }, { id: "direction", libelle: "Direction" }, { id: "risques", libelle: "Risques" }, { id: "ca", libelle: "Conseil d'administration", compte: suivis.length || undefined }]} /></div>
      {vue === "finance" && vueFinance}
      {vue === "pmo" && vuePmo}
      {vue === "direction" && vueDirection}
      {vue === "risques" && vueRisques}
      {vue === "ca" && vueCA}
    </>
  );
}
