"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import type { BrewType, Prisma } from "@ieum/db";

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

  const limit = Math.min(Math.max(params.limit ?? 50, 1), 100);
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
        products: { take: 3, orderBy: { createdAt: "asc" } },
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
        products: { take: 3, orderBy: { createdAt: "asc" } },
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
      products: { orderBy: { createdAt: "asc" } },
      photos: { orderBy: [{ isPrimary: "desc" }, { uploadedAt: "desc" }] },
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
          products: { take: 3, orderBy: { createdAt: "asc" } },
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
