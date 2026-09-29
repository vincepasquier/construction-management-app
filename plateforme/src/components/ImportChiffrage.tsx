import { useRef, useState } from "react";
import { AlertTriangle, FileSpreadsheet, Sparkles, Upload } from "lucide-react";
import { useStore } from "../store/useStore";
import { appelIA } from "../lib/ia";
import { formatCHF } from "../lib/format";
import { nouvelId } from "../lib/id";
import { CFC_OPTIONS, libelleCFC } from "../data/cfc";
import type { BudgetLigne } from "../types";
import { Badge, Bouton, Champ, cx, Modale, Onglets, Tableau, Zone } from "./ui";

interface LigneIA {
  cfc: string;
  libelle: string;
  montant: number;
  confiance: "haute" | "moyenne" | "faible";
  origine: string;
}
interface ResultatIA {
  lignes: LigneIA[];
  totalDocument: number | null;
  baseMontants: "HT" | "TTC" | "inconnu";
  remarques: string[];
}

const TAILLE_MAX = 20 * 1024 * 1024;

/** Prépare le fichier pour l'IA : les tableurs sont convertis en texte, PDF et images envoyés tels quels */
async function preparer(f: File): Promise<{ texte?: string; fichier?: { nom: string; type: string; base64: string } }> {
  const nom = f.name.toLowerCase();
  if (nom.endsWith(".xlsx")) {
    const { default: lireExcel } = await import("read-excel-file/browser");
    const feuilles = await lireExcel(f);
    const texte = feuilles.map((s) => `## Feuille « ${s.sheet} »\n` + s.data
      .filter((ligne) => ligne.some((c) => c !== null && c !== ""))
      .map((ligne) => ligne.map((c) => (c instanceof Date ? c.toISOString().slice(0, 10) : c ?? "")).join(" ; "))
      .join("\n")).join("\n\n");
    return { texte };
  }
  if (nom.endsWith(".xls")) throw new Error("Ancien format Excel (.xls) : enregistrez le fichier au format .xlsx ou .csv.");
  if (nom.endsWith(".csv") || nom.endsWith(".txt") || f.type.startsWith("text/")) return { texte: await f.text() };
  if (f.type === "application/pdf" || f.type.startsWith("image/")) {
    if (f.size > TAILLE_MAX) throw new Error("Fichier trop volumineux (20 Mo maximum).");
    const base64 = await new Promise<string>((ok, ko) => {
      const r = new FileReader();
      r.onload = () => ok(String(r.result).split(",")[1] ?? "");
      r.onerror = () => ko(r.error);
      r.readAsDataURL(f);
    });
    return { fichier: { nom: f.name, type: f.type, base64 } };
  }
  throw new Error("Format non pris en charge. Utilisez Excel (.xlsx), CSV, texte, PDF ou une image.");
}

