import Link from "next/link";

const STATUS_LABEL: Record<string, string> = {
  PLANNED: "대기",
  IN_PROGRESS: "진행 중",
  FERMENTING: "발효 중",
  CONDITIONING: "숙성 중",
  PACKAGING: "패키징",
  COMPLETED: "완료",
  ABORTED: "중단",
};

const STATUS_BADGE: Record<string, string> = {
  PLANNED: "text-amber-700 bg-[#FFF4E0] border-amber-200",
  IN_PROGRESS: "text-blue-700 bg-[#E0EEFA] border-blue-200",
  FERMENTING: "text-blue-700 bg-[#E0EEFA] border-blue-200",
  CONDITIONING: "text-purple-700 bg-purple-50 border-purple-200",
  PACKAGING: "text-zinc-700 bg-zinc-50 border-zinc-200",
  COMPLETED: "text-[#2A5C35] bg-[#EBF5EC] border-green-200",
  ABORTED: "text-red-700 bg-[#FCE8E8] border-red-200",
};

function emoji(brewType: string): string {
  return brewType === "MAKGEOLLI" ? "🍶" : "🍺";
}

export type BatchDetailHeaderProps = {
  batchNumber: string;
  recipeName: string;
  isRecipeDeleted: boolean;
  isFreeForm: boolean;
  brewType: string;
  status: string;
  daysSinceStart: number | null;
  photoCount: number;
  photosHref: string;
};

export default function BatchDetailHeader({
  batchNumber,
  recipeName,
  isRecipeDeleted,
  isFreeForm,
  brewType,
  status,
  daysSinceStart,
  photoCount,
  photosHref,
}: BatchDetailHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-brew-border bg-brew-surface/95 backdrop-blur supports-[backdrop-filter]:bg-brew-surface/75">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3 md:px-12">
        <Link
          href="/dashboard/batches"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-brew-muted transition-colors hover:bg-brew-surface-dark hover:text-brew-text"
          aria-label="내 술빚기로"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="text-sm">{emoji(brewType)}</span>
            <h1
              className={`truncate text-base font-bold leading-tight md:text-lg ${
                isRecipeDeleted ? "italic text-brew-subtle" : "text-brew-text"
              }`}
            >
              {recipeName}
            </h1>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-brew-muted">
            <span className="font-mono">#{batchNumber}</span>
            <span
              className={`inline-flex items-center rounded-full border px-1.5 py-px text-[10px] font-medium ${
                STATUS_BADGE[status] ?? STATUS_BADGE.PLANNED
              }`}
            >
              {STATUS_LABEL[status] ?? status}
            </span>
            {daysSinceStart != null && (
              <span className="font-mono text-brew-accent">D+{daysSinceStart}</span>
            )}
            {isFreeForm && <span className="text-brew-faint">자유 양조</span>}
          </div>
        </div>

        <Link
          href={photosHref}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-brew-border px-2.5 py-1 text-xs font-medium text-brew-muted transition-colors hover:border-brew-accent/40 hover:text-brew-accent"
          aria-label={`전체 사진 ${photoCount}장 보기`}
        >
          <span aria-hidden="true">📷</span>
          <span className="font-mono">{photoCount}</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </header>
  );
}
