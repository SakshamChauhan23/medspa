import { headers } from "next/headers";
import { Webhook } from "svix";
import { db } from "@/lib/db";
import { clinics, users } from "@/lib/db/schema";

type ClerkEmailAddress = { email_address: string; id: string };

type ClerkUserCreatedEvent = {
  type: "user.created";
  data: {
    id: string;
    email_addresses: ClerkEmailAddress[];
    primary_email_address_id: string;
    first_name: string | null;
    last_name: string | null;
  };
};

type ClerkEvent = ClerkUserCreatedEvent | { type: string; data: unknown };

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("Webhook secret not configured", { status: 500 });
  }

  // Verify signature
  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const body = await req.text();
  const wh = new Webhook(secret);

  let event: ClerkEvent;
  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkEvent;
  } catch {
    return new Response("Invalid webhook signature", { status: 400 });
  }

  if (event.type !== "user.created") {
    return new Response("OK", { status: 200 });
  }

  const { id: clerkUserId, email_addresses, primary_email_address_id, first_name, last_name } =
    (event as ClerkUserCreatedEvent).data;

  const primaryEmail = email_addresses.find(
    (e) => e.id === primary_email_address_id
  )?.email_address;

  if (!primaryEmail) {
    return new Response("No primary email found", { status: 400 });
  }

  const fullName = [first_name, last_name].filter(Boolean).join(" ") || null;

  // Create clinic + user in one transaction
  await db.transaction(async (tx) => {
    const [clinic] = await tx
      .insert(clinics)
      .values({
        name: fullName ? `${fullName}'s Clinic` : "My Clinic",
        email: primaryEmail,
        timezone: "America/New_York",
      })
      .returning({ id: clinics.id });

    await tx.insert(users).values({
      clinicId: clinic.id,
      clerkUserId,
      email: primaryEmail,
      fullName,
      role: "owner",
    });
  });

  return new Response("OK", { status: 200 });
}
