import { pool } from "../db";

// Compte (USER ou ADMIN). `password` = bcrypt. Sert à l'auth web (role=ADMIN)
// et, via mosquitto-go-auth, à l'auth MQTT des nodes (role=USER).
export interface ContributorAuth {
  username: string;
  password: string; // bcrypt hash
  role: string;
  isActive: boolean;
}

export type Role = "ADMIN" | "USER";

// Autorisation : compte actif ET rôle requis (logique pure, testée). Volontaire-
// ment séparé de la requête : isAdmin() ET le login s'appuient dessus.
export function canLogin(row: ContributorAuth, requiredRole: Role): boolean {
  return row.isActive === true && row.role === requiredRole;
}

// Format username autorisé (anti-injection, réutilisé par create-admin et,
// plus tard, l'inscription). Alphanumérique + _ - , 3 à 32 caractères.
export function isValidUsername(s: string): boolean {
  return /^[A-Za-z0-9_-]{3,32}$/.test(s);
}

// Lookup auth par username (paramétré). Ne filtre PAS is_active : c'est canLogin
// qui décide -> révocation vérifiée à CHAQUE requête, pas figée dans le cookie.
const SELECT_BY_USERNAME = `
  SELECT username, password, role, is_active AS "isActive"
  FROM contributors WHERE username = $1
`;

export async function getContributorByUsername(
  username: string,
): Promise<ContributorAuth | null> {
  const { rows } = await pool.query<ContributorAuth>(SELECT_BY_USERNAME, [
    username,
  ]);
  return rows[0] ?? null;
}

// Crée (ou réactive/réinitialise) un compte ADMIN. Le hash bcrypt est calculé
// par l'appelant (script create-admin) — cette couche ne touche jamais au clair.
const UPSERT_ADMIN = `
  INSERT INTO contributors (username, password, role, is_active)
  VALUES ($1, $2, 'ADMIN', TRUE)
  ON CONFLICT (username) DO UPDATE
    SET password = EXCLUDED.password, role = 'ADMIN', is_active = TRUE
`;

export async function upsertAdmin(
  username: string,
  passwordHash: string,
): Promise<void> {
  await pool.query(UPSERT_ADMIN, [username, passwordHash]);
}
