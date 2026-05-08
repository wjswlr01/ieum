function Block({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-brew-surface-dark ${className}`} />;
}

export default function BatchesLoading() {
  return (
    <main className="px-4 py-6 md:px-12 md:py-10 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <Block className="h-7 w-20" />
        <Block className="h-9 w-32" />
      </div>

      <div className="flex gap-2 mb-6">
        {[0, 1, 2, 3].map((i) => (
          <Block key={i} className="h-8 w-16 rounded-full" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-xl border border-brew-border bg-brew-surface p-5">
            <div className="flex items-start justify-between mb-3">
              <Block className="h-5 w-16 rounded-full" />
              <Block className="h-6 w-6 rounded-full" />
            </div>
            <Block className="h-3 w-24 mb-2" />
            <Block className="h-5 w-3/4 mb-4" />
            <div className="flex justify-between mb-1">
              <Block className="h-3 w-20" />
              <Block className="h-3 w-10" />
            </div>
            <Block className="h-1 w-full mb-3" />
            <Block className="h-3 w-32" />
          </div>
        ))}
      </div>
    </main>
  );
}
