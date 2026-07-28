// RBAC helper — reads X-User-External-Id header and resolves payee role.
// If the header is present, the caller acts as that payee (rep view).
// If absent or admin role, full access is granted.

import { db } from "./db";

export type UserContext = {
  orgId: string;
  asPayee: { id: string; externalId: string; role: string } | null;
  isAdmin: boolean;
};

export async function getUserContext(
  orgId: string,
  userExternalId: string | null
): Promise<UserContext> {
  if (!userExternalId) {
    return { orgId, asPayee: null, isAdmin: true };
  }
  const payee = await db.payee.findUnique({
    where: { orgId_externalId: { orgId, externalId: userExternalId } },
  });
  if (!payee) {
    return { orgId, asPayee: null, isAdmin: true };
  }
  return {
    orgId,
    asPayee: { id: payee.id, externalId: payee.externalId, role: payee.role ?? "rep" },
    isAdmin: payee.role === "admin",
  };
}

/** Apply RBAC filter: if acting as a payee (non-admin), scope to that payee */
export function scopeToPayee(context: UserContext): { payeeId?: string; payeeExternalId?: string } {
  if (context.isAdmin || !context.asPayee) return {};
  return { payeeId: context.asPayee.id, payeeExternalId: context.asPayee.externalId };
}
