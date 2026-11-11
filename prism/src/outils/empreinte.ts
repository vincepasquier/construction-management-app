/** Empreinte SHA-256 d'un texte, en hexadécimal */
export async function sha256(texte: string): Promise<string> {
  // Absent quand la page est servie en HTTP à un autre appareil : l'archivage se fait sur le poste
  if (!globalThis.crypto?.subtle) throw new Error("L'empreinte ne peut pas être calculée depuis cet appareil : faites l'opération sur le poste qui héberge PRISM.");
  const octets = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texte));
  return [...new Uint8Array(octets)].map((o) => o.toString(16).padStart(2, "0")).join("");
}
