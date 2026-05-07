import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkLowStockNotifications, checkFermentationReminders } from "@/lib/notifications";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tenantId, id: userId } = session.user;

  await Promise.all([
    checkLowStockNotifications(tenantId, userId),
    checkFermentationReminders(tenantId, userId),
  ]);

  return NextResponse.json({ ok: true });
}
