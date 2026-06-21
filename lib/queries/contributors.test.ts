import { describe, it, expect } from "vitest";
import { canLogin, isValidUsername } from "./contributors";
import type { ContributorAuth } from "./contributors";

const admin: ContributorAuth = {
  username: "robin",
  password: "$2b$12$hash",
  role: "ADMIN",
  isActive: true,
};

describe("canLogin — autorisation (actif + bon rôle)", () => {
  it("autorise un admin actif pour le rôle ADMIN", () => {
    expect(canLogin(admin, "ADMIN")).toBe(true);
  });

  it("refuse un admin désactivé", () => {
    expect(canLogin({ ...admin, isActive: false }, "ADMIN")).toBe(false);
  });

  it("refuse un USER qui tente un accès ADMIN", () => {
    expect(canLogin({ ...admin, role: "USER" }, "ADMIN")).toBe(false);
  });

  it("respecte le rôle demandé", () => {
    expect(canLogin({ ...admin, role: "USER" }, "USER")).toBe(true);
  });
});

describe("isValidUsername — format username", () => {
  it("accepte alphanumérique + _ - (3 à 32)", () => {
    expect(isValidUsername("robin")).toBe(true);
    expect(isValidUsername("relay_a1b2c3")).toBe(true);
    expect(isValidUsername("ab-_-CD")).toBe(true);
  });

  it("refuse trop court, trop long, ou caractères interdits", () => {
    expect(isValidUsername("ab")).toBe(false);
    expect(isValidUsername("a".repeat(33))).toBe(false);
    expect(isValidUsername("robin lebon")).toBe(false);
    expect(isValidUsername("robin'; DROP")).toBe(false);
    expect(isValidUsername("")).toBe(false);
  });
});
