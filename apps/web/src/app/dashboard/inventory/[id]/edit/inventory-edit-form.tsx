"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateInventoryItem } from "@/lib/actions/inventory";

type Category = "GRAIN" | "HOP" | "YEAST" | "NURUK" | "RICE" | "OTHER";

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "GRAIN", label: "곡물" },
  { value: "HOP", label: "홉" },
  { value: "YEAST", label: "효모" },
  { value: "NURUK", label: "누룩" },
  { value: "RICE", label: "쌀" },
  { value: "OTHER", label: "기타" },
];
const UNITS = [
  { value: "KG", label: "kg" },
  { value: "G", label: "g" },
  { value: "MG", label: "mg" },
  { value: "L", label: "L" },
  { value: "ML", label: "mL" },
  { value: "PIECE", label: "개" },
] as const;

type TagInputProps = { value: string[]; onChange: (v: string[]) => void; placeholder?: string };
function TagInput({ value, onChange, placeholder }: TagInputProps) {
  const [input, setInput] = useState("");
  function add() {
    const t = input.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setInput("");
  }
  return (
    <div className="rounded-lg border border-brew-border bg-white px-3 py-2 flex flex-wrap gap-1.5 min-h-[42px]">
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-brew-accent/15 px-2.5 py-0.5 text-xs text-brew-accent"
        >
          {tag}
          <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))}>✕</button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }}
        onBlur={add}
        placeholder={value.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[100px] text-sm text-brew-text outline-none bg-transparent placeholder-brew-faint"
      />
    </div>
  );
}

type Meta = Record<string, unknown>;

function MetaField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-brew-muted mb-1">{label}</label>
      {children}
    </div>
  );
}

const INPUT_CLS = "w-full rounded-lg border border-brew-border bg-white px-3 py-2 text-sm focus:border-brew-accent focus:outline-none";
const SELECT_CLS = "rounded-lg border border-brew-border bg-white px-3 py-2 text-sm focus:border-brew-accent focus:outline-none";

function HopFields({ meta, onChange }: { meta: Meta; onChange: (m: Meta) => void }) {
  const set = (k: string, v: unknown) => onChange({ ...meta, [k]: v });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <MetaField label="알파산 (α%)">
        <input type="number" step="0.1" value={(meta.alphaAcid as number) ?? ""} onChange={(e) => set("alphaAcid", parseFloat(e.target.value) || undefined)} className={INPUT_CLS} />
      </MetaField>
      <MetaField label="베타산 (β%)">
        <input type="number" step="0.1" value={(meta.betaAcid as number) ?? ""} onChange={(e) => set("betaAcid", parseFloat(e.target.value) || undefined)} className={INPUT_CLS} />
      </MetaField>
      <MetaField label="원산지">
        <input type="text" value={(meta.origin as string) ?? ""} onChange={(e) => set("origin", e.target.value)} className={INPUT_CLS} />
      </MetaField>
      <MetaField label="용도">
        <select value={(meta.usage as string) ?? ""} onChange={(e) => set("usage", e.target.value)} className={SELECT_CLS}>
          <option value="">선택</option>
          <option value="bittering">쓴맛 (Bittering)</option>
          <option value="aroma">아로마 (Aroma)</option>
          <option value="dual">듀얼 (Dual)</option>
        </select>
      </MetaField>
      <div className="sm:col-span-2">
        <MetaField label="향 프로파일 (Enter로 추가)">
          <TagInput value={(meta.aromaProfile as string[]) ?? []} onChange={(v) => set("aromaProfile", v)} placeholder="시트러스, 플로럴..." />
        </MetaField>
      </div>
      <div className="sm:col-span-2">
        <MetaField label="설명">
          <textarea value={(meta.description as string) ?? ""} onChange={(e) => set("description", e.target.value)} rows={2} className={INPUT_CLS + " resize-none"} />
        </MetaField>
      </div>
    </div>
  );
}

