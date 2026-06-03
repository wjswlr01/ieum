export default function PreviewTab() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-brew-border bg-brew-surface px-6 py-16 text-center">
      <span className="text-brew-muted" aria-hidden="true">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </span>
      <p className="text-sm font-medium text-brew-text">미리보기</p>
      <p className="text-xs text-brew-muted">Phase 5-B-5에서 구현 예정</p>
    </div>
  );
}
