import { NextResponse, type NextRequest } from "next/server";
import { isStubAuth } from "@/lib/auth";

// Stub-mode passthrough — used when no real Clerk key is configured.
function stubMiddleware(_req: NextRequest) {
  return NextResponse.next();
}

// Build the appropriate middleware at module evaluation time.
// isStubAuth() checks an env var, so it's safe to call here.
const middleware = isStubAuth()
  ? stubMiddleware
  : (() => {
      const { clerkMiddleware, createRouteMatcher } = require("@clerk/nextjs/server");

      const isPublicRoute = createRouteMatcher([
        "/sign-in(.*)",
        "/sign-up(.*)",
        "/api/webhooks/(.*)",
      ]);

      return clerkMiddleware(async (auth: () => Promise<{ userId: string | null }>, req: NextRequest) => {
        if (!isPublicRoute(req)) {
          const { userId } = await auth();
          if (!userId) {
            const signInUrl = new URL("/sign-in", req.url);
            signInUrl.searchParams.set("redirect_url", req.url);
            return NextResponse.redirect(signInUrl);
          }
        }
      });
    })();

export default middleware;

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
