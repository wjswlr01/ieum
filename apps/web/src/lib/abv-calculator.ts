export function estimateABV(
  brixValues: number[],
): { estimatedABV: number; initialBrix: number; finalBrix: number } | null {
  if (brixValues.length < 2) return null;
  const initialBrix = Math.max(...brixValues);
  const finalBrix = brixValues[brixValues.length - 1]!;
  const estimatedABV = parseFloat(((initialBrix - finalBrix) * 0.535).toFixed(1));
  return { estimatedABV, initialBrix, finalBrix };
}
