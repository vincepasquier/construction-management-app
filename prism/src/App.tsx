import { lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Coquille } from "./app/Coquille";
import { EnConstruction } from "./app/EnConstruction";
import { ProjetCourant } from "./app/ProjetCourant";

const page = <T extends Record<string, unknown>>(charger: () => Promise<T>, nom: keyof T) =>
  lazy(() => charger().then((m) => ({ default: m[nom] as React.ComponentType })));

const Entreprises = page(() => import("./modules/entreprises/Entreprises"), "Entreprises");

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Coquille />}>
          <Route index element={<EnConstruction titre="Mon travail" etape={1} />} />
          <Route path="portefeuille" element={<EnConstruction titre="Portefeuille" etape={1} />} />
          <Route path="pilotage" element={<EnConstruction titre="Pilotage groupe" etape={3} />} />
          <Route path="cominv" element={<EnConstruction titre="ComInv" etape={3} />} />
          <Route path="ressources" element={<EnConstruction titre="Ressources" etape={2} />} />
          <Route path="entreprises" element={<Entreprises />} />
          <Route path="archives" element={<EnConstruction titre="Archives" etape={4} />} />
          <Route path="acces" element={<EnConstruction titre="Gestion des accès" etape={1} />} />
          <Route path="administration/*" element={<EnConstruction titre="Administration" etape={1} />} />
          <Route path="projets/:projetId" element={<ProjetCourant />}>
            <Route index element={<EnConstruction titre="Synthèse du projet" etape={1} />} />
            <Route path="*" element={<EnConstruction titre="Module du projet" etape={2} />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
