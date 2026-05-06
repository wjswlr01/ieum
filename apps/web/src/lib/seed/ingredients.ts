/**
 * 시스템 기본 재료 시드 데이터
 * 실행: npx ts-node -e "require('./apps/web/src/lib/seed/ingredients').seedIngredients('TENANT_ID')"
 * 또는 /dashboard/settings 의 "시드 데이터 불러오기" 기능을 통해 실행
 */

import { db } from "@/lib/db";

export const HOP_SEEDS = [
  {
    name: "Centennial",
    category: "HOP" as const,
    unit: "G" as const,
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
    category: "HOP" as const,
    unit: "G" as const,
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
    category: "HOP" as const,
    unit: "G" as const,
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
    category: "HOP" as const,
    unit: "G" as const,
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
    category: "HOP" as const,
    unit: "G" as const,
    metadata: {
      alphaAcid: 3.5,
      betaAcid: 3.5,
      aromaProfile: ["허브", "흙냄새", "스파이시"],
      origin: "체코",
      usage: "aroma",
      description: "전통 보헤미안 라거 홉. 우아한 허브 향과 세밀한 쓴맛.",
    },
  },
] satisfies {
  name: string;
  category: "HOP";
  unit: "G";
  metadata: Record<string, unknown>;
}[];

export const NURUK_SEEDS = [
  {
    name: "개량누룩",
    category: "NURUK" as const,
    unit: "KG" as const,
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
    category: "NURUK" as const,
    unit: "KG" as const,
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
    category: "NURUK" as const,
    unit: "KG" as const,
    metadata: {
      nurukType: "입국",
      manufacturer: "일본식",
      saccharification: "매우 높음",
      flavor: ["깔끔한", "단향"],
      recommendedRatio: "20-30",
      fermentTemp: "30-35",
      description: "황국균(Aspergillus oryzae) 접종 입국. 당화력이 매우 높고 깔끔.",
    },
  },
  {
    name: "조효소제",
    category: "NURUK" as const,
    unit: "G" as const,
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
] satisfies {
  name: string;
  category: "NURUK";
  unit: "KG" | "G";
  metadata: Record<string, unknown>;
}[];

export const YEAST_SEEDS = [
  {
    name: "US-05",
    category: "YEAST" as const,
    unit: "G" as const,
    metadata: {
      strain: "US-05",
      type: "Ale",
      attenuation: "73-77",
      tempRange: "15-24",
      flocculation: "중간",
      origin: "Fermentis",
      description: "깔끔한 아메리칸 에일 효모. 다양한 에일 스타일에 범용적으로 사용.",
    },
  },
  {
    name: "S-04",
    category: "YEAST" as const,
    unit: "G" as const,
    metadata: {
      strain: "S-04",
      type: "Ale",
      attenuation: "70-75",
      tempRange: "12-20",
      flocculation: "높음",
      origin: "Fermentis",
      description: "영국식 에일 효모. 높은 응집력으로 맑은 비어를 만들기 쉬움.",
    },
  },
  {
    name: "막걸리 효모",
    category: "YEAST" as const,
    unit: "G" as const,
    metadata: {
      strain: "Saccharomyces cerevisiae",
      type: "Traditional Korean",
      attenuation: "60-70",
      tempRange: "20-28",
      flocculation: "낮음",
      origin: "국내",
      description: "전통 막걸리용 효모. 적당한 산도와 함께 특유의 막걸리 풍미 생성.",
    },
  },
] satisfies {
  name: string;
  category: "YEAST";
  unit: "G";
  metadata: Record<string, unknown>;
}[];

export async function seedIngredients(tenantId: string) {
  const allSeeds = [
    ...HOP_SEEDS.map((s) => ({ ...s, tenantId, quantity: 0 })),
    ...NURUK_SEEDS.map((s) => ({ ...s, tenantId, quantity: 0 })),
    ...YEAST_SEEDS.map((s) => ({ ...s, tenantId, quantity: 0 })),
  ];

  const results = await Promise.all(
    allSeeds.map((seed) =>
      db.inventory.upsert({
        where: { id: `seed-${tenantId}-${seed.name}` },
        create: {
          id: `seed-${tenantId}-${seed.name}`,
          tenantId: seed.tenantId,
          name: seed.name,
          category: seed.category,
          unit: seed.unit,
          quantity: seed.quantity,
          metadata: seed.metadata,
        },
        update: { metadata: seed.metadata },
      })
    )
  );

  return results;
}
