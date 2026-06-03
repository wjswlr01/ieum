"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/admin-guard";

export type LinkResult =
  | { success: true }
  | { success: false; error: string };

export async function linkBreweryToUser(
  breweryId: string,
  userId: string,
): Promise<LinkResult> {
  try {
    await requireAdminSession();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    if (msg === "ADMIN_ONLY") return { success: false, error: "관리자만 사용할 수 있습니다." };
    if (msg === "UNAUTHORIZED") return { success: false, error: "로그인이 필요합니다." };
    return { success: false, error: "권한 확인 실패" };
  }

  try {
    if (typeof breweryId !== "string" || !breweryId.trim()) {
      return { success: false, error: "양조장 ID가 올바르지 않습니다." };
    }
    if (typeof userId !== "string" || !userId.trim()) {
      return { success: false, error: "사용자 ID가 올바르지 않습니다." };
    }

    const [user, brewery] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: { id: true, tenantId: true, isActive: true },
      }),
      db.brewery.findUnique({
        where: { id: breweryId },
        select: { id: true, name: true, tenantId: true },
      }),
    ]);

    if (!user) return { success: false, error: "사용자를 찾을 수 없습니다." };
    if (!user.isActive)
      return { success: false, error: "비활성 사용자에게는 연결할 수 없습니다." };
    if (!user.tenantId)
      return { success: false, error: "사용자의 양조장 정보가 없습니다." };
    if (!brewery) return { success: false, error: "양조장을 찾을 수 없습니다." };

    if (brewery.tenantId === user.tenantId) {
      return { success: false, error: "이미 이 사용자에게 연결된 양조장입니다." };
    }
    if (brewery.tenantId !== null) {
      return {
        success: false,
        error: "이 양조장은 이미 다른 사용자에게 연결되어 있습니다. 먼저 기존 연결을 해제해주세요.",
      };
    }

    // 1:1 제약 검증: 이 tenant가 이미 다른 brewery 보유?
    const existing = await db.brewery.findUnique({
      where: { tenantId: user.tenantId },
      select: { id: true, name: true },
    });
    if (existing && existing.id !== breweryId) {
      return {
        success: false,
        error: `이 사용자는 이미 양조장 "${existing.name}"을(를) 보유 중입니다. 먼저 기존 연결을 해제한 후 다시 시도해주세요.`,
      };
    }

    await db.brewery.update({
      where: { id: breweryId },
      data: { tenantId: user.tenantId },
    });

    revalidatePath("/admin/breweries-directory");
    revalidatePath("/map");
    revalidatePath(`/map/brewery/${breweryId}`);

    return { success: true };
  } catch (e) {
    console.error("[admin-brewery] linkBreweryToUser 실패:", e);
    return { success: false, error: "연결 중 오류가 발생했습니다." };
  }
}

export async function unlinkBrewery(breweryId: string): Promise<LinkResult> {
  try {
    await requireAdminSession();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    if (msg === "ADMIN_ONLY") return { success: false, error: "관리자만 사용할 수 있습니다." };
    if (msg === "UNAUTHORIZED") return { success: false, error: "로그인이 필요합니다." };
    return { success: false, error: "권한 확인 실패" };
  }

  try {
    if (typeof breweryId !== "string" || !breweryId.trim()) {
      return { success: false, error: "양조장 ID가 올바르지 않습니다." };
    }
    const brewery = await db.brewery.findUnique({
      where: { id: breweryId },
      select: { id: true, tenantId: true },
    });
    if (!brewery) return { success: false, error: "양조장을 찾을 수 없습니다." };
    if (brewery.tenantId === null) {
      return { success: false, error: "이미 연결되지 않은 양조장입니다." };
    }

    await db.brewery.update({
      where: { id: breweryId },
      data: { tenantId: null },
    });

    revalidatePath("/admin/breweries-directory");
    revalidatePath("/map");
    revalidatePath(`/map/brewery/${breweryId}`);
    return { success: true };
  } catch (e) {
    console.error("[admin-brewery] unlinkBrewery 실패:", e);
    return { success: false, error: "연결 해제 중 오류가 발생했습니다." };
  }
}
