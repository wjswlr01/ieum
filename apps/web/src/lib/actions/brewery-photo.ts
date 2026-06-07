"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  deletePhotoFromStorage,
  getPublicPhotoUrl,
  createSignedUploadUrl,
} from "@/lib/supabase/storage";
import {
  requireBreweryAccess,
  requireBreweryAccessByPhotoId,
} from "@/lib/brewery-access";

const BUCKET = "brewery-photos";
const MAX_PHOTOS = 12;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/webp",
]);
const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "heic", "heif", "webp"]);

export type BreweryPhotoItem = {
  id: string;
  originalPath: string;
  caption: string | null;
  isPrimary: boolean;
  sortOrder: number;
  uploadedAt: Date;
  thumbUrl: string;
  fullUrl: string;
};

function safeExt(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
  return ALLOWED_EXT.has(ext) ? ext : "jpg";
}

function withPhotoUrls(
  rows: Array<{
    id: string;
    originalPath: string;
    caption: string | null;
    isPrimary: boolean;
    sortOrder: number;
    uploadedAt: Date;
  }>,
): BreweryPhotoItem[] {
  return rows.map((p) => ({
    id: p.id,
    originalPath: p.originalPath,
    caption: p.caption,
    isPrimary: p.isPrimary,
    sortOrder: p.sortOrder,
    uploadedAt: p.uploadedAt,
    thumbUrl: getPublicPhotoUrl(BUCKET, p.originalPath, "thumb"),
    fullUrl: getPublicPhotoUrl(BUCKET, p.originalPath, "full"),
  }));
}

// ── 조회 ─────────────────────────────────────────────────────────────────────

export async function getBreweryPhotos(breweryId: string): Promise<BreweryPhotoItem[]> {
  try {
    const { brewery } = await requireBreweryAccess(breweryId);
    const rows = await db.breweryPhoto.findMany({
      where: { breweryId: brewery.id },
      orderBy: [{ sortOrder: "asc" }, { uploadedAt: "desc" }],
      select: {
        id: true,
        originalPath: true,
        caption: true,
        isPrimary: true,
        sortOrder: true,
        uploadedAt: true,
      },
    });
    return withPhotoUrls(rows);
  } catch (e) {
    console.error("[brewery-photo] getBreweryPhotos 실패:", e);
    return [];
  }
}

// ── 업로드 (2-step: signed URL 발급 → 클라이언트 직접 업로드 → DB commit) ────

// Vercel Serverless Function payload 제한(~4.5MB) 우회용. 큰 사진은 Vercel을 안 거치고
// 브라우저 → Supabase Storage 직접 업로드. NextAuth 세션은 1단계(URL 발급)에서 게이트.

export type CreateUploadUrlResult =
  | { success: true; signedUrl: string; token: string; path: string }
  | { success: false; error: string };

export async function createBreweryPhotoUploadUrl(
  breweryId: string,
  fileName: string,
  fileType: string,
): Promise<CreateUploadUrlResult> {
  let ctx;
  try {
    ctx = await requireBreweryAccess(breweryId);
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "권한 확인 실패" };
  }

  try {
    if (typeof fileType !== "string" || !ALLOWED_MIME.has(fileType)) {
      return { success: false, error: `지원하지 않는 파일 형식: ${fileType || "unknown"}` };
    }

    const count = await db.breweryPhoto.count({ where: { breweryId: ctx.brewery.id } });
    if (count >= MAX_PHOTOS) {
      return { success: false, error: `최대 ${MAX_PHOTOS}장까지 업로드할 수 있습니다.` };
    }

    const ext = safeExt(fileName);
    const filename = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const storagePath = `${ctx.brewery.id}/${filename}`;

    if (/[^\x00-\x7F]/.test(storagePath) || /\s/.test(storagePath)) {
      return { success: false, error: "Storage 경로 검증 실패" };
    }

    const { signedUrl, token, path } = await createSignedUploadUrl(BUCKET, storagePath);
    return { success: true, signedUrl, token, path };
  } catch (e) {
    console.error("[brewery-photo] createBreweryPhotoUploadUrl 실패:", e);
    return { success: false, error: "업로드 URL 생성 실패" };
  }
}

