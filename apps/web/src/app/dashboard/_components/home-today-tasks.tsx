import Link from "next/link";
import type { TodayTask } from "@/lib/actions/dashboard";

function formatHHMM(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function TaskMarker() {
  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-brew-cream bg-brew-cream text-brew-cream-ink"
      aria-hidden="true"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2h4" />
        <path d="M12 14v-4" />
        <circle cx="12" cy="14" r="8" />
      </svg>
    </span>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-brew-border bg-brew-surface px-5 py-8 text-center">
      <p className="text-sm font-medium text-brew-text">오늘 예정된 작업이 없습니다</p>
      <p className="mt-1 text-xs text-brew-muted">측정과 덧술 일정은 자동으로 표시됩니다</p>
    </div>
  );
}

export default function HomeTodayTasks({ tasks }: { tasks: TodayTask[] }) {
  return (
    <aside className="flex flex-col gap-3">
      <h2 className="font-serif text-lg md:text-xl font-bold text-brew-text">오늘의 할 일</h2>

      {tasks.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="relative rounded-2xl border border-brew-border bg-brew-surface p-3 shadow-sm">
          {/* 수직 타임라인 라인 */}
          <span
            className="pointer-events-none absolute bottom-6 left-[1.875rem] top-6 w-px bg-brew-border"
            aria-hidden="true"
          />
          <ul className="flex flex-col">
            {tasks.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/dashboard/batches/${t.batchId}`}
                  className="relative z-10 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-brew-bg"
                >
                  <TaskMarker />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-mono font-semibold text-brew-accent leading-none">
                      {formatHHMM(t.startedAt)}
                    </p>
                    <p className="mt-1 text-sm font-medium text-brew-text truncate">
                      <span className="break-keep">{t.recipeName}</span>
                      <span className="mx-1 text-brew-faint">·</span>
                      <span className="text-brew-subtle">{t.nodeName}</span>
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
