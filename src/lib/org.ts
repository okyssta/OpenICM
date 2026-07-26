import { db } from "./db";

export async function getOrgId(): Promise<string> {
  if (process.env.ORG_ID) return process.env.ORG_ID;
  const org = await db.organization.findFirst({ orderBy: { createdAt: "asc" } });
  if (!org) throw new Error("No organization found. Run the seed script first.");
  return org.id;
}
