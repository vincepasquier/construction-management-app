// Jeu d'essai d'origine (les deux projets de Chantier+ et quelques projets de la source) : il sert
// aux tests. La démonstration proposée à l'utilisateur est le portefeuille de demo/portefeuille.
import { aujourdhui } from "../../domaine/lib/format";
import { dataPlatformSimulee } from "../connecteurs/dataPlatformSimulee";
import { importerProjet, synchroniser } from "../connecteurs/synchro";
import type { Depot, Operation } from "../depot";
import { importer, installerReferentiels } from "../initialisation";
import { session } from "../session";
import { installerChantierDemo } from "./chantier";
import { installerGouvernanceDemo } from "./gouvernance";
import { COMPLEMENTS_SOURCE, docsDemo, NUMEROS_DEMO, UTILISATEUR_DEMO } from "./index";

/**
 * Charge le jeu de démonstration et le synchronise avec la source simulée. Avec `gouvernance`,
 * les projets reçoivent aussi mandats, périodes, rapports, séances et décisions ; avec `chantier`,
 * le projet de route reçoit deux semaines de suivi de chantier.
 */
export async function chargerDemo(depot: Depot, o: { gouvernance?: boolean; chantier?: boolean; jour?: string } = {}): Promise<void> {
  installerReferentiels(depot);
  importer(depot, docsDemo(), "Chargement des données de démonstration");
  const horodatage = new Date().toISOString();
  for (const numero of NUMEROS_DEMO) await importerProjet(depot, dataPlatformSimulee, numero, horodatage);
  const complements: Operation[] = [];
  for (const p of depot.tous("projets")) {
    const c = p.numeroSource ? COMPLEMENTS_SOURCE[p.numeroSource] : undefined;
    if (c) complements.push({ op: "modifier", collection: "projets", id: p.id, patch: c as Record<string, unknown> });
  }
  depot.executer({ libelle: "Compléments de démonstration", origine: "systeme", operations: complements, sansDetail: true });
  await synchroniser(depot, dataPlatformSimulee, { horodatage });
  session.ecrire({ utilisateurId: UTILISATEUR_DEMO, dernierProjetId: null });
  depot.acteurId = UTILISATEUR_DEMO;
  if (o.gouvernance) installerGouvernanceDemo(depot, o.jour ?? aujourdhui());
  if (o.chantier) await installerChantierDemo(depot, o.jour ?? aujourdhui());
}
