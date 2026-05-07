/**
 * 이음 데모 데이터 시드
 * 실행: npx tsx packages/db/prisma/seed-demo.ts
 */

import { PrismaClient } from "../generated";
import bcryptjs from "bcryptjs";

const db = new PrismaClient();

// ── 날짜 헬퍼 ──────────────────────────────────────────────────

function daysAgo(days: number, hour = 12, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

// ── 기존 데모 데이터 정리 ──────────────────────────────────────

async function cleanupExisting() {
  const existing = await db.user.findUnique({ where: { email: "demo@ieum.kr" } });
  if (!existing) return;

  const tenantId = existing.tenantId;
  console.log("♻️  기존 데모 데이터 삭제 중...");

  await db.notification.deleteMany({ where: { tenantId } });
  await db.inventoryTransaction.deleteMany({
    where: { inventory: { tenantId } },
  });
  // Batch 삭제 → cascade: BatchNode, BatchIngredient, Measurement, TastingNote
  await db.batch.deleteMany({ where: { tenantId } });
  await db.inventory.deleteMany({ where: { tenantId } });
  // Recipe 삭제 → cascade: RecipeNode → RecipeNodeIngredient, Ingredient, RecipeShare
  await db.recipe.deleteMany({ where: { tenantId } });
  await db.recipeTemplate.deleteMany({ where: { tenantId } });
  await db.accessMapping.deleteMany({ where: { tenantId } });
  await db.user.deleteMany({ where: { tenantId } });
  await db.tenant.delete({ where: { id: tenantId } });

  console.log("✅ 삭제 완료\n");
}

// ── 메인 ──────────────────────────────────────────────────────

async function main() {
  console.log("🌱 이음 데모 데이터 시드 시작...\n");

  await cleanupExisting();

  // ── 1. 테넌트 + 유저 ──────────────────────────────────────────

  const tenant = await db.tenant.create({
    data: { name: "가양주 연구소", slug: "gayang-lab" },
  });

  const user = await db.user.create({
    data: {
      email: "demo@ieum.kr",
      name: "김양조",
      password: await bcryptjs.hash("demo1234", 10),
      role: "OWNER",
      tenantId: tenant.id,
    },
  });
  console.log("👤 계정 생성: demo@ieum.kr / demo1234");

  // ── 2. 레시피 ─────────────────────────────────────────────────

  // ① 막걸리 단양주
  const recipeMakDan = await db.recipe.create({
    data: {
      tenantId: tenant.id,
      name: "단양주 (쌀+누룩 기본)",
      brewType: "MAKGEOLLI",
      description: "멥쌀과 누룩만으로 빚는 가장 기본적인 막걸리.",
      targetVolume: 6,
      targetUnit: "L",
      isPublished: true,
      nodes: {
        create: [
          {
            order: 1, nodeType: "GRAIN_PREP", name: "고두밥 준비",
            durationMin: 240, targetTemp: 30,
            extraParams: { soakingHours: 6, steamingMinutes: 40, totalWeightKg: 2 },
          },
          {
            order: 2, nodeType: "MASH", name: "술 담기",
            durationMin: 60, targetTemp: 25,
            extraParams: { nurukType: "송학곡자", nurukRatio: 15, waterL: 4, waterTemp: 20, mixTemp: 25 },
          },
          {
            order: 3, nodeType: "FERMENTATION", name: "발효",
            durationMin: 10080, targetTemp: 25,
            extraParams: { durationDays: 7, measureInterval: "매일", targetAcidity: 0.5 },
          },
          { order: 4, nodeType: "PACKAGING", name: "거름 및 병입", durationMin: 120 },
        ],
      },
      ingredients: {
        create: [
          { name: "멥쌀", amount: 2, unit: "KG" },
          { name: "누룩(송학곡자)", amount: 0.3, unit: "KG" },
          { name: "물", amount: 4, unit: "L" },
        ],
      },
    },
  });

  // ② 막걸리 이양주
  const recipeMakI = await db.recipe.create({
    data: {
      tenantId: tenant.id,
      name: "이양주 (밑술+덧술)",
      brewType: "MAKGEOLLI",
      description: "밑술과 덧술 2단 발효로 복합미가 올라오는 막걸리.",
      targetVolume: 10,
      targetUnit: "L",
      isPublished: true,
      nodes: {
        create: [
          { order: 1, nodeType: "GRAIN_PREP", name: "고두밥 (1차)", durationMin: 240, targetTemp: 30 },
          {
            order: 2, nodeType: "MASH", name: "밑술 담기",
            durationMin: 60, targetTemp: 23,
            extraParams: { nurukType: "전통누룩", nurukRatio: 20, waterL: 3, waterTemp: 20 },
          },
          {
            order: 3, nodeType: "FERMENTATION", name: "밑술 발효",
            durationMin: 5040, targetTemp: 23,
            extraParams: { durationDays: 3.5, measureInterval: "매일" },
          },
          { order: 4, nodeType: "GRAIN_PREP", name: "고두밥 (2차)", durationMin: 240 },
          {
            order: 5, nodeType: "MASH", name: "덧술 담기",
            durationMin: 60, targetTemp: 23,
            extraParams: { waterL: 7, waterTemp: 20 },
          },
          {
            order: 6, nodeType: "FERMENTATION", name: "2차 발효",
            durationMin: 7200, targetTemp: 23,
            extraParams: { durationDays: 5, measureInterval: "매일", targetAcidity: 0.4 },
          },
          { order: 7, nodeType: "PACKAGING", name: "거름 및 병입", durationMin: 120 },
        ],
      },
      ingredients: {
        create: [
          { name: "멥쌀", amount: 1, unit: "KG" },
          { name: "찹쌀", amount: 2, unit: "KG" },
          { name: "누룩(전통누룩)", amount: 0.4, unit: "KG" },
          { name: "물", amount: 10, unit: "L" },
        ],
      },
    },
  });

  // ③ 맥주 페일에일
  const recipeBeerPale = await db.recipe.create({
    data: {
      tenantId: tenant.id,
      name: "페일에일 (기본 3단계)",
      brewType: "BEER",
      description: "Cascade 홉의 시트러스 향이 살아있는 아메리칸 페일에일.",
      targetVolume: 20,
      targetUnit: "L",
      isPublished: true,
      nodes: {
        create: [
          {
            order: 1, nodeType: "MASH_BEER", name: "당화 (Mash)",
            durationMin: 60, targetTemp: 67,
            extraParams: { grainWeightKg: 4.5, waterL: 12 },
          },
          { order: 2, nodeType: "BOIL", name: "끓임", durationMin: 60, targetTemp: 100 },
          {
            order: 3, nodeType: "FERMENTATION", name: "발효",
            durationMin: 20160, targetTemp: 20,
            extraParams: { durationDays: 14, measureInterval: "격일" },
          },
          { order: 4, nodeType: "CONDITIONING", name: "숙성", durationMin: 10080, targetTemp: 4 },
          { order: 5, nodeType: "PACKAGING", name: "병입/케깅", durationMin: 180 },
        ],
      },
      ingredients: {
        create: [
          { name: "페일몰트", amount: 4.5, unit: "KG" },
          { name: "Cascade 홉", amount: 50, unit: "G" },
          { name: "US-05 효모", amount: 1, unit: "PIECE" },
          { name: "물", amount: 25, unit: "L" },
        ],
      },
    },
  });

  // ④ 맥주 IPA
  const recipeBeerIpa = await db.recipe.create({
    data: {
      tenantId: tenant.id,
      name: "IPA (올그레인)",
      brewType: "BEER",
      description: "Cascade & Citra 더블홉으로 향이 터지는 웨스트코스트 IPA.",
      targetVolume: 20,
      targetUnit: "L",
      isPublished: true,
      nodes: {
        create: [
          {
            order: 1, nodeType: "MASH_BEER", name: "당화",
            durationMin: 60, targetTemp: 65,
            extraParams: { grainWeightKg: 5.5, waterL: 14 },
          },
          { order: 2, nodeType: "BOIL", name: "끓임 + 홉 첨가", durationMin: 60 },
          { order: 3, nodeType: "CUSTOM", name: "냉각 (칠러)", durationMin: 30 },
          {
            order: 4, nodeType: "FERMENTATION", name: "발효",
            durationMin: 20160, targetTemp: 19,
            extraParams: { durationDays: 14, measureInterval: "격일" },
          },
          {
            order: 5, nodeType: "CONDITIONING", name: "드라이호핑 숙성",
            durationMin: 4320, targetTemp: 18,
            extraParams: { durationDays: 3 },
          },
          { order: 6, nodeType: "PACKAGING", name: "케깅", durationMin: 120 },
        ],
      },
      ingredients: {
        create: [
          { name: "페일몰트", amount: 5.5, unit: "KG" },
          { name: "Cascade 홉", amount: 40, unit: "G" },
          { name: "Citra 홉", amount: 30, unit: "G" },
          { name: "US-05 효모", amount: 1, unit: "PIECE" },
          { name: "물", amount: 28, unit: "L" },
        ],
      },
    },
  });

  console.log("📖 레시피 4개 생성");

  // 레시피 노드 ID 미리 조회
  const [makDanNodes, makINodes, beerPaleNodes, ipaNodes] = await Promise.all([
    db.recipeNode.findMany({ where: { recipeId: recipeMakDan.id }, orderBy: { order: "asc" } }),
    db.recipeNode.findMany({ where: { recipeId: recipeMakI.id }, orderBy: { order: "asc" } }),
    db.recipeNode.findMany({ where: { recipeId: recipeBeerPale.id }, orderBy: { order: "asc" } }),
    db.recipeNode.findMany({ where: { recipeId: recipeBeerIpa.id }, orderBy: { order: "asc" } }),
  ]);

  // ── 3. 재고 ────────────────────────────────────────────────────

  const [invMepsal, invChapsal, invNuruk, invPaleMalt, invCascade, invYeast] =
    await Promise.all([
      db.inventory.create({
        data: {
          tenantId: tenant.id, name: "멥쌀", category: "RICE",
          sku: "RICE-MEP-001", quantity: 10, unit: "KG", reorderLevel: 5,
          notes: "국산 멥쌀 (일반형)",
        },
      }),
      db.inventory.create({
        data: {
          tenantId: tenant.id, name: "찹쌀", category: "RICE",
          sku: "RICE-CHA-001", quantity: 3, unit: "KG", reorderLevel: 5,
          notes: "저재고 알림 테스트용 — 최소기준(5kg) 미달",
        },
      }),
      db.inventory.create({
        data: {
          tenantId: tenant.id, name: "누룩(송학곡자)", category: "NURUK",
          sku: "NURUK-SH-001", quantity: 2, unit: "KG", reorderLevel: 0.5,
        },
      }),
      db.inventory.create({
        data: {
          tenantId: tenant.id, name: "페일몰트", category: "GRAIN",
          sku: "MALT-PALE-001", quantity: 8, unit: "KG", reorderLevel: 3,
        },
      }),
      db.inventory.create({
        data: {
          tenantId: tenant.id, name: "Cascade 홉", category: "HOP",
          sku: "HOP-CASCADE-001", quantity: 500, unit: "G", reorderLevel: 100,
        },
      }),
      db.inventory.create({
        data: {
          tenantId: tenant.id, name: "US-05 효모", category: "YEAST",
          sku: "YEAST-US05-001", quantity: 5, unit: "PIECE", reorderLevel: 2,
        },
      }),
    ]);

  await db.inventoryTransaction.createMany({
    data: [
      // 멥쌀
      { inventoryId: invMepsal.id, type: "PURCHASE", quantity: 15, notes: "쌀 구매", occurredAt: daysAgo(30) },
      { inventoryId: invMepsal.id, type: "BATCH_DEDUCT", quantity: 2, notes: "단양주 배치 투입", occurredAt: daysAgo(20) },
      { inventoryId: invMepsal.id, type: "BATCH_DEDUCT", quantity: 3, notes: "이양주 배치 투입", occurredAt: daysAgo(10) },
      // 찹쌀
      { inventoryId: invChapsal.id, type: "PURCHASE", quantity: 5, notes: "찹쌀 구매", occurredAt: daysAgo(20) },
      { inventoryId: invChapsal.id, type: "BATCH_DEDUCT", quantity: 2, notes: "이양주 배치 투입", occurredAt: daysAgo(10) },
      // 누룩
      { inventoryId: invNuruk.id, type: "PURCHASE", quantity: 3, notes: "송학곡자 구매", occurredAt: daysAgo(40) },
      { inventoryId: invNuruk.id, type: "BATCH_DEDUCT", quantity: 0.3, notes: "단양주 투입", occurredAt: daysAgo(20) },
      { inventoryId: invNuruk.id, type: "BATCH_DEDUCT", quantity: 0.4, notes: "이양주 투입", occurredAt: daysAgo(10) },
      { inventoryId: invNuruk.id, type: "BATCH_DEDUCT", quantity: 0.3, notes: "오염배치 투입", occurredAt: daysAgo(8) },
      // 페일몰트
      { inventoryId: invPaleMalt.id, type: "PURCHASE", quantity: 20, notes: "몰트 대량 구매", occurredAt: daysAgo(60) },
      { inventoryId: invPaleMalt.id, type: "BATCH_DEDUCT", quantity: 4.5, notes: "페일에일 배치 투입", occurredAt: daysAgo(25) },
      { inventoryId: invPaleMalt.id, type: "BATCH_DEDUCT", quantity: 2, notes: "오염배치 투입", occurredAt: daysAgo(8) },
      { inventoryId: invPaleMalt.id, type: "BATCH_DEDUCT", quantity: 5.5, notes: "IPA 배치 투입", occurredAt: daysAgo(5) },
      // Cascade 홉
      { inventoryId: invCascade.id, type: "PURCHASE", quantity: 1000, notes: "홉 구매 (1kg)", occurredAt: daysAgo(60) },
      { inventoryId: invCascade.id, type: "BATCH_DEDUCT", quantity: 50, notes: "페일에일 투입", occurredAt: daysAgo(25) },
      { inventoryId: invCascade.id, type: "BATCH_DEDUCT", quantity: 40, notes: "IPA 투입", occurredAt: daysAgo(5) },
      { inventoryId: invCascade.id, type: "BATCH_DEDUCT", quantity: 20, notes: "오염배치 투입 (폐기)", occurredAt: daysAgo(8) },
      // US-05 효모
      { inventoryId: invYeast.id, type: "PURCHASE", quantity: 10, notes: "효모 구매", occurredAt: daysAgo(60) },
      { inventoryId: invYeast.id, type: "BATCH_DEDUCT", quantity: 1, notes: "페일에일 투입", occurredAt: daysAgo(25) },
      { inventoryId: invYeast.id, type: "BATCH_DEDUCT", quantity: 1, notes: "오염배치 투입", occurredAt: daysAgo(8) },
      { inventoryId: invYeast.id, type: "BATCH_DEDUCT", quantity: 1, notes: "IPA 투입", occurredAt: daysAgo(5) },
      { inventoryId: invYeast.id, type: "BATCH_DEDUCT", quantity: 2, notes: "삼양주 예약 소분", occurredAt: daysAgo(1) },
    ],
  });

  console.log("📦 재고 6종 + 트랜잭션 이력 생성");

  // ── 4. 배치 ────────────────────────────────────────────────────

  // ① COMPLETED 막걸리 단양주 (20일 전 시작, 13일 전 완료)
  const batchMakDanDone = await db.batch.create({
    data: {
      tenantId: tenant.id,
      recipeId: recipeMakDan.id,
      brewerId: user.id,
      batchNumber: "2026-04-17-001",
      status: "COMPLETED",
      startedAt: daysAgo(20, 9),
      finishedAt: daysAgo(13, 13),
      actualVolume: 5.8,
      actualUnit: "L",
      notes: "초회 단양주. 날씨 서늘해서 발효 다소 느림.",
      recipeSnapshot: { name: "단양주 (쌀+누룩 기본)", brewType: "MAKGEOLLI", targetVolume: 6, targetUnit: "L" },
    },
  });

  await db.batchNode.createMany({
    data: [
      { batchId: batchMakDanDone.id, recipeNodeId: makDanNodes[0]!.id, order: 1, startedAt: daysAgo(20, 9), finishedAt: daysAgo(20, 16) },
      { batchId: batchMakDanDone.id, recipeNodeId: makDanNodes[1]!.id, order: 2, startedAt: daysAgo(20, 17), finishedAt: daysAgo(20, 18) },
      { batchId: batchMakDanDone.id, recipeNodeId: makDanNodes[2]!.id, order: 3, startedAt: daysAgo(20, 18), finishedAt: daysAgo(13, 10), actualTemp: 25 },
      { batchId: batchMakDanDone.id, recipeNodeId: makDanNodes[3]!.id, order: 4, startedAt: daysAgo(13, 11), finishedAt: daysAgo(13, 13) },
    ],
  });

  await db.measurement.createMany({
    data: [
      // 발효 D+0 (담금 직후)
      { batchId: batchMakDanDone.id, type: "BRIX", value: 20, unit: "BX", takenAt: daysAgo(20, 19) },
      { batchId: batchMakDanDone.id, type: "TEMPERATURE", value: 25, unit: "CELSIUS", takenAt: daysAgo(20, 19) },
      { batchId: batchMakDanDone.id, type: "PH", value: 4.5, unit: "PH", takenAt: daysAgo(20, 19) },
      // D+1
      { batchId: batchMakDanDone.id, type: "BRIX", value: 17, unit: "BX", takenAt: daysAgo(19, 10) },
      { batchId: batchMakDanDone.id, type: "TEMPERATURE", value: 26, unit: "CELSIUS", takenAt: daysAgo(19, 10) },
      // D+2
      { batchId: batchMakDanDone.id, type: "BRIX", value: 14, unit: "BX", takenAt: daysAgo(18, 10) },
      { batchId: batchMakDanDone.id, type: "TEMPERATURE", value: 25, unit: "CELSIUS", takenAt: daysAgo(18, 10) },
      { batchId: batchMakDanDone.id, type: "PH", value: 4.2, unit: "PH", takenAt: daysAgo(18, 10) },
      // D+3
      { batchId: batchMakDanDone.id, type: "BRIX", value: 11, unit: "BX", takenAt: daysAgo(17, 10) },
      { batchId: batchMakDanDone.id, type: "TEMPERATURE", value: 24, unit: "CELSIUS", takenAt: daysAgo(17, 10) },
      // D+4
      { batchId: batchMakDanDone.id, type: "BRIX", value: 9.5, unit: "BX", takenAt: daysAgo(16, 10) },
      { batchId: batchMakDanDone.id, type: "TEMPERATURE", value: 25, unit: "CELSIUS", takenAt: daysAgo(16, 10) },
      // D+5
      { batchId: batchMakDanDone.id, type: "BRIX", value: 8.5, unit: "BX", takenAt: daysAgo(15, 10) },
      { batchId: batchMakDanDone.id, type: "TEMPERATURE", value: 24, unit: "CELSIUS", takenAt: daysAgo(15, 10) },
      { batchId: batchMakDanDone.id, type: "PH", value: 3.9, unit: "PH", takenAt: daysAgo(15, 10) },
      { batchId: batchMakDanDone.id, type: "CUSTOM", value: 0.45, unit: "PERCENT", takenAt: daysAgo(15, 10), notes: "산도" },
      // D+7 (종료)
      { batchId: batchMakDanDone.id, type: "BRIX", value: 8, unit: "BX", takenAt: daysAgo(13, 9) },
      { batchId: batchMakDanDone.id, type: "TEMPERATURE", value: 24, unit: "CELSIUS", takenAt: daysAgo(13, 9) },
      { batchId: batchMakDanDone.id, type: "PH", value: 3.8, unit: "PH", takenAt: daysAgo(13, 9) },
      { batchId: batchMakDanDone.id, type: "CUSTOM", value: 0.52, unit: "PERCENT", takenAt: daysAgo(13, 9), notes: "산도" },
    ],
  });

  await db.tastingNote.create({
    data: {
      batchId: batchMakDanDone.id,
      tasterId: user.id,
      appearance: { color: "white", clarity: "milky", score: 4 },
      aromaGrain: 4, aromaFruit: 3, aromaNuruk: 4, aromaHop: 0, aromaAlcohol: 2,
      aromaOther: "은은한 쌀 향, 누룩 향기",
      tasteSweet: 3, tasteSour: 4, tasteBitter: 1, tasteUmami: 3,
      body: 3, carbonation: 2,
      overallScore: 4,
      notes: "첫 단양주 치고 산미 밸런스가 좋음. 탄산감 부족.",
    },
  });

  // ② COMPLETED 맥주 페일에일 (25일 전 시작, 7일 전 완료)
  const batchBeerPaleDone = await db.batch.create({
    data: {
      tenantId: tenant.id,
      recipeId: recipeBeerPale.id,
      brewerId: user.id,
      batchNumber: "2026-04-12-001",
      status: "COMPLETED",
      startedAt: daysAgo(25, 9),
      finishedAt: daysAgo(7, 14),
      actualVolume: 18.5,
      actualUnit: "L",
      notes: "Cascade 홉 아로마 매우 만족. 다음엔 드라이호핑 추가해볼 것.",
      recipeSnapshot: { name: "페일에일 (기본 3단계)", brewType: "BEER", targetVolume: 20, targetUnit: "L" },
    },
  });

  await db.batchNode.createMany({
    data: [
      { batchId: batchBeerPaleDone.id, recipeNodeId: beerPaleNodes[0]!.id, order: 1, startedAt: daysAgo(25, 9), finishedAt: daysAgo(25, 13) },
      { batchId: batchBeerPaleDone.id, recipeNodeId: beerPaleNodes[1]!.id, order: 2, startedAt: daysAgo(25, 13), finishedAt: daysAgo(25, 14) },
      { batchId: batchBeerPaleDone.id, recipeNodeId: beerPaleNodes[2]!.id, order: 3, startedAt: daysAgo(25, 15), finishedAt: daysAgo(11, 15), actualTemp: 20 },
      { batchId: batchBeerPaleDone.id, recipeNodeId: beerPaleNodes[3]!.id, order: 4, startedAt: daysAgo(11, 16), finishedAt: daysAgo(7, 10), actualTemp: 4 },
      { batchId: batchBeerPaleDone.id, recipeNodeId: beerPaleNodes[4]!.id, order: 5, startedAt: daysAgo(7, 11), finishedAt: daysAgo(7, 14) },
    ],
  });

  await db.measurement.createMany({
    data: [
      // 담금일
      { batchId: batchBeerPaleDone.id, type: "GRAVITY_ORIGINAL", value: 1.050, unit: "SG", takenAt: daysAgo(25, 15) },
      { batchId: batchBeerPaleDone.id, type: "TEMPERATURE", value: 20, unit: "CELSIUS", takenAt: daysAgo(25, 15) },
      { batchId: batchBeerPaleDone.id, type: "PH", value: 5.3, unit: "PH", takenAt: daysAgo(25, 15) },
      // D+2
      { batchId: batchBeerPaleDone.id, type: "GRAVITY_FINAL", value: 1.038, unit: "SG", takenAt: daysAgo(23, 10) },
      { batchId: batchBeerPaleDone.id, type: "TEMPERATURE", value: 20, unit: "CELSIUS", takenAt: daysAgo(23, 10) },
      // D+4
      { batchId: batchBeerPaleDone.id, type: "GRAVITY_FINAL", value: 1.025, unit: "SG", takenAt: daysAgo(21, 10) },
      { batchId: batchBeerPaleDone.id, type: "TEMPERATURE", value: 21, unit: "CELSIUS", takenAt: daysAgo(21, 10) },
      // D+6
      { batchId: batchBeerPaleDone.id, type: "GRAVITY_FINAL", value: 1.018, unit: "SG", takenAt: daysAgo(19, 10) },
      { batchId: batchBeerPaleDone.id, type: "TEMPERATURE", value: 20, unit: "CELSIUS", takenAt: daysAgo(19, 10) },
      // D+8
      { batchId: batchBeerPaleDone.id, type: "GRAVITY_FINAL", value: 1.013, unit: "SG", takenAt: daysAgo(17, 10) },
      { batchId: batchBeerPaleDone.id, type: "TEMPERATURE", value: 20, unit: "CELSIUS", takenAt: daysAgo(17, 10) },
      // D+10
      { batchId: batchBeerPaleDone.id, type: "GRAVITY_FINAL", value: 1.011, unit: "SG", takenAt: daysAgo(15, 10) },
      { batchId: batchBeerPaleDone.id, type: "TEMPERATURE", value: 19, unit: "CELSIUS", takenAt: daysAgo(15, 10) },
      // D+12 (발효 종료)
      { batchId: batchBeerPaleDone.id, type: "GRAVITY_FINAL", value: 1.010, unit: "SG", takenAt: daysAgo(13, 10) },
      { batchId: batchBeerPaleDone.id, type: "TEMPERATURE", value: 20, unit: "CELSIUS", takenAt: daysAgo(13, 10) },
      { batchId: batchBeerPaleDone.id, type: "PH", value: 4.1, unit: "PH", takenAt: daysAgo(13, 10) },
      // 숙성 (냉장)
      { batchId: batchBeerPaleDone.id, type: "TEMPERATURE", value: 4, unit: "CELSIUS", takenAt: daysAgo(11, 10) },
      { batchId: batchBeerPaleDone.id, type: "TEMPERATURE", value: 4, unit: "CELSIUS", takenAt: daysAgo(9, 10) },
    ],
  });

  await db.tastingNote.create({
    data: {
      batchId: batchBeerPaleDone.id,
      tasterId: user.id,
      appearance: { color: "golden", clarity: "clear", score: 4 },
      aromaGrain: 3, aromaFruit: 4, aromaNuruk: 0, aromaHop: 5, aromaAlcohol: 2,
      aromaOther: "시트러스, 자몽, 열대과일",
      tasteSweet: 2, tasteSour: 3, tasteBitter: 4, tasteUmami: 2,
      body: 4, carbonation: 4,
      overallScore: 4,
      notes: "홉 아로마 풍부. 약간의 다이아세틸 느낌.",
    },
  });

  // ③ FERMENTING 막걸리 이양주 — 덧술 발효 4일차 (10일 전 시작)
  const batchMakIActive = await db.batch.create({
    data: {
      tenantId: tenant.id,
      recipeId: recipeMakI.id,
      brewerId: user.id,
      batchNumber: "2026-04-27-001",
      status: "FERMENTING",
      startedAt: daysAgo(10, 9),
      recipeSnapshot: { name: "이양주 (밑술+덧술)", brewType: "MAKGEOLLI", targetVolume: 10, targetUnit: "L" },
    },
  });

  await db.batchNode.createMany({
    data: [
      { batchId: batchMakIActive.id, recipeNodeId: makINodes[0]!.id, order: 1, startedAt: daysAgo(10, 9), finishedAt: daysAgo(10, 16) },
      { batchId: batchMakIActive.id, recipeNodeId: makINodes[1]!.id, order: 2, startedAt: daysAgo(10, 17), finishedAt: daysAgo(10, 18) },
      // 밑술 발효 4일
      { batchId: batchMakIActive.id, recipeNodeId: makINodes[2]!.id, order: 3, startedAt: daysAgo(10, 18), finishedAt: daysAgo(6, 10), actualTemp: 23 },
      { batchId: batchMakIActive.id, recipeNodeId: makINodes[3]!.id, order: 4, startedAt: daysAgo(6, 11), finishedAt: daysAgo(6, 15) },
      { batchId: batchMakIActive.id, recipeNodeId: makINodes[4]!.id, order: 5, startedAt: daysAgo(6, 16), finishedAt: daysAgo(6, 17) },
      // 현재 진행 중 (덧술 발효 4일차)
      { batchId: batchMakIActive.id, recipeNodeId: makINodes[5]!.id, order: 6, startedAt: daysAgo(4, 10) },
      { batchId: batchMakIActive.id, recipeNodeId: makINodes[6]!.id, order: 7 },
    ],
  });

  await db.measurement.createMany({
    data: [
      // 덧술 담금 직후
      { batchId: batchMakIActive.id, type: "BRIX", value: 18, unit: "BX", takenAt: daysAgo(4, 12) },
      { batchId: batchMakIActive.id, type: "TEMPERATURE", value: 23, unit: "CELSIUS", takenAt: daysAgo(4, 12) },
      { batchId: batchMakIActive.id, type: "PH", value: 4.4, unit: "PH", takenAt: daysAgo(4, 12) },
      // D+1
      { batchId: batchMakIActive.id, type: "BRIX", value: 16, unit: "BX", takenAt: daysAgo(3, 10) },
      { batchId: batchMakIActive.id, type: "TEMPERATURE", value: 23, unit: "CELSIUS", takenAt: daysAgo(3, 10) },
      // D+2
      { batchId: batchMakIActive.id, type: "BRIX", value: 14, unit: "BX", takenAt: daysAgo(2, 10) },
      { batchId: batchMakIActive.id, type: "TEMPERATURE", value: 24, unit: "CELSIUS", takenAt: daysAgo(2, 10) },
      { batchId: batchMakIActive.id, type: "PH", value: 4.3, unit: "PH", takenAt: daysAgo(2, 10) },
      { batchId: batchMakIActive.id, type: "CUSTOM", value: 0.38, unit: "PERCENT", takenAt: daysAgo(2, 10), notes: "산도" },
    ],
  });

  // ④ FERMENTING 맥주 IPA — 발효 5일차
  const batchIpaActive = await db.batch.create({
    data: {
      tenantId: tenant.id,
      recipeId: recipeBeerIpa.id,
      brewerId: user.id,
      batchNumber: "2026-05-02-001",
      status: "FERMENTING",
      startedAt: daysAgo(5, 9),
      recipeSnapshot: { name: "IPA (올그레인)", brewType: "BEER", targetVolume: 20, targetUnit: "L" },
    },
  });

  await db.batchNode.createMany({
    data: [
      { batchId: batchIpaActive.id, recipeNodeId: ipaNodes[0]!.id, order: 1, startedAt: daysAgo(5, 9), finishedAt: daysAgo(5, 13) },
      { batchId: batchIpaActive.id, recipeNodeId: ipaNodes[1]!.id, order: 2, startedAt: daysAgo(5, 13), finishedAt: daysAgo(5, 14) },
      { batchId: batchIpaActive.id, recipeNodeId: ipaNodes[2]!.id, order: 3, startedAt: daysAgo(5, 14), finishedAt: daysAgo(5, 15) },
      // 현재 발효 5일차
      { batchId: batchIpaActive.id, recipeNodeId: ipaNodes[3]!.id, order: 4, startedAt: daysAgo(5, 15) },
      { batchId: batchIpaActive.id, recipeNodeId: ipaNodes[4]!.id, order: 5 },
      { batchId: batchIpaActive.id, recipeNodeId: ipaNodes[5]!.id, order: 6 },
    ],
  });

  await db.measurement.createMany({
    data: [
      // 담금일
      { batchId: batchIpaActive.id, type: "GRAVITY_ORIGINAL", value: 1.065, unit: "SG", takenAt: daysAgo(5, 16) },
      { batchId: batchIpaActive.id, type: "TEMPERATURE", value: 19, unit: "CELSIUS", takenAt: daysAgo(5, 16) },
      { batchId: batchIpaActive.id, type: "PH", value: 5.2, unit: "PH", takenAt: daysAgo(5, 16) },
      // D+1
      { batchId: batchIpaActive.id, type: "GRAVITY_FINAL", value: 1.048, unit: "SG", takenAt: daysAgo(4, 10) },
      { batchId: batchIpaActive.id, type: "TEMPERATURE", value: 19, unit: "CELSIUS", takenAt: daysAgo(4, 10) },
      // D+2
      { batchId: batchIpaActive.id, type: "GRAVITY_FINAL", value: 1.035, unit: "SG", takenAt: daysAgo(3, 10) },
      { batchId: batchIpaActive.id, type: "TEMPERATURE", value: 20, unit: "CELSIUS", takenAt: daysAgo(3, 10) },
      // D+3
      { batchId: batchIpaActive.id, type: "GRAVITY_FINAL", value: 1.025, unit: "SG", takenAt: daysAgo(2, 10) },
      { batchId: batchIpaActive.id, type: "TEMPERATURE", value: 19, unit: "CELSIUS", takenAt: daysAgo(2, 10) },
      // D+4 (어제)
      { batchId: batchIpaActive.id, type: "GRAVITY_FINAL", value: 1.018, unit: "SG", takenAt: daysAgo(1, 10) },
      { batchId: batchIpaActive.id, type: "TEMPERATURE", value: 19, unit: "CELSIUS", takenAt: daysAgo(1, 10) },
      { batchId: batchIpaActive.id, type: "PH", value: 4.2, unit: "PH", takenAt: daysAgo(1, 10) },
    ],
  });

  // ⑤ PLANNED 막걸리 삼양주 (자유양조, 아직 시작 안 함)
  await db.batch.create({
    data: {
      tenantId: tenant.id,
      brewerId: user.id,
      batchNumber: "2026-05-07-001",
      status: "PLANNED",
      notes: "삼양주 첫 도전. 3차 발효까지 도전 예정.",
      recipeSnapshot: {
        freeForm: true,
        name: "삼양주 (3단 발효)",
        brewType: "MAKGEOLLI",
        subType: "SAMYANGJU",
        nodes: [
          { order: 1, nodeType: "GRAIN_PREP", name: "고두밥 (1차)" },
          { order: 2, nodeType: "MASH", name: "밑술 담기" },
          { order: 3, nodeType: "FERMENTATION", name: "밑술 발효" },
          { order: 4, nodeType: "GRAIN_PREP", name: "고두밥 (2차)" },
          { order: 5, nodeType: "MASH", name: "1차 덧술" },
          { order: 6, nodeType: "FERMENTATION", name: "1차 발효" },
          { order: 7, nodeType: "GRAIN_PREP", name: "고두밥 (3차)" },
          { order: 8, nodeType: "MASH", name: "2차 덧술" },
          { order: 9, nodeType: "FERMENTATION", name: "최종 발효" },
        ],
      },
      batchNodes: {
        create: [
          { order: 1 }, { order: 2 }, { order: 3 },
          { order: 4 }, { order: 5 }, { order: 6 },
          { order: 7 }, { order: 8 }, { order: 9 },
        ],
      },
    },
  });

  // ⑥ ABORTED 맥주 — 발효 중 오염 (8일 전 시작, 1일 전 폐기)
  const batchBeerFailed = await db.batch.create({
    data: {
      tenantId: tenant.id,
      brewerId: user.id,
      batchNumber: "2026-04-30-001",
      status: "ABORTED",
      startedAt: daysAgo(8, 10),
      finishedAt: daysAgo(1, 11),
      notes: "pH가 급격히 상승하고 이상한 냄새 발생. 오염으로 판단하여 7일차에 폐기.",
      recipeSnapshot: {
        freeForm: true,
        name: "맥주 (오염 폐기)",
        brewType: "BEER",
        subType: "ALE",
        nodes: [
          { order: 1, nodeType: "MASH_BEER", name: "당화" },
          { order: 2, nodeType: "BOIL", name: "끓임" },
          { order: 3, nodeType: "FERMENTATION", name: "발효" },
        ],
      },
      batchNodes: {
        create: [
          { order: 1, startedAt: daysAgo(8, 10), finishedAt: daysAgo(8, 13) },
          { order: 2, startedAt: daysAgo(8, 13), finishedAt: daysAgo(8, 14) },
          { order: 3, startedAt: daysAgo(8, 15) }, // 종료 없음 (중단)
        ],
      },
    },
  });

  await db.measurement.createMany({
    data: [
      { batchId: batchBeerFailed.id, type: "GRAVITY_ORIGINAL", value: 1.048, unit: "SG", takenAt: daysAgo(8, 16) },
      { batchId: batchBeerFailed.id, type: "TEMPERATURE", value: 21, unit: "CELSIUS", takenAt: daysAgo(8, 16) },
      { batchId: batchBeerFailed.id, type: "PH", value: 5.2, unit: "PH", takenAt: daysAgo(8, 16) },
      // D+2 — pH 이상
      { batchId: batchBeerFailed.id, type: "GRAVITY_FINAL", value: 1.040, unit: "SG", takenAt: daysAgo(6, 10) },
      { batchId: batchBeerFailed.id, type: "TEMPERATURE", value: 22, unit: "CELSIUS", takenAt: daysAgo(6, 10) },
      { batchId: batchBeerFailed.id, type: "PH", value: 6.8, unit: "PH", takenAt: daysAgo(6, 10) },
      // D+4 — 오염 확인, pH 더 상승
      { batchId: batchBeerFailed.id, type: "TEMPERATURE", value: 23, unit: "CELSIUS", takenAt: daysAgo(4, 10) },
      { batchId: batchBeerFailed.id, type: "PH", value: 7.1, unit: "PH", takenAt: daysAgo(4, 10) },
    ],
  });

  console.log("🍶 배치 6개 생성 (완료2 / 진행2 / 대기1 / 중단1)");

  // ── 5. 알림 ────────────────────────────────────────────────────

  await db.notification.createMany({
    data: [
      {
        tenantId: tenant.id, userId: user.id,
        type: "LOW_STOCK",
        title: "저재고 알림",
        message: "찹쌀 재고가 3kg 남았습니다 (최소: 5kg)",
        referenceId: invChapsal.id,
        isRead: false,
        createdAt: daysAgo(1, 9),
      },
      {
        tenantId: tenant.id, userId: user.id,
        type: "FERMENTATION_REMINDER",
        title: "발효 측정 리마인더",
        message: "배치 2026-05-02-001 측정값을 입력해주세요 (마지막 기록: 1일 전)",
        referenceId: batchIpaActive.id,
        isRead: false,
        createdAt: daysAgo(0, 8),
      },
      {
        tenantId: tenant.id, userId: user.id,
        type: "BATCH_STATUS",
        title: "배치 완료",
        message: "배치 2026-04-17-001 발효가 완료되었습니다! 시음 기록을 남겨보세요.",
        referenceId: batchMakDanDone.id,
        isRead: true,
        createdAt: daysAgo(13, 13),
      },
      {
        tenantId: tenant.id, userId: user.id,
        type: "BATCH_STATUS",
        title: "배치 완료",
        message: "배치 2026-04-12-001 발효가 완료되었습니다! 시음 기록을 남겨보세요.",
        referenceId: batchBeerPaleDone.id,
        isRead: true,
        createdAt: daysAgo(7, 14),
      },
    ],
  });

  console.log("🔔 알림 4개 생성 (미읽음 2, 읽음 2)");

  // ── 완료 요약 ──────────────────────────────────────────────────

  console.log(`
✅ 더미 데이터 생성 완료

${"─".repeat(44)}
  📧  로그인    demo@ieum.kr
  🔑  비밀번호  demo1234
  🏠  양조장    가양주 연구소
${"─".repeat(44)}
  📖  레시피    4개 (막걸리 2 / 맥주 2)
  🍶  배치      6개 (완료2 / 진행2 / 대기1 / 중단1)
  📦  재고      6종 (찹쌀 저재고 ⚠️)
  🎭  시음기록  2개
  🔔  알림      4개 (미읽음 2개)
${"─".repeat(44)}
  ABV 테스트
    막걸리 단양주: Brix 20→8  → ~6.4%
    맥주 페일에일: OG 1.050 FG 1.010 → ~5.25%
    IPA (진행중):  OG 1.065 FG 1.018 → ~6.2% (현재)
${"─".repeat(44)}
`);
}

main()
  .catch((e) => {
    console.error("❌ 시드 실패:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
