import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      session: null,
    } as const;
  }
  if (!session.user.isAdmin) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      session: null,
    } as const;
  }
  return { error: null, session } as const;
}

// Server Action용: throw 패턴.
// 호출부에서 try-catch로 받고 사용자 친화 에러로 매핑.
export async function requireAdminSession(): Promise<{
  id: string;
  tenantId: string;
  isAdmin: true;
}> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("UNAUTHORIZED");
  if (!session.user.isAdmin) throw new Error("ADMIN_ONLY");
  if (!session.user.tenantId) throw new Error("NO_TENANT");
  return {
    id: session.user.id,
    tenantId: session.user.tenantId,
    isAdmin: true,
  };
}
