"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@ieum/db";
import type { BrewType } from "@ieum/db";

// ── 공통 타입 ────────────────────────────────────────────────────────────────

export type BreweryCard = {
  id: string;
  name: string;
  address: string;
  region: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  website: string | null;
  tourAvailable: boolean;
  tastingAvailable: boolean;
  products: Array<{
    id: string;
    name: string;
    brewType: BrewType | null;
    alcoholContent: number | null;
  }>;
  primaryPhoto: { id: string; originalPath: string } | null;
  averageRating: number | null;
  reviewCount: number;
  favoriteCount: number;
  isFavorited: boolean;
};

// ── getBreweries ─────────────────────────────────────────────────────────────

export type GetBreweriesParams = {
  search?: string;
  brewType?: string[];
  region?: string;
  hasCoordinates?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: "name" | "newest" | "distance";
  userLat?: number;
  userLng?: number;
};

export type GetBreweriesResult = {
  breweries: BreweryCard[];
  total: number;
  hasMore: boolean;
};

// Haversine 거리(km). 입력은 도 단위.
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const VALID_BREW_TYPES = new Set<BrewType>([
  "BEER",
  "MAKGEOLLI",
  "CHEONGJU",
  "SOJU",
  "FRUIT_WINE",
]);

function buildBreweryWhere(params: GetBreweriesParams): Prisma.BreweryWhereInput {
  const AND: Prisma.BreweryWhereInput[] = [];

  if (params.search && params.search.trim()) {
    const q = params.search.trim();
    AND.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { address: { contains: q, mode: "insensitive" } },
        { products: { some: { name: { contains: q, mode: "insensitive" } } } },
      ],
    });
  }

  if (params.brewType && params.brewType.length > 0) {
    const filtered = params.brewType.filter((t): t is BrewType =>
      VALID_BREW_TYPES.has(t as BrewType),
    );
    if (filtered.length > 0) {
      AND.push({ products: { some: { brewType: { in: filtered } } } });
    }
  }

  if (params.region && params.region.trim()) {
    AND.push({ region: params.region.trim() });
  }

  if (params.hasCoordinates) {
    AND.push({ latitude: { not: null } });
  }

  return AND.length > 0 ? { AND } : {};
}

