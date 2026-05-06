"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createInventoryItem, getCatalogItems } from "@/lib/actions/inventory";

const CATEGORIES = [
  { value: "GRAIN", label: "곡물" },
  { value: "HOP", label: "홉" },
  { value: "YEAST", label: "효모" },
  { value: "NURUK", label: "누룩" },
  { value: "RICE", label: "쌀" },
  { value: "OTHER", label: "기타" },
] as const;

const UNITS = [
  { value: "KG", label: "kg" },
  { value: "G", label: "g" },
  { value: "MG", label: "mg" },
  { value: "L", label: "L" },
  { value: "ML", label: "mL" },
  { value: "PIECE", label: "개 (패킷 등)" },
] as const;

type Meta = Record<string, unknown>;

const INPUT_CLS = "w-full rounded-lg border border-brew-border bg-white px-4 py-2.5 text-sm text-brew-text placeholder-brew-faint focus:border-brew-accent focus:outline-none";
const SELECT_CLS = "rounded-lg border border-brew-border bg-white px-3 py-2 text-sm focus:border-brew-accent focus:outline-none";

function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState("");
  function add() {
    const t = input.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setInput("");
  }
  return (
    <div className="rounded-lg border border-brew-border bg-white px-3 py-2 flex flex-wrap gap-1.5 min-h-[42px]">
      {value.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-brew-accent/15 px-2.5 py-0.5 text-xs text-brew-accent">
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
        className="flex-1 min-w-[100px] text-sm outline-none bg-transparent placeholder-brew-faint"
      />
    </div>
  );
}

function MetaField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-brew-muted mb-1">{label}</label>
      {children}
    </div>
  );
}

