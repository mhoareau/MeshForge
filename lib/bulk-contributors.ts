export const MAX_BULK_CONTRIBUTORS = 200;

export interface BulkContributorRequest {
  prefix: string;
  start: number;
  count: number;
  digits: number;
}

export interface BulkContributorCredential {
  username: string;
  password: string;
}

function requireInteger(
  value: unknown,
  label: string,
  min: number,
  max: number,
): number {
  if (!Number.isInteger(value) || Number(value) < min || Number(value) > max) {
    throw new Error(`${label} invalide (${min} à ${max}).`);
  }
  return Number(value);
}

export function buildBulkContributorUsernames(
  request: BulkContributorRequest,
): string[] {
  return Array.from({ length: request.count }, (_, index) => {
    const number = String(request.start + index).padStart(request.digits, "0");
    return `${request.prefix}${number}`;
  });
}

export function validateBulkContributorRequest(
  input: unknown,
): BulkContributorRequest {
  const body = (input ?? {}) as Record<string, unknown>;
  const prefix = typeof body.prefix === "string" ? body.prefix.trim() : "";

  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(prefix)) {
    throw new Error(
      "Préfixe invalide : lettres, chiffres, tirets et underscores uniquement.",
    );
  }

  const request = {
    prefix,
    start: requireInteger(body.start, "Premier numéro", 0, 99_999_999),
    count: requireInteger(
      body.count,
      "Quantité",
      1,
      MAX_BULK_CONTRIBUTORS,
    ),
    digits: requireInteger(body.digits, "Padding", 1, 8),
  };

  const invalidUsername = buildBulkContributorUsernames(request).find(
    (username) => !/^[A-Za-z0-9_-]{3,32}$/.test(username),
  );
  if (invalidUsername) {
    throw new Error(
      "Les identifiants générés doivent contenir entre 3 et 32 caractères.",
    );
  }

  return request;
}

function csvCell(value: string): string {
  return /[;"\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function buildContributorsCsv(
  credentials: BulkContributorCredential[],
): string {
  const rows = credentials.map(({ username, password }) =>
    [username, username, password].map(csvCell).join(";"),
  );
  return `\uFEFFnom;identifiant_mqtt;mot_de_passe\r\n${rows.join("\r\n")}\r\n`;
}
