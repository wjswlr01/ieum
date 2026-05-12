"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/admin-guard";
import {
  uploadPhoto,
  deletePhotoFromStorage,
  getPhotoUrl,
} from "@/lib/supabase/storage";
import { revalidatePath } from "next/cache";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/webp",
]);

export type PhotoWithUrls = {
  id: string;
  batchId: string;
  batchNodeId: string | null;
  caption: string | null;
  capturedAt: Date;
  fileSize: number;
  width: number | null;
  height: number | null;
  createdAt: Date;
  uploadedBy: { id: string; name: string | null; email: string | null };
  thumbUrl: string;
  fullUrl: string;
};

export async function getPhotosByBatch(batchId: string): Promise<PhotoWithUrls[]> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user.tenantId) return [];

    // tenantId 스코프 체크
    const batch = await db.batch.findFirst({
      where: { id: batchId, tenantId: session.user.tenantId },
      select: { id: true },
    });
    if (!batch) return [];

    const photos = await db.photo.findMany({
      where: { batchId, tenantId: session.user.tenantId },
      orderBy: { capturedAt: "desc" },
      include: {
        uploadedBy: { select: { id: true, name: true, email: true } },
      },
    });

    // signed URL 병렬 생성 (실패하면 빈 URL — UI에서 처리)
    const withUrls = await Promise.all(
      photos.map(async (p) => {
        let thumbUrl = "";
        let fullUrl = "";
        try {
          [thumbUrl, fullUrl] = await Promise.all([
            getPhotoUrl(p.originalPath, "thumb"),
            getPhotoUrl(p.originalPath, "full"),
          ]);
        } catch (e) {
          console.error("[photo] signed URL 생성 실패:", p.id, e);
        }
        return {
          id: p.id,
          batchId: p.batchId,
          batchNodeId: p.batchNodeId,
          caption: p.caption,
          capturedAt: p.capturedAt,
          fileSize: p.fileSize,
          width: p.width,
          height: p.height,
          createdAt: p.createdAt,
          uploadedBy: p.uploadedBy,
          thumbUrl,
          fullUrl,
        };
      })
    );
    return withUrls;
  } catch (e) {
    console.error("[photo] getPhotosByBatch 실패:", e);
    return [];
  }
}

export type CreatePhotoResult =
  | { success: true; photoId: string }
  | { success: false; error: string };

