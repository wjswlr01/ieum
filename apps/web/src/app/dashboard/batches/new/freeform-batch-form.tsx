"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createFreeformBatch } from "@/lib/actions/batch";

type SubOption = {
  key: string;
  label: string;
  desc: string;
  nodes: string[];
};

const MAKGEOLLI_SUBS: SubOption[] = [
  {
    key: "DANYANGJU",
    label: "단양주",
    desc: "1회 발효",
    nodes: ["고두밥 준비", "술 담기", "발효"],
  },
  {
    key: "IYANGJU",
    label: "이양주",
    desc: "2회 발효",
    nodes: ["고두밥(1차)", "밑술 담기", "밑술 발효", "고두밥(2차)", "덧술 담기", "2차 발효"],
  },
  {
    key: "SAMYANGJU",
    label: "삼양주",
    desc: "3회 발효",
    nodes: ["고두밥(1차)", "밑술 담기", "밑술 발효", "고두밥(2차)", "1차 덧술", "1차 발효", "고두밥(3차)", "2차 덧술", "최종 발효"],
  },
];

const BEER_SUBS: SubOption[] = [
  {
    key: "ALE",
    label: "기본 에일",
    desc: "당화→끓임→발효",
    nodes: ["당화", "끓임", "발효"],
  },
  {
    key: "IPA",
    label: "IPA",
    desc: "+드라이호핑",
    nodes: ["당화", "끓임", "냉각", "발효", "드라이호핑 숙성"],
  },
];

export default function FreeformBatchForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [brewType, setBrewType] = useState<"MAKGEOLLI" | "BEER">("MAKGEOLLI");
  const [subType, setSubType] = useState("DANYANGJU");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleBrewTypeChange(type: "MAKGEOLLI" | "BEER") {
    setBrewType(type);
    setSubType(type === "MAKGEOLLI" ? "DANYANGJU" : "ALE");
  }

  const subOptions = brewType === "MAKGEOLLI" ? MAKGEOLLI_SUBS : BEER_SUBS;
  const selectedSub = subOptions.find((s) => s.key === subType) ?? subOptions[0]!;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await createFreeformBatch({
          name: name.trim(),
          brewType,
          subType,
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        });
        router.push(`/dashboard/batches/${result.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* 주종 선택 */}
      <div>
        <label className="block text-sm font-medium text-brew-text mb-2">주종</label>
        <div className="grid grid-cols-2 gap-3">
          {(["MAKGEOLLI", "BEER"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleBrewTypeChange(type)}
              className={`rounded-xl border p-4 text-left transition-colors ${
                brewType === type
                  ? "border-brew-accent bg-[#C8B32A]/5"
                  : "border-brew-border bg-brew-surface hover:border-brew-border-hover"
              }`}
            >
              <span className="text-2xl block mb-1">{type === "MAKGEOLLI" ? "🍶" : "🍺"}</span>
              <p className="font-semibold text-brew-text text-sm">
                {type === "MAKGEOLLI" ? "막걸리" : "맥주"}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* 세부 유형 선택 */}
      <div>
        <label className="block text-sm font-medium text-brew-text mb-2">유형</label>
        <div className={`grid gap-3 ${brewType === "MAKGEOLLI" ? "grid-cols-3" : "grid-cols-2"}`}>
          {subOptions.map((sub) => (
            <button
              key={sub.key}
              type="button"
              onClick={() => setSubType(sub.key)}
              className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                subType === sub.key
                  ? "border-brew-accent bg-[#C8B32A]/5"
                  : "border-brew-border bg-brew-surface hover:border-brew-border-hover"
              }`}
            >
              <p className="font-semibold text-brew-text text-sm">{sub.label}</p>
              <p className="text-xs text-brew-subtle mt-0.5">{sub.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 자동 생성 공정 미리보기 */}
      <div className="rounded-lg bg-brew-surface border border-brew-border px-4 py-3">
        <p className="text-xs text-brew-subtle mb-2">자동 생성 공정 ({selectedSub.nodes.length}개)</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          {selectedSub.nodes.map((n, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className="rounded px-2 py-0.5 text-xs bg-[#E8DFD0] text-brew-muted">{n}</span>
              {i < selectedSub.nodes.length - 1 && (
                <span className="text-brew-border text-xs">→</span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* 배치 이름 */}
      <div>
        <label className="block text-sm font-medium text-brew-text mb-1.5">
          술빚기 이름 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 5월 찹쌀 막걸리"
          className="w-full rounded-lg border border-brew-border bg-white px-4 py-2.5 text-sm focus:border-brew-accent focus:outline-none"
        />
      </div>

      {/* 메모 */}
      <div>
        <label className="block text-sm font-medium text-brew-text mb-1.5">메모 (선택)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="특이사항, 목표, 재료 메모 등을 자유롭게 적어주세요."
          className="w-full rounded-lg border border-brew-border bg-white px-4 py-2.5 text-sm focus:border-brew-accent focus:outline-none resize-none"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isPending || !name.trim()}
        className="w-full rounded-lg bg-brew-accent py-3 text-sm font-semibold text-white hover:bg-brew-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "술빚기 시작 중..." : "자유 양조로 술빚기 시작"}
      </button>
    </form>
  );
}
