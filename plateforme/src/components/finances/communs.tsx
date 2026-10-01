import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { EtapeCascade } from "../../lib/budget";
import { formatCHF, formatCompact } from "../../lib/format";
import { cx } from "../ui";

const entier = new Intl.NumberFormat("fr-CH", { maximumFractionDigits: 0 });
/** Montant de tableau : sans devise (les en-têtes indiquent CHF HT) */
export const formatMontant = (v: number) => entier.format(Math.round(v || 0));

export function Montant({ v, attenue, gras, signe }: { v: number; attenue?: boolean; gras?: boolean; signe?: boolean }) {
  const zero = Math.abs(v) < 0.5;
  return (
    <td className={cx("num whitespace-nowrap text-right", (attenue || zero) && "text-slate-400", gras && "font-semibold")}>
      {zero ? "—" : `${signe && v > 0 ? "+" : ""}${formatMontant(v)}`}
    </td>
  );
}

export function Ecart({ v, gras }: { v: number; gras?: boolean }) {
  return (
    <td className={cx("num whitespace-nowrap text-right", gras && "font-semibold", v < -0.5 ? "text-rose-600" : v > 0.5 ? "text-emerald-600" : "text-slate-400")}>
      {Math.abs(v) < 0.5 ? "—" : `${v > 0 ? "+" : ""}${formatMontant(v)}`}
    </td>
  );
}

/** Graphique en cascade : niveau de départ, variations, niveau d'arrivée */
export function Cascade({ etapes, hauteur = 260 }: { etapes: EtapeCascade[]; hauteur?: number }) {
  let cumul = 0;
  const data = etapes.map((e) => {
    if (e.type === "niveau") {
      cumul = e.valeur;
      return { nom: e.libelle, base: 0, valeur: e.valeur, reel: e.valeur, couleur: "#6366f1" };
    }
    const debut = cumul;
    cumul += e.valeur;
    return { nom: e.libelle, base: Math.min(debut, cumul), valeur: Math.abs(e.valeur), reel: e.valeur, couleur: e.valeur > 0 ? "#e11d48" : "#10b981" };
  });
  const min = Math.min(...data.map((x) => (x.base || x.valeur)));
  const max = Math.max(...data.map((x) => x.base + x.valeur));
  const marge = (max - min) * 0.15 || max * 0.05;
  const plancher = Math.max(0, min - marge);
  return (
    <div style={{ height: hauteur }}>
      <ResponsiveContainer>
        <BarChart data={data.map((x) => ({ ...x, base: x.base ? x.base - plancher : 0, valeur: x.base ? x.valeur : x.valeur - plancher }))} margin={{ top: 22, right: 12, left: 12, bottom: 4 }}>
          <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
          <XAxis dataKey="nom" fontSize={11} axisLine={false} tickLine={false} interval={0} />
          <YAxis fontSize={11} axisLine={false} tickLine={false} tickFormatter={(v) => formatCompact(Number(v) + plancher)} width={64} />
          <Tooltip cursor={{ fill: "rgba(99,102,241,.06)" }} formatter={(_, __, item) => [formatCHF((item.payload as { reel: number }).reel), ""]} separator="" />
          <Bar dataKey="base" stackId="a" fill="transparent" isAnimationActive={false} />
          <Bar dataKey="valeur" stackId="a" radius={[3, 3, 0, 0]} isAnimationActive={false}>
            {data.map((x, i) => <Cell key={i} fill={x.couleur} />)}
            <LabelList dataKey="reel" position="top" fontSize={11} formatter={(v) => {
              const n = Number(v);
              return Math.abs(n) < 0.5 ? "0" : formatCompact(n);
            }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export const joursDepuis = (iso?: string) => (iso ? Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000) : Infinity);