export async function getBreweries(
  params: GetBreweriesParams = {},
): Promise<GetBreweriesResult> {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const limit = Math.min(Math.max(params.limit ?? 50, 1), 1000);
  const offset = Math.max(params.offset ?? 0, 0);
  const sortBy: GetBreweriesParams["sortBy"] = params.sortBy ?? "name";

  const where = buildBreweryWhere(params);

  const total = await db.brewery.count({ where });

  // distance 정렬은 좌표 기반이라 lat/lng 가 필요. 없으면 name 정렬로 fallback.
  const useDistance =
    sortBy === "distance" &&
    typeof params.userLat === "number" &&
    typeof params.userLng === "number";

  let breweries;

  if (useDistance) {
    // 메모리 정렬. cap을 두어 과도한 fetch 방지.
    const DISTANCE_FETCH_CAP = 1000;
    const all = await db.brewery.findMany({
      where,
      include: {
        products: {
          take: 3,
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
        photos: { where: { isPrimary: true }, take: 1 },
      },
      take: DISTANCE_FETCH_CAP,
    });

    const userLat = params.userLat!;
    const userLng = params.userLng!;
    const withDist = all.map((b) => ({
      b,
      dist:
        b.latitude !== null && b.longitude !== null
          ? haversineKm(userLat, userLng, b.latitude, b.longitude)
          : Number.POSITIVE_INFINITY,
    }));
    withDist.sort((x, y) => x.dist - y.dist);
    breweries = withDist.slice(offset, offset + limit).map((x) => x.b);
  } else {
    const orderBy: Prisma.BreweryOrderByWithRelationInput =
      sortBy === "newest" ? { createdAt: "desc" } : { name: "asc" };

    breweries = await db.brewery.findMany({
      where,
      include: {
        products: {
          take: 3,
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
        photos: { where: { isPrimary: true }, take: 1 },
      },
      orderBy,
      skip: offset,
      take: limit,
    });
  }

  const breweryIds = breweries.map((b) => b.id);

  const [reviewStats, favoriteCounts, userFavorites] =
    breweryIds.length > 0
      ? await Promise.all([
          db.breweryReview.groupBy({
            by: ["breweryId"],
            where: { breweryId: { in: breweryIds } },
            _avg: { rating: true },
            _count: { _all: true },
          }),
          db.breweryFavorite.groupBy({
            by: ["breweryId"],
            where: { breweryId: { in: breweryIds } },
            _count: { _all: true },
          }),
          db.breweryFavorite.findMany({
            where: { userId: session.user.id, breweryId: { in: breweryIds } },
            select: { breweryId: true },
          }),
        ])
      : [[], [], []];

  const ratingMap = new Map(reviewStats.map((r) => [r.breweryId, r._avg.rating]));
  const reviewCountMap = new Map(reviewStats.map((r) => [r.breweryId, r._count._all]));
  const favoriteCountMap = new Map(favoriteCounts.map((f) => [f.breweryId, f._count._all]));
  const favoriteSet = new Set(userFavorites.map((f) => f.breweryId));

  const cards: BreweryCard[] = breweries.map((b) => ({
    id: b.id,
    name: b.name,
    address: b.address,
    region: b.region,
    city: b.city,
    latitude: b.latitude,
    longitude: b.longitude,
    website: b.website,
    tourAvailable: b.tourAvailable,
    tastingAvailable: b.tastingAvailable,
    products: b.products.map((p) => ({
      id: p.id,
      name: p.name,
      brewType: p.brewType,
      alcoholContent: p.alcoholContent,
    })),
    primaryPhoto: b.photos[0]
      ? { id: b.photos[0].id, originalPath: b.photos[0].originalPath }
      : null,
    averageRating: ratingMap.get(b.id) ?? null,
    reviewCount: reviewCountMap.get(b.id) ?? 0,
    favoriteCount: favoriteCountMap.get(b.id) ?? 0,
    isFavorited: favoriteSet.has(b.id),
  }));

  return {
    breweries: cards,
    total,
    hasMore: total > offset + limit,
  };
}

// ── getBreweriesForMap ───────────────────────────────────────────────────────
// 마커 렌더링 + 클라이언트 검색/필터 전용 페이로드.
// 좌표 있는 양조장 전체를 한 번에 반환. 필터링은 클라이언트에서 useMemo로 처리.

export type BreweryMapMarker = {
  id: string;
  name: string;
  address: string;
  region: string;
  latitude: number;
  longitude: number;
  primaryBrewType: BrewType | null;
  // 클라이언트 brewType 필터용 (중복 제거된 제품 brewType 목록)
  productBrewTypes: BrewType[];
  // 클라이언트 텍스트 검색용 (제품명)
  productNames: string[];
};

export type GetBreweriesForMapResult = {
  breweries: BreweryMapMarker[];
  total: number;
};

const MAP_MARKER_PRIORITY: BrewType[] = [
  "MAKGEOLLI",
  "CHEONGJU",
  "SOJU",
  "FRUIT_WINE",
  "BEER",
];

export async function getBreweriesForMap(): Promise<GetBreweriesForMapResult> {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const rows = await db.brewery.findMany({
    where: { latitude: { not: null }, longitude: { not: null } },
    select: {
      id: true,
      name: true,
      address: true,
      region: true,
      latitude: true,
      longitude: true,
      products: {
        select: { brewType: true, name: true },
      },
    },
    take: 1000,
    orderBy: { name: "asc" },
  });

  const markers: BreweryMapMarker[] = [];
  for (const b of rows) {
    if (b.latitude === null || b.longitude === null) continue;

    const typeSet = new Set<BrewType>();
    const productNames: string[] = [];
    for (const p of b.products) {
      if (p.brewType) typeSet.add(p.brewType);
      productNames.push(p.name);
    }
    let primary: BrewType | null = null;
    for (const t of MAP_MARKER_PRIORITY) {
      if (typeSet.has(t)) {
        primary = t;
        break;
      }
    }

    markers.push({
      id: b.id,
      name: b.name,
      address: b.address,
      region: b.region,
      latitude: b.latitude,
      longitude: b.longitude,
      primaryBrewType: primary,
      productBrewTypes: Array.from(typeSet),
      productNames,
    });
  }

  return { breweries: markers, total: markers.length };
}

// ── getBreweryById ───────────────────────────────────────────────────────────

export type BreweryDetail = {
  id: string;
  name: string;
  address: string;
  region: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  website: string | null;
  businessNumber: string | null;
  tenantId: string | null;
  description: string | null;
  operatingHours: unknown;
  tourAvailable: boolean;
  tourBookingMethod: string | null;
  tastingAvailable: boolean;
  tastingPriceInfo: string | null;
  parkingInfo: string | null;
  createdAt: Date;
  updatedAt: Date;
  products: Array<{
    id: string;
    name: string;
    brewType: BrewType | null;
    alcoholContent: number | null;
    volume: string | null;
    price: number | null;
    imagePath: string | null;
    sortOrder: number;
    ingredients: string | null;
    features: string | null;
    awards: string | null;
    isAvailable: boolean;
  }>;
  photos: Array<{
    id: string;
    originalPath: string;
    caption: string | null;
    isPrimary: boolean;
    uploadedAt: Date;
  }>;
  reviews: Array<{
    id: string;
    rating: number;
    content: string;
    createdAt: Date;
    author: { id: string; name: string | null };
    isOwnReview: boolean;
  }>;
  averageRating: number | null;
  reviewCount: number;
  favoriteCount: number;
  isFavorited: boolean;
  isOwnBrewery: boolean;
};

export async function getBreweryById(
  id: string,
): Promise<{ brewery: BreweryDetail | null }> {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const brewery = await db.brewery.findUnique({
    where: { id },
    include: {
      products: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      photos: {
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { uploadedAt: "desc" }],
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { id: true, name: true } } },
      },
    },
  });

  if (!brewery) return { brewery: null };

  const [ratingAgg, favoriteCount, userFavorite] = await Promise.all([
    db.breweryReview.aggregate({
      where: { breweryId: id },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    db.breweryFavorite.count({ where: { breweryId: id } }),
    db.breweryFavorite.findUnique({
      where: { userId_breweryId: { userId: session.user.id, breweryId: id } },
      select: { id: true },
    }),
  ]);

  const detail: BreweryDetail = {
    id: brewery.id,
    name: brewery.name,
    address: brewery.address,
    region: brewery.region,
    city: brewery.city,
    latitude: brewery.latitude,
    longitude: brewery.longitude,
    website: brewery.website,
    businessNumber: brewery.businessNumber,
    tenantId: brewery.tenantId,
    description: brewery.description,
    operatingHours: brewery.operatingHours,
    tourAvailable: brewery.tourAvailable,
    tourBookingMethod: brewery.tourBookingMethod,
    tastingAvailable: brewery.tastingAvailable,
    tastingPriceInfo: brewery.tastingPriceInfo,
    parkingInfo: brewery.parkingInfo,
    createdAt: brewery.createdAt,
    updatedAt: brewery.updatedAt,
    products: brewery.products.map((p) => ({
      id: p.id,
      name: p.name,
      brewType: p.brewType,
      alcoholContent: p.alcoholContent,
      volume: p.volume,
      price: p.price,
      imagePath: p.imagePath,
      sortOrder: p.sortOrder,
      ingredients: p.ingredients,
      features: p.features,
      awards: p.awards,
      isAvailable: p.isAvailable,
    })),
    photos: brewery.photos.map((ph) => ({
      id: ph.id,
      originalPath: ph.originalPath,
      caption: ph.caption,
      isPrimary: ph.isPrimary,
      uploadedAt: ph.uploadedAt,
    })),
    reviews: brewery.reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      content: r.content,
      createdAt: r.createdAt,
      author: { id: r.author.id, name: r.author.name },
      isOwnReview: r.authorId === session.user.id,
    })),
    averageRating: ratingAgg._avg.rating,
    reviewCount: ratingAgg._count._all,
    favoriteCount,
    isFavorited: userFavorite !== null,
    isOwnBrewery:
      brewery.tenantId !== null && brewery.tenantId === session.user.tenantId,
  };

  return { brewery: detail };
}

