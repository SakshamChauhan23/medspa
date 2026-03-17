import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/onboarding(.*)",
  "/api/webhooks/(.*)",
  "/api/cron/(.*)",
]);

// Check at build time whether Clerk is configured (NEXT_PUBLIC_ vars are inlined)
const isStub =
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.endsWith("...");

function passthroughMiddleware(_req: NextRequest) {
  return NextResponse.next();
}

export default isStub
  ? passthroughMiddleware
  : clerkMiddleware(async (auth, req) => {
      if (!isPublicRoute(req)) {
        const { userId } = await auth();
        if (!userId) {
          const signInUrl = new URL("/sign-in", req.url);
          signInUrl.searchParams.set("redirect_url", req.url);
          return NextResponse.redirect(signInUrl);
        }
      }
    });

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
