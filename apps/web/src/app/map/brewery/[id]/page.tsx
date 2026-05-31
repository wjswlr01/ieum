import { notFound } from "next/navigation";
import Link from "next/link";
import type { BrewType } from "@ieum/db";
import { getBreweryById } from "@/lib/actions/brewery";
import FavoriteButton from "./_components/favorite-button";
import OperatingHoursPanel from "./_components/operating-hours";
import MiniMap from "./_components/mini-map";
import BottomActionBar from "./_components/bottom-action-bar";

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

type Props = { params: { id: string } };

export default async function BreweryDetailPage({ params }: Props) {
  const { brewery } = await getBreweryById(params.id);
  if (!brewery) notFound();

  const brewTypes = getUniqueBrewTypes(brewery.products);
  const heroPhoto = brewery.photos[0] ?? null;
  const secondaryPhotos = brewery.photos.slice(1, 3);
  const remainingCount = Math.max(0, brewery.photos.length - 3);
  const visibleProducts = brewery.products.slice(0, 8);

  return (
    <div className="flex min-h-screen flex-col bg-brew-bg">
      {/* ── 헤더 ───────────────────────────────────────── */}
      <header
        className="sticky top-0 z-30 border-b border-brew-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-2 py-2 md:px-12">
          <Link
            href="/map"
            aria-label="지도로 돌아가기"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-brew-text transition-colors hover:bg-brew-surface"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </Link>
          <h1
            className="flex-1 truncate text-center font-serif text-base font-semibold text-brew-text md:text-lg"
            style={{ fontFamily: "'Nanum Myeongjo', serif" }}
          >
            {brewery.name}
          </h1>
          <FavoriteButton
            breweryId={brewery.id}
            initialFavorited={brewery.isFavorited}
          />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-6 md:px-12">
        {/* ── 히어로 갤러리 ───────────────────────────── */}
        <section className="mt-4">
          {brewery.photos.length === 0 ? (
            <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-dashed border-brew-border bg-brew-surface md:aspect-[21/9]">
              <p className="text-sm text-brew-muted">아직 등록된 사진이 없습니다</p>
            </div>
          ) : (
            <div className="grid aspect-[4/3] grid-cols-3 gap-2 md:aspect-[21/9]">
              <div className="relative col-span-2 overflow-hidden rounded-xl bg-stone-200">
                {heroPhoto && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={heroPhoto.originalPath}
                    alt={heroPhoto.caption ?? brewery.name}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="grid grid-rows-2 gap-2">
                {[0, 1].map((idx) => {
                  const photo = secondaryPhotos[idx];
                  const isLast = idx === 1 && remainingCount > 0;
                  return (
                    <div
                      key={idx}
                      className="relative overflow-hidden rounded-xl bg-stone-200"
                    >
                      {photo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photo.originalPath}
                          alt={photo.caption ?? brewery.name}
                          className="h-full w-full object-cover"
                        />
                      )}
                      {isLast && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm font-semibold text-white">
                          +{remainingCount} 사진 더보기
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* ── 기본 정보 ───────────────────────────────── */}
        <section className="mt-6">
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
              width="18"
              height="18"
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
          {brewery.latitude != null && brewery.longitude != null && (
            <Link
              href="/map"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brew-accent hover:text-brew-accent-hover"
            >
              <span>지도에서 보기</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          )}
        </section>

        {/* ── 운영 정보 + 브랜드 스토리 ───────────────── */}
        <section className="mt-8 grid gap-8 md:grid-cols-2">
          {/* 운영 시간 */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-brew-text">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
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

          {/* 브랜드 스토리 */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-brew-text">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
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
            {brewery.description ? (
              <p className="whitespace-pre-line text-sm leading-relaxed text-brew-text">
                {brewery.description}
              </p>
            ) : (
              <p className="text-sm text-brew-muted">아직 등록된 소개가 없습니다.</p>
            )}
          </div>
        </section>

        {/* ── 대표 제품 ───────────────────────────────── */}
        {visibleProducts.length > 0 && (
          <section className="mt-8">
            <h3 className="mb-3 text-sm font-semibold text-brew-text">대표 제품</h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {visibleProducts.map((p) => (
                <div
                  key={p.id}
                  className="overflow-hidden rounded-xl border border-brew-border bg-white"
                >
                  <div className="flex aspect-square items-center justify-center bg-stone-100">
                    <span className="text-3xl">🍶</span>
                  </div>
                  <div className="p-3">
                    <p className="truncate text-sm font-medium text-brew-text">
                      {p.name}
                    </p>
                    <p className="mt-0.5 text-xs text-brew-muted">
                      {p.alcoholContent != null ? `${p.alcoholContent}%` : "—"}
                      {p.volume ? ` · ${p.volume}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── 위치 미니맵 ─────────────────────────────── */}
        {brewery.latitude != null && brewery.longitude != null && (
          <section className="mt-8">
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
                  width="18"
                  height="18"
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
      </main>

      <BottomActionBar
        breweryId={brewery.id}
        breweryName={brewery.name}
        isOwnBrewery={brewery.isOwnBrewery}
      />
    </div>
  );
}
