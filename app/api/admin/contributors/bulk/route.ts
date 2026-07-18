import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import {
  buildBulkContributorUsernames,
  buildContributorsCsv,
  validateBulkContributorRequest,
} from "@/lib/bulk-contributors";
import {
  generatePassword,
  insertContributorsBulk,
} from "@/lib/queries/contributors";
import { isSameOrigin } from "@/lib/security";

export const runtime = "nodejs";

function errorResponse(message: string, status: number): NextResponse {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: Request) {
  if (!isSameOrigin(req.headers)) {
    return errorResponse("Origine refusée.", 403);
  }
  if (!(await isAdmin())) {
    return errorResponse("Non autorisé.", 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Requête invalide.", 400);
  }

  let request;
  try {
    request = validateBulkContributorRequest(body);
  } catch (error) {
    return errorResponse((error as Error).message, 400);
  }

  const usernames = buildBulkContributorUsernames(request);
  const credentials = usernames.map((username) => ({
    username,
    password: generatePassword(),
  }));

  try {
    const passwordHashes = await Promise.all(
      credentials.map(({ password }) => bcrypt.hash(password, 12)),
    );
    await insertContributorsBulk(
      credentials.map(({ username }, index) => ({
        username,
        passwordHash: passwordHashes[index],
      })),
    );
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return errorResponse(
        "Au moins un identifiant existe déjà. Aucun compte n’a été créé.",
        409,
      );
    }
    return errorResponse("Création du lot impossible.", 500);
  }

  const first = credentials[0].username;
  const last = credentials.at(-1)?.username ?? first;
  return new Response(buildContributorsCsv(credentials), {
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Content-Disposition": `attachment; filename="comptes-mqtt-${first}-${last}.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
