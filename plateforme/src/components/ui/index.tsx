import { clsx } from "clsx";
import { X } from "lucide-react";
import { createContext, useContext, useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

export { clsx as cx };

/**
 * Mode lecture seule : fourni par la mise en page selon les droits de l'utilisateur sur le
 * module affiché. Les boutons d'action et les champs sont alors désactivés, sauf ceux marqués
 * `libre` (recherche, export, navigation…).
 */
export const LectureSeule = createContext(false);
export const useLectureSeule = () => useContext(LectureSeule);

// ---------------------------------------------------------------------------
// Boutons
// ---------------------------------------------------------------------------

type Variante = "primaire" | "secondaire" | "fantome" | "danger";

export function Bouton({
  variante = "secondaire", taille = "md", icone, className, children, libre, ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; taille?: "sm" | "md"; icone?: ReactNode; libre?: boolean }) {
  const lecture = useLectureSeule();
  return (
    <button
      {...props}
      disabled={props.disabled || (lecture && !libre)}
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap",
        taille === "sm" ? "h-8 px-2.5 text-xs" : "h-9 px-3.5 text-sm",
        variante === "primaire" && "bg-brand-600 text-white shadow-sm hover:bg-brand-700",
        variante === "secondaire" && "bg-white text-slate-700 ring-1 ring-slate-200 shadow-sm hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800",
        variante === "fantome" && "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
        variante === "danger" && "bg-rose-600 text-white hover:bg-rose-700",
        className,
      )}
    >
      {icone}
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Cartes & mise en page
// ---------------------------------------------------------------------------

export function Carte({ className, children, titre, action, sousTitre }: { className?: string; children: ReactNode; titre?: ReactNode; sousTitre?: ReactNode; action?: ReactNode }) {
  return (
    <section className={clsx("rounded-xl bg-white ring-1 ring-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,.04)] dark:bg-slate-900 dark:ring-slate-800", className)}>
      {(titre || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{titre}</h3>
            {sousTitre && <p className="text-xs text-slate-500 mt-0.5">{sousTitre}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function EnTetePage({ titre, description, actions }: { titre: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{titre}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Indicateur({ libelle, valeur, detail, tendance, icone }: { libelle: string; valeur: ReactNode; detail?: ReactNode; tendance?: "bon" | "alerte" | "mauvais"; icone?: ReactNode }) {
  return (
    <Carte className="p-4">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{libelle}</p>
        {icone && <span className="text-slate-400">{icone}</span>}
      </div>
      <p className="mt-2 text-xl leading-tight font-semibold num text-slate-900 2xl:text-2xl dark:text-white" title={typeof valeur === "string" ? valeur : undefined}>{valeur}</p>
      {detail && (
        <p className={clsx("mt-1 text-xs num",
          tendance === "bon" && "text-emerald-600",
          tendance === "alerte" && "text-amber-600",
          tendance === "mauvais" && "text-rose-600",
          !tendance && "text-slate-500")}>
          {detail}
        </p>
      )}
    </Carte>
  );
}

// ---------------------------------------------------------------------------
// Badges & progression
// ---------------------------------------------------------------------------

const couleursBadge = {
  gris: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  bleu: "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-950 dark:text-sky-300",
  vert: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  orange: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  rouge: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  violet: "bg-brand-50 text-brand-700 dark:bg-indigo-950 dark:text-indigo-300",
};
export type CouleurBadge = keyof typeof couleursBadge;

export function Badge({ couleur = "gris", children }: { couleur?: CouleurBadge; children: ReactNode }) {
  return <span className={clsx("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap", couleursBadge[couleur])}>{children}</span>;
}

const COULEURS_STATUT: Record<string, CouleurBadge> = {
  "Préparation": "gris", "Publié": "bleu", "Ouverture des offres": "bleu", "Évaluation": "orange", "Adjugé": "vert", "Annulé": "rouge",
  "En préparation": "gris", "Signé": "bleu", "En cours": "violet", "Réceptionné": "vert", "Clôturé": "gris",
  "Demandé": "orange", "Approuvé": "vert", "Refusé": "rouge",
  "Reçue": "gris", "Contrôlée": "bleu", "Approuvée": "violet", "Payée": "vert", "Contestée": "rouge",
  "À corriger": "orange",
  "Ouvert": "orange", "En traitement": "violet", "Survenu": "rouge", "Clos": "gris",
  "À faire": "gris", "En attente": "orange", "Terminé": "vert",
};

export function BadgeStatut({ statut }: { statut: string }) {
  return <Badge couleur={COULEURS_STATUT[statut] ?? "gris"}>{statut}</Badge>;
}

export function Progression({ valeur, couleur, className }: { valeur: number; couleur?: string; className?: string }) {
  const v = Math.max(0, Math.min(100, valeur));
  return (
    <div className={clsx("h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800", className)}>
      <div className="h-full rounded-full transition-all" style={{ width: `${v}%`, background: couleur ?? (valeur > 100 ? "#e11d48" : "#6366f1") }} />
    </div>
  );
}

export function Avatar({ nom, taille = 28 }: { nom: string; taille?: number }) {
  const initiales = nom.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  let h = 0;
  for (const c of nom) h = (h * 31 + c.charCodeAt(0)) % 360;
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
      style={{ width: taille, height: taille, background: `hsl(${h} 55% 50%)` }} title={nom}>
      {initiales}
    </span>
  );
}

export function Vide({ icone, titre, texte, action }: { icone?: ReactNode; titre: string; texte?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icone && <div className="mb-3 rounded-full bg-slate-100 p-3 text-slate-400 dark:bg-slate-800">{icone}</div>}
      <p className="font-medium text-slate-900 dark:text-white">{titre}</p>
      {texte && <p className="mt-1 max-w-sm text-sm text-slate-500">{texte}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Formulaires
// ---------------------------------------------------------------------------

const champ = "w-full rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500 outline-none dark:bg-slate-900 dark:ring-slate-700";

export function Champ({ libelle, aide, children, className }: { libelle: string; aide?: string; children: ReactNode; className?: string }) {
  return (
    <label className={clsx("block", className)}>
      <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{libelle}</span>
      {children}
      {aide && <span className="mt-1 block text-xs text-slate-400">{aide}</span>}
    </label>
  );
}

type Libre = { libre?: boolean };
export function Saisie({ libre, ...p }: InputHTMLAttributes<HTMLInputElement> & Libre) {
  const lecture = useLectureSeule();
  return <input {...p} disabled={p.disabled || (lecture && !libre)} className={clsx(champ, "disabled:opacity-70", p.className)} />;
}
export function Zone({ libre, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement> & Libre) {
  const lecture = useLectureSeule();
  return <textarea {...p} disabled={p.disabled || (lecture && !libre)} className={clsx(champ, "disabled:opacity-70", p.className)} />;
}
export function Liste({ libre, ...p }: SelectHTMLAttributes<HTMLSelectElement> & Libre) {
  const lecture = useLectureSeule();
  return <select {...p} disabled={p.disabled || (lecture && !libre)} className={clsx(champ, "pr-8 disabled:opacity-70", p.className)} />;
}

// ---------------------------------------------------------------------------
// Fenêtre modale / panneau latéral
// ---------------------------------------------------------------------------

export function Modale({ ouverte, onFermer, titre, children, pied, large }: { ouverte: boolean; onFermer: () => void; titre: string; children: ReactNode; pied?: ReactNode; large?: boolean }) {
  useEffect(() => {
    if (!ouverte) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onFermer();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ouverte, onFermer]);
  if (!ouverte) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-[8vh] backdrop-blur-[2px]" onMouseDown={onFermer}>
      <div className={clsx("apparition w-full rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800", large ? "max-w-4xl" : "max-w-xl")} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h2 className="font-semibold text-slate-900 dark:text-white">{titre}</h2>
          <button onClick={onFermer} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800" aria-label="Fermer"><X size={18} /></button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {pied && <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3 dark:border-slate-800">{pied}</div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tableau
// ---------------------------------------------------------------------------

export function Tableau({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx("overflow-x-auto", className)}>
      <table className="w-full text-sm [&_th]:whitespace-nowrap [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-left [&_th]:text-xs [&_th]:font-medium [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-slate-500 [&_td]:px-4 [&_td]:py-2.5 [&_thead]:bg-slate-50/70 dark:[&_thead]:bg-slate-800/40 [&_tbody_tr]:border-t [&_tbody_tr]:border-slate-100 dark:[&_tbody_tr]:border-slate-800 [&_tbody_tr:hover]:bg-slate-50/60 dark:[&_tbody_tr:hover]:bg-slate-800/30">
        {children}
      </table>
    </div>
  );
}

export function Onglets<T extends string>({ valeur, onChange, options }: { valeur: T; onChange: (v: T) => void; options: { id: T; libelle: string; compte?: number }[] }) {
  return (
    <div className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
      {options.map((o) => (
        <button key={o.id} onClick={() => onChange(o.id)}
          className={clsx("rounded-md px-3 py-1.5 text-sm font-medium transition", valeur === o.id ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>
          {o.libelle}
          {o.compte !== undefined && <span className="ml-1.5 text-xs text-slate-400">{o.compte}</span>}
        </button>
      ))}
    </div>
  );
}
