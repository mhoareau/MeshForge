import { describe, expect, it } from "vitest";
import {
  buildBulkContributorUsernames,
  buildContributorsCsv,
  validateBulkContributorRequest,
} from "./bulk-contributors";

describe("buildBulkContributorUsernames", () => {
  it("construit une séquence avec padding", () => {
    expect(
      buildBulkContributorUsernames({
        prefix: "P",
        start: 1,
        count: 3,
        digits: 3,
      }),
    ).toEqual(["P001", "P002", "P003"]);
  });

  it("conserve les nombres plus longs que le padding", () => {
    expect(
      buildBulkContributorUsernames({
        prefix: "RELAIS-",
        start: 99,
        count: 3,
        digits: 2,
      }),
    ).toEqual(["RELAIS-99", "RELAIS-100", "RELAIS-101"]);
  });
});

describe("validateBulkContributorRequest", () => {
  it("normalise le préfixe et accepte un lot valide", () => {
    expect(
      validateBulkContributorRequest({
        prefix: "  P  ",
        start: 1,
        count: 150,
        digits: 3,
      }),
    ).toEqual({ prefix: "P", start: 1, count: 150, digits: 3 });
  });

  it.each([
    [{ prefix: "", start: 1, count: 1, digits: 3 }, "Préfixe"],
    [{ prefix: "P/", start: 1, count: 1, digits: 3 }, "Préfixe"],
    [{ prefix: "P", start: -1, count: 1, digits: 3 }, "Premier numéro"],
    [{ prefix: "P", start: 1, count: 0, digits: 3 }, "Quantité"],
    [{ prefix: "P", start: 1, count: 201, digits: 3 }, "Quantité"],
    [{ prefix: "P", start: 1, count: 1, digits: 0 }, "Padding"],
  ])("refuse les paramètres invalides", (input, message) => {
    expect(() => validateBulkContributorRequest(input)).toThrow(message);
  });

  it("refuse un identifiant final dépassant 32 caractères", () => {
    expect(() =>
      validateBulkContributorRequest({
        prefix: "x".repeat(30),
        start: 1,
        count: 1,
        digits: 3,
      }),
    ).toThrow("32 caractères");
  });
});

describe("buildContributorsCsv", () => {
  it("produit un CSV UTF-8 compatible avec les tableurs français", () => {
    const csv = buildContributorsCsv([
      { username: "P001", password: "tek-rab-mon-47" },
      { username: "P002", password: "sav-gut-ler-82" },
    ]);

    expect(csv).toBe(
      "\uFEFFnom;identifiant_mqtt;mot_de_passe\r\n" +
        "P001;P001;tek-rab-mon-47\r\n" +
        "P002;P002;sav-gut-ler-82\r\n",
    );
  });
});
