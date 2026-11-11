// Finances d'un projet tenu « en synthèse » : budget, engagé et réalisé viennent du système source ;
// le responsable tient l'atterrissage, ses scénarios, et arrête la situation chaque mois.
import { Save } from "lucide-react";
import { useState } from "react";
import { cheminProjet } from "@/app/registre";
import { lireNombre } from "@/app/table/TableDonnees";
import { Alerte, Bouton, Carte, Champ, EnTetePage, Indicateur, Onglets, Saisie, Tableau, useLectureSeule, Zone } from "@/app/ui";
import { Fraicheur, Montant } from "@/app/ui/metier";
import { aujourdhui, formatCHF, formatDate, formatPct } from "@/domaine/lib/format";
import { nouvelId } from "@/domaine/lib/id";
import { useActions, useDerive, useDonnees, useProjet, useUtilisateur } from "@/donnees/hooks";
import { syntheseProjet, useSynthese } from "@/donnees/lectures";
import { BoutonIA } from "@/modules/assistant/BoutonIA";
import { Link } from "react-router-dom";
import { Periodes } from "./Periodes";
import { Scenarios } from "./Scenarios";
import { FacturesSource, ParAnnee } from "./Source";

type Onglet = "synthese" | "scenarios" | "factures" | "periodes";

export function FinancesSynthese() {
  const { projet, scenarios, facturesSource, periodesFinancieres } = useProjet();
  const [onglet, setOnglet] = useState<Onglet>("synthese");
  if (!projet) return null;
  return (
    <>
      <EnTetePage titre="Finances" description="Valeurs du système source, atterrissage tenu par le responsable, scénarios et arrêts mensuels – montants HT"
        actions={<BoutonIA question="Analyse la situation financière du projet : écart entre budget approuvé et atterrissage, rythme de dépense par rapport au planning, et points à expliquer au prochain arrêt de période.">Analyse IA</BoutonIA>} />
      <div className="mb-5"><Onglets valeur={onglet} onChange={setOnglet} options={[
        { id: "synthese", libelle: "Synthèse" },
        { id: "scenarios", libelle: "Scénarios", compte: scenarios.length || undefined },
        { id: "factures", libelle: "Factures", compte: facturesSource.length || undefined },
        { id: "periodes", libelle: "Périodes", compte: periodesFinancieres.length || undefined },
      ]} /></div>
      {onglet === "synthese" && <Synthese />}
      {onglet === "scenarios" && <Scenarios />}
      {onglet === "factures" && <FacturesSource />}
      {onglet === "periodes" && <Periodes />}
    </>
  );
}

