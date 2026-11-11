// Import des factures depuis un export Power BI / ERP (colonnes du classeur de suivi :
// N° comd, N° fact, Montant validé HT, Date, Statut facture, Fournisseur, N° fact fourn).
import type { Contrat, Facture, FactureHorsCommande, ID } from "../types";

const txt = (v: unknown) => (v === null || v === undefined ? "" : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).trim());
const norm = (v: unknown) => txt(v).replace(/\s+/g, " ").toLowerCase();
const num = (v: unknown) => (typeof v === "number" ? v : Number(txt(v).replace(/['’\s]/g, "").replace(",", ".")) || 0);
const date = (v: unknown) => {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const t = txt(v);
  const m = t.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return /^\d{4}-\d{2}-\d{2}/.test(t) ? t.slice(0, 10) : "";
};
const estPaye = (s: string) => /^(r[ée]gl[ée]e?|pay[ée]e?|paid)$/i.test(s.trim());

export interface ResultatImportFactures {
  factures: Facture[];
  facturesHorsCommande: FactureHorsCommande[];
  /** Factures déjà présentes (même numéro) : statut de paiement mis à jour */
  majPaiement: { id: ID; type: "commande" | "hors"; paye: boolean }[];
  ignorees: number;
  resume: string;
}

export function importerFactures(
  feuilles: { sheet: string; data: unknown[][] }[],
  o: { projetId: ID; contrats: Contrat[]; factures: Facture[]; facturesHorsCommande: FactureHorsCommande[] },
): ResultatImportFactures {
  const factures: Facture[] = [];
  const hc: FactureHorsCommande[] = [];
  const maj: ResultatImportFactures["majPaiement"] = [];
  let ignorees = 0;
  let trouve = false;
  const existantes = new Map<string, { id: ID; type: "commande" | "hors" }>();
  for (const f of o.factures) existantes.set(f.numero.split(" ")[0], { id: f.id, type: "commande" });
  for (const f of o.facturesHorsCommande) existantes.set(f.numero, { id: f.id, type: "hors" });

  for (const { data } of feuilles) {
    const h = data.findIndex((r) => r.some((c) => norm(c).startsWith("n° fact")) && r.some((c) => norm(c).startsWith("montant")));
    if (h < 0) continue;
    trouve = true;
    const e = data[h].map(norm);
    const col = (...l: string[]) => e.findIndex((x) => l.some((y) => x.startsWith(y)));
    const c = {
      cmd: col("n° comd", "n° commande", "n° cmd"), fact: e.findIndex((x) => x === "n° fact" || x === "n° facture"),
      montant: col("montant validé", "montant ht", "montant"), date: col("date"), statut: col("statut facture", "statut"),
      four: col("fournisseur"), ff: col("n° fact fourn", "n° facture fourn"),
    };
    if (c.fact < 0) c.fact = col("n° fact");
    for (const r of data.slice(h + 1)) {
      const numero = txt(r[c.fact]);
      const montant = num(r[c.montant]);
      if (!numero || !montant) continue;
      const paye = estPaye(txt(r[c.statut]));
      const deja = existantes.get(numero);
      if (deja) { maj.push({ ...deja, paye }); ignorees++; continue; }
      existantes.set(numero, { id: numero, type: "hors" });
      const d = date(r[c.date]);
      const cmd = c.cmd >= 0 ? txt(r[c.cmd]) : "";
      const ctr = cmd ? o.contrats.find((k) => k.numero === cmd) : undefined;
      const ff = c.ff >= 0 ? txt(r[c.ff]) : "";
      if (ctr) {
        const ech = d ? new Date(d) : null;
        if (ech) ech.setDate(ech.getDate() + 30);
        factures.push({
          id: `fac-${crypto.randomUUID().slice(0, 8)}`, projetId: o.projetId, contratId: ctr.id, numero: [numero, ff && `(${ff})`].filter(Boolean).join(" "),
          type: montant < 0 ? "Régie" : "Situation", date: d, echeance: ech ? ech.toISOString().slice(0, 10) : "", montantHT: montant, statut: paye ? "Payée" : "Approuvée",
        });
      } else {
        hc.push({
          id: `fhc-${crypto.randomUUID().slice(0, 8)}`, projetId: o.projetId, numero, numeroFournisseur: ff || undefined, fournisseur: c.four >= 0 ? txt(r[c.four]) : "",
          date: d, montantHT: montant, paye, repartition: [], remarques: cmd ? `Commande ${cmd} introuvable` : undefined,
        });
      }
    }
  }
  if (!trouve) throw new Error("Aucune colonne « N° fact » et « Montant » trouvée : vérifiez qu'il s'agit bien de l'export des factures.");
  return {
    factures, facturesHorsCommande: hc, majPaiement: maj, ignorees,
    resume: `${factures.length} facture(s) sur commande, ${hc.length} hors commande à affecter, ${ignorees} déjà connue(s)`,
  };
}