function NurukFields({ meta, onChange }: { meta: Meta; onChange: (m: Meta) => void }) {
  const set = (k: string, v: unknown) => onChange({ ...meta, [k]: v });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <MetaField label="누룩 종류">
        <input type="text" value={(meta.nurukType as string) ?? ""} onChange={(e) => set("nurukType", e.target.value)} placeholder="개량누룩, 전통누룩..." className={INPUT_CLS} />
      </MetaField>
      <MetaField label="제조사">
        <input type="text" value={(meta.manufacturer as string) ?? ""} onChange={(e) => set("manufacturer", e.target.value)} className={INPUT_CLS} />
      </MetaField>
      <MetaField label="당화력">
        <select value={(meta.saccharification as string) ?? ""} onChange={(e) => set("saccharification", e.target.value)} className={SELECT_CLS}>
          <option value="">선택</option>
          <option value="낮음">낮음</option>
          <option value="중간">중간</option>
          <option value="높음">높음</option>
          <option value="매우 높음">매우 높음</option>
        </select>
      </MetaField>
      <MetaField label="권장 비율 (%)">
        <input type="text" value={(meta.recommendedRatio as string) ?? ""} onChange={(e) => set("recommendedRatio", e.target.value)} placeholder="10-15" className={INPUT_CLS} />
      </MetaField>
      <MetaField label="발효 온도 (°C)">
        <input type="text" value={(meta.fermentTemp as string) ?? ""} onChange={(e) => set("fermentTemp", e.target.value)} placeholder="25-28" className={INPUT_CLS} />
      </MetaField>
      <div className="sm:col-span-2">
        <MetaField label="풍미 태그 (Enter로 추가)">
          <TagInput value={(meta.flavor as string[]) ?? []} onChange={(v) => set("flavor", v)} placeholder="고소한, 단향..." />
        </MetaField>
      </div>
      <div className="sm:col-span-2">
        <MetaField label="설명">
          <textarea value={(meta.description as string) ?? ""} onChange={(e) => set("description", e.target.value)} rows={2} className={INPUT_CLS + " resize-none"} />
        </MetaField>
      </div>
    </div>
  );
}

function YeastFields({ meta, onChange }: { meta: Meta; onChange: (m: Meta) => void }) {
  const set = (k: string, v: unknown) => onChange({ ...meta, [k]: v });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <MetaField label="균주명">
        <input type="text" value={(meta.strain as string) ?? ""} onChange={(e) => set("strain", e.target.value)} placeholder="US-05" className={INPUT_CLS} />
      </MetaField>
      <MetaField label="종류">
        <input type="text" value={(meta.type as string) ?? ""} onChange={(e) => set("type", e.target.value)} placeholder="Ale, Lager..." className={INPUT_CLS} />
      </MetaField>
      <MetaField label="발효도 (%)">
        <input type="text" value={(meta.attenuation as string) ?? ""} onChange={(e) => set("attenuation", e.target.value)} placeholder="73-77" className={INPUT_CLS} />
      </MetaField>
      <MetaField label="적정 온도 (°C)">
        <input type="text" value={(meta.tempRange as string) ?? ""} onChange={(e) => set("tempRange", e.target.value)} placeholder="15-24" className={INPUT_CLS} />
      </MetaField>
      <MetaField label="응집도">
        <select value={(meta.flocculation as string) ?? ""} onChange={(e) => set("flocculation", e.target.value)} className={SELECT_CLS}>
          <option value="">선택</option>
          <option value="낮음">낮음</option>
          <option value="중간">중간</option>
          <option value="높음">높음</option>
        </select>
      </MetaField>
      <MetaField label="제조사">
        <input type="text" value={(meta.origin as string) ?? ""} onChange={(e) => set("origin", e.target.value)} placeholder="Fermentis" className={INPUT_CLS} />
      </MetaField>
      <div className="sm:col-span-2">
        <MetaField label="설명">
          <textarea value={(meta.description as string) ?? ""} onChange={(e) => set("description", e.target.value)} rows={2} className={INPUT_CLS + " resize-none"} />
        </MetaField>
      </div>
    </div>
  );
}

function OtherFields({ meta, onChange }: { meta: Meta; onChange: (m: Meta) => void }) {
  return (
    <MetaField label="설명">
      <textarea
        value={(meta.description as string) ?? ""}
        onChange={(e) => onChange({ ...meta, description: e.target.value })}
        rows={3}
        className={INPUT_CLS + " resize-none"}
      />
    </MetaField>
  );
}

type InitialData = {
  id: string;
  name: string;
  category: string;
  unit: string;
  sku: string | null;
  reorderLevel: number | null;
  notes: string | null;
  metadata: Meta | null;
};

