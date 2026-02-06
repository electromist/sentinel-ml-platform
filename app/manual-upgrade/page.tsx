"use server";

import { prisma } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

// → MANUAL UPGRADE PAGE: Quick upgrade endpoint (for testing/admin use)
export default async function ManualUpgrade() {
  const clerkUser = await currentUser();
  if (!clerkUser) return <div>Please login first</div>;

  const email = clerkUser.emailAddresses[0].emailAddress;
  await prisma.user.update({
    where: { email },
    data: { isPro: true },
  });

  redirect("/?upgraded=true");
}
