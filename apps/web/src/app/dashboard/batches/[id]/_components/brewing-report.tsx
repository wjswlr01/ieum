import { calcAbvFromMeasurements } from "@/lib/abv-calculator";

type MeasRow = { type: string; value: number; takenAt: Date };

type Props = {
  batchNumber: string;
  startedAt: Date | null;
  finishedAt: Date | null;
  measurements: MeasRow[];
  brewType: string;
  tastingNotes: Array<{ overallScore: number }>;
};

export default function BrewingReport({
  batchNumber,
  startedAt,
  finishedAt,
  measurements,
  brewType,
  tastingNotes,
}: Props) {
  const abv = calcAbvFromMeasurements(measurements, brewType);

  const duration =
    startedAt && finishedAt
      ? Math.ceil((finishedAt.getTime() - startedAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;

  const temps = measurements.filter((m) => m.type === "TEMPERATURE").map((m) => m.value);
  const avgTemp =
    temps.length > 0 ? parseFloat((temps.reduce((s, v) => s + v, 0) / temps.length).toFixed(1)) : null;
  const maxTemp = temps.length > 0 ? Math.max(...temps) : null;
  const minTemp = temps.length > 0 ? Math.min(...temps) : null;

  const phRows = measurements
    .filter((m) => m.type === "PH")
    .sort((a, b) => a.takenAt.getTime() - b.takenAt.getTime());
  const firstPh = phRows[0]?.value ?? null;
  const lastPh = phRows[phRows.length - 1]?.value ?? null;

  const acidityRows = measurements
    .filter((m) => m.type === "CUSTOM")
    .sort((a, b) => a.takenAt.getTime() - b.takenAt.getTime());
  const firstAcidity = acidityRows[0]?.value ?? null;
  const lastAcidity = acidityRows[acidityRows.length - 1]?.value ?? null;

  const avgScore =
    tastingNotes.length > 0
      ? Math.round(tastingNotes.reduce((s, n) => s + n.overallScore, 0) / tastingNotes.length)
      : null;

  const startStr = startedAt ? new Date(startedAt).toLocaleDateString("ko-KR") : null;
  const endStr = finishedAt ? new Date(finishedAt).toLocaleDateString("ko-KR") : null;

  const abvFormulaNote =
    brewType === "BEER"
      ? abv?.method === "gravity"
        ? `(OG−FG)×131.25 · OG ${abv.og} → FG ${abv.fg}`
        : abv
        ? `Brix→SG 변환 · ${abv.initialBrix} → ${abv.finalBrix}`
        : null
      : abv
      ? `(초기−최종 Brix)×0.535 · ${abv.initialBrix} → ${abv.finalBrix}`
      : null;

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-brew-text">양조 리포트</h2>
        <button
          disabled
          className="flex items-center gap-1.5 rounded-lg border border-brew-border px-3 py-1.5 text-xs text-brew-muted opacity-60"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          리포트 공유 (준비 중)
        </button>
      </div>

      <div
        className="overflow-hidden rounded-2xl border border-brew-accent/40"
        style={{ background: "linear-gradient(135deg, #FAF7F2 0%, #F5EFE4 100%)" }}
      >
        <div
          className="border-b border-brew-accent/30 px-6 py-5"
          style={{ background: "linear-gradient(90deg, rgba(200,179,42,0.08) 0%, transparent 100%)" }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="font-serif text-lg font-semibold tracking-tight text-brew-text">종합 발효 리포트</p>
              <p className="mt-0.5 font-mono text-xs text-brew-muted">#{batchNumber}</p>
            </div>
            <span className="text-2xl">{brewType === "BEER" ? "🍺" : "🍶"}</span>
          </div>
          {startStr && (
            <p className="mt-2 text-xs text-brew-subtle">
              {startStr}
              {endStr && endStr !== startStr ? ` ~ ${endStr}` : ""}
              {duration != null && ` (${duration}일)`}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 divide-x divide-y divide-brew-accent/15">
          <div className="px-5 py-5">
            <p className="mb-2 text-[11px] uppercase tracking-wide text-brew-subtle">알코올 도수</p>
            {abv ? (
              <>
                <p className="font-mono text-3xl font-bold leading-none text-brew-accent">
                  {abv.abv}
                  <span className="ml-0.5 text-lg">%</span>
                </p>
                {abvFormulaNote && (
                  <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-brew-faint">{abvFormulaNote}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-brew-faint">측정 데이터 없음</p>
            )}
          </div>

          <div className="px-5 py-5">
            <p className="mb-2 text-[11px] uppercase tracking-wide text-brew-subtle">발효 기간</p>
            {duration != null ? (
              <>
                <p className="font-mono text-3xl font-bold leading-none text-brew-text">
                  {duration}
                  <span className="ml-0.5 text-lg font-normal">일</span>
                </p>
                {startStr && endStr && (
                  <p className="mt-1.5 text-[10px] text-brew-faint">
                    {startStr} ~ {endStr}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-brew-faint">—</p>
            )}
          </div>

          <div className="px-5 py-5">
            <p className="mb-2 text-[11px] uppercase tracking-wide text-brew-subtle">발효 온도</p>
            {avgTemp != null ? (
              <>
                <p className="font-mono text-3xl font-bold leading-none text-brew-text">
                  {avgTemp}
                  <span className="ml-0.5 text-lg font-normal">°C</span>
                </p>
                <div className="mt-1.5 flex gap-3">
                  <span className="font-mono text-[10px] text-red-500">↑ {maxTemp}°C</span>
                  <span className="font-mono text-[10px] text-blue-500">↓ {minTemp}°C</span>
                  <span className="text-[10px] text-brew-faint">{temps.length}회</span>
                </div>
              </>
            ) : (
              <p className="text-sm text-brew-faint">측정 없음</p>
            )}
          </div>

          <div className="px-5 py-5">
            <p className="mb-2 text-[11px] uppercase tracking-wide text-brew-subtle">총 측정 횟수</p>
            <p className="font-mono text-3xl font-bold leading-none text-brew-text">
              {measurements.length}
              <span className="ml-0.5 text-lg font-normal">회</span>
            </p>
          </div>

          {(firstPh != null || lastPh != null) && (
            <div className="px-5 py-5">
              <p className="mb-2 text-[11px] uppercase tracking-wide text-brew-subtle">pH 변화</p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-semibold text-brew-text">{firstPh ?? "—"}</span>
                <span className="text-sm text-brew-accent">→</span>
                <span className="font-mono text-lg font-semibold text-brew-text">{lastPh ?? "—"}</span>
              </div>
              {firstPh != null && lastPh != null && (
                <p className="mt-1 text-[10px] text-brew-faint">
                  {lastPh < firstPh
                    ? `▼ ${(firstPh - lastPh).toFixed(2)} 감소`
                    : lastPh > firstPh
                    ? `▲ ${(lastPh - firstPh).toFixed(2)} 증가`
                    : "변화 없음"}
                </p>
              )}
            </div>
          )}

          {brewType === "MAKGEOLLI" && (firstAcidity != null || lastAcidity != null) && (
            <div className="px-5 py-5">
              <p className="mb-2 text-[11px] uppercase tracking-wide text-brew-subtle">산도 변화</p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-semibold text-brew-text">{firstAcidity ?? "—"}%</span>
                <span className="text-sm text-brew-accent">→</span>
                <span className="font-mono text-lg font-semibold text-brew-text">{lastAcidity ?? "—"}%</span>
              </div>
            </div>
          )}

          {avgScore != null && (
            <div className="px-5 py-5">
              <p className="mb-2 text-[11px] uppercase tracking-wide text-brew-subtle">시음 총점</p>
              <p className="font-mono text-3xl font-bold leading-none text-brew-accent">
                {avgScore}
                <span className="ml-0.5 text-lg font-normal">점</span>
              </p>
              <p className="mt-1.5 text-[10px] text-brew-faint">{tastingNotes.length}회 기록 평균</p>
            </div>
          )}
        </div>

        <div className="border-t border-brew-accent/20 px-6 py-3">
          <p className="text-right font-mono text-[10px] text-brew-faint">이음 · {endStr ?? ""}</p>
        </div>
      </div>
    </section>
  );
}
