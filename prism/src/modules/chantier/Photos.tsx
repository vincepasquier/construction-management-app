// Photographies d'un constat, d'une réserve ou d'une journée : vignettes, prise de vue directe sur
// téléphone, légendes, visionneuse plein écran. Les images sont réduites avant d'être rangées.
import { Camera, ChevronLeft, ChevronRight, ImagePlus, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { notifier } from "@/app/etatUI";
import { cx, useLectureSeule } from "@/app/ui";
import type { PhotoConstat } from "@/domaine/types-chantier";
import { useDepot } from "@/donnees/hooks";
import { ajouterPhoto } from "@/donnees/photos";

/** Adresse locale d'une photo du magasin ; libérée quand le composant disparaît */
export function usePhoto(fichierId: string | undefined): { url?: string; absente: boolean } {
  const depot = useDepot();
  const [etat, setEtat] = useState<{ url?: string; absente: boolean }>({ absente: false });
  useEffect(() => {
    if (!fichierId) { setEtat({ absente: false }); return; }
    let url: string | undefined, annule = false;
    void depot.lireFichier(fichierId).then((f) => {
      if (annule) return;
      // Une image restaurée sous une forme illisible est traitée comme absente plutôt que de faire échouer l'écran
      if (!f || !(f.donnees instanceof Blob)) { setEtat({ absente: true }); return; }
      url = URL.createObjectURL(f.donnees);
      setEtat({ url, absente: false });
    });
    return () => { annule = true; if (url) URL.revokeObjectURL(url); };
  }, [depot, fichierId]);
  return etat;
}

export function Vignette({ fichierId, legende, className, onClick }: { fichierId: string; legende?: string; className?: string; onClick?: () => void }) {
  const { url, absente } = usePhoto(fichierId);
  const contenu = url
    ? <img src={url} alt={legende || "Photographie"} className="h-full w-full object-cover" loading="lazy" />
    : <span className="flex h-full w-full items-center justify-center px-2 text-center text-[11px] text-slate-400">{absente ? "Photo absente de ce navigateur" : "…"}</span>;
  const classe = cx("block aspect-[4/3] overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700", className);
  return onClick ? <button type="button" onClick={onClick} className={cx(classe, "hover:ring-brand-400")} aria-label={legende ? `Agrandir : ${legende}` : "Agrandir la photographie"}>{contenu}</button> : <span className={classe}>{contenu}</span>;
}

function Visionneuse({ photos, index, onChange, onFermer }: { photos: PhotoConstat[]; index: number; onChange: (i: number) => void; onFermer: () => void }) {
  const p = photos[index];
  const { url } = usePhoto(p?.fichierId);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onFermer(); }
      if (e.key === "ArrowRight" && index < photos.length - 1) onChange(index + 1);
      if (e.key === "ArrowLeft" && index > 0) onChange(index - 1);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [index, photos.length, onChange, onFermer]);
  if (!p) return null;
  const fleche = "absolute top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2 text-white hover:bg-white/30 disabled:opacity-20";
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-950/95 pas-impression" role="dialog" aria-modal="true" aria-label="Photographie" onMouseDown={(e) => { e.stopPropagation(); onFermer(); }}>
      <div className="flex items-center justify-between px-4 py-3 text-sm text-white/80">
        <span>{index + 1} / {photos.length}</span>
        <button type="button" onClick={onFermer} aria-label="Fermer" className="rounded-md p-1.5 hover:bg-white/15"><X size={20} /></button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-3" onMouseDown={(e) => e.stopPropagation()}>
        {url && <img src={url} alt={p.legende || "Photographie"} className="max-h-full max-w-full rounded object-contain" />}
        <button type="button" className={cx(fleche, "left-3")} disabled={index === 0} onClick={() => onChange(index - 1)} aria-label="Photo précédente"><ChevronLeft size={22} /></button>
        <button type="button" className={cx(fleche, "right-3")} disabled={index === photos.length - 1} onClick={() => onChange(index + 1)} aria-label="Photo suivante"><ChevronRight size={22} /></button>
      </div>
      <p className="min-h-12 px-4 py-3 text-center text-sm text-white/90">{p.legende}</p>
    </div>
  );
}

/**
 * Galerie modifiable. `legendes` ajoute un champ de légende sous chaque photo (constats) ; sans
 * lui la galerie ne porte que des images (réserves, journal).
 */
