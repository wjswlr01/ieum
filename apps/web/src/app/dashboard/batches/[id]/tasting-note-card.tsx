"use client";

import { useState, useTransition } from "react";
import { deleteTastingNote } from "@/lib/actions/tasting";
import Link from "next/link";

type TastingNote = {
  id: string;
  batchId: string;
  overallScore: number;
  aromaGrain: number;
  aromaFruit: number;
  aromaNuruk: number;
  aromaHop: number;
  aromaAlcohol: number;
  aromaOther: string | null;
  tasteSweet: number;
  tasteSour: number;
  tasteBitter: number;
  tasteUmami: number;
  body: number;
  carbonation: number;
  appearance: unknown;
  notes: string | null;
  createdAt: Date;
  taster: { name: string };
};

// ── SVG 레이더 차트 ──────────────────────────────────────────────

function RadarChart({
  axes,
  max = 5,
  size = 180,
}: {
  axes: { label: string; value: number }[];
  max?: number;
  size?: number;
}) {
  const n = axes.length;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const labelR = size * 0.48;

  function pt(i: number, scale: number) {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    return {
      x: cx + r * scale * Math.cos(angle),
      y: cy + r * scale * Math.sin(angle),
    };
  }

  function labelPt(i: number) {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    return { x: cx + labelR * Math.cos(angle), y: cy + labelR * Math.sin(angle) };
  }

  const bgLevels = [0.2, 0.4, 0.6, 0.8, 1.0];
  const dataPoints = axes.map((a, i) => pt(i, a.value / max));
  const dataPath =
    dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";

  return (
    <svg width={size} height={size} className="shrink-0">
      {/* grid */}
      {bgLevels.map((scale) => (
        <polygon
          key={scale}
          points={Array.from({ length: n }, (_, i) => {
            const p = pt(i, scale);
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
          }).join(" ")}
          fill="none"
          stroke="#E0D8CC"
          strokeWidth="1"
        />
      ))}
      {/* spokes */}
      {Array.from({ length: n }, (_, i) => {
        const p = pt(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#E0D8CC" strokeWidth="1" />;
      })}
      {/* data */}
      <path d={dataPath} fill="#C8B32A" fillOpacity="0.25" stroke="#C8B32A" strokeWidth="2" />
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#C8B32A" />
      ))}
      {/* labels */}
      {axes.map((a, i) => {
        const lp = labelPt(i);
        return (
          <text
            key={i}
            x={lp.x}
            y={lp.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="9"
            fill="#8A7F6F"
          >
            {a.label}
          </text>
        );
      })}
    </svg>
  );
}

// ── 메인 카드 컴포넌트 ───────────────────────────────────────────

const SCORE_LABEL = ["", "매우 약함", "약함", "보통", "강함", "매우 강함"];

function ScoreBar({ label, value }: { label: string; value: number }) {
  if (value === 0) return null;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-16 text-brew-subtle shrink-0">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((v) => (
          <div
            key={v}
            className={`w-5 h-2 rounded-sm ${v <= value ? "bg-brew-accent" : "bg-brew-border"}`}
          />
        ))}
      </div>
      <span className="text-brew-faint">{SCORE_LABEL[value]}</span>
    </div>
  );
}

export default function TastingNoteCard({
  note,
  index,
  brewType,
}: {
  note: TastingNote;
  index: number;
  brewType: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const appearance = note.appearance as { color?: string; clarity?: string; foam?: string } | null;

  const isBeer = brewType === "BEER";

  const radarAxes = isBeer
    ? [
        { label: "곡물향", value: note.aromaGrain },
        { label: "과일향", value: note.aromaFruit },
        { label: "홉향", value: note.aromaHop },
        { label: "단맛", value: note.tasteSweet },
        { label: "쓴맛", value: note.tasteBitter },
        { label: "바디감", value: note.body },
      ]
    : [
        { label: "곡물향", value: note.aromaGrain },
        { label: "과일향", value: note.aromaFruit },
        { label: "누룩향", value: note.aromaNuruk },
        { label: "단맛", value: note.tasteSweet },
        { label: "신맛", value: note.tasteSour },
        { label: "바디감", value: note.body },
      ];

  function handleDelete() {
    startTransition(async () => {
      await deleteTastingNote(note.id);
    });
  }

  return (
    <div className="rounded-xl border border-brew-border bg-brew-surface p-5">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs text-brew-subtle">시음 #{index}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-lg font-bold font-mono text-brew-text">{note.overallScore}</span>
            <span className="text-xs text-brew-subtle">/ 10</span>
            <span className="text-xs text-brew-faint">
              · {note.taster.name} ·{" "}
              {new Date(note.createdAt).toLocaleDateString("ko-KR")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/batches/${note.batchId}/tasting?edit=${note.id}`}
            className="text-xs text-brew-subtle hover:text-brew-text transition-colors"
          >
            수정
          </Link>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="text-xs text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
              >
                {isPending ? "삭제 중" : "확인"}
              </button>
              <span className="text-brew-faint text-xs">/</span>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-brew-subtle hover:text-brew-text transition-colors"
              >
                취소
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="text-xs text-brew-subtle hover:text-red-500 transition-colors"
            >
              삭제
            </button>
          )}
        </div>
      </div>

      {/* 외관 */}
      {appearance && (appearance.color || appearance.clarity || appearance.foam) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {appearance.color && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#E8DFD0] text-brew-muted">
              색상: {appearance.color}
            </span>
          )}
          {appearance.clarity && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#E8DFD0] text-brew-muted">
              탁도: {appearance.clarity}
            </span>
          )}
          {appearance.foam && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#E8DFD0] text-brew-muted">
              거품: {appearance.foam}
            </span>
          )}
        </div>
      )}

      {/* 레이더 차트 + 점수 상세 */}
      <div className="flex gap-6 items-start">
        <RadarChart axes={radarAxes} />

        <div className="flex-1 space-y-1.5 min-w-0">
          <p className="text-xs font-medium text-brew-subtle mb-2">향</p>
          <ScoreBar label="곡물/몰트" value={note.aromaGrain} />
          <ScoreBar label="과일" value={note.aromaFruit} />
          {isBeer ? (
            <ScoreBar label="홉" value={note.aromaHop} />
          ) : (
            <ScoreBar label="누룩" value={note.aromaNuruk} />
          )}
          <ScoreBar label="알코올" value={note.aromaAlcohol} />

          <p className="text-xs font-medium text-brew-subtle mb-2 pt-2">맛 / 질감</p>
          <ScoreBar label="단맛" value={note.tasteSweet} />
          <ScoreBar label="신맛" value={note.tasteSour} />
          <ScoreBar label="쓴맛" value={note.tasteBitter} />
          <ScoreBar label="감칠맛" value={note.tasteUmami} />
          <ScoreBar label="바디감" value={note.body} />
          <ScoreBar label="탄산감" value={note.carbonation} />
        </div>
      </div>

      {/* 기타 향 + 메모 */}
      {note.aromaOther && (
        <p className="mt-3 text-xs text-brew-muted">
          기타 향: <span className="text-brew-text">{note.aromaOther}</span>
        </p>
      )}
      {note.notes && (
        <p className="mt-3 pt-3 border-t border-brew-border/50 text-sm text-brew-muted whitespace-pre-wrap">
          {note.notes}
        </p>
      )}
    </div>
  );
}
