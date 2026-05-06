"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTastingNote, type TastingNoteInput } from "@/lib/actions/tasting";

const COLOR_OPTIONS = ["황금색", "금색", "구리색", "호박색", "갈색", "진갈색", "흰색", "유백색", "기타"];
const CLARITY_OPTIONS = ["맑음", "약간 탁함", "탁함", "불투명"];
const FOAM_OPTIONS = ["풍성하고 지속적", "적당함", "적음", "없음"];

type ScoreKey = keyof Pick<
  TastingNoteInput,
  | "aromaGrain" | "aromaFruit" | "aromaNuruk" | "aromaHop" | "aromaAlcohol"
  | "tasteSweet" | "tasteSour" | "tasteBitter" | "tasteUmami"
  | "body" | "carbonation"
>;

function ScoreSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const LABELS = ["", "매우 약함", "약함", "보통", "강함", "매우 강함"];
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 text-xs text-brew-muted shrink-0">{label}</span>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(value === v ? 0 : v)}
            className={`w-8 h-8 rounded-lg border text-xs font-semibold transition-colors ${
              value >= v
                ? "bg-brew-accent border-brew-accent text-white"
                : "border-brew-border text-brew-subtle hover:border-brew-border-hover"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
      <span className="text-xs text-brew-faint w-20 shrink-0">
        {value > 0 ? LABELS[value] : ""}
      </span>
    </div>
  );
}

function OverallScore({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(value === v ? 0 : v)}
          className={`w-10 h-10 rounded-xl border text-sm font-bold transition-colors ${
            value === v
              ? "bg-brew-dark border-brew-dark text-brew-text-light"
              : value > 0 && v <= value
              ? "bg-brew-accent/20 border-brew-accent/40 text-brew-accent"
              : "border-brew-border text-brew-subtle hover:border-brew-border-hover"
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

const selectCls =
  "w-full rounded-lg border border-brew-border bg-white px-3 py-1.5 text-sm text-brew-text focus:border-brew-accent focus:outline-none";

export default function TastingForm({
  batchId,
  brewType,
}: {
  batchId: string;
  brewType: "BEER" | "MAKGEOLLI";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [color, setColor] = useState("");
  const [clarity, setClarity] = useState("");
  const [foam, setFoam] = useState("");

  const [scores, setScores] = useState<Record<ScoreKey, number>>({
    aromaGrain: 0, aromaFruit: 0, aromaNuruk: 0, aromaHop: 0, aromaAlcohol: 0,
    tasteSweet: 0, tasteSour: 0, tasteBitter: 0, tasteUmami: 0,
    body: 0, carbonation: 0,
  });
  const [aromaOther, setAromaOther] = useState("");
  const [overallScore, setOverallScore] = useState(0);
  const [notes, setNotes] = useState("");

  function setScore(key: ScoreKey, v: number) {
    setScores((prev) => ({ ...prev, [key]: v }));
  }

  function handleSubmit() {
    startTransition(async () => {
      const appearance = {
        ...(color ? { color } : {}),
        ...(clarity ? { clarity } : {}),
        ...(foam ? { foam } : {}),
      };
      const data: TastingNoteInput = {
        ...((color || clarity || foam) ? { appearance } : {}),
        ...scores,
        ...(aromaOther ? { aromaOther } : {}),
        overallScore,
        ...(notes ? { notes } : {}),
      };
      await createTastingNote(batchId, data);
    });
  }

  const sectionTitle = "text-sm font-semibold text-brew-text mb-4";
  const section = "rounded-xl border border-brew-border bg-brew-surface p-5 space-y-3 mb-4";

  return (
    <div>
      {/* 외관 */}
      <div className={section}>
        <h2 className={sectionTitle}>외관</h2>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-brew-subtle mb-1">색상</label>
            <select value={color} onChange={(e) => setColor(e.target.value)} className={selectCls}>
              <option value="">선택</option>
              {COLOR_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-brew-subtle mb-1">탁도</label>
            <select value={clarity} onChange={(e) => setClarity(e.target.value)} className={selectCls}>
              <option value="">선택</option>
              {CLARITY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-brew-subtle mb-1">거품</label>
            <select value={foam} onChange={(e) => setFoam(e.target.value)} className={selectCls}>
              <option value="">선택</option>
              {FOAM_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* 향 */}
      <div className={section}>
        <h2 className={sectionTitle}>향</h2>
        <ScoreSlider label="곡물/몰트향" value={scores.aromaGrain} onChange={(v) => setScore("aromaGrain", v)} />
        <ScoreSlider label="과일향" value={scores.aromaFruit} onChange={(v) => setScore("aromaFruit", v)} />
        {brewType === "MAKGEOLLI" && (
          <ScoreSlider label="누룩향" value={scores.aromaNuruk} onChange={(v) => setScore("aromaNuruk", v)} />
        )}
        {brewType === "BEER" && (
          <ScoreSlider label="홉향" value={scores.aromaHop} onChange={(v) => setScore("aromaHop", v)} />
        )}
        <ScoreSlider label="알코올향" value={scores.aromaAlcohol} onChange={(v) => setScore("aromaAlcohol", v)} />
        <div>
          <label className="block text-xs text-brew-subtle mb-1">기타 향 메모</label>
          <input
            type="text"
            value={aromaOther}
            onChange={(e) => setAromaOther(e.target.value)}
            placeholder="예: 바나나향, 정향..."
            className="w-full rounded-lg border border-brew-border bg-white px-3 py-1.5 text-sm text-brew-text focus:border-brew-accent focus:outline-none"
          />
        </div>
      </div>

      {/* 맛 */}
      <div className={section}>
        <h2 className={sectionTitle}>맛</h2>
        <ScoreSlider label="단맛" value={scores.tasteSweet} onChange={(v) => setScore("tasteSweet", v)} />
        <ScoreSlider label="신맛" value={scores.tasteSour} onChange={(v) => setScore("tasteSour", v)} />
        <ScoreSlider label="쓴맛" value={scores.tasteBitter} onChange={(v) => setScore("tasteBitter", v)} />
        <ScoreSlider label="감칠맛" value={scores.tasteUmami} onChange={(v) => setScore("tasteUmami", v)} />
      </div>

      {/* 질감 */}
      <div className={section}>
        <h2 className={sectionTitle}>질감</h2>
        <ScoreSlider label="바디감" value={scores.body} onChange={(v) => setScore("body", v)} />
        <ScoreSlider label="탄산감" value={scores.carbonation} onChange={(v) => setScore("carbonation", v)} />
      </div>

      {/* 총점 */}
      <div className={section}>
        <h2 className={sectionTitle}>총점 (1–10)</h2>
        <OverallScore value={overallScore} onChange={setOverallScore} />
        {overallScore > 0 && (
          <p className="text-xs text-brew-subtle mt-1">
            {overallScore <= 3 ? "개선 필요" : overallScore <= 6 ? "양호" : overallScore <= 8 ? "우수" : "최상"}
          </p>
        )}
      </div>

      {/* 자유 메모 */}
      <div className={section}>
        <h2 className={sectionTitle}>자유 메모</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="전반적인 인상, 개선점, 다음 배치를 위한 메모..."
          className="w-full rounded-lg border border-brew-border bg-white px-3 py-2 text-sm text-brew-text placeholder-brew-faint focus:border-brew-accent focus:outline-none resize-none"
        />
      </div>

      {/* 버튼 */}
      <div className="flex gap-3 mt-6">
        <button
          type="button"
          onClick={() => router.push(`/dashboard/batches/${batchId}`)}
          className="flex-1 rounded-xl border border-brew-border py-3 text-sm font-medium text-brew-muted hover:border-brew-border-hover transition-colors"
        >
          나중에 기록하기
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="flex-1 rounded-lg bg-brew-accent py-3 text-sm font-semibold text-white hover:bg-brew-accent-hover transition-colors disabled:opacity-50"
        >
          {isPending ? "저장 중..." : "시음 기록 저장"}
        </button>
      </div>
    </div>
  );
}
