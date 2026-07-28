import { NextResponse, type NextRequest } from "next/server";
import { verifyPassword, createSessionToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({}));
  if (!verifyPassword(String(password ?? ""))) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }
  const token = await createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set("openicm_session", token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 86400, // 24h
  });
  return res;
}
