import { useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";
import { useProjetActif, useStore } from "../../store/useStore";
import { importerSuiviFinancier, moisDuFichier, type ResultatImport } from "../../lib/importSuiviFinancier";
import { lireTableau } from "../../lib/lectureCsv";
import { aujourdhui, formatCHF } from "../../lib/format";
import type { Projet } from "../../types";
import { Bouton, Champ, cx, Modale, Saisie, Tableau } from "../ui";

/** Import du classeur Excel de suivi financier : nouveau projet ou remplacement des finances du projet actif */
export function ImportSuiviFinancier({ onFermer, onTermine }: { onFermer: () => void; onTermine: () => void }) {
  const s = useStore();
  const d = useProjetActif();
  const fichier = useRef<HTMLInputElement>(null);
  const [nom, setNom] = useState("");
  const [feuilles, setFeuilles] = useState<{ sheet: string; data: unknown[][] }[] | null>(null);
  const [cible, setCible] = useState<"nouveau" | "actif">(d.projet && !d.budget.length ? "actif" : "nouveau");
  const [projet, setProjet] = useState({ code: "", nom: "" });
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  const [idNouveau] = useState(() => `prj-imp-${Date.now().toString(36)}`);
  const pid = cible === "actif" && d.projet ? d.projet.id : idNouveau;
  const analyse = useMemo((): { r: ResultatImport | null; erreur?: string } => {
    if (!feuilles) return { r: null };
    try {
      return { r: importerSuiviFinancier(feuilles, {
        projetId: pid, entreprises: s.entreprises, moisCloture: moisDuFichier(nom, aujourdhui()), dateImport: aujourdhui(),
        auteurId: s.utilisateurId ?? undefined, nomFichier: nom,
      }) };
    } catch (e) {
      return { r: null, erreur: e instanceof Error ? e.message : String(e) };
    }
  }, [feuilles, pid, nom, s.entreprises, s.utilisateurId]);
  const r = analyse.r;
  const message = erreur ?? analyse.erreur;

  const lire = async (f: File) => {
    setErreur(null); setChargement(true);
    try {
      const fs = await lireTableau(f);
      setNom(f.name);
      setFeuilles(fs);
      const code = f.name.match(/^([A-Z]{0,4}\d{2}[.\d]{2,})/)?.[1] ?? "";
      setProjet((p) => ({ code: p.code || code, nom: p.nom || f.name.replace(/\.[^.]+$/, "").replace(/_/g, " ") }));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setChargement(false);
    }
  };

  const appliquer = () => {
    if (!r) return;
    const res = r;
    useStore.setState((etat) => {
      // Lots : rapprochés par code avec les lots existants du projet
      const lotsProjet = etat.lots.filter((l) => l.projetId === pid);
      const remap = new Map<string, string>();
      const nouveauxLots = res.lots.filter((l) => {
        const ex = lotsProjet.find((x) => x.code === l.code);
        if (ex) remap.set(l.id, ex.id);
        return !ex;
      });
      const lot = (id?: string) => (id ? remap.get(id) ?? id : id);
      const autre = <T extends { projetId: string }>(xs: T[]) => xs.filter((x) => x.projetId !== pid);
      const nouveauProjet: Projet | null = cible === "nouveau" ? {
        id: pid, code: projet.code || "IMPORT", nom: projet.nom || "Projet importé", maitreOuvrage: "", lieu: "", phase: "52 Exécution de l'ouvrage",
        dateDebut: aujourdhui(), dateFin: `${Number(aujourdhui().slice(0, 4)) + 2}-12-31`, tauxTVA: 8.1, couleur: "#0d9488",
        description: `Importé depuis ${nom}`, directeurId: etat.utilisateurId ?? undefined,
      } : null;
      return {
        projets: nouveauProjet ? [...etat.projets, nouveauProjet] : etat.projets,
        lots: [...etat.lots, ...nouveauxLots],
        entreprises: [...etat.entreprises, ...res.entreprises],
        budget: [...autre(etat.budget), ...res.budget.map((b) => ({ ...b, lotId: lot(b.lotId) }))],
        contrats: [...autre(etat.contrats), ...res.contrats.map((c) => ({ ...c, lotId: lot(c.lotId) }))],
        factures: [...autre(etat.factures), ...res.factures],
        facturesHorsCommande: [...autre(etat.facturesHorsCommande), ...res.facturesHorsCommande],
        offres: [...autre(etat.offres), ...res.offres],
        ajustements: [...autre(etat.ajustements), ...res.ajustements],
        mutations: [...autre(etat.mutations), ...res.mutations],
        clotures: [...etat.clotures.filter((c) => !(c.projetId === pid && c.mois === res.clotures[0].mois)), ...res.clotures],
        projetActifId: pid,
      };
    });
    onTermine();
  };

  return (
    <Modale ouverte large onFermer={onFermer} titre="Importer un classeur de suivi financier"
      pied={<><Bouton libre onClick={onFermer}>Annuler</Bouton><Bouton variante="primaire" disabled={!r} onClick={appliquer}>Importer</Bouton></>}>
      <input ref={fichier} type="file" accept=".xlsm,.xlsx" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void lire(f); e.target.value = ""; }} />
      {!feuilles && message && <p className="mb-3 flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-200"><AlertTriangle size={15} /> {message}</p>}
      {!feuilles ? (
        <button onClick={() => fichier.current?.click()} className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 px-6 py-10 text-center hover:border-brand-400 dark:border-slate-700">
          <FileSpreadsheet size={28} className="text-slate-400" />
          <span className="font-medium">{chargement ? "Lecture du classeur…" : "Choisir le classeur (.xlsm ou .xlsx)"}</span>
          <span className="max-w-md text-sm text-slate-500">Feuilles reprises : BUDGET, MUTATIONS, COMMANDES, OFFRES, IMPORT_SUR_CMD, IMPORT_HORS_CMD. Le fichier est lu dans votre navigateur ; il n'est envoyé nulle part.</span>
        </button>
      ) : (
        <div className="space-y-4">
          <p className="flex items-center gap-2 text-sm"><FileSpreadsheet size={16} className="text-emerald-600" /> <strong>{nom}</strong>
            <button className="ml-auto text-xs text-brand-600 hover:underline" onClick={() => { setFeuilles(null); setErreur(null); }}>Changer de fichier</button></p>
          {message && <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-200"><AlertTriangle size={15} /> {message}</p>}
          {r && <>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={cx("cursor-pointer rounded-lg p-3 text-sm ring-1", cible === "nouveau" ? "ring-brand-500 bg-brand-50/40 dark:bg-indigo-950/30" : "ring-slate-200 dark:ring-slate-700")}>
                <input type="radio" className="mr-2" checked={cible === "nouveau"} onChange={() => setCible("nouveau")} />Créer un nouveau projet
              </label>
              <label className={cx("cursor-pointer rounded-lg p-3 text-sm ring-1", !d.projet && "opacity-50", cible === "actif" ? "ring-brand-500 bg-brand-50/40 dark:bg-indigo-950/30" : "ring-slate-200 dark:ring-slate-700")}>
                <input type="radio" className="mr-2" disabled={!d.projet} checked={cible === "actif"} onChange={() => setCible("actif")} />Remplacer les finances de « {d.projet?.code} »
                <span className="mt-1 block text-xs text-slate-500">Budget, commandes, offres, prévisions, mutations et factures du projet sont remplacés ; les clôtures sont conservées.</span>
              </label>
            </div>
            {cible === "nouveau" && (
              <div className="grid gap-3 sm:grid-cols-3">
                <Champ libelle="Code du projet"><Saisie value={projet.code} onChange={(e) => setProjet({ ...projet, code: e.target.value })} /></Champ>
                <Champ libelle="Nom du projet" className="sm:col-span-2"><Saisie value={projet.nom} onChange={(e) => setProjet({ ...projet, nom: e.target.value })} /></Champ>
              </div>
            )}
            <p className="text-sm text-slate-600 dark:text-slate-400"><Upload size={14} className="mr-1 inline" />{r.resume}.</p>
            <div>
              <p className="mb-1 text-sm font-semibold">Contrôle : totaux du classeur et de Chantier+</p>
              <Tableau>
                <thead><tr><th /><th className="!text-right">Classeur</th><th className="!text-right">Chantier+</th><th className="!text-right">Écart</th></tr></thead>
                <tbody>
                  {r.controle.map((c) => {
                    const e = c.chantier - c.classeur;
                    return (
                      <tr key={c.libelle}>
                        <td>{c.libelle}{c.note && <p className="text-xs text-slate-500">{c.note}</p>}</td>
                        <td className="num text-right">{formatCHF(c.classeur)}</td><td className="num text-right">{formatCHF(c.chantier)}</td>
                        <td className={cx("num text-right", Math.abs(e) < 1 ? "text-emerald-600" : "text-amber-600")}>{Math.abs(e) < 1 ? <CheckCircle2 size={15} className="ml-auto" /> : formatCHF(e)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </Tableau>
            </div>
            {r.avertissements.length > 0 && (
              <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                <p className="mb-1 font-medium">Points relevés dans le classeur ({r.avertissements.length})</p>
                <ul className="list-disc space-y-0.5 pl-5">{r.avertissements.slice(0, 15).map((a, i) => <li key={i}>{a}</li>)}</ul>
                {r.avertissements.length > 15 && <p className="mt-1 text-xs">… et {r.avertissements.length - 15} autre(s).</p>}
              </div>
            )}
          </>}
        </div>
      )}
    </Modale>
  );
}
