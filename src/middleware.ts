import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "./lib/auth";

// ponytail: protects all dashboard pages + API routes. Login/auth pages are open.
const PUBLIC_ROUTES = ["/login", "/api/auth"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // No password configured = open access (dev mode)
  if (!process.env.APP_PASSWORD) {
    return NextResponse.next();
  }

  // Check session cookie
  const session = request.cookies.get("openicm_session")?.value;
  if (session && (await verifySessionToken(session))) {
    // Check API key for API routes
    if (pathname.startsWith("/api/")) {
      const apiKey = request.headers.get("x-api-key");
      const { checkApiKey } = await import("./lib/auth");
      if (apiKey && checkApiKey(apiKey)) {
        return NextResponse.next();
      }
      // Cookie auth is also valid for API routes
    }
    return NextResponse.next();
  }

  // API routes get 401, pages get redirect
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
