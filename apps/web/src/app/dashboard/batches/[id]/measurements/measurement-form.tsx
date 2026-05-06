"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addMeasurement } from "@/lib/actions/batch";

const BEER_TYPES = [
  { type: "GRAVITY_ORIGINAL", label: "현재 비중 (SG)", unit: "PIECE", placeholder: "1.050", step: "0.001" },
  { type: "TEMPERATURE", label: "온도 (°C)", unit: "PIECE", placeholder: "20.0", step: "0.1" },
  { type: "PH", label: "pH", unit: "PH", placeholder: "4.5", step: "0.1" },
];

const MAKGEOLLI_TYPES = [
  { type: "BRIX", label: "Brix (°Bx)", unit: "BX", placeholder: "12.0", step: "0.1" },
  { type: "CUSTOM", label: "산도 (%)", unit: "PERCENT", placeholder: "0.30", step: "0.01" },
  { type: "TEMPERATURE", label: "온도 (°C)", unit: "PIECE", placeholder: "20.0", step: "0.1" },
  { type: "PH", label: "pH", unit: "PH", placeholder: "3.5", step: "0.1" },
];

function localDatetimeNow() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

export default function MeasurementForm({
  batchId,
  brewType,
}: {
  batchId: string;
  brewType: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const types = brewType === "BEER" ? BEER_TYPES : MAKGEOLLI_TYPES;

  const [selectedType, setSelectedType] = useState(types[0]!.type);
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [takenAt, setTakenAt] = useState(localDatetimeNow);

  const meta = types.find((t) => t.type === selectedType) ?? types[0]!;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value) return;
    startTransition(async () => {
      await addMeasurement({
        batchId,
        type: selectedType,
        value: parseFloat(value),
        unit: meta.unit,
        takenAt: new Date(takenAt).toISOString(),
        ...(notes ? { notes } : {}),
      });
      setValue("");
      setNotes("");
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-brew-border bg-brew-surface p-5">
      <h2 className="text-sm font-semibold text-brew-text mb-4">새 측정값 입력</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Type selector */}
        <div>
          <label className="block text-xs text-brew-subtle mb-2">측정 항목</label>
          <div className="flex flex-wrap gap-2">
            {types.map((t) => (
              <button
                key={t.type}
                type="button"
                onClick={() => setSelectedType(t.type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  selectedType === t.type
                    ? "border-brew-accent bg-brew-accent/10 text-brew-accent"
                    : "border-brew-border text-brew-muted hover:border-brew-border-hover"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Value */}
        <div>
          <label className="block text-xs text-brew-subtle mb-1.5">{meta.label}</label>
          <input
            type="number"
            step={meta.step}
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={meta.placeholder}
            className="w-full rounded-lg border border-brew-border bg-white px-4 py-2.5 text-sm text-brew-text placeholder-brew-faint focus:border-brew-accent focus:outline-none"
          />
        </div>

        {/* Datetime */}
        <div>
          <label className="block text-xs text-brew-subtle mb-1.5">측정 일시</label>
          <input
            type="datetime-local"
            value={takenAt}
            onChange={(e) => setTakenAt(e.target.value)}
            className="w-full rounded-lg border border-brew-border bg-white px-4 py-2.5 text-sm text-brew-text focus:border-brew-accent focus:outline-none"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs text-brew-subtle mb-1.5">메모 (선택)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="특이사항"
            className="w-full rounded-lg border border-brew-border bg-white px-4 py-2.5 text-sm text-brew-text placeholder-brew-faint focus:border-brew-accent focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={!value || isPending}
          className="w-full rounded-lg bg-brew-accent py-2.5 text-sm font-semibold text-white hover:bg-brew-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "저장 중..." : "저장"}
        </button>
      </form>
    </div>
  );
}
