// Réduction des photographies avant stockage : une photo de téléphone pèse plusieurs mégaoctets,
// le navigateur n'en garderait que quelques centaines. Ramenée à 1600 px en JPEG, elle reste
// lisible à l'écran et à l'impression pour environ 300 Ko.

export const COTE_MAX = 1600;
export const QUALITE_JPEG = 0.8;

/** Dimensions réduites dans les proportions, sans jamais agrandir */
export function dimensionsReduites(largeur: number, hauteur: number, max = COTE_MAX): { largeur: number; hauteur: number } {
  const grand = Math.max(largeur, hauteur);
  if (!(grand > max)) return { largeur, hauteur };
  const f = max / grand;
  return { largeur: Math.max(1, Math.round(largeur * f)), hauteur: Math.max(1, Math.round(hauteur * f)) };
}

/**
 * Photo compressée. Si le navigateur ne sait pas décoder l'image (format inconnu, environnement
 * sans canevas), ou si la compression n'apporte rien, le fichier d'origine est rendu tel quel.
 */
export async function compresserPhoto(fichier: Blob, max = COTE_MAX, qualite = QUALITE_JPEG): Promise<Blob> {
  if (!fichier.type.startsWith("image/") || fichier.type === "image/svg+xml" || typeof createImageBitmap !== "function" || typeof document === "undefined") return fichier;
  try {
    const image = await createImageBitmap(fichier, { imageOrientation: "from-image" });
    const { largeur, hauteur } = dimensionsReduites(image.width, image.height, max);
    const canevas = document.createElement("canvas");
    canevas.width = largeur; canevas.height = hauteur;
    const ctx = canevas.getContext("2d");
    if (!ctx) return fichier;
    ctx.drawImage(image, 0, 0, largeur, hauteur);
    image.close?.();
    const reduit = await new Promise<Blob | null>((resoudre) => canevas.toBlob(resoudre, "image/jpeg", qualite));
    return reduit && reduit.size < fichier.size ? reduit : fichier;
  } catch {
    return fichier;
  }
}

export function formatTaille(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
  return `${(octets / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`;
}
