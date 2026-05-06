"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { activateBatch } from "@/lib/actions/batch";

export default function BatchStartButton({ batchId }: { batchId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await activateBatch(batchId);
          router.refresh();
        })
      }
      className="shrink-0 rounded-xl bg-brew-accent px-5 py-2.5 text-sm font-semibold text-brew-text hover:bg-brew-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? "시작 중..." : "배치 시작"}
    </button>
  );
}
