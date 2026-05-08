import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { email: rawEmail } = await req.json();

    if (!rawEmail) {
      return NextResponse.json({ error: "이메일을 입력해주세요." }, { status: 400 });
    }

    const email = String(rawEmail).trim().toLowerCase();
    const user = await db.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json(
        { error: "등록되지 않은 이메일입니다." },
        { status: 404 }
      );
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const exp = new Date(Date.now() + 10 * 60 * 1000);

    await db.user.update({
      where: { id: user.id },
      data: { resetToken: code, resetTokenExp: exp },
    });

    return NextResponse.json({ ok: true, devCode: code });
  } catch (err) {
    console.error("[reset-request]", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
