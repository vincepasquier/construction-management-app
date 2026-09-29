import { lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/layout/Layout";

// Chaque module est chargé à la demande pour alléger le démarrage
const Portefeuille = lazy(() => import("./pages/Portefeuille").then((m) => ({ default: m.Portefeuille })));
const TableauDeBord = lazy(() => import("./pages/TableauDeBord").then((m) => ({ default: m.TableauDeBord })));
const Finances = lazy(() => import("./pages/Finances").then((m) => ({ default: m.Finances })));
const AppelsOffres = lazy(() => import("./pages/AppelsOffres").then((m) => ({ default: m.AppelsOffres })));
const AppelOffresDetail = lazy(() => import("./pages/AppelOffresDetail").then((m) => ({ default: m.AppelOffresDetail })));
const Contrats = lazy(() => import("./pages/Contrats").then((m) => ({ default: m.Contrats })));
const ContratDetail = lazy(() => import("./pages/ContratDetail").then((m) => ({ default: m.ContratDetail })));
const Planning = lazy(() => import("./pages/Planning").then((m) => ({ default: m.Planning })));
const Documents = lazy(() => import("./pages/Documents").then((m) => ({ default: m.Documents })));
const Ressources = lazy(() => import("./pages/Ressources").then((m) => ({ default: m.Ressources })));
const Entreprises = lazy(() => import("./pages/Entreprises").then((m) => ({ default: m.Entreprises })));
const Taches = lazy(() => import("./pages/Taches").then((m) => ({ default: m.Taches })));
const Risques = lazy(() => import("./pages/Risques").then((m) => ({ default: m.Risques })));
const Validations = lazy(() => import("./pages/Validations").then((m) => ({ default: m.Validations })));
const Organigramme = lazy(() => import("./pages/Organigramme").then((m) => ({ default: m.Organigramme })));
const Acces = lazy(() => import("./pages/Acces").then((m) => ({ default: m.Acces })));
const Parametres = lazy(() => import("./pages/Parametres").then((m) => ({ default: m.Parametres })));

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Portefeuille />} />
          <Route path="projet" element={<TableauDeBord />} />
          <Route path="finances" element={<Finances />} />
          <Route path="appels-offres" element={<AppelsOffres />} />
          <Route path="appels-offres/:id" element={<AppelOffresDetail />} />
          <Route path="contrats" element={<Contrats />} />
          <Route path="contrats/:id" element={<ContratDetail />} />
          <Route path="planning" element={<Planning />} />
          <Route path="documents" element={<Documents />} />
          <Route path="ressources" element={<Ressources />} />
          <Route path="entreprises" element={<Entreprises />} />
          <Route path="taches" element={<Taches />} />
          <Route path="risques" element={<Risques />} />
          <Route path="validations" element={<Validations />} />
          <Route path="organigramme" element={<Organigramme />} />
          <Route path="acces" element={<Acces />} />
          <Route path="parametres" element={<Parametres />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
