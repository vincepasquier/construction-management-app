// Parties prenantes du projet : qui est concerné, à quel titre, avec quelles attentes. Une partie
// prenante est un membre de l'équipe, une entreprise du carnet, ou un nom libre.
import { Plus, Users } from "lucide-react";
import { useState } from "react";
import { PanneauFiche, type ChampSchema } from "@/app/formulaire/Formulaire";
import { useSuppression } from "@/app/suppression";
import { TableDonnees, type Colonne } from "@/app/table/TableDonnees";
import { Badge, Bouton, Carte, useLectureSeule, Vide } from "@/app/ui";
import { nouvelId } from "@/domaine/lib/id";
import type { PartiePrenante } from "@/domaine/socle/types";
import { useDonnees, useProjet } from "@/donnees/hooks";

export const ROLES_PROJET = ["Sponsor", "Commanditaire", "Chef de projet", "Comité de pilotage", "Équipe de projet", "Référent métier", "Finance", "PMO", "Informatique", "Utilisateur", "Fournisseur", "Mandataire", "Autorité", "Riverain / tiers", "Autre"];

export function PartiesPrenantes() {
  const d = useProjet();
  const { personnes, entreprises, ajouter, modifier } = useDonnees();
  const supprimer = useSuppression();
  const lecture = useLectureSeule();
  const [fiche, setFiche] = useState<PartiePrenante | null>(null);
  if (!d.projet) return null;
  const projet = d.projet;
  const liste = d.partiesPrenantes;
  const existe = (p: PartiePrenante) => liste.some((x) => x.id === p.id);

  const nomDe = (p: PartiePrenante) => personnes.find((x) => x.id === p.personneId)?.nom ?? entreprises.find((x) => x.id === p.entrepriseId)?.nom ?? p.nom ?? "";
  const organisationDe = (p: PartiePrenante) => personnes.find((x) => x.id === p.personneId)?.organisation ?? (p.entrepriseId ? "Entreprise" : "");
  const courrielDe = (p: PartiePrenante) => personnes.find((x) => x.id === p.personneId)?.email ?? entreprises.find((x) => x.id === p.entrepriseId)?.email ?? "";

  const colonnes: Colonne<PartiePrenante>[] = [
    { id: "nom", titre: "Nom", valeur: nomDe, rendu: (p) => <span className="font-medium text-slate-900 dark:text-white">{nomDe(p) || <span className="font-normal text-slate-400">À désigner</span>}</span> },
    { id: "role", titre: "Rôle dans le projet", valeur: (p) => p.roleProjet },
    { id: "cote", titre: "Position", valeur: (p) => (p.interne ? "Interne" : "Externe"), rendu: (p) => <Badge couleur={p.interne ? "bleu" : "gris"}>{p.interne ? "Interne" : "Externe"}</Badge> },
    { id: "org", titre: "Organisation", valeur: organisationDe },
    { id: "resp", titre: "Responsabilités", valeur: (p) => p.responsabilites ?? "" },
    { id: "rem", titre: "Attentes, points d'attention", valeur: (p) => p.remarques ?? "" },
    { id: "mail", titre: "Courriel", valeur: courrielDe, masquee: true },
  ];

  const champs: ChampSchema<PartiePrenante>[] = [
    { cle: "roleProjet", libelle: "Rôle dans le projet", type: "liste", options: ROLES_PROJET, obligatoire: true },
    { cle: "interne", libelle: "Interne au groupe", type: "case" },
    { cle: "personneId", libelle: "Membre de l'équipe", type: "liste", options: [...[...personnes].sort((a, b) => a.nom.localeCompare(b.nom, "fr")).map((p) => ({ valeur: p.id, libelle: `${p.nom} · ${p.fonction ?? p.role}` }))] },
    { cle: "entrepriseId", libelle: "ou entreprise", type: "liste", options: [...entreprises.map((e) => ({ valeur: e.id, libelle: e.nom }))] },
    { cle: "nom", libelle: "ou nom libre", type: "texte", large: true, aide: "Pour une personne ou un organisme qui n'est ni dans l'équipe ni dans le carnet d'entreprises" },
    { cle: "responsabilites", libelle: "Responsabilités", type: "zone", large: true },
    { cle: "remarques", libelle: "Attentes, points d'attention", type: "zone", large: true },
  ];

  const nouveau = (): PartiePrenante => ({ id: nouvelId("pp"), projetId: projet.id, roleProjet: "Équipe de projet", interne: true });
  const ajouterBouton = <Bouton variante="primaire" icone={<Plus size={15} />} onClick={() => setFiche(nouveau())}>Partie prenante</Bouton>;

  return (
    <>
      <Carte>
        <TableDonnees id="parties-prenantes" lignes={liste} colonnes={colonnes} cle={(p) => p.id} onOuvrir={lecture ? undefined : setFiche} barre={ajouterBouton} grouperPar=""
          vide={<Vide icone={<Users size={22} />} titre="Aucune partie prenante" texte="Listez le sponsor, le comité de pilotage, les référents métier, les autorités et les tiers concernés : la liste alimente le mandat de projet." action={ajouterBouton} />} />
      </Carte>
      {fiche && (
        <PanneauFiche titre={existe(fiche) ? "Partie prenante" : "Nouvelle partie prenante"} initial={fiche} champs={champs} onFermer={() => setFiche(null)}
          onEnregistrer={(v) => {
            const propre = { ...v, personneId: v.personneId || undefined, entrepriseId: v.entrepriseId || undefined, nom: v.nom?.trim() || undefined };
            if (existe(v)) modifier("partiesPrenantes", v.id, propre); else ajouter("partiesPrenantes", propre);
            setFiche(null);
          }}
          onSupprimer={existe(fiche) ? async () => { if (await supprimer("partiesPrenantes", fiche.id, { quoi: "la partie prenante" })) setFiche(null); } : undefined} />
      )}
    </>
  );
}
