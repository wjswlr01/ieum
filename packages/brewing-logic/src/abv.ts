/**
 * ABV (알코올 도수) 계산
 * 맥주: 표준 비중 공식 사용
 * 막걸리: Brix 기반 근사치
 */

export function calcAbvFromGravity(og: number, fg: number): number {
  return (og - fg) * 131.25;
}

export function calcAbvFromBrix(initialBrix: number, finalBrix: number): number {
  const og = 1 + initialBrix / (258.6 - (initialBrix / 258.2) * 227.1);
  const fg = 1 + finalBrix / (258.6 - (finalBrix / 258.2) * 227.1);
  return calcAbvFromGravity(og, fg);
}
