"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Link from "next/link";
import { completeNode } from "@/lib/actions/batch";

type Props = {
  nodeId: string;
  batchId: string;
  isFermentation: boolean;
};

export default function NodeActions({ nodeId, batchId, isFermentation }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-2 shrink-0">
      {isFermentation && (
        <Link
          href={`/dashboard/batches/${batchId}/measurements`}
          className="rounded-lg border border-brew-accent/40 px-3 py-1.5 text-xs text-brew-accent hover:bg-brew-accent/10 transition-colors"
        >
          측정값 입력
        </Link>
      )}
      <button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await completeNode(nodeId);
            router.refresh();
          })
        }
        className="rounded-lg border border-brew-success/40 px-3 py-1.5 text-xs text-brew-success hover:bg-brew-success/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "처리 중..." : "완료 ✓"}
      </button>
    </div>
  );
}
