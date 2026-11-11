// Système de design de PRISM. Les composants repris de Chantier+ gardent leur nom et leurs
// propriétés ; la fenêtre modale est devenue un panneau latéral.
import { clsx } from "clsx";
import { AlertTriangle, Calculator, CheckCircle2, CloudDownload, Info, PencilLine, X } from "lucide-react";
import {
  createContext, useContext, useEffect, useRef, useState,
  type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes, type Ref } from "react";
import { fermerAvis, ui } from "../etatUI";

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
      type="button"
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
          <div className="min-w-0">
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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 pas-impression">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{titre}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Indicateur({ libelle, valeur, detail, tendance, icone, origine }: { libelle: string; valeur: ReactNode; detail?: ReactNode; tendance?: "bon" | "alerte" | "mauvais"; icone?: ReactNode; origine?: OrigineChamp }) {
  return (
    <Carte className="p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{libelle}</p>
        {origine ? <PastilleOrigine origine={origine} /> : icone && <span className="text-slate-400">{icone}</span>}
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
  violet: "bg-brand-50 text-brand-700 dark:bg-sky-950 dark:text-sky-300",
};
export type CouleurBadge = keyof typeof couleursBadge;

export function Badge({ couleur = "gris", children, titre }: { couleur?: CouleurBadge; children: ReactNode; titre?: string }) {
  return <span title={titre} className={clsx("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap", couleursBadge[couleur])}>{children}</span>;
}

const COULEURS_STATUT: Record<string, CouleurBadge> = {
  "Préparation": "gris", "Publié": "bleu", "Ouverture des offres": "bleu", "Évaluation": "orange", "Adjugé": "vert", "Annulé": "rouge",
  "En préparation": "gris", "Signé": "vert", "En cours": "violet", "Réceptionné": "vert", "Clôturé": "gris",
  "Demandé": "orange", "Approuvé": "vert", "Refusé": "rouge",
  "Reçue": "gris", "Contrôlée": "bleu", "Approuvée": "vert", "Payée": "vert", "Contestée": "rouge",
  "À corriger": "orange",
  "Ouvert": "orange", "En traitement": "violet", "Survenu": "rouge", "Clos": "gris",
  "À faire": "gris", "En attente": "orange", "Terminé": "vert",
  // Socle
  "Idée": "gris", "En pause": "orange", "Abandonné": "rouge",
  "Brouillon": "gris", "Soumis": "bleu", "Remplacé": "gris", "En revue": "bleu", "Validé": "vert",
  "Note de travail": "gris", "Reportée": "orange", "Refusée": "rouge",
  "À traiter": "orange", "Remplie": "vert", "Levée": "vert",
  "Planifiée": "gris", "Tenue": "bleu", "Diffusée": "vert",
  "Accordé": "vert", "Accordé avec réserves": "orange", "Reporté": "orange",
  // Chantier
  "Ouverte": "orange", "Levée annoncée": "bleu", "Saisi": "gris", "Contesté": "rouge", "Facturé": "vert",
  "Relevé": "gris", "Contradictoire": "vert", "Acceptée": "vert", "Acceptée avec réserves": "orange",
  "Réussie": "vert", "Partielle": "orange", "En erreur": "rouge", "Accordée": "vert",
};

export function BadgeStatut({ statut }: { statut: string }) {
  return <Badge couleur={COULEURS_STATUT[statut] ?? "gris"}>{statut}</Badge>;
}

export function Progression({ valeur, couleur, className }: { valeur: number; couleur?: string; className?: string }) {
  const v = Math.max(0, Math.min(100, valeur));
  return (
    <div className={clsx("h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800", className)}>
      <div className="h-full rounded-full transition-all" style={{ width: `${v}%`, background: couleur ?? (valeur > 100 ? "#e11d48" : "#2586cf") }} />
    </div>
  );
}

export function Avatar({ nom, taille = 28 }: { nom: string; taille?: number }) {
  const initiales = nom.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  let h = 0;
  for (const c of nom) h = (h * 31 + c.charCodeAt(0)) % 360;
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
      style={{ width: taille, height: taille, background: `hsl(${h} 55% 45%)` }} title={nom}>
      {initiales}
    </span>
  );
}

