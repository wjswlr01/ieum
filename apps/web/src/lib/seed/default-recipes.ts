import { db } from "@/lib/db";

export async function seedDefaultRecipes(tenantId: string): Promise<void> {
  const count = await db.recipe.count({ where: { tenantId } });
  if (count > 0) return;

  const template = await db.recipeTemplate.create({
    data: { tenantId, name: "기본 레시피", description: "이음이 제공하는 기본 레시피 모음" },
  });

  const recipes = [
    {
      name: "입문자 단양주",
      brewType: "MAKGEOLLI" as const,
      targetVolume: 2,
      description: "처음 막걸리를 빚는 분을 위한 가장 간단한 단양주 레시피입니다.",
      nodes: [
        {
          nodeType: "GRAIN_PREP" as const,
          order: 1,
          name: "고두밥 준비",
          description: "찹쌀을 씻어 불린 후 고두밥을 짓습니다.",
          durationMin: 180,
          extraParams: { riceBlend: [{ type: "찹쌀", ratio: 1.0, kg: 1.0 }] } as Record<string, unknown>,
        },
        {
          nodeType: "MASH" as const,
          order: 2,
          name: "담금",
          description: "식힌 고두밥에 누룩과 물을 넣고 잘 버무려 항아리에 담습니다.",
          durationMin: 60,
          extraParams: { nurukRatio: 0.1, waterRatio: 1.3 } as Record<string, unknown>,
        },
        {
          nodeType: "FERMENTATION" as const,
          order: 3,
          name: "발효",
          description: "25°C 내외에서 7일간 발효합니다.",
          durationMin: 10080,
          targetTemp: 25,
          extraParams: { targetDays: 7 } as Record<string, unknown>,
        },
      ],
    },
    {
      name: "찹쌀 이양주",
      brewType: "MAKGEOLLI" as const,
      targetVolume: 5,
      description: "밑술과 덧술 두 단계로 빚는 전통 이양주입니다.",
      nodes: [
        {
          nodeType: "GRAIN_PREP" as const,
          order: 1,
          name: "밑술 고두밥",
          description: "밑술용 찹쌀 고두밥을 준비합니다.",
          durationMin: 180,
          extraParams: { riceBlend: [{ type: "찹쌀", ratio: 1.0, kg: 0.5 }] } as Record<string, unknown>,
        },
        {
          nodeType: "MASH" as const,
          order: 2,
          name: "밑술 담금",
          description: "소량의 고두밥, 누룩, 물로 밑술을 담급니다.",
          durationMin: 60,
          extraParams: { nurukRatio: 0.2, waterRatio: 2.0, isMitsool: true } as Record<string, unknown>,
        },
        {
          nodeType: "FERMENTATION" as const,
          order: 3,
          name: "밑술 발효",
          description: "밑술을 3일간 발효합니다.",
          durationMin: 4320,
          targetTemp: 25,
          extraParams: { targetDays: 3, phase: "밑술" } as Record<string, unknown>,
        },
        {
          nodeType: "GRAIN_PREP" as const,
          order: 4,
          name: "덧술 고두밥",
          description: "덧술용 찹쌀 고두밥을 준비합니다.",
          durationMin: 180,
          extraParams: { riceBlend: [{ type: "찹쌀", ratio: 1.0, kg: 1.5 }] } as Record<string, unknown>,
        },
        {
          nodeType: "MASH" as const,
          order: 5,
          name: "덧술 담금",
          description: "발효된 밑술에 덧술 재료를 넣고 버무립니다.",
          durationMin: 60,
          extraParams: { nurukRatio: 0.05, waterRatio: 1.2, isMitsool: false } as Record<string, unknown>,
        },
        {
          nodeType: "FERMENTATION" as const,
          order: 6,
          name: "본발효",
          description: "25°C 내외에서 10일간 발효합니다.",
          durationMin: 14400,
          targetTemp: 25,
          extraParams: { targetDays: 10, phase: "덧술" } as Record<string, unknown>,
        },
      ],
    },
    {
      name: "삼양주 프리미엄",
      brewType: "MAKGEOLLI" as const,
      targetVolume: 10,
      description: "세 번에 나눠 빚는 고급 삼양주. 깊은 단맛과 풍부한 향이 특징입니다.",
      nodes: [
        {
          nodeType: "GRAIN_PREP" as const,
          order: 1,
          name: "밑술 고두밥",
          durationMin: 180,
          extraParams: { riceBlend: [{ type: "찹쌀", ratio: 1.0, kg: 0.5 }] } as Record<string, unknown>,
        },
        {
          nodeType: "MASH" as const,
          order: 2,
          name: "밑술 담금",
          durationMin: 60,
          extraParams: { nurukRatio: 0.3, waterRatio: 2.5, isMitsool: true } as Record<string, unknown>,
        },
        {
          nodeType: "FERMENTATION" as const,
          order: 3,
          name: "밑술 발효",
          durationMin: 4320,
          targetTemp: 23,
          extraParams: { targetDays: 3, phase: "밑술" } as Record<string, unknown>,
        },
        {
          nodeType: "GRAIN_PREP" as const,
          order: 4,
          name: "이양주 고두밥",
          durationMin: 180,
          extraParams: { riceBlend: [{ type: "찹쌀", ratio: 0.5, kg: 1.0 }, { type: "멥쌀", ratio: 0.5, kg: 1.0 }] } as Record<string, unknown>,
        },
        {
          nodeType: "MASH" as const,
          order: 5,
          name: "이양주 담금",
          durationMin: 60,
          extraParams: { nurukRatio: 0.05, waterRatio: 1.0, phase: "이양주" } as Record<string, unknown>,
        },
        {
          nodeType: "FERMENTATION" as const,
          order: 6,
          name: "이양주 발효",
          durationMin: 7200,
          targetTemp: 22,
          extraParams: { targetDays: 5, phase: "이양주" } as Record<string, unknown>,
        },
        {
          nodeType: "GRAIN_PREP" as const,
          order: 7,
          name: "삼양주 고두밥",
          durationMin: 180,
          extraParams: { riceBlend: [{ type: "찹쌀", ratio: 1.0, kg: 2.0 }] } as Record<string, unknown>,
        },
        {
          nodeType: "MASH" as const,
          order: 8,
          name: "삼양주 담금",
          durationMin: 60,
          extraParams: { nurukRatio: 0.0, waterRatio: 0.5, phase: "삼양주" } as Record<string, unknown>,
        },
        {
          nodeType: "FERMENTATION" as const,
          order: 9,
          name: "본발효 및 숙성",
          durationMin: 21600,
          targetTemp: 18,
          extraParams: { targetDays: 15, phase: "삼양주" } as Record<string, unknown>,
        },
      ],
    },
    {
      name: "입문자 페일 에일",
      brewType: "BEER" as const,
      targetVolume: 20,
      description: "홉의 아로마와 몰트의 균형이 좋은 입문용 American Pale Ale입니다.",
      nodes: [
        {
          nodeType: "MASH_BEER" as const,
          order: 1,
          name: "맥아당화",
          description: "67°C에서 60분간 당화합니다.",
          durationMin: 60,
          targetTemp: 67,
          extraParams: { tempC: 67, durationMin: 60 } as Record<string, unknown>,
        },
        {
          nodeType: "BOIL" as const,
          order: 2,
          name: "끓이기",
          description: "60분간 끓이며 홉을 넣습니다. (0분: 카스케이드 30g, 30분: 카스케이드 15g)",
          durationMin: 60,
          extraParams: { durationMin: 60, hops: [{ name: "Cascade", grams: 30, minutesFromStart: 0 }, { name: "Cascade", grams: 15, minutesFromStart: 30 }] } as Record<string, unknown>,
        },
        {
          nodeType: "CUSTOM" as const,
          order: 3,
          name: "냉각 및 이송",
          description: "맥즙을 20°C까지 냉각 후 발효조에 이송합니다.",
          durationMin: 60,
        },
        {
          nodeType: "FERMENTATION" as const,
          order: 4,
          name: "주발효",
          description: "20°C에서 14일간 발효합니다.",
          durationMin: 20160,
          targetTemp: 20,
          extraParams: { targetDays: 14 } as Record<string, unknown>,
        },
      ],
    },
    {
      name: "시트라 IPA",
      brewType: "BEER" as const,
      targetVolume: 20,
      description: "시트라 홉의 열대과일 향이 가득한 West Coast IPA입니다.",
      nodes: [
        {
          nodeType: "MASH_BEER" as const,
          order: 1,
          name: "맥아당화",
          description: "65°C에서 75분간 당화하여 드라이한 바디를 만듭니다.",
          durationMin: 75,
          targetTemp: 65,
          extraParams: { tempC: 65, durationMin: 75 } as Record<string, unknown>,
        },
        {
          nodeType: "BOIL" as const,
          order: 2,
          name: "끓이기",
          description: "90분간 끓이며 시트라 홉을 3회 투입합니다.",
          durationMin: 90,
          extraParams: { durationMin: 90, hops: [{ name: "Citra", grams: 20, minutesFromStart: 0 }, { name: "Citra", grams: 20, minutesFromStart: 60 }, { name: "Citra", grams: 30, minutesFromStart: 85 }] } as Record<string, unknown>,
        },
        {
          nodeType: "CUSTOM" as const,
          order: 3,
          name: "냉각 및 이송",
          description: "맥즙을 18°C까지 냉각 후 발효조에 이송합니다.",
          durationMin: 60,
        },
        {
          nodeType: "FERMENTATION" as const,
          order: 4,
          name: "주발효",
          description: "18°C에서 14일간 발효합니다.",
          durationMin: 20160,
          targetTemp: 18,
          extraParams: { targetDays: 14 } as Record<string, unknown>,
        },
        {
          nodeType: "CONDITIONING" as const,
          order: 5,
          name: "드라이호핑 & 숙성",
          description: "4°C로 냉각 후 시트라 홉 50g을 드라이호핑, 5일 숙성합니다.",
          durationMin: 7200,
          targetTemp: 4,
          extraParams: { targetDays: 5, dryHop: [{ name: "Citra", grams: 50 }] } as Record<string, unknown>,
        },
      ],
    },
  ];

  for (const recipe of recipes) {
    const { nodes, ...recipeData } = recipe;
    await db.recipe.create({
      data: {
        ...recipeData,
        tenantId,
        templateId: template.id,
        nodes: {
          create: nodes.map(({ extraParams, ...node }) => ({
            ...node,
            ...(extraParams ? { extraParams: extraParams as any } : {}),
          })),
        },
      },
    });
  }
}
