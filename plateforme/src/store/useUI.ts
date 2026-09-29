import { create } from "zustand";

interface EtatUI {
  assistantOuvert: boolean;
  /** Question envoyée à l'assistant depuis une autre page (bouton « Analyser avec l'IA ») */
  questionEnAttente: string | null;
  paletteOuverte: boolean;
  ouvrirAssistant: (question?: string) => void;
  fermerAssistant: () => void;
  consommerQuestion: () => string | null;
  setPalette: (v: boolean) => void;
}

export const useUI = create<EtatUI>((set, get) => ({
  assistantOuvert: false,
  questionEnAttente: null,
  paletteOuverte: false,
  ouvrirAssistant: (question) => set({ assistantOuvert: true, questionEnAttente: question ?? null }),
  fermerAssistant: () => set({ assistantOuvert: false }),
  consommerQuestion: () => {
    const q = get().questionEnAttente;
    if (q) set({ questionEnAttente: null });
    return q;
  },
  setPalette: (v) => set({ paletteOuverte: v }),
}));
