import { Component, StrictMode, useEffect, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { Demarrage } from "./app/Demarrage";
import { notifier } from "./app/etatUI";
import { Avis } from "./app/ui";
import { Depot } from "./donnees/depot";
import { brancherErreurs, FournisseurDepot, useDepot, useDonnees } from "./donnees/hooks";
import { definirSeuilsCriticite } from "./domaine/lib/risques";
import { brancherNotifications, rappelsDuJour } from "./donnees/notifications";
import { brancherJournalExports } from "./outils/telechargement";
import { installerReferentiels } from "./donnees/initialisation";
import { autoriser, REGLES } from "./donnees/regles";
import { session } from "./donnees/session";
import { StockageIndexedDB } from "./donnees/stockageIndexedDB";
import { Secours } from "./modules/secours/Secours";
import "./index.css";

const canal = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("prism") : null;
const depot = new Depot(new StockageIndexedDB(), { autoriser, regles: REGLES, canal });
brancherErreurs((message) => notifier(message, "erreur"));

/** Si un écran plante, on garde un accès à la sauvegarde plutôt qu'une page blanche */
class Garde extends Component<{ children: ReactNode }, { erreur: Error | null }> {
  state = { erreur: null as Error | null };
  static getDerivedStateFromError(erreur: Error) { return { erreur }; }
  render() {
    return this.state.erreur ? <Secours depot={depot} erreur={this.state.erreur.message} /> : this.props.children;
  }
}

function Racine() {
  const d = useDepot();
  const { projets, personnes } = useDonnees();
  const erreurEcriture = d.erreurPersistance;
  useEffect(() => {
    if (erreurEcriture) notifier(`Enregistrement impossible : ${erreurEcriture.message}. Téléchargez une sauvegarde depuis /secours.`, "erreur");
  }, [erreurEcriture]);
  if (window.location.pathname === "/secours") return <Secours depot={d} />;
  if (projets.length === 0 && personnes.length === 0) return <><Demarrage /><Avis /></>;
  return <App />;
}

function Amorce() {
  const [etat, setEtat] = useState<"ouverture" | "pret" | Error>("ouverture");
  useEffect(() => {
    let actif = true;
    depot.ouvrir().then(() => {
      if (!actif) return;
      depot.acteurId = session.lire().utilisateurId ?? undefined;
      // Une base déjà remplie reçoit les référentiels ajoutés par les versions suivantes
      if (!depot.estVide()) installerReferentiels(depot, false);
      // Les notifications naissent des écritures : le moteur écoute le journal dès l'ouverture
      // La matrice des risques de la configuration publiée s'applique à toute l'application
      definirSeuilsCriticite(depot.parId("configurations", "courante")?.matriceRisques);
      brancherNotifications(depot);
      // Chaque export (Excel, Word, sauvegarde) laisse une trace au journal
      brancherJournalExports((nom) => { if (!depot.estVide()) depot.consigner(`Export : ${nom}`); });
      if (!depot.estVide()) rappelsDuJour(depot);
      // Demande au navigateur de ne pas évincer la base quand l'espace disque manque
      void navigator.storage?.persist?.();
      setEtat("pret");
    }).catch((e: unknown) => actif && setEtat(e instanceof Error ? e : new Error(String(e))));
    return () => { actif = false; };
  }, []);
  if (etat === "ouverture") return <p className="flex h-full items-center justify-center text-sm text-slate-400">Ouverture de la base…</p>;
  if (etat instanceof Error) return <Secours depot={depot} erreur={etat.message} />;
  return (
    <FournisseurDepot depot={depot}>
      <Garde><Racine /></Garde>
    </FournisseurDepot>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><Amorce /></StrictMode>);
