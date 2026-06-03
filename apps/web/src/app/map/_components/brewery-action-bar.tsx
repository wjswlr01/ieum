"use client";

import Link from "next/link";
import FavoriteButton from "../brewery/[id]/_components/favorite-button";
import ShareButton from "../brewery/[id]/_components/share-button";

type Props = {
  breweryId: string;
  breweryName: string;
  isFavorited: boolean;
  isOwnBrewery: boolean;
};

export default function BreweryActionBar({
  breweryId,
  breweryName,
  isFavorited,
  isOwnBrewery,
}: Props) {
  return (
    <div
      className="sticky bottom-0 z-10 border-t border-brew-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center gap-2 px-4 py-3">
        <FavoriteButton breweryId={breweryId} initialFavorited={isFavorited} />
        {isOwnBrewery ? (
          <Link
            href="/dashboard/my-brewery"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brew-text px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brew-dark"
          >
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
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            <span>정보 수정</span>
          </Link>
        ) : (
          <Link
            href={`/map/brewery/${breweryId}/reviews`}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brew-text px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brew-dark"
          >
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
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" />
            </svg>
            <span>후기 작성하기</span>
          </Link>
        )}
        <ShareButton breweryId={breweryId} breweryName={breweryName} />
      </div>
    </div>
  );
}
