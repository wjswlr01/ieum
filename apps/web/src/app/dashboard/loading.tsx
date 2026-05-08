function Block({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-brew-surface-dark ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <main className="px-4 py-6 md:px-12 md:py-10 max-w-5xl mx-auto w-full">
      <div className="mb-10">
        <Block className="h-7 w-48 mb-2" />
        <Block className="h-4 w-72" />
      </div>

      <div className="rounded-xl border border-brew-border bg-brew-surface p-5 mb-10">
        <Block className="h-4 w-24 mb-4" />
        <div className="space-y-3">
          <Block className="h-16 w-full" />
          <Block className="h-16 w-full" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-10">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-brew-border bg-brew-surface px-6 py-5">
            <Block className="h-3 w-16 mb-3" />
            <Block className="h-8 w-20" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-brew-border bg-brew-surface px-6 py-6">
        <Block className="h-4 w-20 mb-4" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Block key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    </main>
  );
}
