import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that are always accessible regardless of ENABLED_MODULES
const ALWAYS_ALLOWED_PREFIXES = ["/genba", "/login", "/admin", "/_next", "/api", "/favicon"];

// Map from path prefix → module name
const PATH_MODULE_MAP: [string, string][] = [
  ["/customers", "customers"],
  ["/contracts", "contracts"],
  ["/invoices", "invoices"],
  ["/partners", "partners"],
  ["/quotations", "quotations"],
  ["/staff", "staff"],
  ["/approvals", "approvals"],
];

function getEnabledModules(): Set<string> | null {
  const raw = process.env.NEXT_PUBLIC_ENABLED_MODULES ?? "all";
  if (raw.trim().toLowerCase() === "all") return null; // all enabled
  return new Set(raw.split(",").map((m) => m.trim()).filter(Boolean));
}

export function middleware(request: NextRequest) {
  const enabledModules = getEnabledModules();

  // If all modules enabled, no restrictions
  if (enabledModules === null) {
    return NextResponse.next();
  }

  const path = request.nextUrl.pathname;

  // Always-allowed routes
  if (ALWAYS_ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Root path — redirect to genba
  if (path === "/") {
    return NextResponse.next();
  }

  // Check each module
  for (const [pathPrefix, moduleName] of PATH_MODULE_MAP) {
    if (path.startsWith(pathPrefix)) {
      if (enabledModules.has(moduleName)) {
        return NextResponse.next();
      }
      // Module not enabled → redirect to /genba
      return NextResponse.redirect(new URL("/genba", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
