import { db } from "@/lib/db";

type CatalogItem = {
  name: string;
  category: "NURUK" | "HOP" | "YEAST" | "GRAIN" | "RICE" | "OTHER";
  unit: "KG" | "G";
  sku: string;
  metadata: Record<string, unknown>;
};

const CATALOG_ITEMS: CatalogItem[] = [
  // ── 누룩 10종 ────────────────────────────────────────────────────
  {
    name: "송학곡자 전통누룩",
    category: "NURUK",
    unit: "KG",
    sku: "CATALOG:NURUK:송학곡자전통누룩",
    metadata: {
      nurukType: "전통누룩",
      manufacturer: "송학곡자",
      saccharification: "중간",
      flavor: ["구수함", "곡물향", "약한산미"],
      recommendedRatio: "7~10",
      fermentTemp: "18~25",
      description:
        "전통 방식으로 만든 병곡 타입 누룩으로 막걸리, 약주, 소주 밑술 등 다용도로 사용됩니다.",
    },
  },
  {
    name: "진주누룩 (진주곡자)",
    category: "NURUK",
    unit: "KG",
    sku: "CATALOG:NURUK:진주누룩",
    metadata: {
      nurukType: "전통누룩",
      manufacturer: "경남 진주 지역",
      saccharification: "중간",
      flavor: ["고소함", "짚향", "가벼운산미", "약간의허브향"],
      recommendedRatio: "7~10",
      fermentTemp: "18~24",
      description:
        "진주 일대에서 전승되는 전통 누룩으로, 담백하고 산뜻한 곡물 향이 특징입니다.",
    },
  },
  {
    name: "금정산성누룩",
    category: "NURUK",
    unit: "KG",
    sku: "CATALOG:NURUK:금정산성누룩",
    metadata: {
      nurukType: "전통누룩",
      manufacturer: "부산 금정산성",
      saccharification: "낮음",
      flavor: ["강한산미", "고소함", "견과류향", "구수함"],
      recommendedRatio: "8~12",
      fermentTemp: "18~23",
      description:
        "부산 금정산성 지역 특유의 강한 산미와 구수한 향을 내는 누룩입니다.",
    },
  },
  {
    name: "산성누룩 (일반 산곡누룩)",
    category: "NURUK",
    unit: "KG",
    sku: "CATALOG:NURUK:산성누룩",
    metadata: {
      nurukType: "전통누룩",
      manufacturer: "지역 누룩방",
      saccharification: "낮음",
      flavor: ["높은산미", "강한곡물향", "약간의치즈향"],
      recommendedRatio: "8~12",
      fermentTemp: "18~24",
      description:
        "산성도가 높은 흩임누룩 계열로, 개성 있는 전통주 스타일에 유리합니다.",
    },
  },
  {
    name: "백국 (쌀 입국)",
    category: "NURUK",
    unit: "KG",
    sku: "CATALOG:NURUK:백국",
    metadata: {
      nurukType: "입국",
      manufacturer: "국내 입국 전문업체",
      saccharification: "높음",
      flavor: ["클린한단맛", "약한견과향", "은은한곡물향"],
      recommendedRatio: "12~20",
      fermentTemp: "20~32",
      description:
        "쌀에 황국균을 접종해 만든 대표적인 입국으로, 당화력이 높고 잡향이 적습니다.",
    },
  },
  {
    name: "황국 (보리/쌀 황국)",
    category: "NURUK",
    unit: "KG",
    sku: "CATALOG:NURUK:황국",
    metadata: {
      nurukType: "입국",
      manufacturer: "국내 누룩·입국 제조사",
      saccharification: "높음",
      flavor: ["단맛강함", "누룽지향", "고소함"],
      recommendedRatio: "10~18",
      fermentTemp: "25~35",
      description:
        "일본 식품용 코지와 유사한 계열의 황국으로, 진한 단맛과 곡물 고소함이 특징입니다.",
    },
  },
  {
    name: "흑국 (Aspergillus niger)",
    category: "NURUK",
    unit: "KG",
    sku: "CATALOG:NURUK:흑국",
    metadata: {
      nurukType: "입국",
      manufacturer: "국내 양조장",
      saccharification: "중간",
      flavor: ["강한산미", "감초향", "건과일향"],
      recommendedRatio: "5~10",
      fermentTemp: "25~35",
      description:
        "흑국균을 사용한 입국으로 유기산 생성이 많아 산미와 복합적인 향을 부여합니다.",
    },
  },
  {
    name: "개량누룩 (분말형)",
    category: "NURUK",
    unit: "KG",
    sku: "CATALOG:NURUK:개량누룩",
    metadata: {
      nurukType: "개량누룩",
      manufacturer: "국내 효소제 제조사",
      saccharification: "높음",
      flavor: ["중성향", "약한곡물향"],
      recommendedRatio: "3~6",
      fermentTemp: "20~30",
      description:
        "밀가루를 주원료로 균일하게 접종해 만든 분말형 개량누룩입니다.",
    },
  },
  {
    name: "조효소제 (아밀라아제)",
    category: "NURUK",
    unit: "KG",
    sku: "CATALOG:NURUK:조효소제",
    metadata: {
      nurukType: "조효소제",
      manufacturer: "국내 식품·효소제 업체",
      saccharification: "높음",
      flavor: ["향없음"],
      recommendedRatio: "0.05~0.2",
      fermentTemp: "25~60",
      description:
        "산업용 액상 또는 분말형 조효소제로 전통누룩의 당화력을 보완합니다.",
    },
  },
  {
    name: "입국 스타터 (종국)",
    category: "NURUK",
    unit: "KG",
    sku: "CATALOG:NURUK:종국",
    metadata: {
      nurukType: "입국",
      manufacturer: "국내 미생물·종국 제조업체",
      saccharification: "높음",
      flavor: ["클린한단맛", "곡물향"],
      recommendedRatio: "15~20",
      fermentTemp: "28~35",
      description:
        "쌀로 직접 입국을 만들 수 있도록 제공되는 종국 제품입니다.",
    },
  },

  // ── 홉 12종 ────────────────────────────────────────────────────
  {
    name: "Cascade",
    category: "HOP",
    unit: "G",
    sku: "CATALOG:HOP:Cascade",
    metadata: {
      alphaAcid: 4.5,
      betaAcid: 5.5,
      usage: "dual",
      origin: "미국",
      aromaProfile: ["시트러스", "자몽", "꽃향", "허브"],
      description: "미국식 페일에일과 아메리칸 IPA의 상징적인 홉",
    },
  },
  {
    name: "Centennial",
    category: "HOP",
    unit: "G",
    sku: "CATALOG:HOP:Centennial",
    metadata: {
      alphaAcid: 9.5,
      betaAcid: 4.0,
      usage: "dual",
      origin: "미국",
      aromaProfile: ["꽃향", "레몬", "약한허브", "파인"],
      description: "슈퍼 캐스케이드라 불리며 IPA·APA에서 주로 사용",
    },
  },
  {
    name: "Citra",
    category: "HOP",
    unit: "G",
    sku: "CATALOG:HOP:Citra",
    metadata: {
      alphaAcid: 12.5,
      betaAcid: 4.0,
      usage: "aroma",
      origin: "미국",
      aromaProfile: ["열대과일", "라임", "망고", "패션프루트"],
      description: "매우 강렬한 열대과일 향으로 NEIPA에 필수",
    },
  },
  {
    name: "Mosaic",
    category: "HOP",
    unit: "G",
    sku: "CATALOG:HOP:Mosaic",
    metadata: {
      alphaAcid: 12.0,
      betaAcid: 4.5,
      usage: "aroma",
      origin: "미국",
      aromaProfile: ["블루베리", "열대과일", "솔향", "허브"],
      description: "베리류와 트로피컬, 솔향이 복합적인 모던 홉",
    },
  },
  {
    name: "Simcoe",
    category: "HOP",
    unit: "G",
    sku: "CATALOG:HOP:Simcoe",
    metadata: {
      alphaAcid: 13.0,
      betaAcid: 4.5,
      usage: "dual",
      origin: "미국",
      aromaProfile: ["솔향", "자두", "열대과일", "흙내음"],
      description: "파인·수지·베리향이 있는 다목적 홉",
    },
  },
  {
    name: "Amarillo",
    category: "HOP",
    unit: "G",
    sku: "CATALOG:HOP:Amarillo",
    metadata: {
      alphaAcid: 8.5,
      betaAcid: 6.5,
      usage: "aroma",
      origin: "미국",
      aromaProfile: ["오렌지", "꽃향", "복숭아", "감귤"],
      description: "오렌지 계열의 부드러운 시트러스 향이 특징",
    },
  },
  {
    name: "Galaxy",
    category: "HOP",
    unit: "G",
    sku: "CATALOG:HOP:Galaxy",
    metadata: {
      alphaAcid: 14.0,
      betaAcid: 5.5,
      usage: "aroma",
      origin: "호주",
      aromaProfile: ["패션프루트", "복숭아", "시트러스", "열대과일"],
      description: "호주산 대표 아로마 홉으로 강한 패션프루트향",
    },
  },
  {
    name: "Nelson Sauvin",
    category: "HOP",
    unit: "G",
    sku: "CATALOG:HOP:NelsonSauvin",
    metadata: {
      alphaAcid: 12.0,
      betaAcid: 6.0,
      usage: "aroma",
      origin: "뉴질랜드",
      aromaProfile: ["화이트와인", "포도", "구스베리", "열대과일"],
      description: "소비뇽 블랑 계열의 화이트와인 향이 특징",
    },
  },
  {
    name: "Saaz",
    category: "HOP",
    unit: "G",
    sku: "CATALOG:HOP:Saaz",
    metadata: {
      alphaAcid: 3.5,
      betaAcid: 4.0,
      usage: "aroma",
      origin: "체코",
      aromaProfile: ["허브", "스파이시", "꽃향", "은은한흙내음"],
      description: "체코 필스너의 상징적인 노블 홉",
    },
  },
  {
    name: "Hallertau Mittelfrüh",
    category: "HOP",
    unit: "G",
    sku: "CATALOG:HOP:HallertauMittelfrueh",
    metadata: {
      alphaAcid: 4.0,
      betaAcid: 4.5,
      usage: "aroma",
      origin: "독일",
      aromaProfile: ["꽃향", "허브", "약한향신료", "꿀향"],
      description: "독일 노블 홉으로 라거·바이젠에 사용",
    },
  },
  {
    name: "Fuggle",
    category: "HOP",
    unit: "G",
    sku: "CATALOG:HOP:Fuggle",
    metadata: {
      alphaAcid: 4.5,
      betaAcid: 2.5,
      usage: "aroma",
      origin: "영국",
      aromaProfile: ["흙향", "허브", "우디", "약한초콜릿"],
      description: "클래식 영국 홉으로 포터·스타우트에 적합",
    },
  },
  {
    name: "East Kent Goldings",
    category: "HOP",
    unit: "G",
    sku: "CATALOG:HOP:EastKentGoldings",
    metadata: {
      alphaAcid: 5.0,
      betaAcid: 4.0,
      usage: "aroma",
      origin: "영국",
      aromaProfile: ["꽃향", "허브", "꿀", "오렌지껍질"],
      description: "영국 클래식 아로마 홉으로 ESB·포터에 사용",
    },
  },

  // ── 효모 9종 ────────────────────────────────────────────────────
  {
    name: "Fermentis SafAle US-05",
    category: "YEAST",
    unit: "G",
    sku: "CATALOG:YEAST:US-05",
    metadata: {
      strain: "US-05",
      type: "Ale",
      attenuation: "78~82",
      tempRange: "18~28",
      flocculation: "중간",
      origin: "Fermentis",
      description: "미국식 에일 대표 드라이 효모",
    },
  },
  {
    name: "Fermentis SafAle S-04",
    category: "YEAST",
    unit: "G",
    sku: "CATALOG:YEAST:S-04",
    metadata: {
      strain: "S-04",
      type: "Ale",
      attenuation: "73~77",
      tempRange: "15~24",
      flocculation: "높음",
      origin: "Fermentis",
      description: "영국식 에일 효모로 빠른 발효",
    },
  },
  {
    name: "Fermentis SafLager W-34/70",
    category: "YEAST",
    unit: "G",
    sku: "CATALOG:YEAST:W-34-70",
    metadata: {
      strain: "W-34/70",
      type: "Lager",
      attenuation: "80~84",
      tempRange: "9~15",
      flocculation: "중간",
      origin: "Fermentis",
      description: "독일 뮌헨 라거 클래식 효모",
    },
  },
  {
    name: "Lallemand Nottingham",
    category: "YEAST",
    unit: "G",
    sku: "CATALOG:YEAST:Nottingham",
    metadata: {
      strain: "Nottingham",
      type: "Ale",
      attenuation: "77~82",
      tempRange: "10~22",
      flocculation: "중간",
      origin: "Lallemand",
      description: "드라이하고 클린한 고발효도 에일 효모",
    },
  },
  {
    name: "Mangrove Jack's M44",
    category: "YEAST",
    unit: "G",
    sku: "CATALOG:YEAST:M44",
    metadata: {
      strain: "M44",
      type: "Ale",
      attenuation: "77~85",
      tempRange: "18~23",
      flocculation: "중간",
      origin: "Mangrove Jack's",
      description: "웨스트코스트 IPA용 드라이 효모",
    },
  },
  {
    name: "Fermentis SafAle K-97",
    category: "YEAST",
    unit: "G",
    sku: "CATALOG:YEAST:K-97",
    metadata: {
      strain: "K-97",
      type: "Ale",
      attenuation: "80~84",
      tempRange: "12~25",
      flocculation: "중간",
      origin: "Fermentis",
      description: "독일식 에일 프로파일 효모",
    },
  },
  {
    name: "막걸리 전용 건조 효모",
    category: "YEAST",
    unit: "G",
    sku: "CATALOG:YEAST:막걸리건조효모",
    metadata: {
      strain: "S.cerevisiae",
      type: "막걸리",
      attenuation: "80~88",
      tempRange: "18~30",
      flocculation: "낮음",
      origin: "국내 효모 제조사",
      description: "막걸리용으로 선발된 건조 효모",
    },
  },
  {
    name: "전통 양조장 분양 효모주",
    category: "YEAST",
    unit: "G",
    sku: "CATALOG:YEAST:전통효모주",
    metadata: {
      strain: "양조장 고유 균주",
      type: "막걸리",
      attenuation: "75~85",
      tempRange: "15~25",
      flocculation: "낮음",
      origin: "국내 전통주 양조장",
      description: "양조장별 개성이 뚜렷한 전통 효모",
    },
  },
  {
    name: "EC-1118 (와인/과실주)",
    category: "YEAST",
    unit: "G",
    sku: "CATALOG:YEAST:EC-1118",
    metadata: {
      strain: "EC-1118",
      type: "와인",
      attenuation: "90~95",
      tempRange: "10~30",
      flocculation: "중간",
      origin: "Lallemand",
      description: "강한 알코올 내성의 와인용 효모",
    },
  },

  // ── 쌀 5종 ────────────────────────────────────────────────────
  {
    name: "멥쌀 (일반 백미)",
    category: "RICE",
    unit: "KG",
    sku: "CATALOG:RICE:멥쌀",
    metadata: {
      description: "국내 양조장에서 가장 널리 쓰이는 기본 원료",
      recommendedUse: ["단양주", "이양주", "약주", "청주"],
    },
  },
  {
    name: "찹쌀",
    category: "RICE",
    unit: "KG",
    sku: "CATALOG:RICE:찹쌀",
    metadata: {
      description: "아밀로펙틴 비율이 높아 점성이 강하고 단맛이 잘 남",
      recommendedUse: ["단양주", "이양주", "고급탁주"],
    },
  },
  {
    name: "현미",
    category: "RICE",
    unit: "KG",
    sku: "CATALOG:RICE:현미",
    metadata: {
      description: "도정도가 낮아 식이섬유 많고 고소한 향",
      recommendedUse: ["현미막걸리", "건강지향탁주"],
    },
  },
  {
    name: "흑미",
    category: "RICE",
    unit: "KG",
    sku: "CATALOG:RICE:흑미",
    metadata: {
      description: "안토시아닌 색소로 보라색, 5~30% 블렌딩 권장",
      recommendedUse: ["흑미막걸리", "블렌딩막걸리"],
    },
  },
  {
    name: "양조용 쌀 (한아름, 다산2호)",
    category: "RICE",
    unit: "KG",
    sku: "CATALOG:RICE:양조용쌀",
    metadata: {
      description: "막걸리 양조적성이 우수한 품종",
      recommendedUse: ["막걸리", "탁주", "약주"],
    },
  },
  {
    name: "쌀가루",
    category: "RICE",
    unit: "KG",
    sku: "CATALOG:RICE:쌀가루",
    metadata: {
      description: "고두밥 대신 쓰거나 발효 보조 원료로 사용. 입자가 작아 호화·당화가 빠름",
      recommendedUse: ["속성주", "범벅", "구멍떡"],
    },
  },

  // ── 몰트 5종 ────────────────────────────────────────────────────
  {
    name: "페일 몰트",
    category: "GRAIN",
    unit: "KG",
    sku: "CATALOG:GRAIN:페일몰트",
    metadata: {
      description: "에일 레시피 베이스 몰트, 3~5 EBC",
      ebc: "3~5",
      recommendedUse: ["에일", "IPA", "페일에일"],
    },
  },
  {
    name: "필스너 몰트",
    category: "GRAIN",
    unit: "KG",
    sku: "CATALOG:GRAIN:필스너몰트",
    metadata: {
      description: "색이 밝고 깔끔, 2.5~4 EBC",
      ebc: "2.5~4",
      recommendedUse: ["라거", "필스너", "헬레스"],
    },
  },
  {
    name: "뮌헨 몰트",
    category: "GRAIN",
    unit: "KG",
    sku: "CATALOG:GRAIN:뮌헨몰트",
    metadata: {
      description: "빵·토스트·비스킷 풍미, 10~25 EBC",
      ebc: "10~25",
      recommendedUse: ["둔켈", "옥토버페스트"],
    },
  },
  {
    name: "카라멜/크리스탈 몰트",
    category: "GRAIN",
    unit: "KG",
    sku: "CATALOG:GRAIN:카라멜몰트",
    metadata: {
      description: "카라멜화된 당으로 색·단맛·바디감 부여",
      recommendedUse: ["IPA", "포터", "스타우트"],
    },
  },
  {
    name: "밀 몰트",
    category: "GRAIN",
    unit: "KG",
    sku: "CATALOG:GRAIN:밀몰트",
    metadata: {
      description: "단백질 높아 거품 유지, 부드러운 질감",
      recommendedUse: ["바이젠", "위트에일", "고제"],
    },
  },

  // ── 보조곡물 1종 ────────────────────────────────────────────────
  {
    name: "귀리 (압맥/플레이크)",
    category: "OTHER",
    unit: "KG",
    sku: "CATALOG:OTHER:귀리",
    metadata: {
      description: "크리미한 바디와 헤이즈 부여",
      recommendedUse: ["NEIPA", "오트밀스타우트"],
    },
  },
];

const CATALOG_VERSION = CATALOG_ITEMS.length;

export async function seedCatalog(tenantId: string): Promise<void> {
  const existing = await db.inventory.count({
    where: { tenantId, isCatalog: true },
  });
  if (existing === CATALOG_VERSION) return;

  // isCatalog=true 항목 + 이전 방식(sku prefix) 항목 모두 삭제
  await db.inventory.deleteMany({
    where: { tenantId, OR: [{ isCatalog: true }, { sku: { startsWith: "CATALOG:" } }] },
  });
  await db.inventory.createMany({
    data: CATALOG_ITEMS.map((item) => ({
      tenantId,
      name: item.name,
      category: item.category as any,
      unit: item.unit as any,
      sku: item.sku,
      quantity: 0,
      isCatalog: true,
      metadata: item.metadata as any,
    })),
  });
}
