const chf = new Intl.NumberFormat("fr-CH", { style: "currency", currency: "CHF", maximumFractionDigits: 0 });
const chf2 = new Intl.NumberFormat("fr-CH", { style: "currency", currency: "CHF", minimumFractionDigits: 2 });
const nombre = new Intl.NumberFormat("fr-CH", { maximumFractionDigits: 2 });
const dateFmt = new Intl.DateTimeFormat("fr-CH", { day: "2-digit", month: "2-digit", year: "numeric" });

export const formatCHF = (v: number) => chf.format(Math.round(v || 0));
export const formatCHFPrecis = (v: number) => chf2.format(v || 0);
export const formatNombre = (v: number) => nombre.format(v || 0);
export const formatPct = (v: number, decimales = 1) => `${(v || 0).toFixed(decimales)} %`;

/** Montant compact pour les tableaux de bord : 1,2 Mio / 350 k */
export function formatCompact(v: number): string {
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${(v / 1_000_000).toLocaleString("fr-CH", { maximumFractionDigits: 2 })} Mio`;
  if (a >= 10_000) return `${Math.round(v / 1000).toLocaleString("fr-CH")} k`;
  return formatNombre(v);
}

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : dateFmt.format(d);
}

export const aujourdhui = () => new Date().toISOString().slice(0, 10);

export function joursEntre(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

export function ajouterJours(iso: string, jours: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + jours);
  return d.toISOString().slice(0, 10);
}
