// Suivi de chantier d'un projet de construction : journal, séances et procès-verbaux, constats,
// réserves et réceptions, bons de régie, métrés. Pensé pour être utilisé sur place, au téléphone.
import { BookOpen, Camera, ClipboardCheck, HardDrive } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { confirmer, notifier } from "@/app/etatUI";
import { Bouton, EnTetePage, Onglets, useLectureSeule } from "@/app/ui";
import { bilanRegies, bilanReserves } from "@/domaine/lib/chantier";
import { aujourdhui } from "@/domaine/lib/format";
import { useDepot, useProjet } from "@/donnees/hooks";
import { espacePhotos, partQuota, purgerPhotosOrphelines, type EspacePhotos } from "@/donnees/photos";
import { Seances } from "@/modules/seances/Seances";
import { formatTaille } from "@/outils/photo";
import { Constats } from "./Constats";
import { Journal } from "./Journal";
import { Metres } from "./Metres";
import { Regies } from "./Regies";
import { Reserves } from "./Reserves";

const ONGLETS = ["journal", "seances", "constats", "reserves", "regies", "metres"] as const;
type Onglet = (typeof ONGLETS)[number];

export function Chantier() {
  const d = useProjet();
  const lecture = useLectureSeule();
  const [params, setParams] = useSearchParams();
  const demande = params.get("onglet");
  const onglet: Onglet = ONGLETS.includes(demande as Onglet) ? (demande as Onglet) : "journal";
  // Saisie rapide : l'onglet s'ouvre directement sur une fiche vide
  const [rapide, setRapide] = useState<"constat" | "reserve" | null>(null);
  if (!d.projet) return null;
  const aller = (o: Onglet) => setParams(o === "journal" ? {} : { onglet: o }, { replace: true });
  const reserves = bilanReserves(d.reserves, aujourdhui()), regies = bilanRegies(d.regies);
  const tuile = "flex h-16 flex-1 flex-col items-center justify-center gap-1 rounded-xl bg-white text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 active:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700";

  return (
    <>
      <EnTetePage titre="Suivi de chantier" description="Journal, procès-verbaux, constats, réserves, régies et métrés" />
      {!lecture && (
        <div className="mb-4 flex gap-2 sm:hidden pas-impression">
          <button type="button" className={tuile} onClick={() => { setRapide("constat"); aller("constats"); }}><Camera size={20} className="text-brand-600" />Constat</button>
          <button type="button" className={tuile} onClick={() => { setRapide("reserve"); aller("reserves"); }}><ClipboardCheck size={20} className="text-brand-600" />Réserve</button>
          <button type="button" className={tuile} onClick={() => aller("journal")}><BookOpen size={20} className="text-brand-600" />Journal</button>
        </div>
      )}
      <div className="mb-5 pas-impression"><Onglets valeur={onglet} onChange={aller} options={[
        { id: "journal", libelle: "Journal", compte: d.journalChantier.length || undefined },
        { id: "seances", libelle: "Séances et PV", compte: d.seances.filter((s) => s.type === "Chantier").length || undefined },
        { id: "constats", libelle: "Constats", compte: d.constats.length || undefined },
        { id: "reserves", libelle: "Réserves et réceptions", compte: reserves.ouvertes || undefined },
        { id: "regies", libelle: "Régies", compte: regies.aValider || undefined },
        { id: "metres", libelle: "Métrés" },
      ]} /></div>
      {onglet === "journal" && <Journal />}
      {onglet === "seances" && <Seances type="Chantier" projetId={d.projet.id} libelle="Séances de chantier" />}
      {onglet === "constats" && <><Constats creer={rapide === "constat"} onCree={() => setRapide(null)} /><Stockage projetId={d.projet.id} /></>}
      {onglet === "reserves" && <Reserves creer={rapide === "reserve"} onCree={() => setRapide(null)} />}
      {onglet === "regies" && <Regies />}
      {onglet === "metres" && <Metres />}
    </>
  );
}

/** Place prise par les photographies dans le navigateur, et ménage des photos que plus rien ne cite */
function Stockage({ projetId }: { projetId: string }) {
  const depot = useDepot();
  const lecture = useLectureSeule();
  const d = useProjet();
  const [e, setE] = useState<EspacePhotos | null>(null);
  // Recalculé quand le nombre de photos citées change
  const citees = d.constats.reduce((t, c) => t + c.photos.length, 0) + d.reserves.reduce((t, r) => t + r.photos.length, 0) + d.journalChantier.reduce((t, j) => t + j.photos.length, 0);
  useEffect(() => { let actif = true; void espacePhotos(depot, projetId).then((x) => { if (actif) setE(x); }); return () => { actif = false; }; }, [depot, projetId, citees]);
  if (!e || e.nombre === 0) return null;
  const part = partQuota(e);
  const purger = async () => {
    if (!(await confirmer({ titre: `Supprimer ${e.orphelines.length} photographie(s) inutilisée(s)`, message: "Ces photos ne sont plus attachées à aucun constat, réserve ou journée — par exemple après une saisie abandonnée. Une suppression de constat ne pourra plus être annulée avec ses photos.", action: "Supprimer", danger: true }))) return;
    const n = await purgerPhotosOrphelines(depot, projetId);
    notifier(`${n} photographie(s) supprimée(s).`, "succes");
    setE(await espacePhotos(depot, projetId));
  };
  return (
    <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 pas-impression">
      <HardDrive size={13} />
      <span>{e.nombre} photographie(s) du projet · {formatTaille(e.octets)} dans ce navigateur</span>
      {part !== undefined && <span className={part > 0.8 ? "font-medium text-rose-600" : undefined}>· stockage du navigateur utilisé à {Math.max(1, Math.round(part * 100))} %{part > 0.8 && " : faites une sauvegarde"}</span>}
      {!lecture && e.orphelines.length > 0 && <Bouton taille="sm" variante="fantome" onClick={() => void purger()}>Supprimer {e.orphelines.length} photo(s) inutilisée(s)</Bouton>}
    </p>
  );
}