// ── getFavorites ─────────────────────────────────────────────────────────────

export async function getFavorites(): Promise<{ favorites: BreweryCard[] }> {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const favorites = await db.breweryFavorite.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      brewery: {
        include: {
          products: {
            take: 3,
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          },
          photos: { where: { isPrimary: true }, take: 1 },
        },
      },
    },
  });

  const breweryIds = favorites.map((f) => f.breweryId);

  const [reviewStats, favoriteCounts] =
    breweryIds.length > 0
      ? await Promise.all([
          db.breweryReview.groupBy({
            by: ["breweryId"],
            where: { breweryId: { in: breweryIds } },
            _avg: { rating: true },
            _count: { _all: true },
          }),
          db.breweryFavorite.groupBy({
            by: ["breweryId"],
            where: { breweryId: { in: breweryIds } },
            _count: { _all: true },
          }),
        ])
      : [[], []];

  const ratingMap = new Map(reviewStats.map((r) => [r.breweryId, r._avg.rating]));
  const reviewCountMap = new Map(reviewStats.map((r) => [r.breweryId, r._count._all]));
  const favoriteCountMap = new Map(favoriteCounts.map((f) => [f.breweryId, f._count._all]));

  const cards: BreweryCard[] = favorites.map((f) => {
    const b = f.brewery;
    return {
      id: b.id,
      name: b.name,
      address: b.address,
      region: b.region,
      city: b.city,
      latitude: b.latitude,
      longitude: b.longitude,
      website: b.website,
      tourAvailable: b.tourAvailable,
      tastingAvailable: b.tastingAvailable,
      products: b.products.map((p) => ({
        id: p.id,
        name: p.name,
        brewType: p.brewType,
        alcoholContent: p.alcoholContent,
      })),
      primaryPhoto: b.photos[0]
        ? { id: b.photos[0].id, originalPath: b.photos[0].originalPath }
        : null,
      averageRating: ratingMap.get(b.id) ?? null,
      reviewCount: reviewCountMap.get(b.id) ?? 0,
      favoriteCount: favoriteCountMap.get(b.id) ?? 0,
      isFavorited: true,
    };
  });

  return { favorites: cards };
}

