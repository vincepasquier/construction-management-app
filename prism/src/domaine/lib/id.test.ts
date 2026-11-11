import { describe, expect, it, vi } from "vitest";
import { nouvelId } from "./id";

describe("identifiants", () => {
  it("donne un identifiant préfixé de douze caractères hexadécimaux, sans doublon", () => {
    const ids = new Set(Array.from({ length: 2000 }, () => nouvelId("ctr")));
    expect(ids.size).toBe(2000);
    expect([...ids].every((id) => /^ctr-[0-9a-f]{12}$/.test(id))).toBe(true);
  });
  it("fonctionne sans randomUUID, comme sur un appareil servi en HTTP", () => {
    const espion = vi.spyOn(crypto, "randomUUID").mockImplementation(() => { throw new Error("indisponible hors contexte sécurisé"); });
    try { expect(nouvelId("cst")).toMatch(/^cst-[0-9a-f]{12}$/); } finally { espion.mockRestore(); }
  });
});
