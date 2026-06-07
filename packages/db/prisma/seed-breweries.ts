/**
 * 양조장 디렉토리 시드 스크립트
 *
 * CSV → 그룹화 → Kakao 지오코딩 → DB upsert
 *
 * 실행:
 *   pnpm seed:breweries -- --dry-run   (검증만)
 *   pnpm seed:breweries                (실제 적용)
 */

import { config } from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { parse } from "csv-parse/sync";

// ── env 로드 (apps/web/.env.local 단일 진실원) ─────────────────
const here = path.dirname(
  typeof __dirname !== "undefined" ? __filename : fileURLToPath(import.meta.url),
);
const envPath = path.resolve(here, "../../../apps/web/.env.local");
config({ path: envPath });

// ── 의존성 import (env 로드 후) ────────────────────────────────
import { PrismaClient } from "../generated";

// ── 상수 ───────────────────────────────────────────────────────
const CSV_PATH = path.resolve(here, "../../../data/breweries-raw.csv");
const KAKAO_KEY = process.env.KAKAO_REST_API_KEY;
const DRY_RUN = process.argv.includes("--dry-run");

// ── 타입 ───────────────────────────────────────────────────────
type BrewType = "MAKGEOLLI" | "CHEONGJU" | "SOJU" | "FRUIT_WINE" | "BEER";

type RawRow = {
  제품명: string;
  제품소개: string;
  알콜도수: string;
  용량: string;
  성분: string;
  특이사항: string;
  특징: string;
  판매여부: string;
  양조장: string;
  양조장주소: string;
  홈페이지주소: string;
  수상경력: string;
};

type NormalizedProduct = {
  name: string;
  alcoholContent: number | null;
  volume: string | null;
  ingredients: string | null;
  features: string | null; // 제품소개 + 특징 + 특이사항 통합
  awards: string | null;
  isAvailable: boolean;
  brewType: BrewType | null;
};

type GroupedBrewery = {
  name: string;
  address: string;
  website: string | null;
  region: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  products: NormalizedProduct[];
};

type GeocodeResult = {
  latitude: number;
  longitude: number;
  kakaoRegion: string | null;
  kakaoCity: string | null;
};

type GeocodeStats = {
  attempted: number;
  geocoded: number; // 좌표 변환 성공
  notFound: number; // documents 빈 배열
  apiErrors: number;
  regionRecovered: number; // 기타 → 광역 매핑 회복
  failures: Array<{ name: string; address: string; reason: string }>;
};

type UpsertStats = {
  created: number;
  updated: number;
  skipped: number; // 양조장명=주소 (CSV 컬럼 오염)
  withCoords: number; // 좌표 있는 양조장
  withoutCoords: number; // 좌표 null로 저장된 양조장 (skip 제외)
  productsTotal: number;
  errors: number;
  errorDetails: Array<{ name: string; reason: string }>;
};

// ── 정규화 사전 ────────────────────────────────────────────────
const REGION_MAP: Record<string, string> = {
  서울특별시: "서울", 서울시: "서울", 서울: "서울",
  부산광역시: "부산", 부산시: "부산", 부산: "부산",
  대구광역시: "대구", 대구시: "대구", 대구: "대구",
  인천광역시: "인천", 인천시: "인천", 인천: "인천",
  광주광역시: "광주", 광주시: "광주", 광주: "광주",
  대전광역시: "대전", 대전시: "대전", 대전: "대전",
  울산광역시: "울산", 울산시: "울산", 울산: "울산",
  세종특별자치시: "세종", 세종특별시: "세종", 세종시: "세종", 세종: "세종",
  경기도: "경기", 경기: "경기",
  강원도: "강원", 강원특별자치도: "강원", 강원: "강원",
  충청북도: "충북", 충북: "충북",
  충청남도: "충남", 충남: "충남",
  전라북도: "전북", 전북특별자치도: "전북", 전북: "전북",
  전라남도: "전남", 전남: "전남",
  경상북도: "경북", 경북: "경북",
  경상남도: "경남", 경남: "경남",
  제주특별자치도: "제주", 제주도: "제주", 제주: "제주",
};

