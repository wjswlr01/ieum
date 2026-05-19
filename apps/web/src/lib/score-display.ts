// 시음 평점 변환 — DB는 0~10 정수, 화면은 1~5 별점.

export function displayScore(dbScore: number): number {
  if (!Number.isFinite(dbScore)) return 0;
  const v = Math.round(dbScore / 2);
  return Math.max(0, Math.min(5, v));
}

export function toDbScore(displayScore: number): number {
  if (!Number.isFinite(displayScore)) return 0;
  return Math.max(0, Math.min(10, Math.round(displayScore * 2)));
}
