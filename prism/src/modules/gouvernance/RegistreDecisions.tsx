// Registre des décisions : ce qui a été décidé, par qui, pour quel montant, et à quelles conditions.
// Les notes de travail et les décisions à diffusion restreinte ne s'affichent que pour les profils habilités.
import { Lock, Plus, Scale } from "lucide-react";
import { useState } from "react";
import { PanneauFiche, type ChampSchema } from "@/app/formulaire/Formulaire";
import { useSuppression } from "@/app/suppression";
import { TableDonnees, type Colonne } from "@/app/table/TableDonnees";
import { Badge, Bouton, Carte, useLectureSeule, Vide, type CouleurBadge } from "@/app/ui";
import { aujourdhui } from "@/domaine/lib/format";
import { nouvelId } from "@/domaine/lib/id";
import { decisionVisible, projetsAccessibles } from "@/domaine/socle/droits";
import type { Decision, OrganeDecision } from "@/domaine/socle/types";
import { useActions, useDonnees, useUtilisateur } from "@/donnees/hooks";
import { SaisieConditions } from "./Conditions";

const ORGANES: OrganeDecision[] = ["ComInv", "Comité de pilotage", "Direction générale", "Conseil d'administration", "Autre"];
const STATUTS: Decision["statut"][] = ["Approuvée", "Refusée", "Reportée", "Note de travail"];
const COULEUR: Record<Decision["statut"], CouleurBadge> = { "Approuvée": "vert", "Refusée": "rouge", "Reportée": "orange", "Note de travail": "gris" };

export function RegistreDecisions({ projetId }: { projetId?: string }) {
  const { decisions, projets, personnes, seances } = useDonnees();
  const { ajouter, modifier } = useActions();
  const supprimer = useSuppression();
  const utilisateur = useUtilisateur();
  const lecture = useLectureSeule();
  const [fiche, setFiche] = useState<Decision | null>(null);
  const visibles = new Set(projetsAccessibles(utilisateur, projets).map((p) => p.id));
  const liste = decisions.filter((d) => (projetId ? d.projetId === projetId : visibles.has(d.projetId)) && decisionVisible(utilisateur, d));
  const code = (id: string) => projets.find((p) => p.id === id)?.code ?? "";
  const existe = (d: Decision) => decisions.some((x) => x.id === d.id);
  const ouvertes = (d: Decision) => d.conditions.filter((c) => c.statut !== "Remplie" && c.statut !== "Levée").length;

  const colonnes: Colonne<Decision>[] = [
    { id: "date", titre: "Date", valeur: (d) => d.date, type: "date", largeur: "7rem" },
    ...(projetId ? [] : [{ id: "projet", titre: "Projet", valeur: (d: Decision) => code(d.projetId), groupable: true } satisfies Colonne<Decision>]),
    { id: "organe", titre: "Organe", valeur: (d) => d.organe, groupable: true },
    { id: "objet", titre: "Objet", valeur: (d) => d.objet, rendu: (d) => <span className="flex max-w-md items-center gap-1.5 truncate font-medium text-slate-900 dark:text-white" title={d.texte || d.objet}>{d.restreint && <Lock size={12} className="shrink-0 text-amber-500" aria-label="Diffusion restreinte" />}<span className="truncate">{d.objet}</span></span> },
    { id: "montant", titre: "Montant", valeur: (d) => d.montant ?? "", type: "montant", total: true },
    { id: "statut", titre: "Décision", valeur: (d) => d.statut, rendu: (d) => <Badge couleur={COULEUR[d.statut]}>{d.statut}</Badge>, groupable: true },
    { id: "conditions", titre: "Conditions ouvertes", valeur: (d) => ouvertes(d) || "", type: "nombre" },
    { id: "responsable", titre: "Responsable", valeur: (d) => personnes.find((p) => p.id === d.responsableId)?.nom ?? "", masquee: true },
    { id: "seance", titre: "Séance", valeur: (d) => seances.find((s) => s.id === d.seanceId)?.titre ?? "", masquee: true },
  ];

  const champs: ChampSchema<Decision>[] = [
    ...(projetId ? [] : [{ cle: "projetId", libelle: "Projet", type: "liste", obligatoire: true, large: true, options: projetsAccessibles(utilisateur, projets.filter((p) => !p.archive)).map((p) => ({ valeur: p.id, libelle: `${p.code} · ${p.nom}` })) } satisfies ChampSchema<Decision>]),
    { cle: "objet", libelle: "Objet", type: "texte", obligatoire: true, large: true },
    { cle: "organe", libelle: "Organe de décision", type: "liste", options: ORGANES, obligatoire: true },
    { cle: "date", libelle: "Date", type: "date", obligatoire: true },
    { cle: "statut", libelle: "Décision", type: "liste", options: STATUTS, obligatoire: true, aide: "Une note de travail n'engage pas : seule une décision approuvée fait foi" },
    { cle: "montant", libelle: "Montant CHF", type: "nombre" },
    { cle: "texte", libelle: "Texte de la décision", type: "zone", large: true },
    { cle: "responsableId", libelle: "Responsable du suivi", type: "personne" },
    { cle: "restreint", libelle: "Diffusion restreinte", type: "case" },
  ];
  const nouvelle = (): Decision => ({ id: nouvelId("dec"), projetId: projetId ?? "", organe: projetId ? "Comité de pilotage" : "ComInv", date: aujourdhui(), objet: "", texte: "", statut: "Approuvée", conditions: [] });
  const bouton = !lecture && <Bouton variante="primaire" icone={<Plus size={15} />} onClick={() => setFiche(nouvelle())}>Décision</Bouton>;

  return (
    <>
      <Carte>
        <TableDonnees id={projetId ? "decisions-projet" : "decisions"} lignes={liste} colonnes={colonnes} cle={(d) => d.id} onOuvrir={setFiche} barre={bouton} triInitial={{ colonne: "date", sens: "desc" }}
          vide={<Vide icone={<Scale size={22} />} titre="Aucune décision au registre" texte="Les décisions prises en séance s'y inscrivent d'elles-mêmes ; une décision prise hors séance peut être saisie directement." action={bouton} />} />
      </Carte>
      {fiche && (
        <PanneauFiche titre={existe(fiche) ? "Décision" : "Nouvelle décision"} initial={fiche} champs={champs} onFermer={() => setFiche(null)}
          enfants={(v) => <div className="mt-4"><SaisieConditions valeur={v.conditions} onChange={(conditions) => setFiche({ ...v, conditions })} /></div>}
          onEnregistrer={(v) => {
            const propre = { ...v, conditions: v.conditions.filter((c) => c.texte.trim()), montant: v.montant || undefined };
            if (existe(v)) modifier("decisions", v.id, propre); else ajouter("decisions", propre);
            setFiche(null);
          }}
          onSupprimer={existe(fiche) && !lecture ? async () => { if (await supprimer("decisions", fiche.id, { quoi: "la décision" })) setFiche(null); } : undefined} />
      )}
    </>
  );
}
