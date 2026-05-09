import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { seedDefaultRecipes } from "@/lib/seed/default-recipes";

export async function POST(req: Request) {
  try {
    const { email: rawEmail, password, name } = await req.json();

    if (!rawEmail || !password || !name) {
      return NextResponse.json({ error: "모든 필드를 입력해주세요." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "비밀번호는 8자 이상이어야 합니다." }, { status: 400 });
    }

    const email = String(rawEmail).trim().toLowerCase();

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const localPart = email.split("@")[0] ?? "user";
    const slug = `${localPart.replace(/[^a-z0-9]/g, "-")}-${Date.now()}`;

    const tenant = await db.tenant.create({
      data: { name: `${name}의 양조장`, slug },
    });

    await db.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: "OWNER",
        tenantId: tenant.id,
      },
    });

    await seedDefaultRecipes(tenant.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[signup]", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
