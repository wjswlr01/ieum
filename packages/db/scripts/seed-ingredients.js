/**
 * 기본 재료 시드 스크립트
 * 실행: node packages/db/scripts/seed-ingredients.js [tenantId]
 *       또는 node packages/db/scripts/seed-ingredients.js  (첫 번째 테넌트 자동 선택)
 */

// Load .env manually (dotenv not installed in packages/db)
const fs = require("fs");
const envPath = require("path").join(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf8").split("\n").forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, "");
  });
}

const { PrismaClient } = require("../generated");
const db = new PrismaClient();

const SEEDS = [
  // ── 홉 (HOP) ────────────────────────────────────────────────────────────
  {
    name: "Centennial",
    category: "HOP",
    unit: "G",
    metadata: {
      alphaAcid: 10.5,
      betaAcid: 3.5,
      aromaProfile: ["시트러스", "플로럴", "레몬"],
      origin: "미국",
      usage: "dual",
      description: "미국 북서부산 듀얼 퍼퍼스 홉. 시트러스와 플로럴 향이 특징.",
    },
  },
  {
    name: "Cascade",
    category: "HOP",
    unit: "G",
    metadata: {
      alphaAcid: 5.5,
      betaAcid: 6.0,
      aromaProfile: ["자몽", "플로럴", "시트러스"],
      origin: "미국",
      usage: "aroma",
      description: "미국식 에일의 아이콘. 자몽 향이 강하며 아로마 홉으로 널리 사용.",
    },
  },
  {
    name: "Citra",
    category: "HOP",
    unit: "G",
    metadata: {
      alphaAcid: 12.0,
      betaAcid: 4.0,
      aromaProfile: ["열대과일", "라임", "패션후르츠"],
      origin: "미국",
      usage: "aroma",
      description: "강렬한 열대과일 향. 헤이지 IPA와 페일 에일에 적합.",
    },
  },
  {
    name: "Mosaic",
    category: "HOP",
    unit: "G",
    metadata: {
      alphaAcid: 12.5,
      betaAcid: 3.5,
      aromaProfile: ["블루베리", "망고", "허브"],
      origin: "미국",
      usage: "aroma",
      description: "복합적인 과일 향의 홉. 다양한 스타일에 활용 가능.",
    },
  },
  {
    name: "Saaz",
    category: "HOP",
    unit: "G",
    metadata: {
      alphaAcid: 3.5,
      betaAcid: 3.5,
      aromaProfile: ["허브", "흙냄새", "스파이시"],
      origin: "체코",
      usage: "aroma",
      description: "전통 보헤미안 라거 홉. 우아한 허브 향과 세밀한 쓴맛.",
    },
  },

  // ── 누룩 (NURUK) ─────────────────────────────────────────────────────────
  {
    name: "개량누룩",
    category: "NURUK",
    unit: "KG",
    metadata: {
      nurukType: "개량누룩",
      manufacturer: "일반",
      saccharification: "높음",
      flavor: ["고소한", "단향", "부드러운"],
      recommendedRatio: "10-15",
      fermentTemp: "25-28",
      description: "소규모 양조에 적합한 표준 개량누룩. 당화력이 높고 안정적.",
    },
  },
  {
    name: "전통누룩 (밀누룩)",
    category: "NURUK",
    unit: "KG",
    metadata: {
      nurukType: "전통누룩",
      manufacturer: "수제",
      saccharification: "중간",
      flavor: ["누룩향", "복합적인", "흙냄새"],
      recommendedRatio: "15-20",
      fermentTemp: "22-26",
      description: "밀로 제조한 전통 방식 누룩. 풍부한 향미와 복잡한 발효 특성.",
    },
  },
  {
    name: "입국",
    category: "NURUK",
    unit: "KG",
    metadata: {
      nurukType: "입국",
      manufacturer: "일본식",
      saccharification: "매우 높음",
      flavor: ["깔끔한", "단향"],
      recommendedRatio: "20-30",
      fermentTemp: "30-35",
      description:
        "황국균(Aspergillus oryzae) 접종 입국. 당화력이 매우 높고 깔끔.",
    },
  },
  {
    name: "조효소제",
    category: "NURUK",
    unit: "G",
    metadata: {
      nurukType: "조효소제",
      manufacturer: "효소 제조사",
      saccharification: "매우 높음",
      flavor: ["중립적인"],
      recommendedRatio: "0.1-0.3",
      fermentTemp: "55-65",
      description: "정제 효소 제제. 당화 효율이 극도로 높으며 중립적인 풍미.",
    },
  },

  // ── 효모 (YEAST) ──────────────────────────────────────────────────────────
  {
    name: "US-05",
    category: "YEAST",
    unit: "G",
    metadata: {
      strain: "US-05",
      type: "Ale",
      attenuation: "73-77",
      tempRange: "15-24",
      flocculation: "중간",
      origin: "Fermentis",
      description:
        "깔끔한 아메리칸 에일 효모. 다양한 에일 스타일에 범용적으로 사용.",
    },
  },
  {
    name: "S-04",
    category: "YEAST",
    unit: "G",
    metadata: {
      strain: "S-04",
      type: "Ale",
      attenuation: "70-75",
      tempRange: "12-20",
      flocculation: "높음",
      origin: "Fermentis",
      description:
        "영국식 에일 효모. 높은 응집력으로 맑은 비어를 만들기 쉬움.",
    },
  },
  {
    name: "막걸리 효모",
    category: "YEAST",
    unit: "G",
    metadata: {
      strain: "Saccharomyces cerevisiae",
      type: "Traditional Korean",
      attenuation: "60-70",
      tempRange: "20-28",
      flocculation: "낮음",
      origin: "국내",
      description:
        "전통 막걸리용 효모. 적당한 산도와 함께 특유의 막걸리 풍미 생성.",
    },
  },

  // ── 곡물 (GRAIN) ──────────────────────────────────────────────────────────
  {
    name: "페일 몰트",
    category: "GRAIN",
    unit: "KG",
    metadata: {
      description:
        "베이스 몰트. 맥주 양조에서 당분과 발효성 당의 주요 공급원. 색도 2-4 SRM.",
    },
  },

  // ── 쌀 (RICE) ─────────────────────────────────────────────────────────────
  {
    name: "찹쌀",
    category: "RICE",
    unit: "KG",
    metadata: {
      description:
        "아밀로펙틴 함량이 높아 찰기가 강한 쌀. 막걸리 및 청주 양조에 사용.",
    },
  },
  {
    name: "멥쌀",
    category: "RICE",
    unit: "KG",
    metadata: {
      description:
        "일반 백미. 아밀로스 함량이 높으며 깔끔한 맛의 막걸리 양조에 사용.",
    },
  },
];

