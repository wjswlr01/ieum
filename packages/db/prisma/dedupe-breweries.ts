/**
 * 중복 양조장 정리 스크립트
 *
 * 판별 키: (name, region, city)
 *   - 자동 그룹 86개 머지
 *   - (name) 같지만 (region, city) 다른 row는 "수동 검수 필요"로 출력만 (자동 처리 X)
 *
 * survivor 선정 우선순위:
 *   1. tenantId 있음 (owner 연결)
 *   2. photos + favorites + reviews 합 > 0
 *   3. products 수 최다
 *   4. address 길이 최장 (도로명 우선)
 *   5. createdAt 가장 빠른
 *
 * 종속 데이터 머지:
 *   - products: loser → survivor (단, survivor에 같은 name 있으면 skip), sortOrder는 append
 *   - photos:   loser → survivor (originalPath는 변하지 않음, @unique 위반 없음)
 *   - favorites: loser → survivor (단, @@unique(userId, breweryId) 충돌 시 loser 삭제)
 *   - reviews:  loser → survivor (단, @@unique(breweryId, authorId) 충돌 시 loser 삭제)
 * loser hard delete (cascade 안전 — 종속은 이전됐거나 삭제됨)
 *
 * 실행:
 *   pnpm tsx packages/db/prisma/dedupe-breweries.ts            (dry-run, 기본)
 *   pnpm tsx packages/db/prisma/dedupe-breweries.ts --live     (실제 적용)
 */

import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(
  typeof __dirname !== "undefined" ? __filename : fileURLToPath(import.meta.url),
);
config({ path: path.resolve(here, "../.env") });

import { PrismaClient, type Prisma } from "../generated/index.js";

const prisma = new PrismaClient();

const LIVE = process.argv.includes("--live");
const MODE = LIVE ? "LIVE" : "DRY-RUN";

type BreweryRow = {
  id: string;
  name: string;
  address: string;
  region: string;
  city: string | null;
  tenantId: string | null;
  createdAt: Date;
  _count: {
    products: number;
    photos: number;
    favorites: number;
    reviews: number;
  };
};

function groupKey(b: { name: string; region: string; city: string | null }): string {
  return `${b.name.trim()}\u0000${b.region}\u0000${b.city ?? ""}`;
}

function nameKey(b: { name: string }): string {
  return b.name.trim();
}

