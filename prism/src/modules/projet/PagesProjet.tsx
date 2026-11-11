// Pages de projet dont le contenu dépend du type de projet : la synthèse reçoit les blocs
// construction, et les finances sont tenues par position ou en synthèse selon le mode financier.
import { EnConstruction } from "@/app/EnConstruction";
import { useDoc, useProjet } from "@/donnees/hooks";
import { ComplementsConstruction } from "../construction/Complements";
import { Finances } from "../finances/Finances";
import { Synthese } from "./Synthese";

function useModeFinancier() {
  const { projet } = useProjet();
  return useDoc("typesProjet", projet?.typeProjetId)?.modeFinancier;
}

export function SyntheseProjet() {
  return <Synthese complements={useModeFinancier() === "positions" ? <ComplementsConstruction /> : undefined} />;
}

export function FinancesProjet() {
  return useModeFinancier() === "positions" ? <Finances /> : <EnConstruction titre="Finances du projet" etape={3} />;
}
