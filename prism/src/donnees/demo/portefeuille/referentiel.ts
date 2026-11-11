// Personnes et entreprises du portefeuille de démonstration. Tout est fictif : les noms, les
// adresses de messagerie et les numéros d'identification ne désignent personne.
import { ID_PROPRIETAIRE } from "../../../domaine/data/demo";
import type { Entreprise, Personne, ProfilAcces, Role } from "../../../domaine/types";

export const VINCENT = ID_PROPRIETAIRE;

const p = (id: string, nom: string, role: Role, fonction: string, directionId: string, profil: ProfilAcces, capacite = 100, perimetre: "tous" | string[] = [directionId]): Personne => ({
  id, nom, role, fonction, email: `${nom.split(" ")[0][0].toLowerCase()}.${nom.split(" ").slice(1).join("").toLowerCase().normalize("NFD").replace(/[^a-z]/g, "")}@exemple.ch`, organisation: "Groupe", capacite, directionId,
  acces: perimetre === "tous" ? { profil, projets: "tous", modules: {} } : { profil, projets: [], directions: perimetre, modules: {} },
});

export const PERSONNES: Personne[] = [
  { ...p(VINCENT, "Vincent Pasquier", "Directeur de projet", "Chef de projet Solutions Energie", "dir-dse", "Administrateur", 100, "tous"), email: "" },
  p("pf-dg", "Paul Gremaud", "Maître d'ouvrage", "Directeur général", "dir-dg", "ComInv", 10, "tous"),
  p("pf-pmo", "Hélène Marchand", "Assistant(e) de projet", "Responsable PMO", "dir-dg", "PMO", 100, "tous"),
  p("pf-fin", "Olivier Schwab", "Ingénieur", "Contrôleur de gestion", "dir-dfi", "Finance", 100, "tous"),
  p("pf-dir-den", "François Morard", "Maître d'ouvrage", "Directeur Énergie", "dir-den", "Direction", 15),
  p("pf-dir-dde", "Christine Baeriswyl", "Maître d'ouvrage", "Directrice Distribution Electricité", "dir-dde", "Direction", 15),
  p("pf-dir-dse", "Isabelle Roten", "Maître d'ouvrage", "Directrice Solutions Energie", "dir-dse", "Direction", 15),
  p("pf-dir-dfi", "Marc Jungo", "Maître d'ouvrage", "Directeur Finance et Informatique", "dir-dfi", "Direction", 15),
  p("pf-dir-dgc", "Sylvie Clément", "Maître d'ouvrage", "Directrice Gouvernance et communication", "dir-dgc", "Direction", 15),
  p("pf-aymon", "Lucien Aymon", "Directeur de projet", "Chef de projet aménagements hydrauliques", "dir-den", "Directeur de projet"),
  p("pf-berset", "Maude Berset", "Directeur de projet", "Cheffe de projet chaleur à distance", "dir-den", "Directeur de projet"),
  p("pf-keller", "Thomas Keller", "Directeur de projet", "Chef de projet lignes", "dir-dde", "Directeur de projet"),
  p("pf-oberson", "Samuel Oberson", "Directeur de projet", "Chef de projet postes", "dir-dde", "Directeur de projet"),
  p("pf-dubois", "Amélie Dubois", "Directeur de projet", "Cheffe de projet numérique", "dir-dfi", "Directeur de projet"),
  p("pf-crettaz", "Nathalie Crettaz", "Directeur de projet", "Responsable communication institutionnelle", "dir-dgc", "Directeur de projet", 80),
  p("pf-savioz", "Bernard Savioz", "Directeur de projet", "Secrétaire général", "dir-dg", "Directeur de projet", 40),
  p("pf-favre", "Luca Favre", "Conducteur de travaux", "Conducteur de travaux, ouvrages hydrauliques", "dir-den", "Responsable de lot"),
  p("pf-rey", "Julie Rey", "Ingénieur", "Ingénieure hydraulicienne", "dir-den", "Collaborateur"),
  p("pf-bapst", "Cédric Bapst", "Conducteur de travaux", "Conducteur de travaux, réseaux de chaleur", "dir-den", "Responsable de lot"),
  p("pf-monney", "David Monney", "Conducteur de travaux", "Conducteur de travaux, réseaux électriques", "dir-dde", "Responsable de lot"),
  p("pf-gachoud", "Élise Gachoud", "Conducteur de travaux", "Conductrice de travaux, installations techniques", "dir-dse", "Responsable de lot"),
  p("pf-perret", "Nadia Perret", "Ingénieur", "Ingénieure en technique du bâtiment", "dir-dse", "Collaborateur"),
  p("pf-wicht", "Anne Wicht", "Ingénieur", "Juriste, droit de la construction et du foncier", "dir-dgc", "Collaborateur", 60, "tous"),
];