function pickSurvivor(rows: BreweryRow[]): BreweryRow {
  // 우선순위순으로 정렬 후 첫 번째
  const sorted = [...rows].sort((a, b) => {
    // 1. owner 연결
    const ao = a.tenantId ? 1 : 0;
    const bo = b.tenantId ? 1 : 0;
    if (ao !== bo) return bo - ao;

    // 2. 종속(photos+favorites+reviews) 합
    const aDep = a._count.photos + a._count.favorites + a._count.reviews;
    const bDep = b._count.photos + b._count.favorites + b._count.reviews;
    if (aDep !== bDep) return bDep - aDep;

    // 3. products 수
    if (a._count.products !== b._count.products) {
      return b._count.products - a._count.products;
    }

    // 4. address 길이 (도로명/우편번호 포함된 더 완전한 주소 우선)
    if (a.address.length !== b.address.length) {
      return b.address.length - a.address.length;
    }

    // 5. createdAt 빠른 것
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
  return sorted[0]!;
}

type GroupPlan = {
  key: string;
  name: string;
  region: string;
  city: string | null;
  survivor: BreweryRow;
  losers: BreweryRow[];
};

type MergeStats = {
  productsTransferred: number;
  productsSkipped: number;
  photosTransferred: number;
  favoritesTransferred: number;
  favoritesDeleted: number;
  reviewsTransferred: number;
  reviewsDeleted: number;
  breweryDeleted: number;
};

async function processGroup(
  plan: GroupPlan,
  tx: Prisma.TransactionClient,
  stats: MergeStats,
  dryRun: boolean,
): Promise<{
  productsToTransfer: number;
  productsToSkip: number;
  photosToTransfer: number;
  favoritesToTransfer: number;
  favoritesToDelete: number;
  reviewsToTransfer: number;
  reviewsToDelete: number;
}> {
  const survivor = plan.survivor;
  const loserIds = plan.losers.map((l) => l.id);
  const result = {
    productsToTransfer: 0,
    productsToSkip: 0,
    photosToTransfer: 0,
    favoritesToTransfer: 0,
    favoritesToDelete: 0,
    reviewsToTransfer: 0,
    reviewsToDelete: 0,
  };

  // ── products: name dedup 후 이전 ──────────────────────────────
  const survivorProducts = await tx.breweryProduct.findMany({
    where: { breweryId: survivor.id },
    select: { name: true, sortOrder: true },
  });
  const survivorNames = new Set(survivorProducts.map((p) => p.name.trim()));
  const survivorMaxOrder = survivorProducts.reduce(
    (m, p) => (p.sortOrder > m ? p.sortOrder : m),
    -1,
  );

  const loserProducts = await tx.breweryProduct.findMany({
    where: { breweryId: { in: loserIds } },
    select: { id: true, name: true },
    orderBy: [{ breweryId: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });

  let nextOrder = survivorMaxOrder + 1;
  const transferProductIds: string[] = [];
  const skipProductIds: string[] = [];
  const orderUpdates: Array<{ id: string; sortOrder: number }> = [];

  for (const p of loserProducts) {
    if (survivorNames.has(p.name.trim())) {
      skipProductIds.push(p.id);
    } else {
      transferProductIds.push(p.id);
      orderUpdates.push({ id: p.id, sortOrder: nextOrder });
      nextOrder += 1;
      survivorNames.add(p.name.trim()); // 같은 loser 그룹 안에서도 dedup
    }
  }
  result.productsToTransfer = transferProductIds.length;
  result.productsToSkip = skipProductIds.length;

  if (!dryRun) {
    if (transferProductIds.length > 0) {
      // sortOrder 일괄 업데이트 + breweryId 이전
      for (const u of orderUpdates) {
        await tx.breweryProduct.update({
          where: { id: u.id },
          data: { breweryId: survivor.id, sortOrder: u.sortOrder },
        });
      }
    }
    if (skipProductIds.length > 0) {
      await tx.breweryProduct.deleteMany({ where: { id: { in: skipProductIds } } });
    }
  }
  stats.productsTransferred += result.productsToTransfer;
  stats.productsSkipped += result.productsToSkip;

  // ── photos: 단순 breweryId 이전 (originalPath @unique은 변하지 않으니 OK) ──
  const loserPhotos = await tx.breweryPhoto.findMany({
    where: { breweryId: { in: loserIds } },
    select: { id: true },
  });
  result.photosToTransfer = loserPhotos.length;
  if (!dryRun && loserPhotos.length > 0) {
    await tx.breweryPhoto.updateMany({
      where: { id: { in: loserPhotos.map((p) => p.id) } },
      data: { breweryId: survivor.id },
    });
  }
  stats.photosTransferred += result.photosToTransfer;

  // ── favorites: @@unique(userId, breweryId) 충돌 시 loser 삭제 ─────
  const survivorFavUsers = new Set(
    (
      await tx.breweryFavorite.findMany({
        where: { breweryId: survivor.id },
        select: { userId: true },
      })
    ).map((f) => f.userId),
  );
  const loserFavs = await tx.breweryFavorite.findMany({
    where: { breweryId: { in: loserIds } },
    select: { id: true, userId: true },
  });
  const favTransferIds: string[] = [];
  const favDeleteIds: string[] = [];
  for (const f of loserFavs) {
    if (survivorFavUsers.has(f.userId)) {
      favDeleteIds.push(f.id);
    } else {
      favTransferIds.push(f.id);
      survivorFavUsers.add(f.userId); // 같은 loser 그룹 안에서도 dedup
    }
  }
  result.favoritesToTransfer = favTransferIds.length;
  result.favoritesToDelete = favDeleteIds.length;
  if (!dryRun) {
    if (favTransferIds.length > 0) {
      await tx.breweryFavorite.updateMany({
        where: { id: { in: favTransferIds } },
        data: { breweryId: survivor.id },
      });
    }
    if (favDeleteIds.length > 0) {
      await tx.breweryFavorite.deleteMany({ where: { id: { in: favDeleteIds } } });
    }
  }
  stats.favoritesTransferred += result.favoritesToTransfer;
  stats.favoritesDeleted += result.favoritesToDelete;

  // ── reviews: @@unique(breweryId, authorId) 충돌 시 loser 삭제 ──────
  const survivorReviewAuthors = new Set(
    (
      await tx.breweryReview.findMany({
        where: { breweryId: survivor.id },
        select: { authorId: true },
      })
    ).map((r) => r.authorId),
  );
  const loserReviews = await tx.breweryReview.findMany({
    where: { breweryId: { in: loserIds } },
    select: { id: true, authorId: true },
  });
  const reviewTransferIds: string[] = [];
  const reviewDeleteIds: string[] = [];
  for (const r of loserReviews) {
    if (survivorReviewAuthors.has(r.authorId)) {
      reviewDeleteIds.push(r.id);
    } else {
      reviewTransferIds.push(r.id);
      survivorReviewAuthors.add(r.authorId);
    }
  }
  result.reviewsToTransfer = reviewTransferIds.length;
  result.reviewsToDelete = reviewDeleteIds.length;
  if (!dryRun) {
    if (reviewTransferIds.length > 0) {
      await tx.breweryReview.updateMany({
        where: { id: { in: reviewTransferIds } },
        data: { breweryId: survivor.id },
      });
    }
    if (reviewDeleteIds.length > 0) {
      await tx.breweryReview.deleteMany({ where: { id: { in: reviewDeleteIds } } });
    }
  }
  stats.reviewsTransferred += result.reviewsToTransfer;
  stats.reviewsDeleted += result.reviewsToDelete;

  // ── loser brewery hard delete ────────────────────────────────
  if (!dryRun) {
    await tx.brewery.deleteMany({ where: { id: { in: loserIds } } });
  }
  stats.breweryDeleted += loserIds.length;

  return result;
}

async function main() {
  console.log(`\n[DEDUP ${MODE}]`);
  console.log(`판별 키: (name, region, city)`);
  console.log(`survivor 우선순위: owner > 종속(📷⭐💬) > products > address 길이 > createdAt`);
  if (!LIVE) {
    console.log(`\n⚠️  DRY-RUN — DB 변경 없음. 실제 적용은 --live 인자.\n`);
  } else {
    console.log(`\n🔥 LIVE — 실제 변경 적용\n`);
  }

  const total = await prisma.brewery.count();
  console.log(`[총 양조장] ${total}건`);

  // 모든 brewery + 종속 카운트
  const all: BreweryRow[] = await prisma.brewery.findMany({
    select: {
      id: true,
      name: true,
      address: true,
      region: true,
      city: true,
      tenantId: true,
      createdAt: true,
      _count: {
        select: { products: true, photos: true, favorites: true, reviews: true },
      },
    },
  });

  // (name, region, city) 그룹화
  const byKey = new Map<string, BreweryRow[]>();
  for (const b of all) {
    const k = groupKey(b);
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k)!.push(b);
  }
  const autoGroups: GroupPlan[] = [];
  for (const [k, rows] of byKey) {
    if (rows.length < 2) continue;
    const survivor = pickSurvivor(rows);
    const losers = rows.filter((r) => r.id !== survivor.id);
    autoGroups.push({
      key: k,
      name: survivor.name,
      region: survivor.region,
      city: survivor.city,
      survivor,
      losers,
    });
  }
  autoGroups.sort((a, b) =>
    a.name.localeCompare(b.name, "ko") || a.region.localeCompare(b.region, "ko"),
  );

  // 수동 검수: (name) 그룹의 row 중 자동 그룹에 안 포함된 row들
  const autoBreweryIds = new Set<string>();
  for (const g of autoGroups) {
    autoBreweryIds.add(g.survivor.id);
    for (const l of g.losers) autoBreweryIds.add(l.id);
  }
  const byName = new Map<string, BreweryRow[]>();
  for (const b of all) {
    const k = nameKey(b);
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k)!.push(b);
  }
  const manualGroups: Array<{
    name: string;
    rows: BreweryRow[]; // 자동 그룹 + 자동에 안 들어간 row 모두 포함
  }> = [];
  for (const [name, rows] of byName) {
    if (rows.length < 2) continue;
    const unmatched = rows.filter((r) => !autoBreweryIds.has(r.id));
    if (unmatched.length === 0) continue;
    manualGroups.push({ name, rows });
  }
  manualGroups.sort((a, b) => a.name.localeCompare(b.name, "ko"));

  console.log(`[자동 머지 그룹] ${autoGroups.length}개`);
  console.log(`[수동 검수 필요 그룹] ${manualGroups.length}개\n`);

  // ── 자동 머지 시뮬레이션 / 실행 ──────────────────────────────
  const stats: MergeStats = {
    productsTransferred: 0,
    productsSkipped: 0,
    photosTransferred: 0,
    favoritesTransferred: 0,
    favoritesDeleted: 0,
    reviewsTransferred: 0,
    reviewsDeleted: 0,
    breweryDeleted: 0,
  };

  const perGroupResults: Array<{
    plan: GroupPlan;
    result: Awaited<ReturnType<typeof processGroup>>;
  }> = [];

  if (LIVE) {
    await prisma.$transaction(async (tx) => {
      for (const g of autoGroups) {
        const r = await processGroup(g, tx, stats, false);
        perGroupResults.push({ plan: g, result: r });
      }
    }, { timeout: 60_000 });
  } else {
    // dry-run: prisma client를 그대로 read-only로 사용 (write 분기 X)
    const tx = prisma as unknown as Prisma.TransactionClient;
    for (const g of autoGroups) {
      const r = await processGroup(g, tx, stats, true);
      perGroupResults.push({ plan: g, result: r });
    }
  }

  console.log(`[자동 머지 상세] — 상위 20 그룹`);
  for (const { plan, result } of perGroupResults.slice(0, 20)) {
    const cityStr = plan.city ? `/${plan.city}` : "";
    const s = plan.survivor;
    console.log(
      `\n── "${plan.name}" (${plan.region}${cityStr}) loser ${plan.losers.length}건`,
    );
    console.log(
      `  ✓ survivor ${s.id.slice(0, 8)}  [P:${s._count.products} 📷${s._count.photos} ⭐${s._count.favorites} 💬${s._count.reviews}]${s.tenantId ? " owner✓" : ""}  ${s.address}`,
    );
    for (const l of plan.losers) {
      console.log(
        `  ✗ loser    ${l.id.slice(0, 8)}  [P:${l._count.products} 📷${l._count.photos} ⭐${l._count.favorites} 💬${l._count.reviews}]${l.tenantId ? " owner✓" : ""}  ${l.address}`,
      );
    }
    console.log(
      `  → products 이전:${result.productsToTransfer} skip:${result.productsToSkip}, photos:${result.photosToTransfer}, fav:${result.favoritesToTransfer}/-${result.favoritesToDelete}, rev:${result.reviewsToTransfer}/-${result.reviewsToDelete}`,
    );
  }
  if (autoGroups.length > 20) {
    console.log(`\n  ... (이하 ${autoGroups.length - 20} 그룹 생략)`);
  }

  console.log(`\n[자동 머지 집계 (${MODE})]`);
  console.log(`  Brewery 삭제 예정 : ${stats.breweryDeleted}`);
  console.log(`  Product 이전      : ${stats.productsTransferred}`);
  console.log(`  Product 중복삭제  : ${stats.productsSkipped}`);
  console.log(`  Photo 이전        : ${stats.photosTransferred}`);
  console.log(`  Favorite 이전     : ${stats.favoritesTransferred}`);
  console.log(`  Favorite 중복삭제 : ${stats.favoritesDeleted}`);
  console.log(`  Review 이전       : ${stats.reviewsTransferred}`);
  console.log(`  Review 중복삭제   : ${stats.reviewsDeleted}`);
  console.log(`\n  예상 결과: ${total} → ${total - stats.breweryDeleted}건`);

  // ── 수동 검수 출력 ──────────────────────────────────────────
  console.log(`\n[수동 검수 필요] ${manualGroups.length}개 그룹 — 자동 처리 X, 검토 후 별도 결정`);
  for (const g of manualGroups) {
    console.log(`\n── "${g.name}" 총 ${g.rows.length}건`);
    // 같은 (region, city) 끼리 그룹화해서 표시
    const sub = new Map<string, BreweryRow[]>();
    for (const r of g.rows) {
      const k = `${r.region}\u0000${r.city ?? ""}`;
      if (!sub.has(k)) sub.set(k, []);
      sub.get(k)!.push(r);
    }
    for (const [k, rows] of sub) {
      const [reg, cty] = k.split("\u0000");
      const cityStr = cty ? `/${cty}` : "";
      const autoStatus = rows.length >= 2 ? "(자동 머지 예정)" : "(미머지)";
      console.log(`  · ${reg}${cityStr} — ${rows.length}건 ${autoStatus}`);
      for (const r of rows) {
        const inAuto = autoBreweryIds.has(r.id) ? "·자동그룹" : "·수동대상";
        console.log(
          `      ${r.id.slice(0, 8)} ${inAuto}  [P:${r._count.products} 📷${r._count.photos} ⭐${r._count.favorites} 💬${r._count.reviews}]${r.tenantId ? " owner✓" : ""}  ${r.address}`,
        );
      }
    }
  }

  console.log(`\n[완료] ${MODE} mode\n`);
  if (!LIVE) {
    console.log(`▶ 실제 적용: pnpm tsx packages/db/prisma/dedupe-breweries.ts --live\n`);
  }
}

main()
  .catch((e) => {
    console.error("[dedupe] 실패:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