// ── toggleFavorite ───────────────────────────────────────────────────────────

export async function toggleFavorite(
  breweryId: string,
): Promise<{ isFavorited: boolean; favoriteCount: number }> {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  if (typeof breweryId !== "string" || !breweryId.trim()) {
    throw new Error("양조장 ID가 올바르지 않습니다.");
  }

  const brewery = await db.brewery.findUnique({
    where: { id: breweryId },
    select: { id: true },
  });
  if (!brewery) throw new Error("양조장을 찾을 수 없습니다.");

  const userId = session.user.id;

  const { isFavorited, favoriteCount } = await db.$transaction(async (tx) => {
    const existing = await tx.breweryFavorite.findUnique({
      where: { userId_breweryId: { userId, breweryId } },
      select: { id: true },
    });

    if (existing) {
      await tx.breweryFavorite.delete({ where: { id: existing.id } });
    } else {
      await tx.breweryFavorite.create({ data: { userId, breweryId } });
    }

    const favoriteCount = await tx.breweryFavorite.count({ where: { breweryId } });
    return { isFavorited: !existing, favoriteCount };
  });

  revalidatePath("/map");
  revalidatePath(`/map/brewery/${breweryId}`);
  revalidatePath("/map/favorites");

  return { isFavorited, favoriteCount };
}