export async function createPhoto(formData: FormData): Promise<CreatePhotoResult> {
  let admin: { id: string; tenantId: string } | null = null;
  try {
    admin = await requireAdminSession();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    if (msg === "ADMIN_ONLY") return { success: false, error: "관리자만 사진을 업로드할 수 있습니다." };
    if (msg === "UNAUTHORIZED") return { success: false, error: "로그인이 필요합니다." };
    return { success: false, error: "권한 확인 실패" };
  }

  try {
    const file = formData.get("file");
    const batchId = formData.get("batchId");
    const capturedAtRaw = formData.get("capturedAt");
    const caption = formData.get("caption");
    const batchNodeIdRaw = formData.get("batchNodeId");

    if (!(file instanceof File)) return { success: false, error: "파일이 없습니다." };
    if (typeof batchId !== "string" || !batchId)
      return { success: false, error: "배치 ID가 누락되었습니다." };
    if (typeof capturedAtRaw !== "string" || !capturedAtRaw)
      return { success: false, error: "촬영일이 누락되었습니다." };

    if (file.size === 0) return { success: false, error: "빈 파일입니다." };
    if (file.size > MAX_FILE_SIZE)
      return { success: false, error: `파일이 너무 큽니다 (최대 10MB).` };
    if (!ALLOWED_MIME.has(file.type))
      return { success: false, error: `지원하지 않는 파일 형식: ${file.type || "unknown"}` };

    const capturedAt = new Date(capturedAtRaw);
    if (isNaN(capturedAt.getTime()))
      return { success: false, error: "촬영일 형식이 올바르지 않습니다." };

    // tenant 스코프 + batch 존재 확인
    const batch = await db.batch.findFirst({
      where: { id: batchId, tenantId: admin.tenantId },
      select: { id: true },
    });
    if (!batch) return { success: false, error: "배치를 찾을 수 없습니다." };

    // batchNodeId 검증 (제공된 경우)
    let batchNodeId: string | null = null;
    if (typeof batchNodeIdRaw === "string" && batchNodeIdRaw) {
      const node = await db.batchNode.findFirst({
        where: { id: batchNodeIdRaw, batchId },
        select: { id: true },
      });
      if (!node) return { success: false, error: "공정 노드를 찾을 수 없습니다." };
      batchNodeId = node.id;
    }

    // Storage 업로드 — 파일명은 항상 안전한 형식으로 생성 (한글/공백/특수문자 차단)
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const safeExt = ["jpg", "jpeg", "png", "heic", "heif", "webp"].includes(ext) ? ext : "jpg";
    const filename = `${Date.now()}-${crypto.randomUUID()}.${safeExt}`;
    const storagePath = `${admin.tenantId}/${batchId}/${filename}`;

    console.log("[photo:debug] tenantId:", admin.tenantId);
    console.log("[photo:debug] batchId:", batchId);
    console.log("[photo:debug] file.name:", file.name);
    console.log("[photo:debug] file.type:", file.type);
    console.log("[photo:debug] file.size:", file.size);
    console.log("[photo:debug] final storagePath:", storagePath);
    console.log("[photo:debug] storagePath length:", storagePath.length);

    // 검증: storagePath에 ASCII 외 문자나 공백이 있으면 차단
    if (/[^\x00-\x7F]/.test(storagePath) || /\s/.test(storagePath)) {
      console.error("[photo:debug] storagePath 검증 실패:", storagePath);
      return {
        success: false,
        error: `Invalid storagePath: contains non-ASCII or whitespace: ${storagePath}`,
      };
    }

    const buffer = await file.arrayBuffer();
    console.log("[photo:debug] buffer byteLength:", buffer.byteLength);

    try {
      await uploadPhoto(storagePath, buffer, file.type);
    } catch (e) {
      console.error("[photo] Storage 업로드 실패:", e);
      return { success: false, error: "Storage 업로드 실패" };
    }

    // DB row 생성
    let photoId: string;
    try {
      const photo = await db.photo.create({
        data: {
          tenantId: admin.tenantId,
          uploadedById: admin.id,
          batchId,
          batchNodeId,
          originalPath: storagePath,
          caption: typeof caption === "string" && caption ? caption : null,
          capturedAt,
          fileSize: file.size,
        },
        select: { id: true },
      });
      photoId = photo.id;
    } catch (e) {
      // DB 실패 시 Storage 정리
      console.error("[photo] DB 생성 실패, Storage 롤백:", e);
      try {
        await deletePhotoFromStorage(storagePath);
      } catch (cleanup) {
        console.error("[photo] Storage 롤백 실패:", cleanup);
      }
      return { success: false, error: "사진 정보 저장 실패" };
    }

    revalidatePath(`/dashboard/batches/${batchId}`);
    return { success: true, photoId };
  } catch (e) {
    console.error("[photo] createPhoto 실패:", e);
    return { success: false, error: "사진 업로드 중 오류가 발생했습니다." };
  }
}

export type DeletePhotoResult =
  | { success: true }
  | { success: false; error: string };

export async function deletePhoto(photoId: string): Promise<DeletePhotoResult> {
  let admin: { id: string; tenantId: string } | null = null;
  try {
    admin = await requireAdminSession();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    if (msg === "ADMIN_ONLY") return { success: false, error: "관리자만 삭제할 수 있습니다." };
    if (msg === "UNAUTHORIZED") return { success: false, error: "로그인이 필요합니다." };
    return { success: false, error: "권한 확인 실패" };
  }

  try {
    const photo = await db.photo.findFirst({
      where: { id: photoId, tenantId: admin.tenantId },
      select: { id: true, batchId: true, originalPath: true },
    });
    if (!photo) return { success: false, error: "사진을 찾을 수 없습니다." };

    // Storage 먼저 삭제 시도 (실패해도 DB는 삭제 — orphan은 admin이 수동 정리)
    try {
      await deletePhotoFromStorage(photo.originalPath);
    } catch (e) {
      console.error("[photo] Storage 삭제 실패 (DB는 계속 삭제):", e);
    }

    await db.photo.delete({ where: { id: photo.id } });

    revalidatePath(`/dashboard/batches/${photo.batchId}`);
    return { success: true };
  } catch (e) {
    console.error("[photo] deletePhoto 실패:", e);
    return { success: false, error: "삭제 중 오류가 발생했습니다." };
  }
}
