import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { email: rawEmail, code, newPassword } = await req.json();

    if (!rawEmail || !code || !newPassword) {
      return NextResponse.json({ error: "모든 필드를 입력해주세요." }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "비밀번호는 8자 이상이어야 합니다." },
        { status: 400 }
      );
    }

    const email = String(rawEmail).trim().toLowerCase();
    const user = await db.user.findUnique({ where: { email } });

    if (!user || !user.resetToken || !user.resetTokenExp) {
      return NextResponse.json(
        { error: "인증코드가 발급되지 않았습니다. 다시 요청해주세요." },
        { status: 400 }
      );
    }

    if (user.resetToken !== String(code).trim()) {
      return NextResponse.json(
        { error: "인증코드가 일치하지 않습니다." },
        { status: 400 }
      );
    }

    if (user.resetTokenExp.getTime() < Date.now()) {
      return NextResponse.json(
        { error: "인증코드가 만료되었습니다. 다시 요청해주세요." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExp: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[reset-password]", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
