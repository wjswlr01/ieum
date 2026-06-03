"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { BrewType } from "@ieum/db";
import type { BreweryCard } from "@/lib/actions/brewery";
import { BREW_TYPE_LABEL, BREW_TYPE_ORDER } from "@/lib/brewery-labels";

export default function FavoriteCard({
  card,
  onUnfavorite,
}: {
  card: BreweryCard;
  onUnfavorite: () => void;
}) {
  const brewTypes = useMemo(() => {
    const set = new Set<BrewType>();
    for (const p of card.products) if (p.brewType) set.add(p.brewType);
    return BREW_TYPE_ORDER.filter((t) => set.has(t));
  }, [card.products]);

  const regionText = card.city ? `${card.region} ${card.city}` : card.region;
  const photoUrl = card.primaryPhoto?.originalPath ?? null;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-brew-border bg-white transition hover:border-brew-accent hover:shadow-md">
      <Link
        href={`/map?brewery=${card.id}`}
        className="flex flex-1 flex-col"
        aria-label={`${card.name} 양조장 상세 보기`}
      >
        <div className="relative h-48 overflow-hidden bg-brew-surface md:h-56">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt={card.name}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-brew-text/30">
              <svg
                width="42"
                height="42"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          {brewTypes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {brewTypes.slice(0, 3).map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center rounded-full border border-brew-border bg-white px-2 py-0.5 text-[11px] font-medium text-brew-text/70"
                >
                  {BREW_TYPE_LABEL[t]}
                </span>
              ))}
            </div>
          )}
          <h2
            className="font-serif text-lg font-bold leading-snug text-brew-text"
            style={{ fontFamily: "'Nanum Myeongjo', serif" }}
          >
            {card.name}
          </h2>
          <div className="flex items-center gap-1.5 text-xs text-brew-text/70">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="truncate">{regionText}</span>
          </div>
        </div>
      </Link>

      <button
        type="button"
        onClick={onUnfavorite}
        aria-label="즐겨찾기 해제"
        className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-brew-accent shadow-sm backdrop-blur transition hover:bg-white"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />
        </svg>
      </button>
    </article>
  );
}
