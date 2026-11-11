import { lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Coquille } from "./app/Coquille";
import { EnConstruction } from "./app/EnConstruction";
import { ProjetCourant } from "./app/ProjetCourant";

const page = <T extends Record<string, unknown>>(charger: () => Promise<T>, nom: keyof T) =>
  lazy(() => charger().then((m) => ({ default: m[nom] as React.ComponentType })));

const MonTravail = page(() => import("./modules/accueil/MonTravail"), "MonTravail");
const Portefeuille = page(() => import("./modules/portefeuille/Portefeuille"), "Portefeuille");
const Synthese = page(() => import("./modules/projet/Synthese"), "Synthese");
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
          <Route path="pilotage" element={<EnConstruction titre="Pilotage groupe" etape={3} />} />
          <Route path="cominv" element={<EnConstruction titre="ComInv" etape={3} />} />
          <Route path="ressources" element={<EnConstruction titre="Ressources" etape={2} />} />
          <Route path="entreprises" element={<Entreprises />} />
          <Route path="archives" element={<EnConstruction titre="Archives" etape={4} />} />
          <Route path="acces" element={<Acces />} />
          <Route path="administration/*" element={<Administration />} />
          <Route path="projets/:projetId" element={<ProjetCourant />}>
            <Route index element={<Synthese />} />
            <Route path="organisation" element={<Organisation />} />
            <Route path="*" element={<EnConstruction titre="Module du projet" etape={2} />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