// 우편번호 prefix 제거: "(25326)강원도 ..." → "강원도 ..."
const POSTAL_PREFIX_RE = /^\(\d{5}\)\s*/;

// 우선순위 순서대로 검색 — 먼저 매칭되는 키워드의 타입 채택
const BREW_TYPE_KEYWORDS: Array<{ type: BrewType; keywords: string[] }> = [
  { type: "MAKGEOLLI", keywords: ["막걸리", "탁주", "동동주", "생주"] },
  { type: "CHEONGJU", keywords: ["청주", "약주"] },
  { type: "SOJU", keywords: ["안동소주", "증류", "소주"] },
  {
    type: "FRUIT_WINE",
    keywords: ["과실주", "와인", "포도주", "사과주", "매실주", "복분자", "머루"],
  },
  { type: "BEER", keywords: ["맥주", "IPA", "에일", "라거", "스타우트"] },
];

// ── 환경변수 검증 (값은 절대 출력하지 않음) ─────────────────────
function assertEnv(): void {
  const missing: string[] = [];
  if (!KAKAO_KEY) missing.push("KAKAO_REST_API_KEY");
  if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
  if (missing.length) {
    console.error(`❌ 필수 환경변수 누락: ${missing.join(", ")}`);
    console.error(`   확인 위치: ${envPath} (KAKAO), packages/db/.env (DB)`);
    process.exit(1);
  }
  console.log("✅ 환경변수 로드 확인됨 (값 비공개)");
}

// ── 정규화 헬퍼 ────────────────────────────────────────────────
function nullable(s: string | undefined | null): string | null {
  if (s == null) return null;
  const t = String(s).trim();
  return t.length ? t : null;
}

function normalizeAlcohol(s: string): number | null {
  const t = nullable(s);
  if (!t) return null;
  const v = parseFloat(t.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(v)) return null;
  if (v <= 0 || v > 50) return null;
  return v;
}

function normalizeAvailability(s: string): boolean {
  const t = (s ?? "").trim().toUpperCase();
  if (t === "N") return false;
  return true; // "Y" 또는 빈값/기타 → 기본 판매중
}

function normalizeWebsite(s: string): string | null {
  const t = nullable(s);
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  return `http://${t}`;
}

function cleanAddress(address: string): string {
  return address.trim().replace(POSTAL_PREFIX_RE, "").trim();
}

function normalizeRegion(address: string): string {
  const first = cleanAddress(address).split(/\s+/)[0] ?? "";
  return REGION_MAP[first] ?? "기타";
}

// 그룹화 키 정규화 — 공백 trim + 연속 공백 1칸으로
function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

// 그룹 안에서 가장 완전한 address 선택 — 우편번호 prefix 제거 후 길이 최장
function pickBestAddress(addresses: string[]): string {
  let best = addresses[0] ?? "";
  let bestLen = -1;
  for (const a of addresses) {
    const cleaned = cleanAddress(a);
    if (cleaned.length > bestLen) {
      best = a;
      bestLen = cleaned.length;
    }
  }
  return best;
}

function extractCity(address: string): string | null {
  const tokens = cleanAddress(address).split(/\s+/);
  const second = tokens[1];
  if (!second) return null;
  // 시/군/구로 끝나야 행정구역으로 인정 (세종처럼 도로명만 오는 경우 제외)
  if (/(시|군|구)$/.test(second)) return second;
  return null;
}

function inferBrewType(...texts: Array<string | null>): BrewType | null {
  const blob = texts.filter(Boolean).join(" ");
  if (!blob) return null;
  for (const { type, keywords } of BREW_TYPE_KEYWORDS) {
    if (keywords.some((kw) => blob.includes(kw))) return type;
  }
  return null;
}

function normalizeProduct(row: RawRow): NormalizedProduct {
  const description = nullable(row.제품소개);
  const features = nullable(row.특징);
  const note = nullable(row.특이사항);
  const featuresCombined = [description, features, note].filter(Boolean).join(" / ");
  return {
    name: (row.제품명 ?? "").trim(),
    alcoholContent: normalizeAlcohol(row.알콜도수),
    volume: nullable(row.용량),
    ingredients: nullable(row.성분),
    features: featuresCombined.length ? featuresCombined : null,
    awards: nullable(row.수상경력),
    isAvailable: normalizeAvailability(row.판매여부),
    brewType: inferBrewType(row.제품명, row.제품소개, row.특징),
  };
}