function HopMeta({ meta, set }: { meta: Meta; set: (k: string, v: unknown) => void }) {
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

function NurukMeta({ meta, set }: { meta: Meta; set: (k: string, v: unknown) => void }) {
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

function YeastMeta({ meta, set }: { meta: Meta; set: (k: string, v: unknown) => void }) {
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

const META_TITLE: Partial<Record<string, string>> = {
  HOP: "홉 상세 정보",
  NURUK: "누룩 상세 정보",
  YEAST: "효모 상세 정보",
};

const CAT_LABEL: Record<string, string> = {
  GRAIN: "곡물", HOP: "홉", YEAST: "효모", NURUK: "누룩", RICE: "쌀", OTHER: "기타",
};
const CAT_COLOR: Record<string, string> = {
  GRAIN: "text-amber-800 bg-amber-50 border-amber-200",
  HOP:   "text-green-800 bg-green-50 border-green-200",
  YEAST: "text-yellow-800 bg-yellow-50 border-yellow-200",
  NURUK: "text-orange-800 bg-orange-50 border-orange-200",
  RICE:  "text-lime-800 bg-lime-50 border-lime-200",
  OTHER: "text-purple-800 bg-purple-50 border-purple-200",
};

type CatalogEntry = { id: string; name: string; category: string; unit: string; metadata: Record<string, unknown> };

function CatalogPicker({ onSelect }: { onSelect: (item: CatalogEntry) => void }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CatalogEntry[] | null>(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("ALL");
  const overlayRef = useRef<HTMLDivElement>(null);

  async function handleOpen() {
    setOpen(true);
    if (!items) {
      const data = await getCatalogItems();
      setItems(data as CatalogEntry[]);
    }
  }

  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open]);

  const filtered = (items ?? []).filter((i) => {
    const matchCat = catFilter === "ALL" || i.category === catFilter;
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const cats = ["ALL", "NURUK", "HOP", "YEAST", "GRAIN", "RICE", "OTHER"];

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="w-full rounded-xl border border-dashed border-brew-accent/50 bg-brew-accent/5 px-4 py-3 text-sm font-medium text-brew-accent hover:bg-brew-accent/10 transition-colors text-left"
      >
        📖 도감에서 가져오기
        <span className="ml-2 text-xs font-normal text-brew-muted">이름·카테고리·상세 정보 자동 입력</span>
      </button>

      {open && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onMouseDown={(e) => { if (e.target === overlayRef.current) setOpen(false); }}
        >
          <div className="flex flex-col w-full max-w-2xl max-h-[80vh] bg-brew-bg rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-brew-border shrink-0">
              <h3 className="font-semibold text-brew-text">도감에서 가져오기</h3>
              <button onClick={() => setOpen(false)} className="text-brew-muted hover:text-brew-text w-8 h-8 flex items-center justify-center rounded-lg hover:bg-brew-surface text-xl">×</button>
            </div>

            {/* Search + Filter */}
            <div className="px-5 py-3 border-b border-brew-border shrink-0 flex flex-col gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="재료 이름 검색..."
                className="w-full rounded-lg border border-brew-border bg-white px-3 py-2 text-sm focus:border-brew-accent focus:outline-none"
                autoFocus
              />
              <div className="flex gap-1.5 flex-wrap">
                {cats.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCatFilter(c)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      catFilter === c
                        ? "bg-brew-dark text-brew-text-light border-brew-dark"
                        : "border-brew-border text-brew-muted hover:border-brew-border-hover"
                    }`}
                  >
                    {c === "ALL" ? "전체" : CAT_LABEL[c] ?? c}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-5 py-3">
              {items === null ? (
                <p className="text-sm text-brew-subtle text-center py-10">불러오는 중...</p>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-brew-subtle text-center py-10">검색 결과 없음</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {filtered.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { onSelect(item); setOpen(false); }}
                      className="flex items-center gap-3 w-full text-left rounded-lg border border-brew-border bg-brew-surface px-4 py-3 hover:border-brew-accent hover:bg-brew-accent/5 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-brew-text text-sm truncate">{item.name}</p>
                        {(item.metadata as any)?.description && (
                          <p className="text-xs text-brew-subtle mt-0.5 line-clamp-1">{String((item.metadata as any).description)}</p>
                        )}
                      </div>
                      <span className={`shrink-0 text-xs rounded-full border px-2 py-0.5 ${CAT_COLOR[item.category] ?? CAT_COLOR.OTHER}`}>
                        {CAT_LABEL[item.category] ?? item.category}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function InventoryForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    category: "GRAIN",
    unit: "KG",
    sku: "",
    initialQuantity: "",
    reorderLevel: "",
    notes: "",
  });
  const [meta, setMeta] = useState<Meta>({});

  function set(patch: Partial<typeof form>) {
    setForm((f) => ({ ...f, ...patch }));
  }
  function setMetaKey(k: string, v: unknown) {
    setMeta((m) => ({ ...m, [k]: v }));
  }

  function handleCatalogSelect(item: CatalogEntry) {
    setForm((f) => ({
      ...f,
      name: item.name,
      category: item.category,
      unit: item.unit,
    }));
    setMeta((item.metadata as Meta) ?? {});
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) return;

    startTransition(async () => {
      try {
        const result = await createInventoryItem({
          name: form.name.trim(),
          category: form.category,
          unit: form.unit,
          ...(form.sku.trim() ? { sku: form.sku.trim() } : {}),
          initialQuantity: parseFloat(form.initialQuantity) || 0,
          ...(form.reorderLevel ? { reorderLevel: parseFloat(form.reorderLevel) } : {}),
          ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
          ...(Object.keys(meta).length > 0 ? { metadata: meta } : {}),
        });
        router.push(`/dashboard/inventory/${result.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
      }
    });
  }

  const hasMetaSection = ["HOP", "NURUK", "YEAST", "GRAIN", "RICE", "OTHER"].includes(form.category);
  const metaTitle = META_TITLE[form.category] ?? "상세 정보";
  const unitLabel = UNITS.find((u) => u.value === form.unit)?.label ?? form.unit;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <CatalogPicker onSelect={handleCatalogSelect} />

      <div>
        <label className="block text-sm text-brew-text mb-1.5">재료 이름 *</label>
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="예: 페일 에일 몰트, 캐스케이드 홉"
          className={INPUT_CLS}
        />
      </div>

      <div>
        <label className="block text-sm text-brew-text mb-1.5">카테고리</label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => { set({ category: c.value }); setMeta({}); }}
              className={`px-3 py-2 rounded-lg text-sm border transition-colors text-center ${
                form.category === c.value
                  ? "border-brew-accent bg-brew-accent/10 text-brew-accent"
                  : "border-brew-border text-brew-muted hover:border-brew-border-hover hover:text-brew-text"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

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

      <div>
        <label className="block text-sm text-brew-text mb-1.5">SKU <span className="text-brew-subtle">(선택)</span></label>
        <input
          type="text"
          value={form.sku}
          onChange={(e) => set({ sku: e.target.value })}
          placeholder="내부 관리 코드"
          className={INPUT_CLS}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-brew-text mb-1.5">초기 재고</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              step="0.001"
              value={form.initialQuantity}
              onChange={(e) => set({ initialQuantity: e.target.value })}
              placeholder="0"
              className="flex-1 rounded-lg border border-brew-border bg-white px-4 py-2.5 text-sm focus:border-brew-accent focus:outline-none"
            />
            <span className="text-xs text-brew-subtle shrink-0">{unitLabel}</span>
          </div>
        </div>
        <div>
          <label className="block text-sm text-brew-text mb-1.5">저재고 알림 <span className="text-brew-subtle">(선택)</span></label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              step="0.001"
              value={form.reorderLevel}
              onChange={(e) => set({ reorderLevel: e.target.value })}
              placeholder="예: 1"
              className="flex-1 rounded-lg border border-brew-border bg-white px-4 py-2.5 text-sm focus:border-brew-accent focus:outline-none"
            />
            <span className="text-xs text-brew-subtle shrink-0">{unitLabel}</span>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm text-brew-text mb-1.5">메모 <span className="text-brew-subtle">(선택)</span></label>
        <textarea
          value={form.notes}
          onChange={(e) => set({ notes: e.target.value })}
          rows={2}
          placeholder="보관 조건, 원산지 등"
          className={INPUT_CLS + " resize-none"}
        />
      </div>

      {/* Dynamic metadata section */}
      {hasMetaSection && (
        <div className="rounded-xl border border-brew-border bg-brew-surface/50 p-4">
          <p className="text-sm font-semibold text-brew-text mb-4">
            {metaTitle}
            <span className="ml-1.5 text-xs font-normal text-brew-subtle">(선택)</span>
          </p>
          {form.category === "HOP" && <HopMeta meta={meta} set={setMetaKey} />}
          {form.category === "NURUK" && <NurukMeta meta={meta} set={setMetaKey} />}
          {form.category === "YEAST" && <YeastMeta meta={meta} set={setMetaKey} />}
          {(form.category === "GRAIN" || form.category === "RICE" || form.category === "OTHER") && (
            <div>
              <label className="block text-xs text-brew-muted mb-1">설명</label>
              <textarea
                value={(meta.description as string) ?? ""}
                onChange={(e) => setMetaKey("description", e.target.value)}
                rows={3}
                className={INPUT_CLS + " resize-none"}
              />
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={!form.name.trim() || isPending}
        className="w-full rounded-lg bg-brew-accent py-3 text-sm font-semibold text-white hover:bg-brew-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "등록 중..." : "재료 등록하기"}
      </button>
    </form>
  );
}
