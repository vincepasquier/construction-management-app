// Registre des archives : archiver un projet, consulter une archive dans le lecteur, contrôler sa
// restaurabilité, la télécharger, désarchiver, et l'éliminer une fois la durée de conservation écoulée.
import { Archive, Download, Eye, PackagePlus, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { confirmer, notifier } from "@/app/etatUI";
import { Alerte, Badge, Bouton, Carte, Champ, EnTetePage, Liste, Panneau, Saisie, Tableau, useLectureSeule, Vide, Zone } from "@/app/ui";
import { aujourdhui, formatDate } from "@/domaine/lib/format";
import { accesDe, projetsAccessibles } from "@/domaine/socle/droits";
import type { ArchiveRegistre } from "@/domaine/socle/types";
import { archiverProjet, chercherDansArchive, controlerArchive, desarchiver, eliminerArchive, finConservation, ouvrirArchive, verifierArchive, type ResultatControle } from "@/donnees/archive";
import { useDepot, useDonnees, useUtilisateur } from "@/donnees/hooks";
import { telechargerBlob } from "@/outils/telechargement";
import { Lecteur } from "./Lecteur";

export function Archives() {
  const depot = useDepot();
  const { archives, projets, personnes, configurations } = useDonnees();
  const utilisateur = useUtilisateur();
  const lecture = useLectureSeule();
  const [ouverte, setOuverte] = useState<{ archive: ArchiveRegistre; resultat: ResultatControle } | null>(null);
  const [aArchiver, setAArchiver] = useState<{ projetId: string; motif: string } | null>(null);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [requete, setRequete] = useState("");
  const [trouves, setTrouves] = useState<{ archive: ArchiveRegistre; n: number; extrait: string }[] | null>(null);

  const annees = configurations.find((c) => c.id === "courante")?.conservationAnnees ?? 10;
  const jour = aujourdhui();
  const admin = !!utilisateur && accesDe(utilisateur).profil === "Administrateur";
  // Une archive n'est visible que de ceux qui pouvaient voir le projet
  const visibles = new Set(projetsAccessibles(utilisateur, projets).map((p) => p.id));
  const liste = archives.filter((a) => visibles.has(a.projetId) || !projets.some((p) => p.id === a.projetId)).sort((a, b) => b.date.localeCompare(a.date));
  const archivables = projetsAccessibles(utilisateur, projets.filter((p) => !p.archive && !p.parentId)).sort((a, b) => a.code.localeCompare(b.code));
  const nom = (id?: string) => personnes.find((p) => p.id === id)?.nom ?? "—";

  const faire = async (cle: string, action: () => Promise<void>) => {
    setEnCours(cle);
    try { await action(); } catch (e) { notifier(e instanceof Error ? e.message : "Opération impossible.", "erreur"); } finally { setEnCours(null); }
  };
  const archiver = () => aArchiver && faire("archiver", async () => {
    const a = await archiverProjet(depot, aArchiver.projetId, { motif: aArchiver.motif.trim() || undefined });
    setAArchiver(null);
    notifier(`Projet ${a.code} archivé : ${Object.values(a.manifeste).reduce((s, n) => s + n, 0)} enregistrements, empreinte ${a.empreinte.slice(0, 12)}…`, "succes");
  });
  const consulter = (a: ArchiveRegistre) => faire(`lire-${a.id}`, async () => setOuverte({ archive: a, resultat: await ouvrirArchive(depot, a) }));
  const controler = (a: ArchiveRegistre) => faire(`controle-${a.id}`, async () => {
    const r = await controlerArchive(depot, a);
    notifier(r.conforme ? `Archive ${a.code} conforme : empreinte et manifeste vérifiés.` : `Archive ${a.code} non conforme : ${r.ecarts[0]}`, r.conforme ? "succes" : "erreur");
  });
  const telecharger = (a: ArchiveRegistre) => faire(`dl-${a.id}`, async () => {
    const f = await depot.lireFichier(a.fichierId);
    if (!f) throw new Error("Le fichier de cette archive est introuvable dans ce navigateur.");
    telechargerBlob(f.nom, f.donnees);
  });
  const rendre = async (a: ArchiveRegistre) => {
    const r = await confirmer({ titre: `Désarchiver ${a.code}`, message: "Le projet redevient modifiable. L'archive reste au registre, telle qu'elle a été figée.", action: "Désarchiver", motif: true });
    if (r) { desarchiver(depot, a, r.motif); notifier(`Projet ${a.code} désarchivé.`, "succes"); }
  };
  const eliminer = async (a: ArchiveRegistre) => {
    const r = await confirmer({ titre: `Éliminer l'archive ${a.code}`, message: "La durée de conservation est écoulée. L'archive et toutes les données du projet seront supprimées définitivement de PRISM.", action: "Éliminer", danger: true, motif: true });
    if (r) void faire(`suppr-${a.id}`, async () => { await eliminerArchive(depot, a, r.motif, jour); notifier(`Archive ${a.code} éliminée.`, "succes"); });
  };
  const chercher = () => faire("recherche", async () => {
    const out: { archive: ArchiveRegistre; n: number; extrait: string }[] = [];
    for (const a of liste) {
      const r = await verifierArchive(depot, a);
      const t = r.contenu ? chercherDansArchive(r.contenu, requete) : [];
      if (t.length) out.push({ archive: a, n: t.length, extrait: t[0].extrait });
    }
    setTrouves(out);
  });

  if (ouverte) return <Lecteur archive={ouverte.archive} resultat={ouverte.resultat} onFermer={() => setOuverte(null)} />;

  return (
    <>
      <EnTetePage titre="Archives" description={`Projets figés dans un format ouvert, scellés par une empreinte ; conservation ${annees} ans`}
        actions={!lecture && <Bouton variante="primaire" icone={<PackagePlus size={15} />} disabled={archivables.length === 0} onClick={() => setAArchiver({ projetId: archivables.find((p) => p.statut === "Terminé")?.id ?? archivables[0].id, motif: "" })}>Archiver un projet</Bouton>} />

      {liste.length > 0 && (
        <form className="mb-5 flex max-w-2xl gap-2" onSubmit={(e) => { e.preventDefault(); if (requete.trim().length > 1) void chercher(); }}>
          <Saisie libre aria-label="Rechercher dans les archives" placeholder="Rechercher dans le contenu de toutes les archives…" value={requete} onChange={(e) => { setRequete(e.target.value); setTrouves(null); }} />
          <Bouton libre type="submit" disabled={requete.trim().length < 2 || enCours === "recherche"}>Rechercher</Bouton>
        </form>
      )}
      {trouves && (
        <Carte className="mb-5" titre={`« ${requete} » : ${trouves.length} archive(s)`}>
          {trouves.length === 0 ? <p className="px-5 py-4 text-sm text-slate-500">Aucune archive ne contient ces termes.</p> : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">{trouves.map((t) => (
              <li key={t.archive.id}><button type="button" className="flex w-full items-center gap-3 px-5 py-2.5 text-left hover:bg-slate-50/70 dark:hover:bg-slate-800/40" onClick={() => consulter(t.archive)}><span className="font-medium text-brand-600">{t.archive.code}</span><span className="min-w-0 flex-1 truncate text-sm text-slate-600 dark:text-slate-300">…{t.extrait}…</span><Badge>{t.n} occurrence(s)</Badge></button></li>
            ))}</ul>
          )}
        </Carte>
      )}

      <Carte>
        {liste.length === 0 ? <Vide icone={<Archive size={22} />} titre="Aucune archive" texte="Archiver un projet écrit toutes ses données dans un fichier JSON documenté, le scelle par une empreinte et rend le projet non modifiable. L'archive se relit ici, sans dépendre du reste de l'application." /> : (
          <Tableau>
            <thead><tr><th>Projet</th><th>Archivé le</th><th className="text-right">Enregistrements</th><th>Empreinte SHA-256</th><th>Dernier contrôle</th><th>Conservation</th><th /></tr></thead>
            <tbody>{liste.map((a) => {
              const fin = finConservation(a, annees);
              const encoreArchive = !!projets.find((p) => p.id === a.projetId)?.archive;
              return (
                <tr key={a.id}>
                  <td><span className="font-medium text-slate-900 dark:text-white">{a.code}</span> <span className="text-slate-500">{a.nom}</span>{!encoreArchive && <span className="ml-2"><Badge couleur="orange" titre="Le projet a été désarchivé : cette archive garde son état d'alors">projet désarchivé</Badge></span>}</td>
                  <td>{formatDate(a.date)}<span className="block text-xs text-slate-500">{nom(a.auteurId)}</span></td>
                  <td className="text-right num">{Object.values(a.manifeste).reduce((s, n) => s + n, 0)}<span className="block text-xs text-slate-500">{(a.taille / 1024).toFixed(0)} Ko</span></td>
                  <td className="font-mono text-xs text-slate-500" title={a.empreinte}>{a.empreinte.slice(0, 16)}…</td>
                  <td>{a.dernierControle ? <Badge couleur={a.dernierControle.conforme ? "vert" : "rouge"}>{a.dernierControle.conforme ? "Conforme" : "Non conforme"} · {formatDate(a.dernierControle.date)}</Badge> : <span className="text-xs text-slate-400">jamais contrôlée</span>}</td>
                  <td className="text-sm">jusqu'au {formatDate(fin)}</td>
                  <td className="whitespace-nowrap text-right">
                    <Bouton libre taille="sm" variante="fantome" icone={<Eye size={14} />} disabled={enCours === `lire-${a.id}`} onClick={() => consulter(a)}>Consulter</Bouton>
                    <Bouton libre taille="sm" variante="fantome" icone={<ShieldCheck size={14} />} disabled={lecture || enCours === `controle-${a.id}`} onClick={() => controler(a)}>Contrôler</Bouton>
                    <Bouton libre taille="sm" variante="fantome" icone={<Download size={14} />} onClick={() => telecharger(a)} title="Télécharger le fichier d'archive (JSON)" />
                    {admin && encoreArchive && <Bouton taille="sm" variante="fantome" onClick={() => rendre(a)}>Désarchiver</Bouton>}
                    {admin && jour >= fin && <Bouton taille="sm" variante="fantome" className="text-rose-600" onClick={() => eliminer(a)}>Éliminer</Bouton>}
                  </td>
                </tr>
              );
            })}</tbody>
          </Tableau>
        )}
      </Carte>
      <p className="mt-4 text-xs text-slate-500">Les documents ne sont pas copiés dans l'archive : ils restent dans SharePoint, sous ses propres règles de versions et de conservation. L'archive garde leurs liens et leurs métadonnées.</p>

      {aArchiver && (
        <Panneau ouverte onFermer={() => setAArchiver(null)} titre="Archiver un projet"
          pied={<><Bouton libre onClick={() => setAArchiver(null)}>Annuler</Bouton><Bouton variante="primaire" disabled={enCours === "archiver"} onClick={archiver}>Archiver</Bouton></>}>
          <div className="space-y-4">
            <Champ libelle="Projet"><Liste value={aArchiver.projetId} onChange={(e) => setAArchiver({ ...aArchiver, projetId: e.target.value })}>{archivables.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.nom}{p.statut ? ` (${p.statut.toLowerCase()})` : ""}</option>)}</Liste></Champ>
            <Champ libelle="Motif" aide="Conservé au journal avec l'opération"><Zone rows={2} value={aArchiver.motif} onChange={(e) => setAArchiver({ ...aArchiver, motif: e.target.value })} placeholder="Projet clôturé, rapport de clôture validé…" /></Champ>
            <Alerte type="info">Le projet et ses sous-projets deviennent non modifiables et quittent le portefeuille. Leurs données restent consultables ici ; un administrateur peut désarchiver le projet, avec un motif.</Alerte>
          </div>
        </Panneau>
      )}
    </>
  );
}