function Synthese() {
  const { projet, atterrissagesSaisis } = useProjet();
  const { projets, personnes } = useDonnees();
  const { ajouter } = useActions();
  const utilisateur = useUtilisateur();
  const lecture = useLectureSeule();
  const s = useSynthese(projet?.id ?? "");
  const enfants = projets.filter((p) => p.parentId === projet?.id);
  const synthesesEnfants = useDerive((depot, suivre) => enfants.map((e) => ({ projet: e, s: syntheseProjet(depot, e.id, suivre) })), [enfants.map((e) => e.id).join("|")]);
  const [montant, setMontant] = useState("");
  const [commentaire, setCommentaire] = useState("");
  if (!projet) return null;

  const tenuParSource = s.origines.atterrissage === "source";
  const saisies = [...atterrissagesSaisis].sort((a, b) => b.date.localeCompare(a.date));
  const valeur = lireNombre(montant);
  const enregistrer = () => {
    ajouter("atterrissagesSaisis", { id: nouvelId("att"), projetId: projet.id, date: aujourdhui(), montant: valeur, commentaire: commentaire.trim(), auteurId: utilisateur?.id });
    setMontant(""); setCommentaire("");
  };

  return (
    <div className="space-y-6">
      {s.vide && <Alerte type="info">Aucune valeur financière n'est encore disponible : rattachez le projet à son numéro dans le système source (fiche du projet), ou saisissez un premier atterrissage.</Alerte>}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-6">
        <Indicateur libelle="Budget initial" valeur={formatCHF(s.budgetInitial)} origine={s.origines.budgetInitial} />
        <Indicateur libelle="Budget approuvé" valeur={formatCHF(s.budgetApprouve)} origine={s.origines.budgetApprouve} detail={Math.abs(s.budgetApprouve - s.budgetInitial) > 0.5 ? `${s.budgetApprouve > s.budgetInitial ? "+" : ""}${formatCHF(s.budgetApprouve - s.budgetInitial)} depuis l'origine` : "inchangé"} />
        <Indicateur libelle="Engagé" valeur={formatCHF(s.engage)} origine={s.origines.engage} detail={`${formatPct(s.budgetApprouve ? (s.engage / s.budgetApprouve) * 100 : 0, 0)} du budget`} />
        <Indicateur libelle="Réalisé" valeur={formatCHF(s.realise)} origine={s.origines.realise} detail={`payé ${formatCHF(s.paye)}`} />
        <Indicateur libelle="Atterrissage" valeur={formatCHF(s.atterrissage)} origine={s.origines.atterrissage} detail={s.atterrissageDefavorable > s.atterrissage + 0.5 ? `défavorable ${formatCHF(s.atterrissageDefavorable)}` : undefined} />
        <Indicateur libelle="Écart" valeur={<Montant v={s.ecart} signe />} origine="calcul" detail={`${formatPct(s.ecartPct)} du budget`} tendance={s.ecart < -0.5 ? "mauvais" : "bon"} />
      </div>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        {s.reference && <Fraicheur date={s.dateSource} systeme={s.reference.systeme} />}
        {s.consolidee && <span>Valeurs consolidées : somme des {enfants.length} sous-projets</span>}
      </p>

      <div className="grid gap-6 xl:grid-cols-2">
        <Carte titre="Atterrissage" sousTitre={tenuParSource ? "Tenu dans le système source" : "Tenu par le responsable du projet"}>
          <div className="space-y-4 p-5">
            {tenuParSource ? (
              <Alerte type="info">Le système source tient un atterrissage pour ce projet ({formatCHF(s.atterrissage)}) : il fait foi. Pour l'ajuster, corrigez-le dans la source ; vos hypothèses se chiffrent dans les scénarios.</Alerte>
            ) : s.consolidee ? (
              <Alerte type="info">L'atterrissage de ce projet est la somme de ceux de ses sous-projets : il se tient dans chacun d'eux.</Alerte>
            ) : (
              <>
                {s.commentaireAtterrissage && <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">« {s.commentaireAtterrissage} »</p>}
                {!lecture && (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Champ libelle="Nouvel atterrissage CHF"><Saisie inputMode="decimal" className="text-right num" value={montant} onChange={(e) => setMontant(e.target.value)} placeholder={Math.round(s.atterrissage).toLocaleString("fr-CH")} /></Champ>
                    <Champ libelle="Ce qui le justifie" obligatoire className="sm:col-span-2"><Zone rows={2} value={commentaire} onChange={(e) => setCommentaire(e.target.value)} placeholder="Offre reçue, avenant, risque survenu, report…" /></Champ>
                    <div className="sm:col-span-3"><Bouton variante="primaire" icone={<Save size={15} />} disabled={!(valeur > 0) || !commentaire.trim()} onClick={enregistrer}>Enregistrer l'atterrissage</Bouton></div>
                  </div>
                )}
              </>
            )}
            {saisies.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Historique des saisies</p>
                <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
                  {saisies.map((a) => (
                    <li key={a.id} className="flex gap-3 py-2">
                      <span className="w-24 shrink-0 text-slate-500">{formatDate(a.date)}</span>
                      <span className="w-28 shrink-0 text-right font-medium"><Montant v={a.montant} /></span>
                      <span className="min-w-0 flex-1 text-slate-600 dark:text-slate-300">{a.commentaire}<span className="block text-xs text-slate-400">{personnes.find((p) => p.id === a.auteurId)?.nom}</span></span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Carte>
        <ParAnnee />
      </div>

      {synthesesEnfants.length > 0 && (
        <Carte titre="Sous-projets" sousTitre="Leurs valeurs s'additionnent dans ce projet, sans double compte">
          <Tableau>
            <thead><tr><th>Sous-projet</th><th className="text-right">Budget approuvé</th><th className="text-right">Engagé</th><th className="text-right">Réalisé</th><th className="text-right">Atterrissage</th><th className="text-right">Écart</th></tr></thead>
            <tbody>
              {synthesesEnfants.map(({ projet: e, s: se }) => (
                <tr key={e.id}>
                  <td><Link className="font-medium text-brand-600 hover:underline" to={cheminProjet(e.id, "finances")}>{e.code}</Link> <span className="text-slate-500">{e.nom}</span></td>
                  <td className="text-right"><Montant v={se.budgetApprouve} /></td><td className="text-right"><Montant v={se.engage} /></td><td className="text-right"><Montant v={se.realise} /></td>
                  <td className="text-right font-medium"><Montant v={se.atterrissage} /></td><td className="text-right"><Montant v={se.ecart} signe /></td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="font-semibold"><td>Total consolidé</td><td className="text-right"><Montant v={s.budgetApprouve} /></td><td className="text-right"><Montant v={s.engage} /></td><td className="text-right"><Montant v={s.realise} /></td><td className="text-right"><Montant v={s.atterrissage} /></td><td className="text-right"><Montant v={s.ecart} signe /></td></tr></tfoot>
          </Tableau>
        </Carte>
      )}
    </div>
  );
}
