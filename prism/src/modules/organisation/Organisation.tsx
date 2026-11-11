// Organisation du projet : organigramme et parties prenantes.
import { useState } from "react";
import { EnTetePage, Onglets } from "@/app/ui";
import { useProjet } from "@/donnees/hooks";
import { OrganigrammeProjet } from "./Organigramme";
import { PartiesPrenantes } from "./PartiesPrenantes";

export function Organisation() {
  const d = useProjet();
  const [onglet, setOnglet] = useState<"organigramme" | "parties">("organigramme");
  return (
    <>
      <EnTetePage titre="Organisation du projet" description="Qui fait quoi : organigramme, annuaire et parties prenantes" />
      <div className="mb-6"><Onglets valeur={onglet} onChange={setOnglet} options={[{ id: "organigramme", libelle: "Organigramme", compte: d.organigramme.length }, { id: "parties", libelle: "Parties prenantes", compte: d.partiesPrenantes.length }]} /></div>
      {onglet === "organigramme" ? <OrganigrammeProjet /> : <PartiesPrenantes />}
    </>
  );
}
