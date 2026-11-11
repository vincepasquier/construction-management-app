// Métrés contradictoires : quantités relevées chaque mois par position du contrat. La situation
// du mois (antérieur, mois, cumul) sert à contrôler la facture de l'entreprise.
import { CheckCheck, Plus, Ruler } from "lucide-react";
import { useState } from "react";
import { notifier } from "@/app/etatUI";
import { PanneauFiche, type ChampSchema } from "@/app/formulaire/Formulaire";
import { useSuppression } from "@/app/suppression";
import { TableDonnees, type Colonne } from "@/app/table/TableDonnees";
import { Badge, Bouton, Carte, Champ, Indicateur, Liste, Saisie, useLectureSeule, Vide, type CouleurBadge } from "@/app/ui";
import { Montant } from "@/app/ui/metier";
import { avancementMetre, montantContrat, periodesMetrees, situation, type LigneSituation } from "@/domaine/lib/chantier";
import { aujourdhui, formatPct, moisDe, moisEnClair } from "@/domaine/lib/format";
import { nouvelId } from "@/domaine/lib/id";
import type { Metre } from "@/domaine/types-chantier";
import { useDonnees, useProjet } from "@/donnees/hooks";

const COULEUR: Record<Metre["statut"], CouleurBadge> = { "Relevé": "orange", Contradictoire: "vert", "Contesté": "rouge" };

