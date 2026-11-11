// État de l'interface : panneaux ouverts, notifications passagères, confirmation en attente.
import { creerEtat } from "../donnees/etat";

export interface Avis {
  id: number;
  message: string;
  type: "info" | "succes" | "erreur";
  action?: { libelle: string; faire: () => void };
}

export interface DemandeConfirmation {
  titre: string;
  message: string;
  libelleAction: string;
  danger: boolean;
  /** Un motif est demandé, puis conservé dans le journal */
  motif: boolean;
  repondre: (reponse: false | { motif: string }) => void;
}

interface EtatUI {
  assistantOuvert: boolean;
  /** Question envoyée à l'assistant depuis une autre page */
  questionEnAttente: string | null;
  paletteOuverte: boolean;
  organigrammeOuvert: boolean;
  menuOuvert: boolean;
  avis: Avis[];
  confirmation: DemandeConfirmation | null;
}

export const ui = creerEtat<EtatUI>({
  assistantOuvert: false, questionEnAttente: null, paletteOuverte: false, organigrammeOuvert: false, menuOuvert: false,
  avis: [], confirmation: null,
});

let prochainAvis = 1;

/** Affiche une notification passagère, avec éventuellement une action (« Annuler ») */
export function notifier(message: string, type: Avis["type"] = "info", action?: Avis["action"]): void {
  const id = prochainAvis++;
  ui.ecrire({ avis: [...ui.lire().avis.slice(-3), { id, message, type, action }] });
  setTimeout(() => fermerAvis(id), type === "erreur" ? 9000 : 6000);
}

export function fermerAvis(id: number): void {
  ui.ecrire({ avis: ui.lire().avis.filter((a) => a.id !== id) });
}

/** Demande une confirmation dans la page. Renvoie `false` si l'utilisateur renonce. */
export function confirmer(o: { titre?: string; message: string; action?: string; danger?: boolean; motif?: boolean }): Promise<false | { motif: string }> {
  return new Promise((resolve) => {
    ui.ecrire({
      confirmation: {
        titre: o.titre ?? "Confirmer", message: o.message, libelleAction: o.action ?? "Confirmer", danger: o.danger ?? false, motif: o.motif ?? false,
        repondre: (r) => { ui.ecrire({ confirmation: null }); resolve(r); },
      },
    });
  });
}

/** Confirmation simple, sans motif : `if (await demander("Supprimer ?")) …` */
export function demander(message: string, action = "Confirmer", danger = true): Promise<boolean> {
  return confirmer({ message, action, danger }).then(Boolean);
}

export function ouvrirAssistant(question?: string): void {
  ui.ecrire({ assistantOuvert: true, questionEnAttente: question ?? null });
}

export function consommerQuestion(): string | null {
  const q = ui.lire().questionEnAttente;
  if (q) ui.ecrire({ questionEnAttente: null });
  return q;
}
