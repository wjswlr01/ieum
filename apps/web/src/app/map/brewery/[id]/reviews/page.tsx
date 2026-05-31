import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getBreweryById } from "@/lib/actions/brewery";
import ReviewForm from "./review-form";

type Props = { params: { id: string } };

export default async function BreweryReviewsPage({ params }: Props) {
  const { brewery } = await getBreweryById(params.id);
  if (!brewery) notFound();

  // 본인 양조장은 후기 작성 불가 — 상세 페이지로 돌려보냄
  if (brewery.isOwnBrewery) {
    redirect(`/map/brewery/${brewery.id}`);
  }

  // 본인 기존 후기 (있으면 수정 모드)
  const myReview = brewery.reviews.find((r) => r.isOwnReview) ?? null;
  const otherReviews = brewery.reviews.filter((r) => !r.isOwnReview);

  return (
    <div className="flex min-h-screen flex-col bg-brew-bg">
      <header
        className="sticky top-0 z-30 border-b border-brew-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex w-full max-w-2xl items-center gap-2 px-2 py-2 md:px-12">
          <Link
            href={`/map/brewery/${brewery.id}`}
            aria-label="양조장 상세로"
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
          <h1 className="flex-1 truncate text-center text-base font-semibold text-brew-text md:text-lg">
            후기 작성
          </h1>
          <div className="h-10 w-10 shrink-0" aria-hidden="true" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 md:px-12">
        {/* 양조장 헤더 */}
        <div className="mb-6">
          <p className="text-xs text-brew-muted">{brewery.region}</p>
          <h2
            className="font-serif text-xl font-bold text-brew-text"
            style={{ fontFamily: "'Nanum Myeongjo', serif" }}
          >
            {brewery.name}
          </h2>
        </div>

        {/* 작성 폼 */}
        <section className="rounded-xl border border-brew-border bg-white p-5">
          {myReview && (
            <p className="mb-4 rounded-lg bg-brew-accent-light px-3 py-2 text-xs text-brew-accent-light-text">
              이미 작성한 후기가 있어요. 수정 시 덮어쓰여집니다.
            </p>
          )}
          <ReviewForm
            breweryId={brewery.id}
            initial={
              myReview ? { rating: myReview.rating, content: myReview.content } : null
            }
          />
        </section>

        {/* 다른 후기 목록 */}
        {otherReviews.length > 0 && (
          <section className="mt-8">
            <h3 className="mb-3 text-sm font-semibold text-brew-text">
              다른 사람들의 후기 ({otherReviews.length})
            </h3>
            <ul className="flex flex-col gap-3">
              {otherReviews.map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-brew-border bg-white p-4"
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-brew-text">
                        {r.author.name ?? "익명"}
                      </span>
                      <span className="text-xs text-brew-faint">
                        {new Date(r.createdAt).toLocaleDateString("ko-KR")}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg
                          key={i}
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill={i < r.rating ? "currentColor" : "none"}
                          stroke="currentColor"
                          strokeWidth="1.5"
                          className={i < r.rating ? "" : "text-brew-border"}
                          aria-hidden="true"
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      ))}
                    </div>
                  </div>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-brew-text">
                    {r.content}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
