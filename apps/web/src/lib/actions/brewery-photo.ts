"use server";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  uploadPhoto,
  deletePhotoFromStorage,
  getPhotoUrl,
} from "@/lib/supabase/storage";

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

type OwnerCtx = {
  userId: string;
  tenantId: string;
  brewery: { id: string; tenantId: string };
};

async function requireBreweryOwnerByBreweryId(breweryId: string): Promise<OwnerCtx> {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (typeof breweryId !== "string" || !breweryId.trim()) {
    throw new Error("양조장 ID가 올바르지 않습니다.");
  }
  if (!session.user.tenantId) {
    throw new Error("양조장 정보가 없는 계정은 사진을 관리할 수 없습니다.");
  }
  const brewery = await db.brewery.findUnique({
    where: { id: breweryId },
    select: { id: true, tenantId: true },
  });
  if (!brewery) throw new Error("양조장을 찾을 수 없습니다.");
  if (brewery.tenantId !== session.user.tenantId) {
    throw new Error("본인 양조장만 관리할 수 있습니다.");
  }
  return {
    userId: session.user.id,
    tenantId: session.user.tenantId,
    brewery: { id: brewery.id, tenantId: brewery.tenantId },
  };
}

async function requireBreweryOwnerByPhotoId(photoId: string): Promise<
  OwnerCtx & { photo: { id: string; breweryId: string; originalPath: string; isPrimary: boolean; sortOrder: number } }
> {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (typeof photoId !== "string" || !photoId.trim()) {
    throw new Error("사진 ID가 올바르지 않습니다.");
  }
  if (!session.user.tenantId) {
    throw new Error("양조장 정보가 없는 계정은 사진을 관리할 수 없습니다.");
  }
  const photo = await db.breweryPhoto.findUnique({
    where: { id: photoId },
    select: {
      id: true,
      breweryId: true,
      originalPath: true,
      isPrimary: true,
      sortOrder: true,
      brewery: { select: { id: true, tenantId: true } },
    },
  });
  if (!photo) throw new Error("사진을 찾을 수 없습니다.");
  if (photo.brewery.tenantId !== session.user.tenantId) {
    throw new Error("본인 양조장 사진만 관리할 수 있습니다.");
  }
  if (!photo.brewery.tenantId) {
    throw new Error("양조장 소유자 정보가 없습니다.");
  }
  return {
    userId: session.user.id,
    tenantId: session.user.tenantId,
    brewery: { id: photo.brewery.id, tenantId: photo.brewery.tenantId },
    photo: {
      id: photo.id,
      breweryId: photo.breweryId,
      originalPath: photo.originalPath,
      isPrimary: photo.isPrimary,
      sortOrder: photo.sortOrder,
    },
  };
}

function safeExt(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
  return ALLOWED_EXT.has(ext) ? ext : "jpg";
}

async function withSignedUrls(
  rows: Array<{
    id: string;
    originalPath: string;
    caption: string | null;
    isPrimary: boolean;
    sortOrder: number;
    uploadedAt: Date;
  }>,
): Promise<BreweryPhotoItem[]> {
  return Promise.all(
    rows.map(async (p) => {
      let thumbUrl = "";
      let fullUrl = "";
      try {
        [thumbUrl, fullUrl] = await Promise.all([
          getPhotoUrl(BUCKET, p.originalPath, "thumb"),
          getPhotoUrl(BUCKET, p.originalPath, "full"),
        ]);
      } catch (e) {
        console.error("[brewery-photo] signed URL 생성 실패:", p.id, e);
      }
      return {
        id: p.id,
        originalPath: p.originalPath,
        caption: p.caption,
        isPrimary: p.isPrimary,
        sortOrder: p.sortOrder,
        uploadedAt: p.uploadedAt,
        thumbUrl,
        fullUrl,
      };
    }),
  );
}

// ── 조회 ─────────────────────────────────────────────────────────────────────

export async function getBreweryPhotos(breweryId: string): Promise<BreweryPhotoItem[]> {
  const { brewery } = await requireBreweryOwnerByBreweryId(breweryId);
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
  return withSignedUrls(rows);
}

// ── 업로드 ───────────────────────────────────────────────────────────────────

export type UploadBreweryPhotoResult =
  | { success: true; photo: BreweryPhotoItem }
  | { success: false; error: string };

export async function uploadBreweryPhoto(
  breweryId: string,
  formData: FormData,
): Promise<UploadBreweryPhotoResult> {
  let ctx: OwnerCtx;
  try {
    ctx = await requireBreweryOwnerByBreweryId(breweryId);
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "권한 확인 실패" };
  }

  try {
    const file = formData.get("file");
    if (!(file instanceof File)) return { success: false, error: "파일이 없습니다." };
    if (file.size === 0) return { success: false, error: "빈 파일입니다." };
    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: "파일이 너무 큽니다 (최대 10MB)." };
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return { success: false, error: `지원하지 않는 파일 형식: ${file.type || "unknown"}` };
    }

    const count = await db.breweryPhoto.count({ where: { breweryId: ctx.brewery.id } });
    if (count >= MAX_PHOTOS) {
      return { success: false, error: `최대 ${MAX_PHOTOS}장까지 업로드할 수 있습니다.` };
    }

    const ext = safeExt(file.name);
    const filename = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const storagePath = `${ctx.tenantId}/${ctx.brewery.id}/${filename}`;

    if (/[^\x00-\x7F]/.test(storagePath) || /\s/.test(storagePath)) {
      return { success: false, error: "Storage 경로 검증 실패" };
    }

    const buffer = await file.arrayBuffer();

    try {
      await uploadPhoto(BUCKET, storagePath, buffer, file.type);
    } catch (e) {
      console.error("[brewery-photo] Storage 업로드 실패:", e);
      return { success: false, error: "Storage 업로드 실패" };
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
          originalPath: storagePath,
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
      console.error("[brewery-photo] DB 생성 실패, Storage 롤백:", e);
      try {
        await deletePhotoFromStorage(BUCKET, storagePath);
      } catch (cleanup) {
        console.error("[brewery-photo] Storage 롤백 실패:", cleanup);
      }
      return { success: false, error: "사진 정보 저장 실패" };
    }

    revalidatePath("/dashboard/my-brewery");
    revalidatePath(`/map/brewery/${ctx.brewery.id}`);
    revalidatePath("/map");

    const items = await withSignedUrls([created]);
    const item = items[0];
    if (!item) return { success: false, error: "사진 정보 생성 실패" };
    return { success: true, photo: item };
  } catch (e) {
    console.error("[brewery-photo] uploadBreweryPhoto 실패:", e);
    return { success: false, error: "사진 업로드 중 오류가 발생했습니다." };
  }
}

// ── 삭제 ─────────────────────────────────────────────────────────────────────

export type DeleteBreweryPhotoResult =
  | { success: true }
  | { success: false; error: string };

export async function deleteBreweryPhoto(photoId: string): Promise<DeleteBreweryPhotoResult> {
  let ctx;
  try {
    ctx = await requireBreweryOwnerByPhotoId(photoId);
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
      // 대표였으면 다음 사진(sortOrder asc)을 대표로 승격
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
    ctx = await requireBreweryOwnerByPhotoId(photoId);
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
    ctx = await requireBreweryOwnerByBreweryId(breweryId);
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
