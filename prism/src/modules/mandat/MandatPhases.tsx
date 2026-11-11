import { useState } from "react";
import { EnTetePage, Onglets } from "@/app/ui";
import { useProjet } from "@/donnees/hooks";
import { Mandat } from "./Mandat";
import { Phases } from "./Phases";

export function MandatPhases() {
  const { mandats, decisionsPhase } = useProjet();
  const [onglet, setOnglet] = useState<"mandat" | "phases">("mandat");
  return (
    <>
      <EnTetePage titre="Mandat et phases" description="Mandat de projet selon le modèle du groupe, signatures, versions et passages de phase" />
      <div className="mb-6 pas-impression"><Onglets valeur={onglet} onChange={setOnglet} options={[{ id: "mandat", libelle: "Mandat", compte: mandats.length || undefined }, { id: "phases", libelle: "Phases", compte: decisionsPhase.length || undefined }]} /></div>
      {onglet === "mandat" ? <Mandat /> : <Phases />}
    </>
  );
}