export default function InventoryEditForm({ initial }: { initial: InitialData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: initial.name,
    category: initial.category as Category,
    unit: initial.unit,
    sku: initial.sku ?? "",
    reorderLevel: initial.reorderLevel != null ? String(initial.reorderLevel) : "",
    notes: initial.notes ?? "",
  });
  const [meta, setMeta] = useState<Meta>(initial.metadata ?? {});

  function set(patch: Partial<typeof form>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        await updateInventoryItem(initial.id, {
          name: form.name.trim(),
          category: form.category,
          unit: form.unit,
          sku: form.sku.trim() || null,
          reorderLevel: form.reorderLevel ? parseFloat(form.reorderLevel) : null,
          notes: form.notes.trim() || null,
          metadata: Object.keys(meta).length > 0 ? meta : null,
        });
        router.push(`/dashboard/inventory/${initial.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
      }
    });
  }

  const unitLabel = UNITS.find((u) => u.value === form.unit)?.label ?? form.unit;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Name */}
      <div>
        <label className="block text-sm text-brew-text mb-1.5">재료 이름 *</label>
        <input
          required
          value={form.name}
          onChange={(e) => set({ name: e.target.value })}
          className={INPUT_CLS}
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm text-brew-text mb-1.5">카테고리</label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => { set({ category: c.value }); setMeta({}); }}
              className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                form.category === c.value
                  ? "border-brew-accent bg-brew-accent/10 text-brew-accent"
                  : "border-brew-border text-brew-muted hover:border-brew-border-hover"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Unit */}
      <div>
        <label className="block text-sm text-brew-text mb-1.5">기본 단위</label>
        <div className="flex flex-wrap gap-2">
          {UNITS.map((u) => (
            <button
              key={u.value}
              type="button"
              onClick={() => set({ unit: u.value })}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                form.unit === u.value
                  ? "border-brew-accent bg-brew-accent/10 text-brew-accent"
                  : "border-brew-border text-brew-muted hover:border-brew-border-hover"
              }`}
            >
              {u.label}
            </button>
          ))}
        </div>
      </div>

      {/* SKU + Reorder side by side */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-brew-text mb-1.5">SKU (선택)</label>
          <input type="text" value={form.sku} onChange={(e) => set({ sku: e.target.value })} className={INPUT_CLS} />
        </div>
        <div>
          <label className="block text-sm text-brew-text mb-1.5">저재고 알림 ({unitLabel})</label>
          <input type="number" min={0} step="0.001" value={form.reorderLevel} onChange={(e) => set({ reorderLevel: e.target.value })} className={INPUT_CLS} />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm text-brew-text mb-1.5">메모 (선택)</label>
        <textarea value={form.notes} onChange={(e) => set({ notes: e.target.value })} rows={2} className={INPUT_CLS + " resize-none"} />
      </div>

      {/* Metadata by category */}
      {(form.category === "HOP" || form.category === "NURUK" || form.category === "YEAST" || form.category === "GRAIN" || form.category === "RICE" || form.category === "OTHER") && (
        <div className="rounded-xl border border-brew-border bg-brew-surface/50 p-4">
          <p className="text-sm font-semibold text-brew-text mb-4">
            {form.category === "HOP" ? "홉 상세 정보" :
             form.category === "NURUK" ? "누룩 상세 정보" :
             form.category === "YEAST" ? "효모 상세 정보" : "상세 정보"}
            <span className="ml-1.5 text-xs font-normal text-brew-subtle">(선택)</span>
          </p>
          {form.category === "HOP" && <HopFields meta={meta} onChange={setMeta} />}
          {form.category === "NURUK" && <NurukFields meta={meta} onChange={setMeta} />}
          {form.category === "YEAST" && <YeastFields meta={meta} onChange={setMeta} />}
          {(form.category === "GRAIN" || form.category === "RICE" || form.category === "OTHER") && (
            <OtherFields meta={meta} onChange={setMeta} />
          )}
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 rounded-xl border border-brew-border py-3 text-sm font-medium text-brew-muted hover:border-brew-border-hover transition-colors"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={!form.name.trim() || isPending}
          className="flex-1 rounded-lg bg-brew-accent py-3 text-sm font-semibold text-white hover:bg-brew-accent-hover transition-colors disabled:opacity-50"
        >
          {isPending ? "저장 중..." : "저장"}
        </button>
      </div>
    </form>
  );
}
