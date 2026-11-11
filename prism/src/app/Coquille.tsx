// Coquille de l'application : navigation à deux niveaux (groupe, puis projet ouvert), barre du haut,
// droits de page, raccourcis clavier.
import { ChevronDown, Eye, Lock, Menu, Moon, Search, Sparkles, Sun, Undo2 } from "lucide-react";
import { lazy, Suspense, useEffect } from "react";
import { NavLink, Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { aujourdhui } from "../domaine/lib/format";
import { attendDe } from "../domaine/lib/validations";
import { accesDe, niveau, projetsAccessibles } from "../domaine/socle/droits";
import type { Projet } from "../domaine/types";
import { ErreurDepot } from "../donnees/depot";
import { useDepot, useDonnees, useJournal, useUtilisateur } from "../donnees/hooks";
import { session } from "../donnees/session";
import { notifier, ouvrirAssistant, ui } from "./etatUI";
import { cheminProjet, moduleDeChemin, NAVIGATION_ADMIN, NAVIGATION_GLOBALE, navigationDuType, type EntreeNavigation } from "./registre";
import { Avatar, Avis, Carte, Confirmation, cx, LectureSeule, Vide } from "./ui";

const Palette = lazy(() => import("../modules/recherche/Palette").then((m) => ({ default: m.Palette })));
const Assistant = lazy(() => import("../modules/assistant/Assistant").then((m) => ({ default: m.Assistant })));
const Cloche = lazy(() => import("../modules/collaboration/Cloche").then((m) => ({ default: m.Cloche })));

function useTheme() {
  const theme = session.utiliser((s) => s.theme);
  useEffect(() => { document.documentElement.classList.toggle("dark", theme === "sombre"); }, [theme]);
  return [theme === "sombre", () => session.ecrire({ theme: theme === "sombre" ? "clair" : "sombre" })] as const;
}

/** Projets présentés avec leurs sous-projets en retrait */
function ordonner(projets: Projet[]): { projet: Projet; niveau: number }[] {
  const ids = new Set(projets.map((p) => p.id));
  const racines = projets.filter((p) => !p.parentId || !ids.has(p.parentId)).sort((a, b) => a.code.localeCompare(b.code));
  const out: { projet: Projet; niveau: number }[] = [];
  const descendre = (p: Projet, n: number) => {
    out.push({ projet: p, niveau: n });
    for (const e of projets.filter((x) => x.parentId === p.id).sort((a, b) => a.code.localeCompare(b.code))) descendre(e, n + 1);
  };
  for (const r of racines) descendre(r, 0);
  return out;
}

export function Coquille() {
  const depot = useDepot();
  const { projets, personnes, typesProjet, validations, actions, lots } = useDonnees();
  const journal = useJournal();
  const utilisateur = useUtilisateur();
  const utilisateurId = session.utiliser((s) => s.utilisateurId);
  const vueMesLots = session.utiliser((s) => s.vueMesLots);
  const dernierProjetId = session.utiliser((s) => s.dernierProjetId);
  const menuOuvert = ui.utiliser((s) => s.menuOuvert);
  const assistantOuvert = ui.utiliser((s) => s.assistantOuvert);
  const paletteOuverte = ui.utiliser((s) => s.paletteOuverte);
  const [sombre, basculerTheme] = useTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { projetId: projetUrl } = useParams();

  const mesProjets = projetsAccessibles(utilisateur, projets.filter((p) => !p.archive));
  const projetId = projetUrl ?? (mesProjets.some((p) => p.id === dernierProjetId) ? dernierProjetId : null);
  const projet = projets.find((p) => p.id === projetId);
  const type = typesProjet.find((t) => t.id === projet?.typeProjetId);
  const iaAutorisee = niveau(utilisateur, "ia") !== "aucun";
  const module = moduleDeChemin(pathname);
  const niveauPage = niveau(utilisateur, module);
  const aDesLots = lots.some((l) => l.projetId === projetId && l.responsableId === utilisateurId);
  void journal;
  const annulable = depot.derniereAnnulable();

  useEffect(() => { depot.acteurId = utilisateurId ?? undefined; }, [depot, utilisateurId]);
  useEffect(() => { if (projetUrl) session.ecrire({ dernierProjetId: projetUrl }); }, [projetUrl]);
  useEffect(() => { ui.ecrire({ menuOuvert: false }); }, [pathname]);

  const annuler = () => {
    const e = depot.derniereAnnulable();
    if (!e) return;
    try {
      depot.annuler(e.seq);
      notifier(`Annulé : ${e.libelle}`, "succes");
    } catch (err) {
      notifier(err instanceof ErreurDepot ? err.message : "Annulation impossible.", "erreur");
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null;
      const enSaisie = cible && (cible.tagName === "INPUT" || cible.tagName === "TEXTAREA" || cible.tagName === "SELECT" || cible.isContentEditable);
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); ui.ecrire({ paletteOuverte: true }); }
      if (mod && e.key.toLowerCase() === "j" && iaAutorisee) { e.preventDefault(); ouvrirAssistant(); }
      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey && !enSaisie) { e.preventDefault(); annuler(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iaAutorisee, depot]);

  // Ce qui attend l'utilisateur sur le projet ouvert
  const jour = aujourdhui();
  const compteurs: Record<string, { n: number; alerte?: boolean }> = {
    validations: { n: validations.filter((v) => v.projetId === projetId && attendDe(v, utilisateurId)).length, alerte: true },
    taches: {
      n: actions.filter((a) => a.projetId === projetId && a.assigneId === utilisateurId && a.statut !== "Terminé").length,
      alerte: actions.some((a) => a.projetId === projetId && a.assigneId === utilisateurId && a.statut !== "Terminé" && !!a.echeance && a.echeance < jour),
    },
  };

  const visible = (n: EntreeNavigation) => niveau(utilisateur, n.module) !== "aucun";
  const lien = (n: EntreeNavigation, a: string, fin: boolean, compteur?: { n: number; alerte?: boolean }) => (
    <NavLink key={a} to={a} end={fin}
      className={({ isActive }) => cx("flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm font-medium transition",
        isActive ? "bg-brand-50 text-brand-700 dark:bg-sky-950 dark:text-sky-300" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800")}>
      <n.icone size={16} className="shrink-0" />
      <span className="truncate">{n.libelle}</span>
      {niveau(utilisateur, n.module) === "lecture" && <Eye size={12} className="ml-auto shrink-0 text-slate-400" aria-label="Lecture seule" />}
      {compteur && compteur.n > 0 && (
        <span className={cx("ml-auto rounded-full px-1.5 text-[11px] font-semibold num", compteur.alerte ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200")}>{compteur.n}</span>
      )}
    </NavLink>
  );

  const entreesProjet = navigationDuType(type).filter(visible);
  const groupesProjet = [...new Set(entreesProjet.map((n) => n.groupe))];

  const barre = (
    <aside className="flex h-full w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex h-14 shrink-0 items-center gap-2.5 px-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M12 3l9 17H3z" /><path d="M12 3v17" strokeWidth="1.3" /></svg>
        </div>
        <div>
          <p className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">PRISM</p>
          <p className="text-[11px] text-slate-500">Pilotage des projets</p>
        </div>
      </div>
      <button type="button" onClick={() => ui.ecrire({ paletteOuverte: true })}
        className="mx-3 mb-2 flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700">
        <Search size={14} /> Rechercher… <kbd className="ml-auto rounded bg-white px-1.5 text-[10px] font-medium text-slate-400 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">Ctrl K</kbd>
      </button>
      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Navigation principale">
        <div className="space-y-0.5">{NAVIGATION_GLOBALE.filter(visible).map((n) => lien(n, n.chemin, n.chemin === "/"))}</div>

        {mesProjets.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
            <label className="relative block">
              <span className="sr-only">Projet ouvert</span>
              <select value={projetId ?? ""} onChange={(e) => e.target.value && navigate(cheminProjet(e.target.value))}
                className="w-full appearance-none truncate rounded-lg bg-slate-900 py-2 pl-3 pr-8 text-sm font-semibold text-white outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-100 dark:text-slate-900">
                {!projetId && <option value="">Ouvrir un projet…</option>}
                {ordonner(mesProjets).map(({ projet: p, niveau: n }) => <option key={p.id} value={p.id}>{" ".repeat(n * 3)}{n ? "↳ " : ""}{p.code} · {p.nom}</option>)}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white/70 dark:text-slate-500" />
            </label>
            {projet && groupesProjet.map((g) => (
              <div key={g} className="mt-3">
                <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{g}</p>
                <div className="space-y-0.5">{entreesProjet.filter((n) => n.groupe === g).map((n) => lien(n, cheminProjet(projet.id, n.chemin), n.chemin === "", compteurs[n.chemin]))}</div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 space-y-0.5 border-t border-slate-100 pt-3 dark:border-slate-800">{NAVIGATION_ADMIN.filter(visible).map((n) => lien(n, n.chemin, false))}</div>
      </nav>
      {iaAutorisee && (
        <button type="button" onClick={() => ouvrirAssistant()}
          className="m-3 flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-600 to-brand-700 px-3 py-2 text-sm font-medium text-white shadow-sm hover:opacity-95">
          <Sparkles size={15} /> Assistant IA <kbd className="ml-auto rounded bg-white/20 px-1.5 text-[10px]">Ctrl J</kbd>
        </button>
      )}
    </aside>
  );

  return (
    <div className="flex h-full">
      <div className="hidden lg:block pas-impression">{barre}</div>
      {menuOuvert && (
        <div className="fixed inset-0 z-40 flex lg:hidden pas-impression" onClick={() => ui.ecrire({ menuOuvert: false })}>
          <div className="h-full" onClick={(e) => e.stopPropagation()}>{barre}</div>
          <div className="flex-1 bg-slate-900/40" />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 lg:px-6 pas-impression">
          <button type="button" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden" onClick={() => ui.ecrire({ menuOuvert: true })} aria-label="Ouvrir le menu"><Menu size={20} /></button>
          <p className="min-w-0 truncate text-sm text-slate-500">
            {projetUrl && projet ? <><span className="font-semibold text-slate-900 dark:text-white">{projet.code}</span> · {projet.nom}</> : <span className="font-medium text-slate-700 dark:text-slate-200">Tous les projets</span>}
          </p>
          <div className="ml-auto flex items-center gap-1.5">
            {annulable && (
              <button type="button" onClick={annuler} title={`Annuler : ${annulable.libelle} (Ctrl+Z)`}
                className="hidden max-w-56 items-center gap-1.5 truncate rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 md:flex">
                <Undo2 size={14} className="shrink-0" /> <span className="truncate">Annuler : {annulable.libelle}</span>
              </button>
            )}
            {projetUrl && aDesLots && (
              <label className="hidden items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-slate-600 dark:text-slate-300 sm:flex" title="N'afficher que les données de mes lots">
                <input type="checkbox" checked={vueMesLots} onChange={(e) => session.ecrire({ vueMesLots: e.target.checked })} /> Mes lots
              </label>
            )}
            <Suspense fallback={null}><Cloche /></Suspense>
            <button type="button" onClick={basculerTheme} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Changer de thème">{sombre ? <Sun size={17} /> : <Moon size={17} />}</button>
            <label className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-slate-100 dark:hover:bg-slate-800" title="Sans authentification, l'utilisateur se choisit ici : les droits appliqués sont ceux du profil choisi (identité simulée).">
              {utilisateur && <Avatar nom={utilisateur.nom} taille={26} />}
              <select value={utilisateurId ?? ""} onChange={(e) => session.ecrire({ utilisateurId: e.target.value || null })} aria-label="Utilisateur"
                className="max-w-36 truncate bg-transparent text-sm font-medium outline-none dark:bg-slate-900">
                {!utilisateur && <option value="">Choisir…</option>}
                {[...personnes].sort((a, b) => a.nom.localeCompare(b.nom, "fr")).map((p) => <option key={p.id} value={p.id}>{p.nom} · {accesDe(p).profil}</option>)}
              </select>
            </label>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1500px] px-4 py-6 lg:px-8">
            {niveauPage === "aucun" ? (
              <Carte><Vide icone={<Lock size={22} />} titre="Accès non autorisé" texte="Votre profil ne donne pas accès à ce module. Adressez-vous à un administrateur." /></Carte>
            ) : (
              <LectureSeule.Provider value={niveauPage === "lecture"}>
                {niveauPage === "lecture" && (
                  <p className="mb-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300 pas-impression"><Eye size={13} /> Lecture seule sur ce module</p>
                )}
                <Suspense fallback={<p className="py-20 text-center text-sm text-slate-400">Chargement…</p>}><Outlet /></Suspense>
              </LectureSeule.Provider>
            )}
          </div>
        </main>
      </div>
      {assistantOuvert && iaAutorisee && <Suspense fallback={null}><Assistant /></Suspense>}
      {paletteOuverte && <Suspense fallback={null}><Palette /></Suspense>}
      <Confirmation />
      <Avis />
    </div>
  );
}
