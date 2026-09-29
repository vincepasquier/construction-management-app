import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Suspense, useEffect, useState } from "react";
import { Eye, Lock, Menu, Moon, Network, Search, Sparkles, Sun } from "lucide-react";
import { useStore } from "../../store/useStore";
import { useUI } from "../../store/useUI";
import { accesDe, niveau, projetsAccessibles } from "../../lib/acces";
import { attendDe } from "../../lib/validations";
import { aujourdhui } from "../../lib/format";
import { Avatar, Carte, cx, LectureSeule, Liste, Vide } from "../ui";
import { AssistantIA } from "../AssistantIA";
import { OrganigrammeRapide } from "../OrganigrammeRapide";
import { PaletteCommandes } from "./PaletteCommandes";
import { moduleDeChemin, NAVIGATION } from "./navigation";

function useTheme() {
  const [sombre, setSombre] = useState(() => {
    try {
      const v = localStorage.getItem("theme");
      return v ? v === "sombre" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", sombre);
    try { localStorage.setItem("theme", sombre ? "sombre" : "clair"); } catch { /* stockage indisponible */ }
  }, [sombre]);
  return [sombre, setSombre] as const;
}

export function Layout() {
  const { projets, projetActifId, setProjetActif, personnes, utilisateurId, setUtilisateur, vueMesLots, setVueMesLots, lots, validations, actions } = useStore();
  const { ouvrirAssistant, assistantOuvert, setPalette, setOrganigramme } = useUI();
  const [sombre, setSombre] = useTheme();
  const [menuMobile, setMenuMobile] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const utilisateur = personnes.find((p) => p.id === utilisateurId);
  const aDesLots = lots.some((l) => l.projetId === projetActifId && l.responsableId === utilisateurId);
  const mesProjets = projetsAccessibles(utilisateur, projets);
  const iaAutorisee = niveau(utilisateur, "ia") !== "aucun";
  const niveauPage = niveau(utilisateur, moduleDeChemin(pathname));

  // Le projet actif doit rester dans le périmètre de l'utilisateur
  useEffect(() => {
    if (projetActifId && !mesProjets.some((p) => p.id === projetActifId)) setProjetActif(mesProjets[0]?.id ?? null);
  }, [projetActifId, mesProjets, setProjetActif]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette(true); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j" && iaAutorisee) { e.preventDefault(); ouvrirAssistant(); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "o" && e.shiftKey) { e.preventDefault(); setOrganigramme(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setPalette, ouvrirAssistant, setOrganigramme, iaAutorisee]);

  // Compteurs affichés dans le menu : ce qui attend l'utilisateur
  const jour = aujourdhui();
  const compteurs: Partial<Record<string, { n: number; alerte?: boolean }>> = {
    "/validations": { n: validations.filter((v) => attendDe(v, utilisateurId)).length, alerte: true },
    "/taches": {
      n: actions.filter((a) => a.assigneId === utilisateurId && a.statut !== "Terminé").length,
      alerte: actions.some((a) => a.assigneId === utilisateurId && a.statut !== "Terminé" && !!a.echeance && a.echeance < jour),
    },
  };

  const navigation = NAVIGATION.filter((n) => niveau(utilisateur, n.module) !== "aucun");
  const groupes = [...new Set(navigation.map((n) => n.groupe))];

  const barre = (
    <aside className="flex h-full w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"><path d="M3 20h18M6 20V10l6-5 6 5v10" /></svg>
        </div>
        <div>
          <p className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">Chantier+</p>
          <p className="text-[11px] text-slate-500">Pilotage de projets</p>
        </div>
      </div>
      <button onClick={() => setPalette(true)} className="mx-3 mb-3 flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-500 hover:bg-slate-200/70 dark:bg-slate-800 dark:hover:bg-slate-700">
        <Search size={15} /> Rechercher…
        <kbd className="ml-auto rounded bg-white px-1.5 text-[10px] font-medium text-slate-400 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">Ctrl K</kbd>
      </button>
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4">
        {groupes.map((g) => (
          <div key={g}>
            <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{g}</p>
            {navigation.filter((n) => n.groupe === g).map((n) => {
              const c = compteurs[n.a];
              return (
                <NavLink key={n.a} to={n.a} end={n.a === "/"} onClick={() => setMenuMobile(false)}
                  className={({ isActive }) => cx("flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
                    isActive ? "bg-brand-50 text-brand-700 dark:bg-indigo-950/60 dark:text-indigo-300" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white")}>
                  <n.icone size={17} strokeWidth={2} />
                  <span className="flex-1 truncate">{n.libelle}</span>
                  {niveau(utilisateur, n.module) === "lecture" && <Eye size={13} className="text-slate-300" aria-label="Lecture seule" />}
                  {!!c?.n && (
                    <span className={cx("min-w-5 rounded-full px-1.5 text-center text-[11px] font-semibold", c.alerte ? "bg-rose-500 text-white" : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200")}>{c.n}</span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>
      {iaAutorisee && (
        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          <button onClick={() => ouvrirAssistant()} className="flex w-full items-center gap-2.5 rounded-lg bg-gradient-to-r from-brand-600 to-violet-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm hover:opacity-95">
            <Sparkles size={16} /> Assistant IA
            <kbd className="ml-auto rounded bg-white/20 px-1.5 text-[10px]">Ctrl J</kbd>
          </button>
        </div>
      )}
    </aside>
  );

  return (
    <div className="flex h-full">
      <div className="hidden lg:block">{barre}</div>
      {menuMobile && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMenuMobile(false)}>
          <div className="absolute inset-0 bg-slate-900/40" />
          <div className="relative h-full w-64" onClick={(e) => e.stopPropagation()}>{barre}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur sm:px-6 dark:border-slate-800 dark:bg-slate-900/80">
          <button className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setMenuMobile(true)} aria-label="Menu"><Menu size={20} /></button>
          <Liste value={projetActifId ?? ""} onChange={(e) => { setProjetActif(e.target.value || null); navigate("/projet"); }} className="max-w-xs font-medium">
            {mesProjets.length === 0 && <option value="">Aucun projet</option>}
            {mesProjets.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.nom}</option>)}
          </Liste>
          {aDesLots && (
            <label className="hidden cursor-pointer items-center gap-2 text-sm text-slate-600 md:flex dark:text-slate-300">
              <input type="checkbox" checked={vueMesLots} onChange={(e) => setVueMesLots(e.target.checked)} className="h-4 w-4 rounded accent-brand-600" />
              Mes lots uniquement
            </label>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            {niveau(utilisateur, "organigramme") !== "aucun" && projetActifId && (
              <button onClick={() => setOrganigramme(true)} title="Organigramme du projet (Ctrl Maj O)"
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                <Network size={18} /><span className="hidden xl:inline">Organigramme</span>
              </button>
            )}
            <button onClick={() => setSombre(!sombre)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Thème">
              {sombre ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <label className="relative flex cursor-pointer items-center gap-2.5 rounded-lg py-1 pl-1 pr-2 hover:bg-slate-100 dark:hover:bg-slate-800" title="Changer d'utilisateur (démonstration des rôles et des accès)">
              {utilisateur && <Avatar nom={utilisateur.nom} taille={32} />}
              <span className="hidden text-left leading-tight sm:block">
                <span className="block text-sm font-medium text-slate-900 dark:text-white">{utilisateur?.nom ?? "—"}</span>
                <span className="block text-xs text-slate-500">{utilisateur ? accesDe(utilisateur).profil : ""}</span>
              </span>
              <select value={utilisateurId ?? ""} onChange={(e) => setUtilisateur(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Utilisateur">
                {personnes.map((p) => <option key={p.id} value={p.id}>{p.nom} — {accesDe(p).profil}</option>)}
              </select>
            </label>
          </div>
        </header>
        <main className={cx("flex-1 overflow-y-auto transition-[padding]", assistantOuvert && "xl:pr-[440px]")}>
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {niveauPage === "aucun" ? (
              <Carte><Vide icone={<Lock size={22} />} titre="Accès non autorisé" texte="Votre profil ne donne pas accès à ce module. Contactez l'administrateur du projet." /></Carte>
            ) : (
              <LectureSeule.Provider value={niveauPage === "lecture"}>
                {niveauPage === "lecture" && (
                  <div className="mb-4 flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <Eye size={15} /> Consultation seule : votre profil ne permet pas de modifier ce module.
                  </div>
                )}
                <Suspense fallback={<div className="py-20 text-center text-sm text-slate-400">Chargement…</div>}>
                  <Outlet />
                </Suspense>
              </LectureSeule.Provider>
            )}
          </div>
        </main>
      </div>
      {iaAutorisee && <AssistantIA />}
      <OrganigrammeRapide />
      <PaletteCommandes />
    </div>
  );
}
