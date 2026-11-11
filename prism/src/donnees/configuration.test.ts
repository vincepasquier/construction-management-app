import { beforeEach, describe, expect, it } from "vitest";
import { criticite, definirSeuilsCriticite } from "../domaine/lib/risques";
import { controlerConfiguration, courante, mesurerImpact, publier, retablir, versions } from "./configuration";
import { Depot } from "./depot";
import { chargerDemo } from "./initialisation";
import { REGLES, autoriser } from "./regles";
import { StockageMemoire } from "./stockage";

const JOUR = "2026-11-11";
let depot: Depot;
beforeEach(async () => {
  definirSeuilsCriticite(undefined);
  depot = new Depot(new StockageMemoire(), { autoriser, regles: REGLES });
  await depot.ouvrir();
  await chargerDemo(depot, { gouvernance: true, jour: JOUR });
});

describe("configuration versionnée", () => {
  it("mesure l'effet d'un brouillon avant publication, sans rien écrire", () => {
    const c = courante(depot)!;
    const avant = depot.journal.length;
    const identique = mesurerImpact(depot, c, JOUR);
    expect(identique.sante).toEqual([]);
    expect(identique.completudeMoyenne.avant).toBe(identique.completudeMoyenne.apres);
    const tolerant = mesurerImpact(depot, { ...c, seuilsSante: { surveiller: 50, critique: 80 }, matriceRisques: { modere: 4, eleve: 9, critique: 25 }, joursRevueRisque: 5, criteresCompletude: c.criteresCompletude.map((x) => (x.regle === "mandatSigne" ? { ...x, actif: false } : x)) }, JOUR);
    expect(tolerant.risquesCritiques.apres).toBeLessThan(tolerant.risquesCritiques.avant);
    expect(tolerant.risquesARevoir.apres).toBeGreaterThan(tolerant.risquesARevoir.avant);
    expect(tolerant.completudeMoyenne.apres).toBeGreaterThanOrEqual(tolerant.completudeMoyenne.avant);
    expect(depot.journal.length).toBe(avant);
  });

  it("refuse une configuration incohérente ou une publication sans commentaire", () => {
    const c = courante(depot)!;
    expect(controlerConfiguration(c)).toEqual([]);
    expect(controlerConfiguration({ ...c, matriceRisques: { modere: 9, eleve: 9, critique: 15 } })[0]).toContain("croissants");
    expect(() => publier(depot, { ...c, seuilVariationPct: 0 }, "Essai")).toThrow(/seuil de variation/);
    expect(() => publier(depot, c, "  ")).toThrow(/Décrivez/);
    expect(courante(depot)!.version).toBe(1);
  });

  it("publie une nouvelle version, garde la précédente et sait y revenir", () => {
    const c = courante(depot)!;
    const v2 = publier(depot, { ...c, seuilVariationPct: 5, matriceRisques: { modere: 5, eleve: 10, critique: 20 } }, "Seuils revus avec la Finance", "2026-11-11T09:00:00.000Z");
    expect(v2).toMatchObject({ version: 2, seuilVariationPct: 5, commentaire: "Seuils revus avec la Finance", auteurId: depot.acteurId });
    expect(courante(depot)!.seuilVariationPct).toBe(5);
    expect(versions(depot).map((x) => [x.version, x.seuilVariationPct])).toEqual([[1, 2]]);
    // La matrice publiée s'applique à l'évaluation des risques
    expect(criticite(16)).toBe("Élevée");
    const v3 = retablir(depot, 1, "2026-11-12T09:00:00.000Z");
    expect(v3).toMatchObject({ version: 3, seuilVariationPct: 2, commentaire: "Retour à la version 1" });
    expect(versions(depot).map((x) => x.version)).toEqual([2, 1]);
    expect(criticite(16)).toBe("Critique");
    expect(depot.journal.at(-1)).toMatchObject({ motif: "Retour à la version 1", irreversible: true });
  });
});
