export default function HomePage() {
  return (
    <div className="min-h-screen bg-brew-bg text-brew-text flex flex-col">
      {/* Nav */}
      <header className="bg-brew-dark flex items-center justify-between px-6 py-5 md:px-12">
        <span className="font-serif text-xl font-bold tracking-tight text-brew-text-light">
          이음
        </span>
        <a
          href="/login"
          className="text-sm text-[#B0A080] hover:text-brew-text-light transition-colors"
        >
          로그인
        </a>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 md:py-36">
        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-brew-border bg-brew-surface px-4 py-1.5 text-xs text-brew-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-brew-accent" />
          양조 공정 관리 플랫폼
        </div>

        {/* Headline */}
        <h1 className="font-serif max-w-2xl text-4xl font-bold leading-tight tracking-tight md:text-6xl md:leading-[1.1]">
          맥주와 막걸리,
          <br />
          <span className="text-brew-accent">
            하나의 플랫폼에서
          </span>
        </h1>

        {/* Subtext */}
        <p className="mt-6 max-w-md text-base text-brew-muted md:text-lg">
          레시피 관리부터 발효 공정 추적까지
        </p>

        {/* CTA buttons */}
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <a
            href="/login"
            className="w-44 rounded-xl bg-brew-accent py-3 text-center text-sm font-semibold text-brew-text hover:bg-brew-accent-hover transition-colors"
          >
            시작하기
          </a>
          <a
            href="/about"
            className="w-44 rounded-xl border border-brew-border py-3 text-center text-sm font-semibold text-brew-muted hover:border-brew-border-hover hover:text-brew-text transition-colors"
          >
            더 알아보기
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 text-center text-xs text-brew-faint md:px-12">
        © 2026 이음 (Ieum). All rights reserved.
      </footer>
    </div>
  );
}
