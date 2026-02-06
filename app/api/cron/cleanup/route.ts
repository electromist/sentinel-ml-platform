import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deleteFileFromR2 } from "@/lib/r2";

// → CLEANUP CRON FLOW: Delete expired secrets and files
export async function GET() {
  try {
    const now = new Date();

    // → DELETE EXPIRED SECRETS: Batch delete for efficiency
    const expiredSecrets = await prisma.secret.findMany({
      where: { expiresAt: { lte: now } },
      select: { id: true },
    });

    if (expiredSecrets.length > 0) {
      await prisma.secret.deleteMany({
        where: { id: { in: expiredSecrets.map((s) => s.id) } },
      });
    }

    // → DELETE EXPIRED FILES: R2 storage + database cleanup
    const expiredFiles = await prisma.secureFile.findMany({
      where: { expiresAt: { lte: now } },
      select: { id: true, storageKey: true },
    });

    // → Parallel deletion: R2 and DB operations for each file
    await Promise.all(
      expiredFiles.map(async (file) => {
        await deleteFileFromR2(file.storageKey);
        return prisma.secureFile.delete({ where: { id: file.id } });
      }),
    );

    return NextResponse.json({
      success: true,
      message: "Cleanup complete",
      deletedSecrets: expiredSecrets.length,
      deletedFiles: expiredFiles.length,
    });
  } catch (error) {
    console.error("Cron cleanup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