export type CommitBreweryPhotoResult =
  | { success: true; photo: BreweryPhotoItem }
  | { success: false; error: string };

export async function commitBreweryPhoto(
  breweryId: string,
  path: string,
): Promise<CommitBreweryPhotoResult> {
  let ctx;
  try {
    ctx = await requireBreweryAccess(breweryId);
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "권한 확인 실패" };
  }

  try {
    // path squat 방지: 반드시 <breweryId>/ 로 시작
    if (typeof path !== "string" || !path.startsWith(`${ctx.brewery.id}/`)) {
      return { success: false, error: "잘못된 경로입니다." };
    }
    if (/[^\x00-\x7F]/.test(path) || /\s/.test(path)) {
      return { success: false, error: "Storage 경로 검증 실패" };
    }

    const count = await db.breweryPhoto.count({ where: { breweryId: ctx.brewery.id } });
    if (count >= MAX_PHOTOS) {
      return { success: false, error: `최대 ${MAX_PHOTOS}장까지 업로드할 수 있습니다.` };
    }

    const isPrimary = count === 0;
    const maxOrderAgg = await db.breweryPhoto.aggregate({
      where: { breweryId: ctx.brewery.id },
      _max: { sortOrder: true },
    });
    const nextSortOrder = (maxOrderAgg._max.sortOrder ?? -1) + 1;

    let created;
    try {
      created = await db.breweryPhoto.create({
        data: {
          breweryId: ctx.brewery.id,
          originalPath: path,
          isPrimary,
          sortOrder: nextSortOrder,
          uploadedById: ctx.userId,
        },
        select: {
          id: true,
          originalPath: true,
          caption: true,
          isPrimary: true,
          sortOrder: true,
          uploadedAt: true,
        },
      });
    } catch (e) {
      // originalPath @unique 위반(중복 commit) 또는 기타 DB 오류
      console.error("[brewery-photo] commit DB 실패:", e);
      return { success: false, error: "사진 정보 저장 실패" };
    }

    revalidatePath("/dashboard/my-brewery");
    revalidatePath(`/map/brewery/${ctx.brewery.id}`);
    revalidatePath("/map");

    const items = withPhotoUrls([created]);
    const item = items[0];
    if (!item) return { success: false, error: "사진 정보 생성 실패" };
    return { success: true, photo: item };
  } catch (e) {
    console.error("[brewery-photo] commitBreweryPhoto 실패:", e);
    return { success: false, error: "사진 저장 중 오류가 발생했습니다." };
  }
}

// 클라이언트 best-effort 클린업용 (commit 실패 시 호출)
export type AbortBreweryPhotoResult =
  | { success: true }
  | { success: false; error: string };

export async function abortBreweryPhotoUpload(
  breweryId: string,
  path: string,
): Promise<AbortBreweryPhotoResult> {
  let ctx;
  try {
    ctx = await requireBreweryAccess(breweryId);
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "권한 확인 실패" };
  }

  if (typeof path !== "string" || !path.startsWith(`${ctx.brewery.id}/`)) {
    return { success: false, error: "잘못된 경로입니다." };
  }

  try {
    await deletePhotoFromStorage(BUCKET, path);
    return { success: true };
  } catch (e) {
    console.error("[brewery-photo] abort 클린업 실패:", e);
    return { success: false, error: "클린업 실패" };
  }
}

// ── 삭제 ─────────────────────────────────────────────────────────────────────

export type DeleteBreweryPhotoResult =
  | { success: true }
  | { success: false; error: string };

