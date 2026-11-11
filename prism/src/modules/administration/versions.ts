/** Notes de publication, de la plus récente à la plus ancienne */
export const NOTES_DE_VERSION: { version: string; titre: string; points: string[] }[] = [
  { version: "0.5", titre: "Collaboration, traçabilité, archivage", points: ["Commentaires avec mentions, notifications, validations parallèles et délégations", "Journal d'audit consultable et exportable, qualité des données", "Archivage scellé et lecteur d'archive", "Configuration versionnée, couverture du cahier des charges"] },
  { version: "0.4", titre: "Gouvernance du groupe", points: ["Finances en synthèse, scénarios et périodes financières", "Mandat de projet, passages de phase, rapports, indice de complétude", "Séances, registre des décisions, ComInv", "Risques enrichis, jalons, charge et capacité", "Vues Finance, PMO, Direction et Conseil d'administration"] },
  { version: "0.3", titre: "Verticale construction", points: ["Finances par position, appels d'offres, contrats, planning, risques, documents, validations", "Assistant IA limité aux données que l'utilisateur peut lire"] },
  { version: "0.2", titre: "Socle projet", points: ["Portefeuille, fiche projet avec l'origine de chaque donnée, recherche globale", "Référentiels, types de projet, accès, source de projets simulée"] },
  { version: "0.1", titre: "Fondations", points: ["Dépôt de données avec droits, règles et journal ; sauvegarde et reprise des données Chantier+"] },
];
