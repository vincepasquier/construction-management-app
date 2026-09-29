import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Network, Pencil, Printer, X } from "lucide-react";
import { useProjetActif } from "../store/useStore";
import { useUI } from "../store/useUI";
import { ArbreOrganigramme, LegendeOrganigramme } from "./Organigramme";
import { Annuaire } from "../pages/Organigramme";
import { Onglets } from "./ui";

/** Organigramme du projet actif, accessible depuis n'importe quelle page (bouton en haut à droite) */
export function OrganigrammeRapide() {
  const { organigrammeOuvert, setOrganigramme } = useUI();
  const { projet, organigramme } = useProjetActif();
  const [vue, setVue] = useState<"arbre" | "annuaire">("arbre");

  useEffect(() => {
    if (!organigrammeOuvert) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOrganigramme(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [organigrammeOuvert, setOrganigramme]);

  if (!organigrammeOuvert || !projet) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 dark:bg-slate-950">
      <header className="pas-impression flex items-center gap-3 border-b border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-900">
        <Network size={20} className="text-brand-600" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900 dark:text-white">Organigramme · {projet.code}</p>
          <p className="truncate text-xs text-slate-500">{projet.nom}</p>
        </div>
        <Onglets valeur={vue} onChange={setVue} options={[{ id: "arbre", libelle: "Organigramme" }, { id: "annuaire", libelle: "Annuaire" }]} />
        <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"><Printer size={16} /> Imprimer</button>
        <Link to="/organigramme" onClick={() => setOrganigramme(false)} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"><Pencil size={16} /> Modifier</Link>
        <button onClick={() => setOrganigramme(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Fermer"><X size={20} /></button>
      </header>
      <div className="zone-impression flex-1 overflow-auto">
        <p className="hidden px-6 pt-4 text-lg font-semibold print:block">Organigramme – {projet.code} {projet.nom}</p>
        {organigramme.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <p className="text-slate-600 dark:text-slate-300">L'organigramme de ce projet n'est pas encore créé.</p>
            <Link to="/organigramme" onClick={() => setOrganigramme(false)} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white">Créer l'organigramme</Link>
          </div>
        ) : vue === "arbre" ? (
          <ArbreOrganigramme noeuds={organigramme} />
        ) : (
          <div className="mx-auto max-w-5xl p-6"><Annuaire noeuds={organigramme} /></div>
        )}
      </div>
      <footer className="pas-impression border-t border-slate-200 bg-white px-5 py-2 dark:border-slate-800 dark:bg-slate-900"><LegendeOrganigramme /></footer>
    </div>
  );
}
