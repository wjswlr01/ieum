"use client";

import { useState } from "react";
import BatchPipeline, { type BatchPipelineNode } from "./batch-pipeline";

type Props = {
  pipelineNodes: BatchPipelineNode[];
  initialSelectedId: string | null;
  panels: Record<string, React.ReactNode>;
};

export default function BatchDetailBody({ pipelineNodes, initialSelectedId, panels }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);

  const handleSelect = (nodeId: string) => {
    // 같은 노드 재클릭 → 접힘. 다른 노드 → 전환.
    setSelectedId((prev) => (prev === nodeId ? null : nodeId));
  };

  return (
    <div className="flex flex-col gap-6">
      <section>
        <BatchPipeline
          nodes={pipelineNodes}
          selectedNodeId={selectedId}
          onSelect={handleSelect}
        />
      </section>

      {selectedId && panels[selectedId] ? (
        <section>{panels[selectedId]}</section>
      ) : (
        <section className="rounded-2xl border border-dashed border-brew-border bg-brew-surface px-6 py-8 text-center">
          <p className="text-sm text-brew-muted">위 단계를 선택하면 상세 정보가 표시됩니다.</p>
        </section>
      )}
    </div>
  );
}
