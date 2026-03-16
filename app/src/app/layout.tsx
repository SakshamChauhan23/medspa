import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { isStubAuth } from "@/lib/auth";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MedSpa Revenue System",
  description: "Revenue Recovery & Retention Infrastructure for Med Spas",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const stub = isStubAuth();

  if (stub) {
    return (
      <html lang="en">
        <body className={`${inter.className} antialiased`}>{children}</body>
      </html>
    );
  }

  // Dynamically import ClerkProvider only when real keys are present
  const { ClerkProvider } = await import("@clerk/nextjs");
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${inter.className} antialiased`}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
