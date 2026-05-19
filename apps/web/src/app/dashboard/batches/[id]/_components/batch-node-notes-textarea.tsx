"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { updateBatchNodeNotes } from "@/lib/actions/batch";

const MAX = 5000;
const DEBOUNCE_MS = 800;

type Props = {
  batchNodeId: string;
  initial: string;
};

export default function BatchNodeNotesTextarea({ batchNodeId, initial }: Props) {
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef(initial);
  const [, startTransition] = useTransition();

  // 노드가 바뀌면 값 리셋
  useEffect(() => {
    setValue(initial);
    lastSaved.current = initial;
    setStatus("idle");
    setError(null);
  }, [batchNodeId, initial]);

  const saveNow = (next: string) => {
    if (next === lastSaved.current) return;
    setStatus("saving");
    setError(null);
    startTransition(async () => {
      try {
        await updateBatchNodeNotes(batchNodeId, next);
        lastSaved.current = next;
        setStatus("saved");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "저장 실패";
        setError(msg);
        setStatus("error");
      }
    });
  };

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value.slice(0, MAX);
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => saveNow(next), DEBOUNCE_MS);
  };

  const onBlur = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    saveNow(value);
  };

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-brew-subtle">메모</p>
        <span className="text-[10px] text-brew-faint">
          {status === "saving" && "저장 중…"}
          {status === "saved" && "저장됨 ✓"}
          {status === "error" && (error ?? "저장 실패")}
          {status === "idle" && `${value.length} / ${MAX}`}
        </span>
      </div>
      <textarea
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        maxLength={MAX}
        rows={4}
        placeholder="이 단계에서 관찰한 점, 변경 사항, 다음에 참고할 메모를 자유롭게 적어 두세요."
        className="w-full rounded-lg border border-brew-border bg-brew-bg px-3 py-2 text-sm text-brew-text placeholder:text-brew-faint focus:border-brew-accent focus:outline-none"
      />
    </div>
  );
}