export async function deleteBreweryPhoto(photoId: string): Promise<DeleteBreweryPhotoResult> {
  let ctx;
  try {
    ctx = await requireBreweryAccessByPhotoId(photoId);
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "권한 확인 실패" };
  }

  try {
    try {
      await deletePhotoFromStorage(BUCKET, ctx.photo.originalPath);
    } catch (e) {
      console.error("[brewery-photo] Storage 삭제 실패 (DB는 계속 삭제):", e);
    }

    await db.$transaction(async (tx) => {
      await tx.breweryPhoto.delete({ where: { id: ctx.photo.id } });
      if (ctx.photo.isPrimary) {
        const next = await tx.breweryPhoto.findFirst({
          where: { breweryId: ctx.brewery.id },
          orderBy: [{ sortOrder: "asc" }, { uploadedAt: "desc" }],
          select: { id: true },
        });
        if (next) {
          await tx.breweryPhoto.update({
            where: { id: next.id },
            data: { isPrimary: true },
          });
        }
      }
    });

    revalidatePath("/dashboard/my-brewery");
    revalidatePath(`/map/brewery/${ctx.brewery.id}`);
    revalidatePath("/map");
    return { success: true };
  } catch (e) {
    console.error("[brewery-photo] deleteBreweryPhoto 실패:", e);
    return { success: false, error: "삭제 중 오류가 발생했습니다." };
  }
}

// ── 대표 지정 ────────────────────────────────────────────────────────────────

export type SetPrimaryResult =
  | { success: true }
  | { success: false; error: string };

export async function setPrimaryBreweryPhoto(photoId: string): Promise<SetPrimaryResult> {
  let ctx;
  try {
    ctx = await requireBreweryAccessByPhotoId(photoId);
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "권한 확인 실패" };
  }

  try {
    await db.$transaction([
      db.breweryPhoto.updateMany({
        where: { breweryId: ctx.brewery.id, isPrimary: true },
        data: { isPrimary: false },
      }),
      db.breweryPhoto.update({
        where: { id: ctx.photo.id },
        data: { isPrimary: true },
      }),
    ]);
    revalidatePath("/dashboard/my-brewery");
    revalidatePath(`/map/brewery/${ctx.brewery.id}`);
    revalidatePath("/map");
    return { success: true };
  } catch (e) {
    console.error("[brewery-photo] setPrimaryBreweryPhoto 실패:", e);
    return { success: false, error: "대표 사진 지정 중 오류가 발생했습니다." };
  }
}

// ── 순서 변경 ────────────────────────────────────────────────────────────────

export type ReorderResult =
  | { success: true }
  | { success: false; error: string };

export async function reorderBreweryPhotos(
  breweryId: string,
  orderedPhotoIds: string[],
): Promise<ReorderResult> {
  let ctx;
  try {
    ctx = await requireBreweryAccess(breweryId);
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "권한 확인 실패" };
  }

  if (!Array.isArray(orderedPhotoIds) || orderedPhotoIds.length === 0) {
    return { success: false, error: "순서 목록이 비어있습니다." };
  }
  if (orderedPhotoIds.some((id) => typeof id !== "string" || !id.trim())) {
    return { success: false, error: "사진 ID가 올바르지 않습니다." };
  }
  const unique = new Set(orderedPhotoIds);
  if (unique.size !== orderedPhotoIds.length) {
    return { success: false, error: "중복된 사진 ID가 있습니다." };
  }

  try {
    const photos = await db.breweryPhoto.findMany({
      where: { breweryId: ctx.brewery.id, id: { in: orderedPhotoIds } },
      select: { id: true },
    });
    if (photos.length !== orderedPhotoIds.length) {
      return { success: false, error: "양조장에 속하지 않은 사진이 포함되어 있습니다." };
    }

    await db.$transaction(
      orderedPhotoIds.map((id, idx) =>
        db.breweryPhoto.update({
          where: { id },
          data: { sortOrder: idx },
        }),
      ),
    );

    revalidatePath("/dashboard/my-brewery");
    revalidatePath(`/map/brewery/${ctx.brewery.id}`);
    revalidatePath("/map");
    return { success: true };
  } catch (e) {
    console.error("[brewery-photo] reorderBreweryPhotos 실패:", e);
    return { success: false, error: "순서 변경 중 오류가 발생했습니다." };
  }
}