const e = (id: string, nom: string, localite: string, contact: string, specialites: string[], n: number, categorie: Entreprise["categorie"] = "Entreprise"): Entreprise => ({
  id, nom, localite, contact, email: `info@${nom.toLowerCase().normalize("NFD").replace(/[^a-z]+/g, "-").replace(/-(sa|sarl)$/, "").replace(/^-|-$/g, "").slice(0, 24)}.example`, telephone: `026 000 ${String(10 + n).padStart(2, "0")} ${String(n * 7 % 100).padStart(2, "0")}`,
  ide: `CHE-100.${String(200 + n).padStart(3, "0")}.${String(n * 37 % 1000).padStart(3, "0")}`, specialites, categorie,
});

export const ENTREPRISES: Entreprise[] = [
  e("e-gc1", "Génie Civil du Lac SA", "Morat", "P. Schmutz", ["Génie civil", "Ouvrages d'art"], 1),
  e("e-gc2", "Constructions Sarine SA", "Fribourg", "A. Carron", ["Gros œuvre", "Génie civil"], 2),
  e("e-gc3", "Travaux Publics Gruyère SA", "Bulle", "D. Rey", ["Terrassements", "Travaux routiers", "Fouilles"], 3),
  e("e-for", "Forages et Sondages SA", "Romont", "J. Dafflon", ["Sondages carottés", "Injections", "Forages dirigés"], 4),
  e("e-hyd1", "Hydro-Mécanique Alpine SA", "Vevey", "E. Morel", ["Vannes", "Conduites forcées", "Équipements hydromécaniques"], 5),
  e("e-hyd2", "Turbines & Vannes SA", "Kriens", "M. Steiner", ["Turbines", "Vannes"], 6),
  e("e-elec1", "Électro-Montage Romand SA", "Lausanne", "F. Chappuis", ["Installations électriques", "Contrôle-commande"], 7),
  e("e-elec2", "Postes & Réseaux SA", "Berne", "S. Aebischer", ["Postes haute tension", "Jonctions de câbles"], 8),
  e("e-cab", "Câbles Souterrains SA", "Cossonay", "L. Favez", ["Câbles haute tension"], 9),
  e("e-lig", "Lignes Aériennes Suisse SA", "Olten", "R. Kaufmann", ["Lignes aériennes", "Démontage de pylônes"], 10),
  e("e-trafo", "Transformateurs Helvétiques SA", "Baden", "U. Meier", ["Transformateurs de puissance"], 11),
  e("e-cvc1", "Thermo-Technique SA", "Fribourg", "G. Pittet", ["Chauffage", "Ventilation", "Froid"], 12),
  e("e-cvc2", "Climat & Chaleur Sàrl", "Bulle", "C. Overney", ["Ventilation", "Chauffage"], 13),
  e("e-tuy1", "Conduites à Distance SA", "Yverdon-les-Bains", "N. Jaquier", ["Conduites préisolées", "Soudure"], 14),
  e("e-tuy2", "Réseaux Thermiques Romands SA", "Payerne", "B. Rapin", ["Réseaux de chaleur"], 15),
  e("e-chaud", "Chaudières Bois Énergie SA", "Châtel-Saint-Denis", "H. Genoud", ["Chaudières à bois", "Filtres à particules"], 16),
  e("e-pac", "Pompes à chaleur Industrielles SA", "Winterthour", "T. Huber", ["Pompes à chaleur de grande puissance"], 17),
  e("e-reg", "Régulation & Automation SA", "Givisiez", "V. Schaller", ["Régulation", "Télégestion", "Automation du bâtiment"], 18),
  e("e-charp", "Charpentes du Gibloux SA", "Farvagny", "I. Clerc", ["Charpente", "Façades", "Toiture"], 19),
  e("e-ing1", "Ingénieurs Hydrauliciens Associés SA", "Lausanne", "H. Blanc", ["Aménagements hydroélectriques", "Barrages"], 20, "Mandataire"),
  e("e-ing2", "Bureau d'ingénieurs civils du Moléson SA", "Bulle", "O. Gremion", ["Génie civil", "Structures"], 21, "Mandataire"),
  e("e-ing3", "Ingénieurs-conseils en électricité SA", "Fribourg", "K. Brülhart", ["Haute tension", "Postes et lignes"], 22, "Mandataire"),
  e("e-ing4", "Bureau technique CVC Romand SA", "Fribourg", "W. Egger", ["Chauffage, ventilation, climatisation", "Réseaux de chaleur"], 23, "Mandataire"),
  e("e-geo", "Géologie & Géotechnique SA", "Fribourg", "Y. Piller", ["Géologie", "Hydrogéologie", "Auscultation"], 24, "Mandataire"),
  e("e-env", "Écologie appliquée Sàrl", "Neuchâtel", "Z. Humbert", ["Études d'impact", "Suivi environnemental"], 25, "Mandataire"),
  e("e-arch", "Atelier d'architecture du Bourg SA", "Fribourg", "Q. Mauron", ["Architecture", "Direction des travaux"], 26, "Mandataire"),
];
