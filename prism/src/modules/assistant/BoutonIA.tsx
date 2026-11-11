import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { ouvrirAssistant } from "@/app/etatUI";
import { Bouton } from "@/app/ui";
import { useDroit } from "@/donnees/hooks";

/** Ouvre l'assistant IA avec une question préparée ; masqué si l'utilisateur n'a pas accès à l'IA */
export function BoutonIA({ question, children, variante }: { question: string; children: ReactNode; variante?: "primaire" | "secondaire" }) {
  const { lire } = useDroit("ia");
  if (!lire) return null;
  return <Bouton libre variante={variante} icone={<Sparkles size={15} />} onClick={() => ouvrirAssistant(question)}>{children}</Bouton>;
}
