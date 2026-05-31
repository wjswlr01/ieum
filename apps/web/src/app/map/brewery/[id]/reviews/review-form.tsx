"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createReview } from "@/lib/actions/brewery";

type Props = {
  breweryId: string;
  initial?: { rating: number; content: string } | null;
};

const MAX_CONTENT = 1000;

export default function ReviewForm({ breweryId, initial }: Props) {
  const router = useRouter();
  const [rating, setRating] = useState<number>(initial?.rating ?? 0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [content, setContent] = useState<string>(initial?.content ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    if (rating < 1 || rating > 5) {
      setError("별점을 선택해주세요.");
      return;
    }
    const trimmed = content.trim();
    if (trimmed.length < 1) {
      setError("후기 내용을 입력해주세요.");
      return;
    }
    if (trimmed.length > MAX_CONTENT) {
      setError(`후기는 ${MAX_CONTENT}자 이내로 작성해주세요.`);
      return;
    }
    startTransition(async () => {
      try {
        await createReview({ breweryId, rating, content: trimmed });
        router.push(`/map/brewery/${breweryId}`);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "후기 저장 중 오류가 발생했습니다.");
      }
    });
  }

  const displayRating = hoverRating || rating;

  return (
    <div className="space-y-5">
      {/* 별점 */}
      <div>
        <label className="block text-sm font-medium text-brew-text">별점</label>
        <div className="mt-2 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((v) => {
            const filled = v <= displayRating;
            return (
              <button
                key={v}
                type="button"
                onClick={() => setRating(v)}
                onMouseEnter={() => setHoverRating(v)}
                onMouseLeave={() => setHoverRating(0)}
                aria-label={`${v}점`}
                className="p-1 transition-transform hover:scale-110"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill={filled ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={filled ? "text-amber-400" : "text-brew-border"}
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </button>
            );
          })}
          {rating > 0 && (
            <span className="ml-2 text-sm font-semibold text-brew-text">{rating}/5</span>
          )}
        </div>
      </div>

      {/* 내용 */}
      <div>
        <label htmlFor="review-content" className="block text-sm font-medium text-brew-text">
          후기 내용
        </label>
        <textarea
          id="review-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={MAX_CONTENT}
          rows={6}
          placeholder="이 양조장에서의 경험을 자유롭게 적어주세요."
          className="mt-2 w-full rounded-lg border border-brew-border bg-white px-3 py-2.5 text-sm text-brew-text placeholder:text-brew-faint focus:border-brew-accent focus:outline-none resize-none"
        />
        <p className="mt-1 text-right text-[11px] text-brew-faint">
          {content.length} / {MAX_CONTENT}
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isPending}
          className="flex-1 rounded-xl border border-brew-border py-3 text-sm font-medium text-brew-muted hover:border-brew-border-hover disabled:opacity-50"
        >
          취소
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="flex-1 rounded-xl bg-brew-text py-3 text-sm font-semibold text-white hover:bg-brew-dark disabled:opacity-50"
        >
          {isPending ? "저장 중..." : initial ? "후기 수정" : "후기 등록"}
        </button>
      </div>
    </div>
  );
}
