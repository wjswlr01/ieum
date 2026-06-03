import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export type BreweryAccessCtx = {
  userId: string;
  brewery: { id: string; tenantId: string | null };
  isAdmin: boolean;
  isOwner: boolean;
};

export type PhotoAccessCtx = BreweryAccessCtx & {
  photo: {
    id: string;
    breweryId: string;
    originalPath: string;
    isPrimary: boolean;
    sortOrder: number;
  };
};

export type ProductAccessCtx = BreweryAccessCtx & {
  product: {
    id: string;
    breweryId: string;
    imagePath: string | null;
  };
};

export async function requireBreweryAccess(
  breweryId: string,
): Promise<BreweryAccessCtx> {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("로그인이 필요합니다.");
  if (typeof breweryId !== "string" || !breweryId.trim()) {
    throw new Error("양조장 ID가 올바르지 않습니다.");
  }

  const brewery = await db.brewery.findUnique({
    where: { id: breweryId },
    select: { id: true, tenantId: true },
  });
  if (!brewery) throw new Error("양조장을 찾을 수 없습니다.");

  const isAdmin = session.user.isAdmin === true;
  const isOwner =
    brewery.tenantId !== null &&
    !!session.user.tenantId &&
    brewery.tenantId === session.user.tenantId;

  if (!isAdmin && !isOwner) {
    throw new Error("이 양조장을 수정할 권한이 없습니다.");
  }

  return {
    userId: session.user.id,
    brewery,
    isAdmin,
    isOwner,
  };
}

export async function requireBreweryAccessByPhotoId(
  photoId: string,
): Promise<PhotoAccessCtx> {
  if (typeof photoId !== "string" || !photoId.trim()) {
    throw new Error("사진 ID가 올바르지 않습니다.");
  }
  const photo = await db.breweryPhoto.findUnique({
    where: { id: photoId },
    select: {
      id: true,
      breweryId: true,
      originalPath: true,
      isPrimary: true,
      sortOrder: true,
    },
  });
  if (!photo) throw new Error("사진을 찾을 수 없습니다.");
  const access = await requireBreweryAccess(photo.breweryId);
  return { ...access, photo };
}

export async function requireBreweryAccessByProductId(
  productId: string,
): Promise<ProductAccessCtx> {
  if (typeof productId !== "string" || !productId.trim()) {
    throw new Error("제품 ID가 올바르지 않습니다.");
  }
  const product = await db.breweryProduct.findUnique({
    where: { id: productId },
    select: { id: true, breweryId: true, imagePath: true },
  });
  if (!product) throw new Error("제품을 찾을 수 없습니다.");
  const access = await requireBreweryAccess(product.breweryId);
  return { ...access, product };
}
