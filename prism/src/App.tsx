import { lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Coquille } from "./app/Coquille";
import { EnConstruction } from "./app/EnConstruction";
import { ProjetCourant } from "./app/ProjetCourant";

const page = <T extends Record<string, unknown>>(charger: () => Promise<T>, nom: keyof T) =>
  lazy(() => charger().then((m) => ({ default: m[nom] as React.ComponentType })));

const MonTravail = page(() => import("./modules/accueil/MonTravail"), "MonTravail");
const Portefeuille = page(() => import("./modules/portefeuille/Portefeuille"), "Portefeuille");
const SyntheseProjet = page(() => import("./modules/projet/PagesProjet"), "SyntheseProjet");
const FinancesProjet = page(() => import("./modules/projet/PagesProjet"), "FinancesProjet");
const AppelsOffres = page(() => import("./modules/achats/AppelsOffres"), "AppelsOffres");
const AppelOffresDetail = page(() => import("./modules/achats/AppelOffresDetail"), "AppelOffresDetail");
const Contrats = page(() => import("./modules/contrats/Contrats"), "Contrats");
const ContratDetail = page(() => import("./modules/contrats/ContratDetail"), "ContratDetail");
const Planification = page(() => import("./modules/planning/Planification"), "Planification");
const Taches = page(() => import("./modules/taches/Taches"), "Taches");
const Risques = page(() => import("./modules/risques/Risques"), "Risques");
const Documents = page(() => import("./modules/documents/Documents"), "Documents");
const Validations = page(() => import("./modules/validations/Validations"), "Validations");
const Juridique = page(() => import("./modules/juridique/Juridique"), "Juridique");
const MandatPhases = page(() => import("./modules/mandat/MandatPhases"), "MandatPhases");
const Rapports = page(() => import("./modules/rapports/Rapports"), "Rapports");
const ComInv = page(() => import("./modules/gouvernance/ComInv"), "ComInv");
const DecisionsProjet = page(() => import("./modules/gouvernance/DecisionsProjet"), "DecisionsProjet");
const Pilotage = page(() => import("./modules/pilotage/Pilotage"), "Pilotage");
const PageHistorique = page(() => import("./modules/historique/PageHistorique"), "PageHistorique");
const Archives = page(() => import("./modules/archives/Archives"), "Archives");
const Ressources = page(() => import("./modules/ressources/Ressources"), "Ressources");
const Organisation = page(() => import("./modules/organisation/Organisation"), "Organisation");
const Entreprises = page(() => import("./modules/entreprises/Entreprises"), "Entreprises");
const Acces = page(() => import("./modules/acces/Acces"), "Acces");
const Administration = page(() => import("./modules/administration/Administration"), "Administration");

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Coquille />}>
          <Route index element={<MonTravail />} />
          <Route path="portefeuille" element={<Portefeuille />} />
          <Route path="pilotage" element={<Pilotage />} />
          <Route path="cominv" element={<ComInv />} />
          <Route path="ressources" element={<Ressources />} />
          <Route path="entreprises" element={<Entreprises />} />
          <Route path="archives" element={<Archives />} />
          <Route path="acces" element={<Acces />} />
          <Route path="administration/*" element={<Administration />} />
          <Route path="projets/:projetId" element={<ProjetCourant />}>
            <Route index element={<SyntheseProjet />} />
            <Route path="planning" element={<Planification />} />
            <Route path="taches" element={<Taches />} />
            <Route path="risques" element={<Risques />} />
            <Route path="organisation" element={<Organisation />} />
            <Route path="finances" element={<FinancesProjet />} />
            <Route path="appels-offres" element={<AppelsOffres />} />
            <Route path="appels-offres/:id" element={<AppelOffresDetail />} />
            <Route path="contrats" element={<Contrats />} />
            <Route path="contrats/:id" element={<ContratDetail />} />
            <Route path="juridique" element={<Juridique />} />
            <Route path="mandat" element={<MandatPhases />} />
            <Route path="rapports" element={<Rapports />} />
            <Route path="decisions" element={<DecisionsProjet />} />
            <Route path="validations" element={<Validations />} />
            <Route path="documents" element={<Documents />} />
            <Route path="historique" element={<PageHistorique />} />
            <Route path="*" element={<EnConstruction titre="Module du projet" etape={2} />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
