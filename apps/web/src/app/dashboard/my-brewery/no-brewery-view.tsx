import Link from "next/link";

export default function NoBreweryView() {
  return (
    <main className="px-4 py-10 md:px-12 md:py-16 max-w-2xl mx-auto w-full">
      <div className="rounded-2xl border border-brew-border bg-brew-surface px-6 py-10 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-brew-bg">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-brew-muted"
            aria-hidden="true"
          >
            <path d="M3 21h18" />
            <path d="M5 21V7l7-4 7 4v14" />
            <path d="M9 9h1" />
            <path d="M9 13h1" />
            <path d="M9 17h1" />
            <path d="M14 9h1" />
            <path d="M14 13h1" />
            <path d="M14 17h1" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-brew-text mb-2">
          아직 양조장이 등록되지 않았습니다
        </h1>
        <p className="text-sm text-brew-muted mb-6">
          본인 양조장 정보를 관리하려면 관리자에게 연결을 요청해주세요.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-lg border border-brew-border bg-brew-bg px-4 py-2 text-sm font-medium text-brew-text hover:bg-brew-surface-dark transition-colors"
        >
          대시보드로 돌아가기
        </Link>
      </div>
    </main>
  );
}