export function Photos({ photos, onChange, projetId, legendes, vide = "Aucune photographie" }: { photos: PhotoConstat[]; onChange?: (photos: PhotoConstat[]) => void; projetId: string; legendes?: boolean; vide?: string }) {
  const depot = useDepot();
  const lecture = useLectureSeule() || !onChange;
  const [ouverte, setOuverte] = useState<number | null>(null);
  const [enCours, setEnCours] = useState(0);
  const galerie = useRef<HTMLInputElement>(null), appareil = useRef<HTMLInputElement>(null);

  const ajouter = async (fichiers: FileList | null) => {
    const liste = [...(fichiers ?? [])].filter((f) => f.type.startsWith("image/"));
    if (!liste.length || !onChange) return;
    setEnCours(liste.length);
    const nouvelles: PhotoConstat[] = [];
    try {
      for (const f of liste) { nouvelles.push({ fichierId: await ajouterPhoto(depot, f, projetId) }); setEnCours((n) => n - 1); }
    } catch (e) {
      // Le plus souvent : le quota du navigateur est atteint
      notifier(e instanceof DOMException && e.name === "QuotaExceededError" ? "L'espace de stockage du navigateur est plein : faites une sauvegarde puis libérez de la place." : "Une photographie n'a pas pu être enregistrée.", "erreur");
    } finally {
      setEnCours(0);
      if (nouvelles.length) onChange([...photos, ...nouvelles]);
    }
  };

  const bouton = "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-white px-3 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 sm:h-9 sm:flex-none dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700";
  return (
    <div>
      {photos.length === 0 && lecture && <p className="text-sm text-slate-400">{vide}</p>}
      {photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((p, i) => (
            <li key={p.fichierId} className="min-w-0">
              <div className="relative">
                <Vignette fichierId={p.fichierId} legende={p.legende} onClick={() => setOuverte(i)} className="w-full" />
                {!lecture && <button type="button" onClick={() => onChange!(photos.filter((x) => x.fichierId !== p.fichierId))} aria-label="Retirer la photographie" className="absolute right-1 top-1 rounded-md bg-slate-900/60 p-1 text-white hover:bg-rose-600"><Trash2 size={13} /></button>}
              </div>
              {legendes && (lecture
                ? p.legende && <p className="mt-1 truncate text-xs text-slate-500" title={p.legende}>{p.legende}</p>
                : <input value={p.legende ?? ""} onChange={(e) => onChange!(photos.map((x) => (x.fichierId === p.fichierId ? { ...x, legende: e.target.value || undefined } : x)))} placeholder="Légende" aria-label={`Légende de la photo ${i + 1}`}
                    className="mt-1 w-full rounded-md border-0 bg-slate-50 px-2 py-1 text-xs ring-1 ring-slate-200 focus:ring-2 focus:ring-brand-500 dark:bg-slate-800 dark:ring-slate-700" />)}
            </li>
          ))}
        </ul>
      )}
      {!lecture && (
        <div className={cx("flex gap-2", photos.length > 0 && "mt-3")}>
          <input ref={appareil} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { void ajouter(e.target.files); e.target.value = ""; }} />
          <input ref={galerie} type="file" accept="image/*" multiple hidden onChange={(e) => { void ajouter(e.target.files); e.target.value = ""; }} />
          <button type="button" className={cx(bouton, "sm:hidden")} onClick={() => appareil.current?.click()}><Camera size={16} /> Photographier</button>
          <button type="button" className={bouton} onClick={() => galerie.current?.click()} disabled={enCours > 0}><ImagePlus size={16} /> {enCours > 0 ? `Enregistrement… (${enCours})` : <><span className="sm:hidden">Galerie</span><span className="hidden sm:inline">Ajouter des photos</span></>}</button>
        </div>
      )}
      {ouverte !== null && <Visionneuse photos={photos} index={Math.min(ouverte, photos.length - 1)} onChange={setOuverte} onFermer={() => setOuverte(null)} />}
    </div>
  );
}

/** Passage entre la liste d'identifiants (réserves, journal) et la forme avec légende */
export const enPhotos = (ids: string[]): PhotoConstat[] => ids.map((fichierId) => ({ fichierId }));
export const enIds = (photos: PhotoConstat[]): string[] => photos.map((p) => p.fichierId);
