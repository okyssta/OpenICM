// Minimal auth for self-hosted — HMAC-signed session tokens.
// ponytail: single-user password auth. Multi-user/RBAC when more than one person uses the app.

const AUTH_SECRET = process.env.AUTH_SECRET || "dev-secret-change-me";

async function hmac(key: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(data));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createSessionToken(): Promise<string> {
  const expiry = Date.now() + 86400000; // 24h
  const sig = await hmac(AUTH_SECRET, `${expiry}`);
  return Buffer.from(`${expiry}.${sig}`).toString("base64url");
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const dot = decoded.indexOf(".");
    if (dot === -1) return false;
    const expiry = Number(decoded.slice(0, dot));
    const sig = decoded.slice(dot + 1);
    if (Date.now() > expiry) return false;
    const expected = await hmac(AUTH_SECRET, `${expiry}`);
    return sig === expected;
  } catch {
    return false;
  }
}

export function verifyPassword(input: string): boolean {
  const pw = process.env.APP_PASSWORD;
  if (!pw) return true; // no password set = open access
  return input === pw;
}

export function checkApiKey(key: string | null): boolean {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return false; // API key auth only when explicitly set
  return key === apiKey;
}