// ── createReview ─────────────────────────────────────────────────────────────

export type CreateReviewInput = {
  breweryId: string;
  rating: number;
  content: string;
};

function validateReviewInput(input: CreateReviewInput): {
  breweryId: string;
  rating: number;
  content: string;
} {
  if (typeof input.breweryId !== "string" || !input.breweryId.trim()) {
    throw new Error("양조장 ID가 올바르지 않습니다.");
  }
  if (
    typeof input.rating !== "number" ||
    !Number.isInteger(input.rating) ||
    input.rating < 1 ||
    input.rating > 5
  ) {
    throw new Error("별점은 1~5 사이의 정수여야 합니다.");
  }
  if (typeof input.content !== "string") {
    throw new Error("후기 내용이 올바르지 않습니다.");
  }
  const content = input.content.trim();
  if (content.length < 1) throw new Error("후기 내용을 입력해주세요.");
  if (content.length > 1000) throw new Error("후기 내용은 1000자 이내로 작성해주세요.");

  return { breweryId: input.breweryId, rating: input.rating, content };
}

export async function createReview(input: CreateReviewInput): Promise<{
  review: {
    id: string;
    rating: number;
    content: string;
    createdAt: Date;
    updatedAt: Date;
  };
}> {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { breweryId, rating, content } = validateReviewInput(input);

  const brewery = await db.brewery.findUnique({
    where: { id: breweryId },
    select: { id: true, tenantId: true },
  });
  if (!brewery) throw new Error("양조장을 찾을 수 없습니다.");

  if (
    brewery.tenantId !== null &&
    session.user.tenantId &&
    brewery.tenantId === session.user.tenantId
  ) {
    throw new Error("본인 양조장에는 후기를 작성할 수 없습니다.");
  }

  const review = await db.breweryReview.upsert({
    where: {
      breweryId_authorId: { breweryId, authorId: session.user.id },
    },
    create: { breweryId, authorId: session.user.id, rating, content },
    update: { rating, content },
    select: {
      id: true,
      rating: true,
      content: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  revalidatePath(`/map/brewery/${breweryId}`);

  return { review };
}

// ── updateBrewery ────────────────────────────────────────────────────────────

export type UpdateBreweryInput = {
  name?: string;
  tagline?: string | null;
  description?: string | null;
  operatingHours?: Record<string, { open: string; close: string } | null> | null;
  tourAvailable?: boolean;
  tourBookingMethod?: string | null;
  tastingAvailable?: boolean;
  tastingPriceInfo?: string | null;
  parkingInfo?: string | null;
  website?: string | null;
};

const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAY_KEYS = new Set(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);

function normalizeWebsite(input: string | null | undefined): string | null {
  if (input === null || input === undefined) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      throw new Error("웹사이트 주소 형식이 올바르지 않습니다.");
    }
    return u.toString();
  } catch {
    throw new Error("웹사이트 주소 형식이 올바르지 않습니다.");
  }
}

function validateOperatingHours(
  input: UpdateBreweryInput["operatingHours"],
): Prisma.InputJsonValue | null {
  if (input === null || input === undefined) return null;
  if (typeof input !== "object" || Array.isArray(input)) {
    throw new Error("영업시간 형식이 올바르지 않습니다.");
  }

  const result: Record<string, { open: string; close: string } | null> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!DAY_KEYS.has(key)) {
      throw new Error("영업시간 요일 키가 올바르지 않습니다.");
    }
    if (value === null) {
      result[key] = null;
      continue;
    }
    if (
      typeof value !== "object" ||
      typeof (value as { open?: unknown }).open !== "string" ||
      typeof (value as { close?: unknown }).close !== "string"
    ) {
      throw new Error("영업시간 값 형식이 올바르지 않습니다.");
    }
    const { open, close } = value as { open: string; close: string };
    if (!HHMM_RE.test(open) || !HHMM_RE.test(close)) {
      throw new Error("영업시간은 HH:MM 형식이어야 합니다.");
    }
    result[key] = { open, close };
  }
  return result as Prisma.InputJsonValue;
}

