// Comité d'investissement : séances, registre des décisions de tout le portefeuille et suivi des conditions.
import { useState } from "react";
import { EnTetePage, Onglets, Carte } from "@/app/ui";
import { aujourdhui } from "@/domaine/lib/format";
import { decisionVisible, projetsAccessibles } from "@/domaine/socle/droits";
import { conditionsOuvertes } from "@/donnees/gouvernance";
import { useDonnees, useUtilisateur } from "@/donnees/hooks";
import { Seances } from "../seances/Seances";
import { SuiviConditions } from "./Conditions";
import { RegistreDecisions } from "./RegistreDecisions";

export function ComInv() {
  const { decisions, decisionsPhase, projets, seances } = useDonnees();
  const utilisateur = useUtilisateur();
  const [onglet, setOnglet] = useState<"seances" | "decisions" | "conditions">("seances");
  const visibles = new Set(projetsAccessibles(utilisateur, projets).map((p) => p.id));
  const conditions = conditionsOuvertes(decisions.filter((d) => visibles.has(d.projetId) && decisionVisible(utilisateur, d)), decisionsPhase.filter((d) => visibles.has(d.projetId)), aujourdhui());
  return (
    <>
      <EnTetePage titre="ComInv" description="Séances du comité d'investissement, registre des décisions et suivi de leurs conditions" />
      <div className="mb-6 pas-impression"><Onglets valeur={onglet} onChange={setOnglet} options={[
        { id: "seances", libelle: "Séances", compte: seances.filter((s) => s.type === "ComInv").length || undefined },
        { id: "decisions", libelle: "Registre des décisions" },
        { id: "conditions", libelle: "Conditions à lever", compte: conditions.length || undefined },
      ]} /></div>
      {onglet === "seances" && <Seances type="ComInv" libelle="Séances du comité d'investissement" />}
      {onglet === "decisions" && <RegistreDecisions />}
      {onglet === "conditions" && <Carte titre="Conditions et réserves ouvertes" sousTitre="Décisions des comités et passages de phase, tous projets de votre périmètre"><SuiviConditions conditions={conditions} avecProjet /></Carte>}
    </>
  );
}
