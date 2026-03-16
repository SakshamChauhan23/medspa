/**
 * Auth wrapper — stubs Clerk when no valid publishable key is configured.
 *
 * Stub mode is active when NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is missing,
 * is the placeholder value "pk_test_...", or ends with "...".
 *
 * In stub mode:
 *   - auth() returns { userId: null } (unauthenticated)
 *   - All dashboard pages redirect to /sign-in
 *   - /sign-in shows a setup-instructions page instead of the Clerk widget
 *
 * To exit stub mode, add real Clerk keys to .env.local and restart the dev server.
 */

export function isStubAuth(): boolean {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  return !key || key.endsWith("...") || key === "";
}

/**
 * Mirrors the subset of Clerk's auth() return value used in this app.
 * In stub mode, returns { userId: null }.
 * In real mode, delegates to @clerk/nextjs/server auth().
 */
export async function auth(): Promise<{ userId: string | null }> {
  if (isStubAuth()) {
    return { userId: null };
  }

  // Dynamic import so Next.js doesn't evaluate the Clerk module at build
  // time when no valid key is present.
  const { auth: clerkAuth } = await import("@clerk/nextjs/server");
  return clerkAuth();
}