// ── CSV 파싱 ───────────────────────────────────────────────────
function parseCsv(): RawRow[] {
  const content = fs.readFileSync(CSV_PATH);
  const rows = parse(content, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
  }) as RawRow[];
  return rows;
}

// ── 그룹화 ─────────────────────────────────────────────────────
function groupByBrewery(rows: RawRow[]): {
  groups: Map<string, GroupedBrewery>;
  orphanRows: RawRow[]; // 주소가 빈 행
} {
  const groups = new Map<string, GroupedBrewery>();
  const orphanRows: RawRow[] = [];

  for (const row of rows) {
    const name = (row.양조장 ?? "").trim();
    const address = (row.양조장주소 ?? "").trim();
    if (!name || !address) {
      orphanRows.push(row);
      continue;
    }
    const key = `${name}|||${address}`;
    const product = normalizeProduct(row);

    const existing = groups.get(key);
    if (existing) {
      existing.products.push(product);
      if (!existing.website) {
        existing.website = normalizeWebsite(row.홈페이지주소);
      }
      continue;
    }
    groups.set(key, {
      name,
      address,
      website: normalizeWebsite(row.홈페이지주소),
      region: normalizeRegion(address),
      city: extractCity(address),
      latitude: null,
      longitude: null,
      products: [product],
    });
  }

  return { groups, orphanRows };
}

// ── Kakao 지오코딩 ─────────────────────────────────────────────
class KakaoAuthError extends Error {
  constructor() {
    super("Kakao 인증 실패 (HTTP 401) — KAKAO_REST_API_KEY 확인 필요");
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function geocodeAddress(
  address: string,
  attempt = 1,
): Promise<GeocodeResult | null> {
  const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`;
  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${KAKAO_KEY}` },
  });

  if (res.status === 401) throw new KakaoAuthError();

  if (res.status === 429 && attempt <= 2) {
    await sleep(1000);
    return geocodeAddress(address, attempt + 1);
  }
  if ((res.status === 500 || res.status === 503) && attempt <= 2) {
    await sleep(500);
    return geocodeAddress(address, attempt + 1);
  }
  if (!res.ok) {
    throw new Error(`Kakao HTTP ${res.status}`);
  }

  const data = (await res.json()) as {
    documents?: Array<{
      x: string;
      y: string;
      address?: {
        region_1depth_name?: string;
        region_2depth_name?: string;
      };
    }>;
  };

  const doc = data.documents?.[0];
  if (!doc) return null;

  const lng = parseFloat(doc.x);
  const lat = parseFloat(doc.y);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    latitude: lat,
    longitude: lng,
    kakaoRegion: doc.address?.region_1depth_name ?? null,
    kakaoCity: doc.address?.region_2depth_name ?? null,
  };
}

async function geocodeAll(breweries: GroupedBrewery[]): Promise<GeocodeStats> {
  const stats: GeocodeStats = {
    attempted: breweries.length,
    geocoded: 0,
    notFound: 0,
    apiErrors: 0,
    regionRecovered: 0,
    failures: [],
  };
  const total = breweries.length;
  const PROGRESS_EVERY = 50;

  for (let i = 0; i < total; i++) {
    const b = breweries[i];
    if (i === 0 || (i + 1) % PROGRESS_EVERY === 0 || i === total - 1) {
      console.log(`  [${i + 1}/${total}] 진행 중... (성공 ${stats.geocoded} / 미발견 ${stats.notFound} / 오류 ${stats.apiErrors})`);
    }

    try {
      const result = await geocodeAddress(b.address);
      if (result) {
        b.latitude = result.latitude;
        b.longitude = result.longitude;
        const beforeRegion = b.region;
        if (result.kakaoRegion) {
          const normalized = REGION_MAP[result.kakaoRegion] ?? "기타";
          b.region = normalized;
          if (beforeRegion === "기타" && normalized !== "기타") {
            stats.regionRecovered++;
          }
        }
        if (result.kakaoCity) b.city = result.kakaoCity;
        stats.geocoded++;
      } else {
        stats.notFound++;
        stats.failures.push({
          name: b.name,
          address: b.address,
          reason: "documents 빈 배열",
        });
      }
    } catch (e) {
      if (e instanceof KakaoAuthError) {
        console.error(`💥 ${e.message}`);
        process.exit(1);
      }
      stats.apiErrors++;
      const msg = e instanceof Error ? e.message : String(e);
      stats.failures.push({ name: b.name, address: b.address, reason: msg });
    }

    await sleep(100);
  }

  return stats;
}

