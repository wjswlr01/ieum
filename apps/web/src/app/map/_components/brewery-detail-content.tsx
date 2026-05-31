"use client";

import type { BrewType } from "@ieum/db";
import type { BreweryDetail } from "@/lib/actions/brewery";
import OperatingHoursPanel from "../brewery/[id]/_components/operating-hours";
import MiniMap from "../brewery/[id]/_components/mini-map";
import BreweryHeroGallery from "./brewery-hero-gallery";
import BreweryActionBar from "./brewery-action-bar";

const BREW_TYPE_LABEL: Record<BrewType, string> = {
  BEER: "맥주",
  MAKGEOLLI: "막걸리",
  CHEONGJU: "청주",
  SOJU: "증류주",
  FRUIT_WINE: "과실주",
};

const PRIORITY_ORDER: BrewType[] = [
  "MAKGEOLLI",
  "CHEONGJU",
  "SOJU",
  "FRUIT_WINE",
  "BEER",
];

function getUniqueBrewTypes(
  products: { brewType: BrewType | null }[],
): BrewType[] {
  const set = new Set<BrewType>();
  for (const p of products) if (p.brewType) set.add(p.brewType);
  return PRIORITY_ORDER.filter((t) => set.has(t));
}

type Variant = "sheet" | "panel";

type Props = {
  brewery: BreweryDetail | null;
  isFetching: boolean;
  variant: Variant;
};

export default function BreweryDetailContent({
  brewery,
  isFetching,
  variant,
}: Props) {
  if (!brewery) {
    return (
      <div className="flex flex-1 flex-col gap-3 px-5 py-8">
        {isFetching ? (
          <>
            <div className="h-7 w-2/3 animate-pulse rounded bg-brew-surface" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-brew-surface" />
            <div className="mt-4 h-40 animate-pulse rounded-xl bg-brew-surface" />
          </>
        ) : (
          <p className="text-sm text-brew-muted">양조장 정보를 찾을 수 없습니다</p>
        )}
      </div>
    );
  }

  const brewTypes = getUniqueBrewTypes(brewery.products);
  const visibleProducts = brewery.products.slice(0, 8);
  const isPanel = variant === "panel";

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1">
        {/* Hero 갤러리 */}
        <BreweryHeroGallery photos={brewery.photos} alt={brewery.name} />

        {/* 기본 정보 */}
        <section className="mt-6 px-4">
          {brewTypes.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {brewTypes.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center rounded-full bg-brew-surface px-2.5 py-0.5 text-xs font-medium text-brew-muted"
                >
                  {BREW_TYPE_LABEL[t]}
                </span>
              ))}
            </div>
          )}
          <h2
            className="font-serif text-2xl font-bold text-brew-text md:text-3xl"
            style={{ fontFamily: "'Nanum Myeongjo', serif" }}
          >
            {brewery.name}
          </h2>
          <div className="mt-2 flex items-start gap-2 text-sm text-brew-muted">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 shrink-0"
              aria-hidden="true"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="flex-1">{brewery.address}</span>
          </div>
        </section>

        <hr className="mx-4 my-6 border-brew-border" />

        {/* 운영 정보 + 브랜드 스토리 (panel은 항상 세로, sheet은 md 이상 2단) */}
        <section
          className={`grid gap-6 px-4 ${
            isPanel ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
          }`}
        >
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-brew-text">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>운영 정보</span>
            </h3>
            <OperatingHoursPanel raw={brewery.operatingHours} />
          </div>

          {brewery.description && (
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-brew-text">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2Z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7Z" />
                </svg>
                <span>브랜드 스토리</span>
              </h3>
              <p className="whitespace-pre-line text-sm leading-relaxed text-brew-text">
                {brewery.description}
              </p>
            </div>
          )}
        </section>

        {/* 대표 제품 */}
        {visibleProducts.length > 0 && (
          <section className="mt-8 px-4">
            <h3 className="mb-3 text-sm font-semibold text-brew-text">대표 제품</h3>
            <div
              className={`grid gap-3 ${
                isPanel ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4"
              }`}
            >
              {visibleProducts.map((p) => (
                <div
                  key={p.id}
                  className="overflow-hidden rounded-xl border border-brew-border bg-white"
                >
                  <div className="flex aspect-square items-center justify-center bg-stone-100">
                    <span className="text-2xl">🍶</span>
                  </div>
                  <div className="p-2.5">
                    <p className="truncate text-xs font-medium text-brew-text">
                      {p.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-brew-muted">
                      {p.alcoholContent != null ? `${p.alcoholContent}%` : "—"}
                      {p.volume ? ` · ${p.volume}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 위치 미니맵 — sheet only (데스크탑 panel은 메인 지도와 중복되어 Kakao Map 2개 인스턴스가 렉을 유발) */}
        {!isPanel && brewery.latitude != null && brewery.longitude != null && (
          <section className="mt-8 px-4 pb-6">
            <h3 className="mb-3 text-sm font-semibold text-brew-text">위치</h3>
            <MiniMap
              latitude={brewery.latitude}
              longitude={brewery.longitude}
              name={brewery.name}
            />
            {brewery.parkingInfo && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-brew-border bg-brew-surface p-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mt-0.5 shrink-0 text-brew-muted"
                  aria-hidden="true"
                >
                  <path d="M19 17h2v-5a2 2 0 0 0-1.4-1.9l-2.6-.8-2-3.5A2 2 0 0 0 13.2 5H7a2 2 0 0 0-2 1.4L3 12v5h2" />
                  <circle cx="7" cy="17" r="2" />
                  <circle cx="17" cy="17" r="2" />
                </svg>
                <div className="flex-1 text-xs text-brew-text">
                  <p className="font-medium">주차 정보</p>
                  <p className="mt-0.5 text-brew-muted">{brewery.parkingInfo}</p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* panel은 미니맵 생략 + parking 정보만 별도 노출 */}
        {isPanel && brewery.parkingInfo && (
          <section className="mt-8 px-4 pb-6">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-brew-text">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M19 17h2v-5a2 2 0 0 0-1.4-1.9l-2.6-.8-2-3.5A2 2 0 0 0 13.2 5H7a2 2 0 0 0-2 1.4L3 12v5h2" />
                <circle cx="7" cy="17" r="2" />
                <circle cx="17" cy="17" r="2" />
              </svg>
              <span>주차 정보</span>
            </h3>
            <p className="text-sm leading-relaxed text-brew-text">
              {brewery.parkingInfo}
            </p>
          </section>
        )}
      </div>

      {/* 하단 액션바 (sheet/panel 공통, sticky bottom-0) */}
      <BreweryActionBar
        breweryId={brewery.id}
        breweryName={brewery.name}
        isFavorited={brewery.isFavorited}
        isOwnBrewery={brewery.isOwnBrewery}
      />
    </div>
  );
}