export function Vide({ icone, titre, texte, action }: { icone?: ReactNode; titre: string; texte?: string; action?: ReactNode }) {
  return (
    <div data-vide="" className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icone && <div className="mb-3 rounded-full bg-slate-100 p-3 text-slate-400 dark:bg-slate-800">{icone}</div>}
      <p className="font-medium text-slate-900 dark:text-white">{titre}</p>
      {texte && <p className="mt-1 max-w-sm text-sm text-slate-500">{texte}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Origine et fraîcheur des données
// ---------------------------------------------------------------------------

export type OrigineChamp = "source" | "calcul" | "saisie";

const ORIGINES: Record<OrigineChamp, { libelle: string; aide: string; icone: ReactNode; classe: string }> = {
  source: { libelle: "Source", aide: "Valeur reçue du système source ; elle se corrige dans ce système.", icone: <CloudDownload size={11} />, classe: "text-sky-700 bg-sky-50 dark:bg-sky-950 dark:text-sky-300" },
  calcul: { libelle: "Calcul", aide: "Valeur calculée par PRISM à partir des données du projet.", icone: <Calculator size={11} />, classe: "text-violet-700 bg-violet-50 dark:bg-violet-950 dark:text-violet-300" },
  saisie: { libelle: "Saisie", aide: "Valeur saisie dans PRISM.", icone: <PencilLine size={11} />, classe: "text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300" },
};

/** Indique d'où vient une donnée : système source, calcul ou saisie manuelle */
export function PastilleOrigine({ origine, detail }: { origine: OrigineChamp; detail?: string }) {
  const o = ORIGINES[origine];
  return (
    <span title={detail ? `${o.aide}\n${detail}` : o.aide} className={clsx("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide", o.classe)}>
      {o.icone}{o.libelle}
    </span>
  );
}

/** Bandeau signalant qu'une fonction est simulée dans cette version */
export function BandeauSimule({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-900 pas-impression">
      <Info size={14} className="mt-0.5 shrink-0" />
      <p>{children}</p>
    </div>
  );
}

export function Alerte({ type = "alerte", children }: { type?: "info" | "alerte" | "erreur"; children: ReactNode }) {
  const classes = {
    info: "bg-sky-50 text-sky-900 ring-sky-200 dark:bg-sky-950/50 dark:text-sky-200 dark:ring-sky-900",
    alerte: "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-900",
    erreur: "bg-rose-50 text-rose-900 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-200 dark:ring-rose-900",
  };
  return (
    <div className={clsx("flex items-start gap-2 rounded-lg px-3 py-2 text-sm ring-1", classes[type])}>
      {type === "info" ? <Info size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Formulaires
// ---------------------------------------------------------------------------

const champ = "w-full rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500 outline-none dark:bg-slate-900 dark:ring-slate-700";

export function Champ({ libelle, aide, children, className, obligatoire, origine }: { libelle: string; aide?: string; children: ReactNode; className?: string; obligatoire?: boolean; origine?: OrigineChamp }) {
  return (
    <label className={clsx("block", className)}>
      <span className="mb-1 flex items-center justify-between gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
        <span>{libelle}{obligatoire && <span className="text-rose-600" title="Obligatoire"> *</span>}</span>
        {origine && <PastilleOrigine origine={origine} />}
      </span>
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
export function Zone({ libre, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement> & Libre & { ref?: Ref<HTMLTextAreaElement> }) {
  const lecture = useLectureSeule();
  return <textarea {...p} disabled={p.disabled || (lecture && !libre)} className={clsx(champ, "disabled:opacity-70", p.className)} />;
}
export function Liste({ libre, ...p }: SelectHTMLAttributes<HTMLSelectElement> & Libre) {
  const lecture = useLectureSeule();
  return <select {...p} disabled={p.disabled || (lecture && !libre)} className={clsx(champ, "pr-8 disabled:opacity-70", p.className)} />;
}

export function Case({ libelle, libre, ...p }: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & Libre & { libelle: ReactNode }) {
  const lecture = useLectureSeule();
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
      <input type="checkbox" {...p} disabled={p.disabled || (lecture && !libre)} className="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
      <span>{libelle}</span>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Panneau latéral (remplace la fenêtre modale)
// ---------------------------------------------------------------------------

/**
 * Panneau d'édition qui glisse depuis la droite : la page reste visible derrière, et le pied
 * garde les actions à portée. Échap ou un clic à côté le ferme.
 */
export function Panneau({ ouverte, onFermer, titre, children, pied, large }: { ouverte: boolean; onFermer: () => void; titre: ReactNode; children: ReactNode; pied?: ReactNode; large?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ouverte) return;
    const onKey = (e: KeyboardEvent) => {
      // La confirmation, affichée par-dessus, a la priorité sur Échap
      if (e.key === "Escape" && !ui.lire().confirmation) onFermer();
    };
    window.addEventListener("keydown", onKey);
    // Le premier champ reçoit le curseur : on saisit sans prendre la souris
    const premier = ref.current?.querySelector<HTMLElement>("input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled])");
    premier?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [ouverte, onFermer]);
  if (!ouverte) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30 pas-impression" onMouseDown={onFermer}>
      <div ref={ref} role="dialog" aria-modal="true"
        className={clsx("glisser flex h-full w-full flex-col bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800", large ? "max-w-4xl" : "max-w-xl")}
        onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h2 className="min-w-0 truncate font-semibold text-slate-900 dark:text-white">{titre}</h2>
          <button type="button" onClick={onFermer} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800" aria-label="Fermer"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {pied && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3 dark:border-slate-800 dark:bg-slate-900">{pied}</div>}
      </div>
    </div>
  );
}

/** Ancien nom du panneau, conservé pour les écrans repris de Chantier+ */
export const Modale = Panneau;

// ---------------------------------------------------------------------------
// Confirmation et notifications
// ---------------------------------------------------------------------------

/** Dialogue de confirmation intégré à la page ; monté une fois par la coquille */
export function Confirmation() {
  const demande = ui.utiliser((s) => s.confirmation);
  const [motif, setMotif] = useState("");
  useEffect(() => { setMotif(""); }, [demande]);
  useEffect(() => {
    if (!demande) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && demande.repondre(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [demande]);
  if (!demande) return null;
  const pret = !demande.motif || motif.trim().length > 2;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 pas-impression" onMouseDown={() => demande.repondre(false)}>
      <form role="alertdialog" aria-modal="true" className="apparition w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); if (pret) demande.repondre({ motif: motif.trim() }); }}>
        <h2 className="font-semibold text-slate-900 dark:text-white">{demande.titre}</h2>
        <p className="mt-2 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{demande.message}</p>
        {demande.motif && (
          <Champ libelle="Motif" obligatoire aide="Conservé dans le journal des modifications." className="mt-4">
            <Saisie libre autoFocus value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Pourquoi cette opération ?" />
          </Champ>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Bouton libre onClick={() => demande.repondre(false)}>Annuler</Bouton>
          <Bouton libre type="submit" autoFocus={!demande.motif} variante={demande.danger ? "danger" : "primaire"} disabled={!pret}>{demande.libelleAction}</Bouton>
        </div>
      </form>
    </div>
  );
}

/** Notifications passagères, en bas à droite ; montées une fois par la coquille */
export function Avis() {
  const avis = ui.utiliser((s) => s.avis);
  if (!avis.length) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[70] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 pas-impression" role="status" aria-live="polite">
      {avis.map((a) => (
        <div key={a.id} className={clsx("apparition flex items-start gap-2 rounded-xl px-3.5 py-3 text-sm shadow-lg ring-1",
          a.type === "erreur" ? "bg-rose-600 text-white ring-rose-700" : "bg-slate-900 text-white ring-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:ring-slate-200")}>
          {a.type === "succes" && <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400" />}
          {a.type === "erreur" && <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
          <p className="min-w-0 flex-1">{a.message}</p>
          {a.action && (
            <button type="button" className="shrink-0 font-semibold underline underline-offset-2" onClick={() => { a.action!.faire(); fermerAvis(a.id); }}>{a.action.libelle}</button>
          )}
          <button type="button" aria-label="Fermer" className="shrink-0 opacity-70 hover:opacity-100" onClick={() => fermerAvis(a.id)}><X size={15} /></button>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tableau simple et onglets
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
    <div className="inline-flex max-w-full overflow-x-auto rounded-lg bg-slate-100 p-1 dark:bg-slate-800 pas-impression" role="tablist">
      {options.map((o) => (
        <button key={o.id} type="button" role="tab" aria-selected={valeur === o.id} onClick={() => onChange(o.id)}
          className={clsx("whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition", valeur === o.id ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>
          {o.libelle}
          {o.compte !== undefined && <span className="ml-1.5 text-xs text-slate-400">{o.compte}</span>}
        </button>
      ))}
    </div>
  );
}

/** Couple libellé / valeur d'une fiche */
export function Info2({ libelle, children, origine }: { libelle: string; children: ReactNode; origine?: OrigineChamp }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs text-slate-500">{libelle}{origine && <PastilleOrigine origine={origine} />}</dt>
      <dd className="mt-0.5 text-sm text-slate-900 dark:text-white">{children || <span className="text-slate-400">—</span>}</dd>
    </div>
  );
}