function printGeocodeStats(stats: GeocodeStats) {
  console.log("");
  console.log("[Phase 1-B Step 3] Kakao 지오코딩 결과");
  console.log("─────────────────────────────────────────────");
  console.log(`총 시도              : ${stats.attempted}`);
  console.log(`좌표 변환 성공       : ${stats.geocoded}`);
  console.log(`좌표 변환 실패(미발견): ${stats.notFound}`);
  console.log(`API 에러             : ${stats.apiErrors}`);
  console.log(`region 자동 보강     : ${stats.regionRecovered} (CSV "기타" → 광역)`);

  if (stats.failures.length > 0) {
    console.log("");
    console.log(`⚠️ 실패 양조장 ${stats.failures.length}건 (이름 | 주소 | 사유):`);
    for (const f of stats.failures.slice(0, 30)) {
      console.log(`  - ${f.name} | ${f.address} | ${f.reason}`);
    }
    if (stats.failures.length > 30) {
      console.log(`  ... 외 ${stats.failures.length - 30}건`);
    }
  }
  console.log("─────────────────────────────────────────────");
}

// ── 2차 dedup: 지오코딩 후 (name, region, city)로 머지 ─────────
// 1차(groupByBrewery)는 (name, address) 키라 같은 양조장의 표기 차이를 못 잡음.
// 지오코딩으로 region/city가 보강된 후 같은 행정구역+동명을 머지해 재발 방지.
function dedupGroupedBreweries(
  breweries: GroupedBrewery[],
): { merged: GroupedBrewery[]; mergedCount: number } {
  const buckets = new Map<string, GroupedBrewery[]>();
  for (const b of breweries) {
    const key = `${normalizeName(b.name)}|||${b.region}|||${b.city ?? ""}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(b);
  }
  const merged: GroupedBrewery[] = [];
  let mergedCount = 0;
  for (const rows of buckets.values()) {
    if (rows.length === 1) {
      merged.push(rows[0]!);
      continue;
    }
    mergedCount += rows.length - 1;

    // address는 가장 완전한 것
    const bestAddr = pickBestAddress(rows.map((r) => r.address));
    // 좌표는 있는 것 우선
    const withCoords = rows.find((r) => r.latitude !== null && r.longitude !== null);
    // products는 합치고 name dedup
    const productByName = new Map<string, NormalizedProduct>();
    for (const r of rows) {
      for (const p of r.products) {
        const k = p.name.trim();
        if (!productByName.has(k)) productByName.set(k, p);
      }
    }
    merged.push({
      name: rows[0]!.name.trim(),
      address: bestAddr,
      website: rows.find((r) => r.website)?.website ?? null,
      region: rows[0]!.region,
      city: rows[0]!.city,
      latitude: withCoords?.latitude ?? null,
      longitude: withCoords?.longitude ?? null,
      products: Array.from(productByName.values()),
    });
  }
  return { merged, mergedCount };
}

// ── DB Upsert ──────────────────────────────────────────────────
function shouldSkipBrewery(b: GroupedBrewery): boolean {
  // 양조장명과 주소가 동일 → CSV 컬럼 오염 (마마스팜, 오대서주양조 등)
  return b.name.trim() === b.address.trim();
}

async function upsertBreweries(
  breweries: GroupedBrewery[],
  prisma: PrismaClient | null,
): Promise<UpsertStats> {
  const stats: UpsertStats = {
    created: 0,
    updated: 0,
    skipped: 0,
    withCoords: 0,
    withoutCoords: 0,
    productsTotal: 0,
    errors: 0,
    errorDetails: [],
  };
  const total = breweries.length;
  const PROGRESS_EVERY = 100;

  for (let i = 0; i < total; i++) {
    const b = breweries[i];

    if (shouldSkipBrewery(b)) {
      stats.skipped++;
      console.log(`  [${i + 1}/${total}] SKIP: ${b.name} (양조장명=주소)`);
      continue;
    }

    const hasCoords = b.latitude !== null && b.longitude !== null;
    if (hasCoords) stats.withCoords++;
    else stats.withoutCoords++;

    // DRY-RUN: DB 호출 없이 모두 CREATE 가정 (첫 실행이면 정확)
    if (!prisma) {
      stats.created++;
      stats.productsTotal += b.products.length;
      if (i === 0 || (i + 1) % PROGRESS_EVERY === 0 || i === total - 1) {
        console.log(
          `  [${i + 1}/${total}] CREATE: ${b.name} | ${b.region} ${b.city ?? "-"} | products: ${b.products.length} | coords: ${hasCoords ? "✓" : "✗"}`,
        );
      }
      continue;
    }

    // LIVE — 매칭 키: (name, region, city). raw address 표기 차이로 중복 생성되지 않게.
    try {
      const existing = await prisma.brewery.findFirst({
        where: { name: b.name, region: b.region, city: b.city },
        select: { id: true },
      });

      let breweryId: string;
      if (existing) {
        await prisma.brewery.update({
          where: { id: existing.id },
          data: {
            latitude: b.latitude,
            longitude: b.longitude,
            region: b.region,
            city: b.city,
            website: b.website,
          },
        });
        breweryId = existing.id;
        stats.updated++;
      } else {
        const created = await prisma.brewery.create({
          data: {
            name: b.name,
            address: b.address,
            latitude: b.latitude,
            longitude: b.longitude,
            region: b.region,
            city: b.city,
            website: b.website,
          },
          select: { id: true },
        });
        breweryId = created.id;
        stats.created++;
      }

      // 제품: 매번 새로 (deleteMany + createMany)
      await prisma.breweryProduct.deleteMany({ where: { breweryId } });
      if (b.products.length > 0) {
        await prisma.breweryProduct.createMany({
          data: b.products.map((p) => ({
            breweryId,
            name: p.name,
            brewType: p.brewType,
            alcoholContent: p.alcoholContent,
            volume: p.volume,
            ingredients: p.ingredients,
            features: p.features,
            awards: p.awards,
            isAvailable: p.isAvailable,
          })),
        });
      }
      stats.productsTotal += b.products.length;

      if (i === 0 || (i + 1) % PROGRESS_EVERY === 0 || i === total - 1) {
        console.log(
          `  [${i + 1}/${total}] ${existing ? "UPDATE" : "CREATE"}: ${b.name}`,
        );
      }
    } catch (e) {
      stats.errors++;
      const msg = e instanceof Error ? e.message : String(e);
      stats.errorDetails.push({ name: b.name, reason: msg });
      console.error(`  ❌ ${b.name}: ${msg}`);
    }
  }

  return stats;
}

function printUpsertStats(stats: UpsertStats, dryRun: boolean) {
  console.log("");
  console.log(`[Phase 1-B Step 4] DB Upsert ${dryRun ? "계획" : "결과"}`);
  console.log("─────────────────────────────────────────────");
  console.log(`CREATE Brewery       : ${stats.created}`);
  console.log(`UPDATE Brewery       : ${stats.updated}`);
  console.log(`SKIP (양조장명=주소) : ${stats.skipped}`);
  console.log(`  ↳ 좌표 있음        : ${stats.withCoords}`);
  console.log(`  ↳ 좌표 null 저장   : ${stats.withoutCoords}`);
  console.log(`총 BreweryProduct    : ${stats.productsTotal}`);
  console.log(`에러                 : ${stats.errors}`);
  if (stats.errorDetails.length > 0) {
    console.log("");
    console.log("⚠️ 에러 양조장:");
    for (const e of stats.errorDetails.slice(0, 10)) {
      console.log(`  - ${e.name}: ${e.reason}`);
    }
    if (stats.errorDetails.length > 10) {
      console.log(`  ... 외 ${stats.errorDetails.length - 10}건`);
    }
  }
  console.log("─────────────────────────────────────────────");
}

// ── DB 검증 (LIVE 완료 후) ─────────────────────────────────────
async function verifyDB(prisma: PrismaClient) {
  const breweryCount = await prisma.brewery.count();
  const productCount = await prisma.breweryProduct.count();
  const nullCoordsCount = await prisma.brewery.count({
    where: { latitude: null },
  });

  const byRegion = await prisma.brewery.groupBy({
    by: ["region"],
    _count: { _all: true },
  });
  const byRegionSorted = byRegion.sort(
    (a, b) => b._count._all - a._count._all,
  );

  const samples = await prisma.brewery.findMany({
    take: 3,
    include: { products: { take: 2 } },
    orderBy: { createdAt: "asc" },
  });

  console.log("");
  console.log("[Phase 1-B 검증] DB 상태 조회");
  console.log("─────────────────────────────────────────────");
  console.log(`Brewery        : ${breweryCount} 건 (예상 655)`);
  console.log(`BreweryProduct : ${productCount} 건 (예상 1,141)`);
  console.log(`좌표 NULL      : ${nullCoordsCount} 건 (예상 43)`);
  console.log("");
  console.log("지역별 분포:");
  for (const r of byRegionSorted) {
    console.log(`  ${r.region.padEnd(8)} : ${r._count._all}`);
  }
  console.log("");
  console.log("샘플 양조장 3건:");
  for (const s of samples) {
    console.log(
      `  • ${s.name} | ${s.region} ${s.city ?? "-"} | (${s.latitude}, ${s.longitude}) | products: ${s.products.length}`,
    );
    for (const p of s.products) {
      console.log(
        `      - ${p.name} | type: ${p.brewType ?? "미분류"} | 도수: ${p.alcoholContent ?? "-"}`,
      );
    }
  }
  console.log("─────────────────────────────────────────────");
}

// ── 통계 출력 (dry-run) ────────────────────────────────────────
function printStats(
  rowCount: number,
  groups: Map<string, GroupedBrewery>,
  orphanRows: RawRow[],
) {
  const breweries = Array.from(groups.values());
  const productCount = breweries.reduce((sum, b) => sum + b.products.length, 0);

  // 지역별 분포
  const byRegion = new Map<string, number>();
  for (const b of breweries) {
    byRegion.set(b.region, (byRegion.get(b.region) ?? 0) + 1);
  }
  const regionSorted = Array.from(byRegion.entries()).sort((a, b) => b[1] - a[1]);

  // 주종 추정 결과 (제품 단위)
  const byType = new Map<string, number>();
  for (const b of breweries) {
    for (const p of b.products) {
      const key = p.brewType ?? "미분류";
      byType.set(key, (byType.get(key) ?? 0) + 1);
    }
  }
  const typeSorted = Array.from(byType.entries()).sort((a, b) => b[1] - a[1]);

  // 데이터 품질
  const alcoholMissing = breweries.reduce(
    (s, b) => s + b.products.filter((p) => p.alcoholContent === null).length,
    0,
  );
  const websiteMissing = breweries.filter((b) => !b.website).length;
  const cityMissing = breweries.filter((b) => !b.city).length;

  console.log("");
  console.log("[Phase 1-B Step 2] CSV 파싱 + 그룹화 결과");
  console.log("─────────────────────────────────────────────");
  console.log(`총 CSV 행            : ${rowCount.toLocaleString()}`);
  console.log(`고유 양조장          : ${breweries.length.toLocaleString()}`);
  console.log(`총 제품              : ${productCount.toLocaleString()}`);
  console.log(
    `평균 제품수/양조장   : ${(productCount / Math.max(breweries.length, 1)).toFixed(2)}`,
  );
  console.log(`주소 누락 행         : ${orphanRows.length}`);
  console.log("");
  console.log("지역별 분포 (양조장 수):");
  for (const [region, count] of regionSorted) {
    console.log(`  ${region.padEnd(8)} : ${count}`);
  }
  console.log("");
  console.log("주종 추정 결과 (제품 단위):");
  for (const [type, count] of typeSorted) {
    console.log(`  ${type.padEnd(12)} : ${count}`);
  }
  console.log("");
  console.log("데이터 품질:");
  console.log(`  알콜도수 결측 (제품)  : ${alcoholMissing}`);
  console.log(`  홈페이지 결측 (양조장): ${websiteMissing}`);
  console.log(`  시·군·구 결측 (양조장): ${cityMissing}`);

  if (orphanRows.length > 0) {
    console.log("");
    console.log("⚠️ 주소/이름 누락 행 (양조장명만 표시):");
    for (const r of orphanRows.slice(0, 10)) {
      console.log(`  - ${(r.양조장 || "(이름없음)").trim()}`);
    }
    if (orphanRows.length > 10) {
      console.log(`  ... 외 ${orphanRows.length - 10}건`);
    }
  }

  // "기타"로 분류된 양조장 — CEO 검토용 (이름 + 주소만)
  const etcBreweries = breweries.filter((b) => b.region === "기타");
  if (etcBreweries.length > 0) {
    console.log("");
    console.log(`⚠️ "기타"로 분류된 양조장 ${etcBreweries.length}건 (이름 | 주소):`);
    for (const b of etcBreweries) {
      console.log(`  - ${b.name} | ${b.address}`);
    }
  }
  console.log("─────────────────────────────────────────────");
}

// ── 메인 ───────────────────────────────────────────────────────
async function main() {
  console.log("🌱 양조장 디렉토리 시드 시작");
  console.log(`   모드: ${DRY_RUN ? "DRY-RUN (DB 변경 없음)" : "LIVE (DB 적용)"}`);
  console.log(`   CSV : ${CSV_PATH}`);
  console.log("");

  assertEnv();

  const rows = parseCsv();
  const { groups, orphanRows } = groupByBrewery(rows);
  printStats(rows.length, groups, orphanRows);

  console.log("");
  console.log(`🌐 Kakao 지오코딩 시작 (예상 소요: ${Math.ceil((groups.size * 100) / 1000)}초+)`);
  const breweries = Array.from(groups.values());
  const geocodeStats = await geocodeAll(breweries);
  printGeocodeStats(geocodeStats);

  // 지오코딩 후 region 재집계 표시
  const byRegionAfter = new Map<string, number>();
  for (const b of breweries) {
    byRegionAfter.set(b.region, (byRegionAfter.get(b.region) ?? 0) + 1);
  }
  console.log("");
  console.log("지역별 분포 (지오코딩 보강 후):");
  for (const [region, count] of Array.from(byRegionAfter.entries()).sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`  ${region.padEnd(8)} : ${count}`);
  }

  // ── 2차 dedup: (name, region, city) 기준 머지 ──────────────────
  const { merged, mergedCount } = dedupGroupedBreweries(breweries);
  console.log("");
  console.log(`🧹 2차 dedup (name, region, city): ${breweries.length} → ${merged.length} (-${mergedCount})`);

  console.log("");
  console.log(`💾 DB Upsert ${DRY_RUN ? "계획 출력 (DB 변경 없음)" : "실행"}`);
  const prisma = DRY_RUN ? null : new PrismaClient();
  const startedAt = Date.now();
  try {
    const upsertStats = await upsertBreweries(merged, prisma);
    printUpsertStats(upsertStats, DRY_RUN);
    if (prisma) {
      await verifyDB(prisma);
    }
  } finally {
    if (prisma) await prisma.$disconnect();
  }
  const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`\n⏱  Upsert 소요: ${elapsedSec}s`);

  if (DRY_RUN) {
    console.log("\n✅ DRY-RUN 완료 — DB 변경 없음. CEO 검토 후 LIVE 실행:");
    console.log("   pnpm seed:breweries  (--dry-run 없이)");
    return;
  }
  console.log("\n✅ LIVE 완료 — DB 적용됨.");
}

main().catch((e) => {
  console.error("💥 시드 실패:", e);
  process.exit(1);
});
