// Qualité des données : anomalies relevées par domaine et par propriétaire, avec le lien pour les
// corriger. Une donnée maîtrisée par le système source se corrige à la source, pas ici.
import { CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TableDonnees, type Colonne } from "@/app/table/TableDonnees";
import { Badge, Carte, Indicateur, Vide, type CouleurBadge } from "@/app/ui";
import { aujourdhui } from "@/domaine/lib/format";
import { projetsAccessibles } from "@/domaine/socle/droits";
import { useDerive, useDonnees, useUtilisateur } from "@/donnees/hooks";
import { bilan, controler, type Anomalie, type Gravite } from "@/donnees/qualite";
import { COLLECTIONS } from "@/donnees/schema";

const COULEUR: Record<Gravite, CouleurBadge> = { Bloquant: "rouge", "À corriger": "orange", "À vérifier": "gris" };

export function Qualite() {
  const { projets, personnes } = useDonnees();
  const utilisateur = useUtilisateur();
  const navigate = useNavigate();
  const jour = aujourdhui();
  const visibles = projetsAccessibles(utilisateur, projets.filter((p) => !p.archive));
  const anomalies = useDerive((depot, suivre) => {
    // Les contrôles parcourent toute la base : ils sont refaits à chaque écriture
    for (const c of COLLECTIONS) suivre(c);
    return controler(depot, visibles, jour);
  }, [visibles.map((p) => p.id).join("|"), jour]);
  const b = bilan(anomalies);
  const code = (id?: string) => projets.find((p) => p.id === id)?.code ?? "";
  const nom = (id?: string) => personnes.find((p) => p.id === id)?.nom ?? "Sans propriétaire";

  const colonnes: Colonne<Anomalie>[] = [
    { id: "gravite", titre: "Gravité", valeur: (a) => a.gravite, rendu: (a) => <Badge couleur={COULEUR[a.gravite]}>{a.gravite}</Badge>, groupable: true, largeur: "8rem" },
    { id: "domaine", titre: "Domaine", valeur: (a) => a.domaine, groupable: true },
    { id: "controle", titre: "Contrôle", valeur: (a) => a.controle, groupable: true, masquee: true },
    { id: "projet", titre: "Projet", valeur: (a) => code(a.projetId), groupable: true },
    { id: "objet", titre: "Objet", valeur: (a) => a.objet },
    { id: "message", titre: "Anomalie", valeur: (a) => a.message },
    { id: "proprietaire", titre: "Propriétaire", valeur: (a) => nom(a.proprietaireId), groupable: true },
    { id: "ou", titre: "Où corriger", valeur: (a) => (a.aLaSource ? "Système source" : "PRISM"), rendu: (a) => <Badge couleur={a.aLaSource ? "bleu" : "gris"}>{a.aLaSource ? "Système source" : "PRISM"}</Badge>, groupable: true },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Indicateur libelle="Anomalies" valeur={b.total} detail={`${visibles.length} projets contrôlés`} tendance={b.total ? "alerte" : "bon"} />
        <Indicateur libelle="Bloquantes" valeur={b.parGravite.Bloquant} tendance={b.parGravite.Bloquant ? "mauvais" : "bon"} />
        <Indicateur libelle="À corriger" valeur={b.parGravite["À corriger"]} />
        <Indicateur libelle="À vérifier" valeur={b.parGravite["À vérifier"]} />
        <Indicateur libelle="À corriger à la source" valeur={b.aLaSource} detail="hors de PRISM" />
      </div>
      <Carte>
        <TableDonnees id="qualite" lignes={anomalies} colonnes={colonnes} cle={(a) => a.cle} grouperPar="domaine" onOuvrir={(a) => a.lien && navigate(a.lien)}
          vide={<Vide icone={<CheckCircle2 size={22} />} titre="Aucune anomalie" texte="Complétude, cohérence, unicité et fraîcheur : tous les contrôles passent sur les projets de votre périmètre." />} />
      </Carte>
      <p className="text-xs text-slate-500">Contrôles : champs obligatoires, dates, unicité des codes et des numéros de facture, dépassement des contrats, écart avec le système source au-delà de 5 %, fraîcheur de la synchronisation (7 jours), revue des risques, mesures et jalons échus, corrections locales à reporter dans la source.</p>
    </div>
  );
}