export function Metres() {
  const d = useProjet();
  const { entreprises, ajouter, modifier, grouper } = useDonnees();
  const lecture = useLectureSeule();
  const supprimer = useSuppression();
  const contrats = d.contrats.filter((c) => c.type !== "Mandat");
  const [contratId, setContratId] = useState(() => contrats.find((c) => d.metres.some((m) => m.contratId === c.id))?.id ?? contrats[0]?.id ?? "");
  const [periode, setPeriode] = useState(() => periodesMetrees(d.metres, contratId)[0] ?? moisDe(aujourdhui()));
  const [fiche, setFiche] = useState<Metre | null>(null);
  if (!d.projet) return null;
  const projet = d.projet;
  const contrat = contrats.find((c) => c.id === contratId);
  if (!contrat) return <Carte><Vide icone={<Ruler size={22} />} titre="Aucun contrat d'entreprise" texte="Les métrés se relèvent par contrat : enregistrez d'abord le contrat de l'entreprise." /></Carte>;

  const s = situation(d.metres, contrat.id, periode);
  const periodes = periodesMetrees(d.metres, contrat.id);
  const duMois = d.metres.filter((m) => m.contratId === contrat.id && m.periode === periode);
  const aConfirmer = duMois.filter((m) => m.statut === "Relevé");
  const existe = (m: Metre) => d.metres.some((x) => x.id === m.id);
  // Positions du descriptif de l'appel d'offres, avec les prix de l'adjudicataire
  const ao = d.appelsOffres.find((a) => a.id === contrat.appelOffresId);
  const offre = ao?.soumissions.find((x) => x.entrepriseId === contrat.entrepriseId);
  const descriptif = (ao?.positions ?? []).map((p) => ({ numero: p.numero, libelle: p.libelle, unite: p.unite, prix: offre?.prixUnitaires[p.id] ?? 0, prevu: p.quantite }));

  const nouveau = (p: Partial<Metre> = {}): Metre => ({ id: nouvelId("met"), projetId: projet.id, contratId: contrat.id, position: "", libelle: "", unite: "", periode, quantite: 0, prixUnitaire: 0, statut: "Relevé", ...p });
  const ouvrir = (l: LigneSituation) => setFiche(l.metres[0] ?? nouveau({ position: l.position, libelle: l.libelle, unite: l.unite, prixUnitaire: l.prixUnitaire }));

  const colonnes: Colonne<LigneSituation>[] = [
    { id: "position", titre: "Position", valeur: (l) => l.position, largeur: "8rem", rendu: (l) => <span className="num font-medium">{l.position || "—"}</span> },
    { id: "libelle", titre: "Désignation", valeur: (l) => l.libelle },
    { id: "unite", titre: "Unité", valeur: (l) => l.unite, largeur: "4rem" },
    { id: "pu", titre: "Prix unit.", valeur: (l) => l.prixUnitaire, type: "nombre" },
    { id: "prevu", titre: "Prévu", valeur: (l) => descriptif.find((p) => p.numero === l.position)?.prevu ?? "", type: "nombre", masquee: descriptif.length === 0 },
    { id: "anterieur", titre: "Antérieur", valeur: (l) => l.anterieur, type: "nombre" },
    { id: "periode", titre: moisEnClair(periode), valeur: (l) => l.periode, type: "nombre", rendu: (l) => <span className="num font-semibold text-slate-900 dark:text-white">{l.periode ? l.periode.toLocaleString("fr-CH") : "—"}</span> },
    { id: "cumul", titre: "Cumul", valeur: (l) => l.cumul, type: "nombre" },
    { id: "mPeriode", titre: "Montant du mois", valeur: (l) => l.montantPeriode, type: "montant", total: true },
    { id: "mCumul", titre: "Montant cumulé", valeur: (l) => l.montantCumul, type: "montant", total: true },
    { id: "statut", titre: "État", valeur: (l) => l.metres[0]?.statut ?? "", rendu: (l) => (l.metres.length ? <span className="flex gap-1">{[...new Set(l.metres.map((m) => m.statut))].map((x) => <Badge key={x} couleur={COULEUR[x]}>{x}</Badge>)}</span> : <span className="text-slate-300">—</span>) },
  ];

  const champs: ChampSchema<Metre>[] = [
    ...(descriptif.length ? [{ cle: "position", libelle: "Position du descriptif", type: "liste", large: true, options: descriptif.map((p) => ({ valeur: p.numero, libelle: `${p.numero} · ${p.libelle}` })), aide: "Choisir une position reprend sa désignation, son unité et le prix de l'offre" } satisfies ChampSchema<Metre>] : [{ cle: "position", libelle: "Position", type: "texte", aide: "Numéro de la position du contrat" } satisfies ChampSchema<Metre>]),
    { cle: "libelle", libelle: "Désignation", type: "texte", obligatoire: descriptif.length === 0, large: true, aide: descriptif.length ? "Laissée vide : celle de la position choisie" : undefined },
    { cle: "quantite", libelle: `Quantité relevée en ${moisEnClair(periode)}`, type: "nombre", obligatoire: true },
    { cle: "unite", libelle: "Unité", type: "texte", obligatoire: descriptif.length === 0 },
    { cle: "prixUnitaire", libelle: "Prix unitaire (CHF HT)", type: "nombre" },
    { cle: "statut", libelle: "État", type: "liste", options: ["Relevé", "Contradictoire", "Contesté"], obligatoire: true, aide: "Contradictoire : reconnu par la direction des travaux et l'entreprise" },
    { cle: "remarque", libelle: "Remarque", type: "zone", large: true },
  ];

  const bouton = !lecture && <Bouton variante="primaire" icone={<Plus size={15} />} onClick={() => setFiche(nouveau())}>Relevé</Bouton>;
  const montant = montantContrat(contrat);

  return (
    <div className="space-y-5">
      <Carte className="p-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
          <Champ libelle="Contrat"><Liste libre value={contrat.id} onChange={(e) => { setContratId(e.target.value); setPeriode(periodesMetrees(d.metres, e.target.value)[0] ?? moisDe(aujourdhui())); }}>{contrats.map((c) => <option key={c.id} value={c.id}>{c.numero} · {entreprises.find((e) => e.id === c.entrepriseId)?.nom} · {c.objet}</option>)}</Liste></Champ>
          <Champ libelle="Mois du relevé" aide={periodes.length ? `Relevés existants : ${periodes.slice(0, 4).map(moisEnClair).join(", ")}${periodes.length > 4 ? "…" : ""}` : undefined}><Saisie libre type="month" value={periode} onChange={(e) => e.target.value && setPeriode(e.target.value)} /></Champ>
        </div>
      </Carte>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Indicateur libelle={`Situation de ${moisEnClair(periode)}`} valeur={<Montant v={s.montantPeriode} />} detail={s.conteste ? <span className="text-rose-600">+ <Montant v={s.conteste} /> contesté</span> : "CHF HT, hors relevés contestés"} origine="calcul" />
        <Indicateur libelle="Antérieur" valeur={<Montant v={s.montantAnterieur} />} detail="mois précédents" />
        <Indicateur libelle="Cumul" valeur={<Montant v={s.montantCumul} />} detail="antérieur + mois" />
        <Indicateur libelle="Part du contrat" valeur={formatPct(avancementMetre(s.montantCumul, contrat))} tendance={s.montantCumul > montant ? "mauvais" : undefined} detail={<>sur <Montant v={montant} /> avenants approuvés compris</>} />
      </div>
      <Carte>
        <TableDonnees id="metres" lignes={s.lignes} colonnes={colonnes} cle={(l) => l.position || l.libelle} onOuvrir={lecture ? undefined : ouvrir} grouperPar=""
          barre={<>
            {!lecture && aConfirmer.length > 0 && <Bouton icone={<CheckCheck size={15} />} title="Les relevés du mois sont reconnus par l'entreprise" onClick={() => grouper(`Métrés de ${moisEnClair(periode)} reconnus contradictoirement (${contrat.numero})`, () => { for (const m of aConfirmer) modifier("metres", m.id, { statut: "Contradictoire" }); })}>Reconnaître les {aConfirmer.length} relevé(s) du mois</Bouton>}
            {bouton}
          </>}
          vide={<Vide icone={<Ruler size={22} />} titre="Aucun relevé pour ce contrat" texte={descriptif.length ? "Relevez les quantités exécutées, position par position : le descriptif de l'appel d'offres et les prix de l'offre retenue sont proposés." : "Relevez les quantités exécutées, position par position. Les positions des mois précédents sont reproposées chaque mois."} action={bouton} />} />
      </Carte>
      {fiche && (
        <PanneauFiche titre={existe(fiche) ? `Relevé · ${moisEnClair(fiche.periode)}` : `Nouveau relevé · ${moisEnClair(periode)}`} initial={fiche} champs={champs} onFermer={() => setFiche(null)}
          onEnregistrer={(v) => {
            // Une position choisie dans le descriptif apporte sa désignation, son unité et son prix
            const p = descriptif.find((x) => x.numero === v.position);
            const propre: Metre = { ...v, position: v.position?.trim() ?? "", libelle: v.libelle.trim() || p?.libelle || "", unite: v.unite.trim() || p?.unite || "", prixUnitaire: v.prixUnitaire || p?.prix || 0, remarque: v.remarque?.trim() || undefined };
            if (!propre.libelle) { notifier("Indiquez la désignation ou choisissez une position du descriptif.", "erreur"); return; }
            if (existe(v)) modifier("metres", v.id, propre); else ajouter("metres", propre);
            setFiche(null);
          }}
          onSupprimer={existe(fiche) ? async () => { if (await supprimer("metres", fiche.id, { quoi: "ce relevé" })) setFiche(null); } : undefined} />
      )}
    </div>
  );
}