async function main() {
  const tenantId =
    process.argv[2] ||
    (await db.tenant.findFirst({ select: { id: true } }).then((t) => t?.id));

  if (!tenantId) {
    console.error("❌ 테넌트를 찾을 수 없습니다.");
    process.exit(1);
  }

  console.log(`\n🌱 시드 실행 중... (tenantId: ${tenantId})\n`);

  let created = 0;
  let updated = 0;

  for (const seed of SEEDS) {
    // upsert by tenantId + name (unique combination)
    const existing = await db.inventory.findFirst({
      where: { tenantId, name: seed.name },
      select: { id: true },
    });

    if (existing) {
      await db.inventory.update({
        where: { id: existing.id },
        data: { metadata: seed.metadata },
      });
      console.log(`  ↻  업데이트: ${seed.name}`);
      updated++;
    } else {
      await db.inventory.create({
        data: {
          tenantId,
          name: seed.name,
          category: seed.category,
          unit: seed.unit,
          quantity: 0,
          metadata: seed.metadata,
        },
      });
      console.log(`  ✓  생성: ${seed.name}`);
      created++;
    }
  }

  console.log(`\n✅ 완료: 생성 ${created}개, 업데이트 ${updated}개\n`);
}

main()
  .catch((e) => {
    console.error("❌ 에러:", e.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