function trimOrNull(input: string | null | undefined, max: number, label: string): string | null {
  if (input === null || input === undefined) return null;
  if (typeof input !== "string") throw new Error(`${label} 형식이 올바르지 않습니다.`);
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.length > max) throw new Error(`${label}은(는) ${max}자 이내로 작성해주세요.`);
  return trimmed;
}

export async function updateBrewery(
  breweryId: string,
  data: UpdateBreweryInput,
): Promise<{ brewery: Awaited<ReturnType<typeof db.brewery.update>> }> {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  if (typeof breweryId !== "string" || !breweryId.trim()) {
    throw new Error("양조장 ID가 올바르지 않습니다.");
  }
  if (!session.user.tenantId) {
    throw new Error("양조장 정보가 없는 계정은 수정할 수 없습니다.");
  }

  const brewery = await db.brewery.findUnique({
    where: { id: breweryId },
    select: { id: true, tenantId: true },
  });
  if (!brewery) throw new Error("양조장을 찾을 수 없습니다.");

  if (brewery.tenantId !== session.user.tenantId) {
    throw new Error("본인 양조장만 수정할 수 있습니다.");
  }

  const updateData: Prisma.BreweryUpdateInput = {};

  if (data.name !== undefined) {
    if (typeof data.name !== "string") {
      throw new Error("양조장 이름 형식이 올바르지 않습니다.");
    }
    const trimmed = data.name.trim();
    if (!trimmed) throw new Error("양조장 이름을 입력해주세요.");
    if (trimmed.length > 50) {
      throw new Error("양조장 이름은 50자 이내로 작성해주세요.");
    }
    updateData.name = trimmed;
  }
  if (data.tagline !== undefined) {
    updateData.tagline = trimOrNull(data.tagline, 80, "한 줄 소개");
  }
  if (data.description !== undefined) {
    updateData.description = trimOrNull(data.description, 1000, "소개");
  }
  if (data.operatingHours !== undefined) {
    const hours = validateOperatingHours(data.operatingHours);
    updateData.operatingHours = hours === null ? Prisma.JsonNull : hours;
  }
  if (data.tourAvailable !== undefined) {
    if (typeof data.tourAvailable !== "boolean") {
      throw new Error("투어 가능 여부 형식이 올바르지 않습니다.");
    }
    updateData.tourAvailable = data.tourAvailable;
  }
  if (data.tourBookingMethod !== undefined) {
    updateData.tourBookingMethod = trimOrNull(data.tourBookingMethod, 200, "투어 예약 방법");
  }
  if (data.tastingAvailable !== undefined) {
    if (typeof data.tastingAvailable !== "boolean") {
      throw new Error("시음 가능 여부 형식이 올바르지 않습니다.");
    }
    updateData.tastingAvailable = data.tastingAvailable;
  }
  if (data.tastingPriceInfo !== undefined) {
    updateData.tastingPriceInfo = trimOrNull(data.tastingPriceInfo, 200, "시음 가격 정보");
  }
  if (data.parkingInfo !== undefined) {
    updateData.parkingInfo = trimOrNull(data.parkingInfo, 200, "주차 정보");
  }
  if (data.website !== undefined) {
    updateData.website = normalizeWebsite(data.website);
  }

  const updated = await db.brewery.update({
    where: { id: breweryId },
    data: updateData,
  });

  revalidatePath("/map");
  revalidatePath(`/map/brewery/${breweryId}`);
  revalidatePath("/dashboard/my-brewery");

  return { brewery: updated };
}
