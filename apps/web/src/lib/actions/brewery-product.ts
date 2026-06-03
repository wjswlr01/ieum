"use server";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { BrewType } from "@ieum/db";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  uploadPhoto,
  deletePhotoFromStorage,
  getPhotoUrl,
} from "@/lib/supabase/storage";

const BUCKET = "brewery-photos";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/webp",
]);
const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "heic", "heif", "webp"]);

const NAME_MAX = 80;
const VOLUME_MAX = 30;
const TEXT_MAX = 500;
const PRICE_MAX = 100_000_000;
const ABV_MAX = 100;

const VALID_BREW_TYPES = new Set<BrewType>([
  "BEER",
  "MAKGEOLLI",
  "CHEONGJU",
  "SOJU",
  "FRUIT_WINE",
]);

export type BreweryProductItem = {
  id: string;
  name: string;
  brewType: BrewType | null;
  alcoholContent: number | null;
  volume: string | null;
  price: number | null;
  imagePath: string | null;
  imageUrl: string | null;
  features: string | null;
  ingredients: string | null;
  isAvailable: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
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
    throw new Error("양조장 정보가 없는 계정은 제품을 관리할 수 없습니다.");
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

async function requireBreweryOwnerByProductId(productId: string): Promise<
  OwnerCtx & { product: { id: string; breweryId: string; imagePath: string | null } }
> {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (typeof productId !== "string" || !productId.trim()) {
    throw new Error("제품 ID가 올바르지 않습니다.");
  }
  if (!session.user.tenantId) {
    throw new Error("양조장 정보가 없는 계정은 제품을 관리할 수 없습니다.");
  }
  const product = await db.breweryProduct.findUnique({
    where: { id: productId },
    select: {
      id: true,
      breweryId: true,
      imagePath: true,
      brewery: { select: { id: true, tenantId: true } },
    },
  });
  if (!product) throw new Error("제품을 찾을 수 없습니다.");
  if (product.brewery.tenantId !== session.user.tenantId) {
    throw new Error("본인 양조장 제품만 관리할 수 있습니다.");
  }
  if (!product.brewery.tenantId) {
    throw new Error("양조장 소유자 정보가 없습니다.");
  }
  return {
    userId: session.user.id,
    tenantId: session.user.tenantId,
    brewery: { id: product.brewery.id, tenantId: product.brewery.tenantId },
    product: {
      id: product.id,
      breweryId: product.breweryId,
      imagePath: product.imagePath,
    },
  };
}

function safeExt(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
  return ALLOWED_EXT.has(ext) ? ext : "jpg";
}

async function signImageUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  try {
    return await getPhotoUrl(BUCKET, path, "thumb");
  } catch (e) {
    console.error("[brewery-product] signed URL 생성 실패:", path, e);
    return null;
  }
}

