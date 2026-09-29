import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, FileSignature, Gavel, Search, Sparkles } from "lucide-react";
import { useStore } from "../../store/useStore";
import { useUI } from "../../store/useUI";
import { NAVIGATION } from "./navigation";

interface Resultat {
  id: string;
  libelle: string;
  detail?: string;
  icone: React.ReactNode;
  action: () => void;
}

export function PaletteCommandes() {
  const { paletteOuverte, setPalette, ouvrirAssistant } = useUI();
  const { contrats, appelsOffres, projets, setProjetActif, entreprises } = useStore();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const navigate = useNavigate();

  const fermer = () => { setPalette(false); setQ(""); setSel(0); };

  const resultats = useMemo<Resultat[]>(() => {
    const aller = (a: string, projetId?: string) => () => { if (projetId) setProjetActif(projetId); navigate(a); fermer(); };
    const r: Resultat[] = [
      ...NAVIGATION.map((n) => ({ id: n.a, libelle: n.libelle, detail: "Navigation", icone: <n.icone size={16} />, action: aller(n.a) })),
      ...projets.map((p) => ({ id: p.id, libelle: `${p.code} · ${p.nom}`, detail: "Projet", icone: <ArrowRight size={16} />, action: aller("/projet", p.id) })),
      ...appelsOffres.map((a) => ({ id: a.id, libelle: `${a.numero} · ${a.objet}`, detail: "Appel d'offres", icone: <Gavel size={16} />, action: aller(`/appels-offres/${a.id}`, a.projetId) })),
      ...contrats.map((c) => ({ id: c.id, libelle: `${c.numero} · ${c.objet}`, detail: entreprises.find((e) => e.id === c.entrepriseId)?.nom ?? "Contrat", icone: <FileSignature size={16} />, action: aller(`/contrats/${c.id}`, c.projetId) })),
    ];
    const t = q.trim().toLowerCase();
    const filtres = t ? r.filter((x) => `${x.libelle} ${x.detail}`.toLowerCase().includes(t)) : r.slice(0, 10);
    if (t) filtres.push({ id: "ia", libelle: `Demander à l'assistant : « ${q} »`, detail: "IA", icone: <Sparkles size={16} />, action: () => { ouvrirAssistant(q); fermer(); } });
    return filtres.slice(0, 12);
  }, [q, contrats, appelsOffres, projets, entreprises]);

  if (!paletteOuverte) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 pt-[12vh] backdrop-blur-[2px]" onMouseDown={fermer}>
      <div className="apparition w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 dark:border-slate-800">
          <Search size={18} className="text-slate-400" />
          <input autoFocus value={q} placeholder="Rechercher un projet, un contrat, un AO… ou poser une question"
            onChange={(e) => { setQ(e.target.value); setSel(0); }}
            onKeyDown={(e) => {
              if (e.key === "Escape") fermer();
              if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, resultats.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
              if (e.key === "Enter") resultats[sel]?.action();
            }}
            className="h-14 flex-1 bg-transparent text-sm outline-none" />
        </div>
        <ul className="max-h-96 overflow-y-auto p-2">
          {resultats.map((r, i) => (
            <li key={r.id}>
              <button onMouseEnter={() => setSel(i)} onClick={r.action}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${i === sel ? "bg-brand-50 text-brand-700 dark:bg-indigo-950 dark:text-indigo-200" : "text-slate-700 dark:text-slate-300"}`}>
                <span className="text-slate-400">{r.icone}</span>
                <span className="flex-1 truncate">{r.libelle}</span>
                <span className="text-xs text-slate-400">{r.detail}</span>
              </button>
            </li>
          ))}
          {resultats.length === 0 && <li className="px-3 py-6 text-center text-sm text-slate-500">Aucun résultat</li>}
        </ul>
      </div>
    </div>
  );
}
