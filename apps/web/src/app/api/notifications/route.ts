import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notifications = await db.notification.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isRead: "asc" }, { createdAt: "desc" }],
    take: 20,
  });

  const unreadCount = await db.notification.count({
    where: { userId: session.user.id, isRead: false },
  });

  return NextResponse.json({ notifications, unreadCount });
}