type ProductRow = {
  id: string;
  name: string;
  brewType: BrewType | null;
  alcoholContent: number | null;
  volume: string | null;
  price: number | null;
  imagePath: string | null;
  features: string | null;
  ingredients: string | null;
  isAvailable: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

async function toItems(rows: ProductRow[]): Promise<BreweryProductItem[]> {
  return Promise.all(
    rows.map(async (p) => ({
      id: p.id,
      name: p.name,
      brewType: p.brewType,
      alcoholContent: p.alcoholContent,
      volume: p.volume,
      price: p.price,
      imagePath: p.imagePath,
      imageUrl: await signImageUrl(p.imagePath),
      features: p.features,
      ingredients: p.ingredients,
      isAvailable: p.isAvailable,
      sortOrder: p.sortOrder,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
  );
}

// ── 입력 파싱/검증 ───────────────────────────────────────────────────────────

type ParsedInput = {
  name: string;
  brewType: BrewType | null;
  alcoholContent: number | null;
  volume: string | null;
  price: number | null;
  features: string | null;
  ingredients: string | null;
};

function parseStringField(
  v: FormDataEntryValue | null,
  label: string,
  max: number,
): string | null {
  if (v === null) return null;
  if (typeof v !== "string") throw new Error(`${label} 형식이 올바르지 않습니다.`);
  const trimmed = v.trim();
  if (!trimmed) return null;
  if (trimmed.length > max) throw new Error(`${label}은(는) ${max}자 이내로 작성해주세요.`);
  return trimmed;
}

function parseNumberField(
  v: FormDataEntryValue | null,
  label: string,
  opts: { min: number; max: number; integer: boolean },
): number | null {
  if (v === null) return null;
  if (typeof v !== "string") throw new Error(`${label} 형식이 올바르지 않습니다.`);
  const trimmed = v.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  if (!Number.isFinite(num)) throw new Error(`${label}은(는) 숫자여야 합니다.`);
  if (opts.integer && !Number.isInteger(num)) {
    throw new Error(`${label}은(는) 정수여야 합니다.`);
  }
  if (num < opts.min || num > opts.max) {
    throw new Error(`${label} 범위가 올바르지 않습니다.`);
  }
  return num;
}

function parseBrewType(v: FormDataEntryValue | null): BrewType | null {
  if (v === null || v === "") return null;
  if (typeof v !== "string") throw new Error("주종 형식이 올바르지 않습니다.");
  if (!VALID_BREW_TYPES.has(v as BrewType)) {
    throw new Error("주종 값이 올바르지 않습니다.");
  }
  return v as BrewType;
}

function parseInput(formData: FormData): ParsedInput {
  const name = parseStringField(formData.get("name"), "제품 이름", NAME_MAX);
  if (!name) throw new Error("제품 이름을 입력해주세요.");

  return {
    name,
    brewType: parseBrewType(formData.get("brewType")),
    alcoholContent: parseNumberField(formData.get("alcoholContent"), "도수(%)", {
      min: 0,
      max: ABV_MAX,
      integer: false,
    }),
    volume: parseStringField(formData.get("volume"), "용량", VOLUME_MAX),
    price: parseNumberField(formData.get("price"), "가격(원)", {
      min: 0,
      max: PRICE_MAX,
      integer: true,
    }),
    features: parseStringField(formData.get("features"), "특징", TEXT_MAX),
    ingredients: parseStringField(formData.get("ingredients"), "원료", TEXT_MAX),
  };
}

async function uploadImageIfPresent(
  formData: FormData,
  tenantId: string,
  breweryId: string,
): Promise<string | null> {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("썸네일이 너무 큽니다 (최대 10MB).");
  }
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error(`지원하지 않는 파일 형식: ${file.type || "unknown"}`);
  }
  const ext = safeExt(file.name);
  const filename = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const storagePath = `${tenantId}/${breweryId}/products/${filename}`;
  if (/[^\x00-\x7F]/.test(storagePath) || /\s/.test(storagePath)) {
    throw new Error("Storage 경로 검증 실패");
  }
  const buffer = await file.arrayBuffer();
  await uploadPhoto(BUCKET, storagePath, buffer, file.type);
  return storagePath;
}

// ── 조회 ─────────────────────────────────────────────────────────────────────

export async function getBreweryProducts(
  breweryId: string,
): Promise<BreweryProductItem[]> {
  const { brewery } = await requireBreweryOwnerByBreweryId(breweryId);
  const rows = await db.breweryProduct.findMany({
    where: { breweryId: brewery.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      brewType: true,
      alcoholContent: true,
      volume: true,
      price: true,
      imagePath: true,
      features: true,
      ingredients: true,
      isAvailable: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return toItems(rows);
}

// ── 생성 ─────────────────────────────────────────────────────────────────────

export type CreateBreweryProductResult =
  | { success: true; product: BreweryProductItem }
  | { success: false; error: string };

export async function createBreweryProduct(
  breweryId: string,
  formData: FormData,
): Promise<CreateBreweryProductResult> {
  let ctx: OwnerCtx;
  try {
    ctx = await requireBreweryOwnerByBreweryId(breweryId);
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "권한 확인 실패" };
  }

  let parsed: ParsedInput;
  try {
    parsed = parseInput(formData);
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "입력값이 올바르지 않습니다." };
  }

  let uploadedPath: string | null = null;
  try {
    uploadedPath = await uploadImageIfPresent(formData, ctx.tenantId, ctx.brewery.id);
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "썸네일 업로드 실패" };
  }

  try {
    const maxOrderAgg = await db.breweryProduct.aggregate({
      where: { breweryId: ctx.brewery.id },
      _max: { sortOrder: true },
    });
    const nextSortOrder = (maxOrderAgg._max.sortOrder ?? -1) + 1;

    const created = await db.breweryProduct.create({
      data: {
        breweryId: ctx.brewery.id,
        name: parsed.name,
        brewType: parsed.brewType,
        alcoholContent: parsed.alcoholContent,
        volume: parsed.volume,
        price: parsed.price,
        imagePath: uploadedPath,
        features: parsed.features,
        ingredients: parsed.ingredients,
        sortOrder: nextSortOrder,
      },
      select: {
        id: true,
        name: true,
        brewType: true,
        alcoholContent: true,
        volume: true,
        price: true,
        imagePath: true,
        features: true,
        ingredients: true,
        isAvailable: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    revalidatePath("/dashboard/my-brewery");
    revalidatePath(`/map/brewery/${ctx.brewery.id}`);
    revalidatePath("/map");

    const items = await toItems([created]);
    const item = items[0];
    if (!item) return { success: false, error: "제품 정보 생성 실패" };
    return { success: true, product: item };
  } catch (e) {
    if (uploadedPath) {
      try {
        await deletePhotoFromStorage(BUCKET, uploadedPath);
      } catch (cleanup) {
        console.error("[brewery-product] Storage 롤백 실패:", cleanup);
      }
    }
    console.error("[brewery-product] createBreweryProduct 실패:", e);
    return { success: false, error: "제품 생성 중 오류가 발생했습니다." };
  }
}

// ── 수정 ─────────────────────────────────────────────────────────────────────

export type UpdateBreweryProductResult =
  | { success: true; product: BreweryProductItem }
  | { success: false; error: string };

export async function updateBreweryProduct(
  productId: string,
  formData: FormData,
): Promise<UpdateBreweryProductResult> {
  let ctx;
  try {
    ctx = await requireBreweryOwnerByProductId(productId);
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "권한 확인 실패" };
  }

  let parsed: ParsedInput;
  try {
    parsed = parseInput(formData);
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "입력값이 올바르지 않습니다." };
  }

  const removeImage = formData.get("removeImage") === "true";

  let newImagePath: string | null = null;
  try {
    newImagePath = await uploadImageIfPresent(formData, ctx.tenantId, ctx.brewery.id);
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "썸네일 업로드 실패" };
  }

  const prevImagePath = ctx.product.imagePath;
  const nextImagePath = newImagePath !== null
    ? newImagePath
    : removeImage
      ? null
      : prevImagePath;

  try {
    const updated = await db.breweryProduct.update({
      where: { id: ctx.product.id },
      data: {
        name: parsed.name,
        brewType: parsed.brewType,
        alcoholContent: parsed.alcoholContent,
        volume: parsed.volume,
        price: parsed.price,
        imagePath: nextImagePath,
        features: parsed.features,
        ingredients: parsed.ingredients,
      },
      select: {
        id: true,
        name: true,
        brewType: true,
        alcoholContent: true,
        volume: true,
        price: true,
        imagePath: true,
        features: true,
        ingredients: true,
        isAvailable: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 이전 썸네일 정리 (교체 또는 명시적 제거 시)
    if (prevImagePath && prevImagePath !== nextImagePath) {
      try {
        await deletePhotoFromStorage(BUCKET, prevImagePath);
      } catch (e) {
        console.error("[brewery-product] 이전 썸네일 삭제 실패:", e);
      }
    }

    revalidatePath("/dashboard/my-brewery");
    revalidatePath(`/map/brewery/${ctx.brewery.id}`);
    revalidatePath("/map");

    const items = await toItems([updated]);
    const item = items[0];
    if (!item) return { success: false, error: "제품 정보 갱신 실패" };
    return { success: true, product: item };
  } catch (e) {
    if (newImagePath) {
      try {
        await deletePhotoFromStorage(BUCKET, newImagePath);
      } catch (cleanup) {
        console.error("[brewery-product] Storage 롤백 실패:", cleanup);
      }
    }
    console.error("[brewery-product] updateBreweryProduct 실패:", e);
    return { success: false, error: "제품 수정 중 오류가 발생했습니다." };
  }
}

// ── 삭제 ─────────────────────────────────────────────────────────────────────

export type DeleteBreweryProductResult =
  | { success: true }
  | { success: false; error: string };

export async function deleteBreweryProduct(
  productId: string,
): Promise<DeleteBreweryProductResult> {
  let ctx;
  try {
    ctx = await requireBreweryOwnerByProductId(productId);
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "권한 확인 실패" };
  }

  try {
    if (ctx.product.imagePath) {
      try {
        await deletePhotoFromStorage(BUCKET, ctx.product.imagePath);
      } catch (e) {
        console.error("[brewery-product] Storage 삭제 실패 (DB는 계속 삭제):", e);
      }
    }
    await db.breweryProduct.delete({ where: { id: ctx.product.id } });
    revalidatePath("/dashboard/my-brewery");
    revalidatePath(`/map/brewery/${ctx.brewery.id}`);
    revalidatePath("/map");
    return { success: true };
  } catch (e) {
    console.error("[brewery-product] deleteBreweryProduct 실패:", e);
    return { success: false, error: "제품 삭제 중 오류가 발생했습니다." };
  }
}

// ── 순서 변경 ────────────────────────────────────────────────────────────────

export type ReorderBreweryProductsResult =
  | { success: true }
  | { success: false; error: string };

export async function reorderBreweryProducts(
  breweryId: string,
  orderedProductIds: string[],
): Promise<ReorderBreweryProductsResult> {
  let ctx;
  try {
    ctx = await requireBreweryOwnerByBreweryId(breweryId);
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "권한 확인 실패" };
  }

  if (!Array.isArray(orderedProductIds) || orderedProductIds.length === 0) {
    return { success: false, error: "순서 목록이 비어있습니다." };
  }
  if (orderedProductIds.some((id) => typeof id !== "string" || !id.trim())) {
    return { success: false, error: "제품 ID가 올바르지 않습니다." };
  }
  const unique = new Set(orderedProductIds);
  if (unique.size !== orderedProductIds.length) {
    return { success: false, error: "중복된 제품 ID가 있습니다." };
  }

  try {
    const products = await db.breweryProduct.findMany({
      where: { breweryId: ctx.brewery.id, id: { in: orderedProductIds } },
      select: { id: true },
    });
    if (products.length !== orderedProductIds.length) {
      return { success: false, error: "양조장에 속하지 않은 제품이 포함되어 있습니다." };
    }

    await db.$transaction(
      orderedProductIds.map((id, idx) =>
        db.breweryProduct.update({
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
    console.error("[brewery-product] reorderBreweryProducts 실패:", e);
    return { success: false, error: "순서 변경 중 오류가 발생했습니다." };
  }
}
