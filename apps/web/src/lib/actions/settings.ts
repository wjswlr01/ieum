"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

export async function changePassword(currentPassword: string, newPassword: string) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (newPassword.length < 8) throw new Error("새 비밀번호는 8자 이상이어야 합니다.");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  });
  if (!user?.password) throw new Error("소셜 로그인 계정은 비밀번호 변경을 지원하지 않습니다.");

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) throw new Error("현재 비밀번호가 올바르지 않습니다.");

  const hashed = await bcrypt.hash(newPassword, 12);
  await db.user.update({ where: { id: session.user.id }, data: { password: hashed } });
}

export async function updateProfile(name: string) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (!name.trim()) throw new Error("이름을 입력해주세요.");

  await db.user.update({
    where: { id: session.user.id },
    data: { name: name.trim() },
  });

  revalidatePath("/dashboard/settings");
}

export async function updateTenantName(name: string) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (!["OWNER", "MANAGER"].includes(session.user.role))
    throw new Error("권한이 없습니다.");
  if (!name.trim()) throw new Error("양조장 이름을 입력해주세요.");

  await db.tenant.update({
    where: { id: session.user.tenantId },
    data: { name: name.trim() },
  });

  revalidatePath("/dashboard/settings");
}

// 멤버 초대: 소셜 로그인 전용 전환 후에는 이메일 사전등록만 가능.
// 초대받은 사용자가 같은 이메일로 첫 소셜 로그인 시 자동으로 본 양조장에 합류.
export async function inviteMember(input: { email: string; name: string; role: string }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (!["OWNER", "MANAGER"].includes(session.user.role))
    throw new Error("권한이 없습니다.");

  const email = input.email.trim().toLowerCase();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) throw new Error("이미 등록된 이메일입니다.");

  await db.user.create({
    data: {
      email,
      name: input.name.trim(),
      role: input.role as any,
      tenantId: session.user.tenantId,
    },
  });

  revalidatePath("/dashboard/settings");
  return { ok: true as const };
}

export async function updateMemberRole(userId: string, role: string) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "OWNER") throw new Error("오너만 역할을 변경할 수 있습니다.");
  if (userId === session.user.id) throw new Error("본인의 역할은 변경할 수 없습니다.");

  const member = await db.user.findFirst({
    where: { id: userId, tenantId: session.user.tenantId },
  });
  if (!member) throw new Error("멤버를 찾을 수 없습니다.");

  await db.user.update({ where: { id: userId }, data: { role: role as any } });
  revalidatePath("/dashboard/settings");
}

export async function removeMember(userId: string) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "OWNER") throw new Error("오너만 멤버를 제거할 수 있습니다.");
  if (userId === session.user.id) throw new Error("본인을 제거할 수 없습니다.");

  const member = await db.user.findFirst({
    where: { id: userId, tenantId: session.user.tenantId },
    select: { id: true, role: true },
  });
  if (!member) throw new Error("멤버를 찾을 수 없습니다.");
  if (member.role === "OWNER") throw new Error("오너 계정은 제거할 수 없습니다.");

  const batchCount = await db.batch.count({ where: { brewerId: userId } });
  if (batchCount > 0)
    throw new Error(`이 멤버가 참여한 술빚기 ${batchCount}개가 있어 제거할 수 없습니다. 술빚기를 먼저 삭제해주세요.`);

  await db.user.delete({ where: { id: userId } });
  revalidatePath("/dashboard/settings");
}

// 계정 삭제 — 소셜 로그인 전환 후 비밀번호 인증 불가.
// 명시 문구("계정 삭제")를 typed-confirm으로 받아 오인 삭제 방지.
export async function deleteAccount(confirmText: string) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  if (confirmText.trim() !== "계정 삭제")
    throw new Error("'계정 삭제'를 정확히 입력해주세요.");

  const batchCount = await db.batch.count({ where: { brewerId: session.user.id } });
  if (batchCount > 0)
    throw new Error(`${batchCount}개의 술빚기 기록이 있어 계정을 삭제할 수 없습니다. 술빚기를 먼저 삭제해주세요.`);

  await db.user.delete({ where: { id: session.user.id } });
  redirect("/");
}
