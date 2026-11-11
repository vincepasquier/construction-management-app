// Petits composants d'affichage propres au métier : santé, fraîcheur, montants.
import { RefreshCw } from "lucide-react";
import { formatCHF, formatCompact } from "../../domaine/lib/format";
import { LIBELLE_SANTE, type Sante } from "../../domaine/socle/synthese";
import type { PrioriteProjet } from "../../domaine/types";
import { Badge, cx, type CouleurBadge } from ".";

const COULEUR_SANTE: Record<Sante, CouleurBadge> = { bon: "vert", alerte: "orange", mauvais: "rouge" };

export function BadgeSante({ sante }: { sante: Sante }) {
  return <Badge couleur={COULEUR_SANTE[sante]}><span className="size-1.5 rounded-full bg-current" />{LIBELLE_SANTE[sante]}</Badge>;
}

const COULEUR_PRIORITE: Record<PrioriteProjet, CouleurBadge> = { Basse: "gris", Normale: "gris", Haute: "orange", Critique: "rouge" };
export const BadgePriorite = ({ priorite }: { priorite?: PrioriteProjet }) => (priorite ? <Badge couleur={COULEUR_PRIORITE[priorite]}>{priorite}</Badge> : null);

/** Ancienneté d'une donnée synchronisée, en clair */
export function anciennete(iso: string | undefined, maintenant = Date.now()): string {
  if (!iso) return "jamais";
  const minutes = Math.max(0, Math.round((maintenant - new Date(iso).getTime()) / 60_000));
  if (minutes < 2) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.round(minutes / 60);
  if (heures < 36) return `il y a ${heures} h`;
  return `il y a ${Math.round(heures / 24)} j`;
}

/** État de fraîcheur d'une donnée venue d'un système source */
export function Fraicheur({ date, systeme }: { date?: string; systeme?: string }) {
  const ancien = date ? Date.now() - new Date(date).getTime() > 7 * 86_400_000 : true;
  return (
    <span className={cx("inline-flex items-center gap-1 text-xs", ancien ? "text-amber-600" : "text-slate-500")} title={date ? new Date(date).toLocaleString("fr-CH") : undefined}>
      <RefreshCw size={11} /> {systeme ? `${systeme} · ` : ""}synchronisé {anciennete(date)}
    </span>
  );
}

export function Montant({ v, compact, signe }: { v: number; compact?: boolean; signe?: boolean }) {
  const texte = compact ? formatCompact(v) : formatCHF(v).replace("CHF", "").trim();
  return <span className={cx("num", signe && (v < -0.5 ? "text-rose-600" : v > 0.5 ? "text-emerald-600" : ""))}>{signe && v > 0.5 ? "+" : ""}{texte}</span>;
}