export function ImportChiffrage({ projetId, onFermer }: { projetId: string; onFermer: () => void }) {
  const { budget, ajouter, supprimer } = useStore();
  const fichierRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<"fichier" | "texte">("fichier");
  const [fichier, setFichier] = useState<File | null>(null);
  const [texte, setTexte] = useState("");
  const [consignes, setConsignes] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultat, setResultat] = useState<ResultatIA | null>(null);
  const [lignes, setLignes] = useState<(LigneIA & { garder: boolean })[]>([]);
  const [mode, setMode] = useState<"ajouter" | "remplacer">("ajouter");

  const budgetExistant = budget.filter((b) => b.projetId === projetId);

  const analyser = async () => {
    setErreur(null);
    setChargement(true);
    try {
      const contenu = source === "fichier" && fichier ? await preparer(fichier) : { texte };
      const r = await appelIA<ResultatIA>("chiffrage", { ...contenu, consignes });
      setResultat(r);
      setLignes(r.lignes.map((l) => ({ ...l, garder: l.montant !== 0 })));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setChargement(false);
    }
  };

  const retenues = lignes.filter((l) => l.garder);
  const total = retenues.reduce((s, l) => s + l.montant, 0);
  const ecartTotal = resultat?.totalDocument ? total - resultat.totalDocument : null;

  const importer = () => {
    if (mode === "remplacer") budgetExistant.forEach((b) => supprimer("budget", b.id));
    retenues.forEach((l) => ajouter("budget", {
      id: nouvelId("bud"), projetId, cfc: l.cfc, libelle: l.libelle, montant: Math.round(l.montant * 100) / 100,
      notes: `Import IA – ${l.origine}`,
    } satisfies BudgetLigne));
    onFermer();
  };

  const maj = (i: number, p: Partial<LigneIA & { garder: boolean }>) => setLignes(lignes.map((l, j) => (j === i ? { ...l, ...p } : l)));

  return (
    <Modale ouverte large onFermer={onFermer} titre="Importer un chiffrage avec l'IA"
      pied={resultat ? <>
        <Bouton libre className="mr-auto" onClick={() => { setResultat(null); setLignes([]); }}>Recommencer</Bouton>
        <Bouton libre onClick={onFermer}>Annuler</Bouton>
        <Bouton variante="primaire" disabled={retenues.length === 0 || retenues.some((l) => !l.cfc)} onClick={importer}>
          {mode === "remplacer" ? "Remplacer le budget" : "Ajouter au budget"} ({retenues.length} ligne{retenues.length > 1 ? "s" : ""})
        </Bouton>
      </> : <>
        <Bouton libre onClick={onFermer}>Annuler</Bouton>
        <Bouton variante="primaire" icone={<Sparkles size={15} />} disabled={chargement || (source === "fichier" ? !fichier : !texte.trim())} onClick={analyser}>
          {chargement ? "Analyse en cours…" : "Analyser"}
        </Bouton>
      </>}>
      {!resultat ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Déposez un chiffrage sous n'importe quelle forme — estimation Excel, devis PDF, offre scannée, photo d'une note — ou collez le texte.
            L'IA le convertit en lignes budgétaires CFC que vous vérifiez avant l'import.
          </p>
          <Onglets valeur={source} onChange={setSource} options={[{ id: "fichier", libelle: "Fichier" }, { id: "texte", libelle: "Texte collé" }]} />
          {source === "fichier" ? (
            <>
              <input ref={fichierRef} type="file" hidden accept=".xlsx,.xls,.csv,.txt,.pdf,image/*" onChange={(e) => setFichier(e.target.files?.[0] ?? null)} />
              <button onClick={() => fichierRef.current?.click()}
                onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); setFichier(e.dataTransfer.files[0] ?? null); }}
                className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-6 py-10 text-center transition hover:border-brand-400 hover:bg-brand-50/40 dark:border-slate-700 dark:hover:bg-slate-800">
                {fichier ? <FileSpreadsheet size={28} className="text-brand-600" /> : <Upload size={28} className="text-slate-400" />}
                <span className="font-medium text-slate-700 dark:text-slate-200">{fichier ? fichier.name : "Glissez un fichier ici ou cliquez pour choisir"}</span>
                <span className="text-xs text-slate-500">Excel (.xlsx), CSV, texte, PDF, image (JPG, PNG) · 20 Mo max.</span>
              </button>
            </>
          ) : (
            <Zone rows={10} value={texte} onChange={(e) => setTexte(e.target.value)} placeholder={"Collez ici le contenu du chiffrage, par exemple :\nTerrassements 2'400 m3 à 38.- = 91'200.-\nEnrobés AC 11 …"} />
          )}
          <Champ libelle="Consignes pour l'IA (facultatif)" aide="ex. « les montants sont TTC », « regrouper au niveau CFC à 2 chiffres », « ignorer les variantes »">
            <Zone rows={2} value={consignes} onChange={(e) => setConsignes(e.target.value)} />
          </Champ>
          {chargement && (
            <div className="flex items-center gap-3 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:bg-indigo-950 dark:text-indigo-200">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
              Lecture du document et attribution des codes CFC… (jusqu'à une minute pour un document volumineux)
            </div>
          )}
          {erreur && <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">{erreur}</p>}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Badge couleur={resultat.baseMontants === "TTC" ? "orange" : "gris"}>Document {resultat.baseMontants === "inconnu" ? "HT/TTC non précisé" : resultat.baseMontants}</Badge>
            <span>Total retenu : <strong className="num">{formatCHF(total)}</strong> HT</span>
            {resultat.totalDocument !== null && (
              <span className={cx(Math.abs(ecartTotal ?? 0) > 1 ? "text-amber-700" : "text-emerald-700")}>
                Total du document : {formatCHF(resultat.totalDocument)}{Math.abs(ecartTotal ?? 0) > 1 && ` (écart ${formatCHF(ecartTotal!)})`}
              </span>
            )}
          </div>
          {resultat.remarques.length > 0 && (
            <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
              <p className="mb-1 flex items-center gap-1.5 font-medium"><AlertTriangle size={14} /> Remarques de l'IA</p>
              <ul className="list-disc space-y-0.5 pl-5">{resultat.remarques.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </div>
          )}
          <div className="max-h-[42vh] overflow-y-auto rounded-lg ring-1 ring-slate-200 dark:ring-slate-700">
            <Tableau>
              <thead><tr><th /><th>CFC</th><th>Libellé</th><th className="!text-right">Montant HT</th><th>Confiance</th></tr></thead>
              <tbody>
                {lignes.map((l, i) => (
                  <tr key={i} className={cx(!l.garder && "opacity-40")}>
                    <td><input type="checkbox" checked={l.garder} onChange={(e) => maj(i, { garder: e.target.checked })} className="accent-brand-600" /></td>
                    <td>
                      <input list="cfc-import" value={l.cfc} onChange={(e) => maj(i, { cfc: e.target.value.trim() })}
                        className={cx("num w-16 rounded px-1.5 py-1 ring-1 dark:bg-slate-900", l.cfc ? "ring-slate-200 dark:ring-slate-700" : "ring-rose-400")} />
                      <p className="mt-0.5 max-w-36 truncate text-[11px] text-slate-400">{libelleCFC(l.cfc)}</p>
                    </td>
                    <td>
                      <input value={l.libelle} onChange={(e) => maj(i, { libelle: e.target.value })} className="w-full min-w-48 rounded px-1.5 py-1 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700" />
                      <p className="mt-0.5 max-w-md truncate text-[11px] text-slate-400" title={l.origine}>{l.origine}</p>
                    </td>
                    <td className="text-right">
                      <input type="number" value={l.montant} onChange={(e) => maj(i, { montant: Number(e.target.value) })} className="num w-32 rounded px-1.5 py-1 text-right ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700" />
                    </td>
                    <td><Badge couleur={l.confiance === "haute" ? "vert" : l.confiance === "moyenne" ? "orange" : "rouge"}>{l.confiance}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
            <datalist id="cfc-import">{CFC_OPTIONS.map((o) => <option key={o.code} value={o.code}>{o.libelle}</option>)}</datalist>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="radio" checked={mode === "ajouter"} onChange={() => setMode("ajouter")} className="accent-brand-600" /> Ajouter au budget existant</label>
            <label className="flex items-center gap-2"><input type="radio" checked={mode === "remplacer"} onChange={() => setMode("remplacer")} className="accent-brand-600" />
              Remplacer le budget actuel {budgetExistant.length > 0 && <span className="text-slate-500">({budgetExistant.length} ligne(s) supprimée(s))</span>}</label>
          </div>
        </div>
      )}
    </Modale>
  );
}
