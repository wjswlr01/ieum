import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const body = await req.json().catch(() => ({}));
  const { isAdmin, isActive } = body as { isAdmin?: boolean; isActive?: boolean };

  if (typeof isAdmin === "undefined" && typeof isActive === "undefined") {
    return NextResponse.json({ error: "변경할 필드가 없습니다." }, { status: 400 });
  }

  const target = await db.user.findUnique({
    where: { id: params.id },
    select: { id: true, isAdmin: true, isActive: true },
  });
  if (!target) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  if (target.id === guard.session.user.id) {
    if (typeof isAdmin === "boolean" && !isAdmin) {
      return NextResponse.json(
        { error: "본인의 ADMIN 권한은 해제할 수 없습니다." },
        { status: 400 }
      );
    }
    if (typeof isActive === "boolean" && !isActive) {
      return NextResponse.json(
        { error: "본인의 계정은 비활성화할 수 없습니다." },
        { status: 400 }
      );
    }
  }

  const updated = await db.user.update({
    where: { id: params.id },
    data: {
      ...(typeof isAdmin === "boolean" ? { isAdmin } : {}),
      ...(typeof isActive === "boolean" ? { isActive } : {}),
    },
    select: { id: true, isAdmin: true, isActive: true },
  });

  return NextResponse.json({ ok: true, user: updated });
}
