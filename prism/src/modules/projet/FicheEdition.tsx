// Édition de la fiche projet. Les champs dont le système source est maître ne se modifient pas
// directement : on les « corrige localement » avec un motif, en attendant la correction à la source.
import { Trash2, Undo2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { confirmer, notifier } from "@/app/etatUI";
import { Bouton, Case, Champ, Liste, Panneau, Saisie, Zone } from "@/app/ui";
import { PHASES } from "@/domaine/data/phasesSia";
import { accesDe } from "@/domaine/socle/droits";
import { CONFIDENTIALITES } from "@/domaine/socle/types";
import type { PhaseSIA, Projet, StatutProjet } from "@/domaine/types";
import { leverSurcharge, origineChamp, surcharger } from "@/donnees/connecteurs/synchro";
import { useDepot, useDonnees, useUtilisateur } from "@/donnees/hooks";
import { supprimerProjet } from "@/donnees/initialisation";
import { champsManquantsProjet } from "@/donnees/lectures";
import { libelleChamp } from "./libelles";

const STATUTS: StatutProjet[] = ["Idée", "En préparation", "En cours", "En pause", "Terminé", "Abandonné"];

export function FicheEdition({ projet, onFermer }: { projet: Projet; onFermer: () => void }) {
  const depot = useDepot();
  const navigate = useNavigate();
  const utilisateur = useUtilisateur();
  const { personnes, directions, portefeuilles, programmes, typesProjet, configurations, projets, modifier } = useDonnees();
  const [p, setP] = useState<Projet>(projet);
  // Champs maîtres de la source que l'utilisateur a choisi de corriger localement, avec leur motif
  const [corrections, setCorrections] = useState<Record<string, string>>({});
  const type = typesProjet.find((t) => t.id === p.typeProjetId);
  const config = configurations.find((c) => c.id === "courante");
  const manquants = champsManquantsProjet(p, type);
  const construction = type?.modeFinancier === "positions";
  const maj = (patch: Partial<Projet>) => setP({ ...p, ...patch });

  const corriger = async (cle: keyof Projet) => {
    const r = await confirmer({
      titre: `Corriger « ${libelleChamp(cle)} » localement`,
      message: "Cette valeur vient du système source. La correction définitive se fait dans ce système ; en attendant, PRISM conserve votre valeur et la signale comme corrigée localement.",
      action: "Corriger", motif: true,
    });
    if (r) setCorrections({ ...corrections, [cle]: r.motif });
  };

  /** Champ de la fiche ; verrouillé avec sa pastille « Source » si le système source en est maître */
  const champ = (cle: keyof Projet, controle: (verrou: boolean) => ReactNode, o: { large?: boolean; aide?: string } = {}) => {
    const source = origineChamp(projet, cle) === "source";
    const surcharge = projet.synchro?.surcharges?.[cle];
    const verrou = source && !(cle in corrections);
    return (
      <Champ key={cle} libelle={libelleChamp(cle)} className={o.large ? "sm:col-span-2" : undefined} origine={source ? "source" : undefined}
        obligatoire={manquants.includes(cle) || type?.champsObligatoires["*"]?.includes(cle)}
        aide={surcharge ? `Corrigé localement (${surcharge.motif}). Valeur de la source : ${String(surcharge.valeurSource ?? "—")}` : o.aide}>
        <div className="flex items-start gap-1.5">
          <div className="min-w-0 flex-1">{controle(verrou)}</div>
          {verrou && <Bouton taille="sm" variante="fantome" onClick={() => corriger(cle)}>Corriger</Bouton>}
          {surcharge && <Bouton taille="sm" variante="fantome" title="Revenir à la valeur de la source" icone={<Undo2 size={13} />} onClick={() => { leverSurcharge(depot, projet.id, cle); onFermer(); }} />}
        </div>
      </Champ>
    );
  };

  const texte = (cle: keyof Projet, o: { large?: boolean; type?: string; aide?: string } = {}) =>
    champ(cle, (verrou) => <Saisie type={o.type ?? "text"} disabled={verrou} value={String(p[cle] ?? "")} onChange={(e) => maj({ [cle]: e.target.value } as Partial<Projet>)} />, o);
  const liste = (cle: keyof Projet, options: { id: string; nom: string }[], o: { vide?: boolean } = { vide: true }) =>
    champ(cle, (verrou) => (
      <Liste disabled={verrou} value={String(p[cle] ?? "")} onChange={(e) => maj({ [cle]: e.target.value || undefined } as Partial<Projet>)}>
        {o.vide !== false && <option value="">—</option>}
        {options.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
      </Liste>
    ));

  const enregistrer = () => {
    depot.grouper(`Modification de la fiche : ${projet.code}`, () => {
      const reste: Record<string, unknown> = { ...p };
      for (const [cle, motif] of Object.entries(corrections)) {
        if (reste[cle] !== (projet as unknown as Record<string, unknown>)[cle]) surcharger(depot, projet.id, cle, reste[cle], motif);
        delete reste[cle];
      }
      delete reste.synchro;
      modifier("projets", projet.id, reste as Partial<Projet>);
    });
    onFermer();
  };

  const administrateur = !!utilisateur && accesDe(utilisateur).profil === "Administrateur";
  const supprimer = async () => {
    const sous = projets.filter((x) => x.parentId === projet.id).length;
    const r = await confirmer({
      titre: `Supprimer le projet ${projet.code}`,
      message: `Le projet « ${projet.nom} »${sous ? `, ses ${sous} sous-projet(s)` : ""} et toutes leurs données (budget, contrats, factures, planning, risques, documents…) seront supprimés. L'opération est inscrite au journal ; téléchargez d'abord une sauvegarde si vous voulez pouvoir y revenir plus tard.`,
      action: "Supprimer le projet", danger: true, motif: true,
    });
    if (!r) return;
    try {
      const n = supprimerProjet(depot, projet.id, r.motif);
      notifier(`Projet ${projet.code} supprimé (${n} enregistrements).`, "succes");
      onFermer();
      navigate("/portefeuille");
    } catch (e) {
      notifier(e instanceof Error ? e.message : "Suppression impossible.", "erreur");
    }
  };

  const personnesTriees = [...personnes].sort((a, b) => a.nom.localeCompare(b.nom, "fr")).map((x) => ({ id: x.id, nom: x.nom }));
  const section = (titre: string, enfants: ReactNode) => (
    <fieldset className="mb-6">
      <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{titre}</legend>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{enfants}</div>
    </fieldset>
  );

  return (
    <Panneau ouverte large onFermer={onFermer} titre={`Fiche du projet ${projet.code}`}
      pied={<>
        {administrateur && <Bouton libre variante="fantome" className="mr-auto text-rose-600" icone={<Trash2 size={14} />} onClick={supprimer}>Supprimer le projet</Bouton>}
        <Bouton libre onClick={onFermer}>Annuler</Bouton><Bouton variante="primaire" disabled={!p.code.trim() || !p.nom.trim()} onClick={enregistrer}>Enregistrer</Bouton>
      </>}>
      {section("Identification", <>
        {texte("code")}
        {liste("typeProjetId", typesProjet, { vide: false })}
        {texte("nom", { large: true })}
        {champ("description", (verrou) => <Zone rows={3} disabled={verrou} value={p.description} onChange={(e) => maj({ description: e.target.value })} />, { large: true })}
        {liste("statut", STATUTS.map((s) => ({ id: s, nom: s })), { vide: false })}
        {liste("priorite", ["Basse", "Normale", "Haute", "Critique"].map((s) => ({ id: s, nom: s })), { vide: false })}
        {liste("classification", (config?.classifications ?? []).map((s) => ({ id: s, nom: s })))}
        {liste("confidentialite", CONFIDENTIALITES.map((s) => ({ id: s, nom: s })), { vide: false })}
        <Case libelle="Projet stratégique (vue PMO)" checked={!!p.strategique} onChange={(e) => maj({ strategique: e.target.checked })} />
        <Case libelle="Suivi par le conseil d'administration" checked={!!p.suiviCA} onChange={(e) => maj({ suiviCA: e.target.checked })} />
      </>)}
      {section("Organisation", <>
        {liste("directionId", directions.map((d) => ({ id: d.id, nom: `${d.code} – ${d.nom}` })))}
        {liste("directeurId", personnesTriees)}
        {liste("sponsorId", personnesTriees)}
        {liste("portefeuilleId", portefeuilles)}
        {liste("programmeId", programmes)}
        {liste("parentId", projets.filter((x) => x.id !== projet.id && x.parentId !== projet.id && !x.archive).map((x) => ({ id: x.id, nom: `${x.code} · ${x.nom}` })))}
      </>)}
      {section("Calendrier et phase", <>
        {texte("dateDebut", { type: "date" })}
        {texte("dateFin", { type: "date" })}
        {liste("phaseGroupe", (type?.phases ?? []).map((s) => ({ id: s, nom: s })))}
        {construction && champ("phase", () => <Liste value={p.phase} onChange={(e) => maj({ phase: e.target.value as PhaseSIA })}>{PHASES.map((x) => <option key={x}>{x}</option>)}</Liste>)}
        {texte("compteAnalytique")}
      </>)}
      {construction && section("Ouvrage", <>
        {texte("maitreOuvrage")}
        {texte("lieu")}
        {champ("tauxTVA", () => <Saisie type="number" step="0.1" value={p.tauxTVA} onChange={(e) => maj({ tauxTVA: Number(e.target.value) })} />)}
        {champ("couleur", () => <input type="color" value={p.couleur} onChange={(e) => maj({ couleur: e.target.value })} className="h-9 w-full cursor-pointer rounded-lg ring-1 ring-slate-200 dark:ring-slate-700" />)}
      </>)}
      {type && type.champs.length > 0 && section(`Propre au type « ${type.nom} »`, type.champs.map((c) => (
        <Champ key={c.cle} libelle={c.libelle}>
          {c.type === "liste"
            ? <Liste value={p.donneesType?.[c.cle] ?? ""} onChange={(e) => maj({ donneesType: { ...p.donneesType, [c.cle]: e.target.value } })}><option value="">—</option>{c.options?.map((o) => <option key={o}>{o}</option>)}</Liste>
            : <Saisie type={c.type === "date" ? "date" : c.type === "nombre" ? "number" : "text"} value={p.donneesType?.[c.cle] ?? ""} onChange={(e) => maj({ donneesType: { ...p.donneesType, [c.cle]: e.target.value } })} />}
        </Champ>
      )))}
    </Panneau>
  );
}
